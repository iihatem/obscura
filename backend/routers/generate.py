import os
import base64
import io
import json
import re
from typing import Optional
from types import SimpleNamespace
import numpy as np
from PIL import Image
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from anthropic import Anthropic, APIConnectionError, APIStatusError, APITimeoutError
from openai import OpenAI, OpenAIError
from lib.auth import get_current_user
from prompts.config import (
    CROP_DETECT, LABEL_CONTEXT, LABEL_ASSEMBLY,
    FULL_IMAGE_SYSTEM, FULL_IMAGE_USER,
    FLASHCARD_SYSTEM, FLASHCARD_USER, FLASHCARD_TEXT_USER,
)

# Skip PaddleOCR's network connectivity check on every init
os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")

# Max base64 payload accepted (~20 MB raw image → ~27 MB base64)
_MAX_B64_BYTES = 27 * 1024 * 1024

# Claude API timeout in seconds
_CLAUDE_TIMEOUT = 60.0

_DEFAULT_PRIMARY_MODEL = "claude-sonnet-4-6"
_DEFAULT_FALLBACK_MODEL = "gpt-5-mini"
_FALLBACK_STATUS_CODES = {400, 401, 403, 404, 408, 409, 413, 422, 429, 500, 502, 503, 504, 529}

router = APIRouter(prefix="/generate", tags=["generate"])

# ── Singletons ────────────────────────────────────────────────────────────────

_anthropic: Anthropic | None = None
_openai: OpenAI | None = None


def get_anthropic() -> Anthropic:
    global _anthropic
    if _anthropic is None:
        _anthropic = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    return _anthropic


def get_openai() -> OpenAI | None:
    """Return the optional cross-provider fallback client."""
    global _openai
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key:
        return None
    if _openai is None:
        _openai = OpenAI(api_key=key, timeout=_CLAUDE_TIMEOUT)
    return _openai


def _openai_fallback(kwargs: dict, model: str):
    client = get_openai()
    if client is None:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    messages = []
    system = kwargs.get("system")
    if system:
        messages.append({"role": "system", "content": system})

    for message in kwargs.get("messages", []):
        content = message.get("content", "")
        if isinstance(content, str):
            converted = content
        else:
            converted = []
            for block in content:
                if block.get("type") == "text":
                    converted.append({"type": "text", "text": block["text"]})
                elif block.get("type") == "image":
                    source = block["source"]
                    converted.append({
                        "type": "image_url",
                        "image_url": {"url": f"data:{source['media_type']};base64,{source['data']}"},
                    })
        messages.append({"role": message.get("role", "user"), "content": converted})

    response = client.chat.completions.create(
        model=model,
        messages=messages,
        max_completion_tokens=kwargs.get("max_tokens", 2048),
    )
    text = response.choices[0].message.content or ""
    return SimpleNamespace(content=[SimpleNamespace(type="text", text=text)])


def _create_message_with_fallback(client: Anthropic, **kwargs):
    """Call Anthropic first, then retry eligible failures through OpenAI."""
    primary = os.environ.get("ANTHROPIC_PRIMARY_MODEL", _DEFAULT_PRIMARY_MODEL).strip()
    fallback = os.environ.get("OPENAI_FALLBACK_MODEL", _DEFAULT_FALLBACK_MODEL).strip()
    primary_error: Exception | None = None

    try:
        return client.messages.create(model=primary, **kwargs), primary
    except (APIConnectionError, APITimeoutError) as exc:
        if not fallback or fallback == primary:
            raise
        print(f"[generate] {primary} unavailable ({type(exc).__name__}); retrying with OpenAI {fallback}")
        primary_error = exc
    except APIStatusError as exc:
        if not fallback or fallback == primary or exc.status_code not in _FALLBACK_STATUS_CODES:
            raise
        print(f"[generate] {primary} returned HTTP {exc.status_code}; retrying with OpenAI {fallback}")
        primary_error = exc

    try:
        return _openai_fallback(kwargs, fallback), f"openai:{fallback}"
    except RuntimeError:
        raise primary_error
    except OpenAIError as exc:
        print(f"[generate] OpenAI fallback failed: {type(exc).__name__}")
        raise HTTPException(status_code=502, detail="Both AI providers are currently unavailable.") from exc


_paddle_ocr = None
_paddle_available: bool | None = None  # None = untried


def get_paddle_ocr():
    """Lazy singleton. Returns None (permanently) if paddleocr is not installed."""
    global _paddle_ocr, _paddle_available
    if _paddle_available is False:
        return None
    if _paddle_ocr is not None:
        return _paddle_ocr
    try:
        from paddleocr import PaddleOCR
        _paddle_ocr = PaddleOCR(
            lang=os.environ.get("PADDLE_LANG", "en"),
            # Disable heavyweight document preprocessing — not needed for diagrams
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
        )
        _paddle_available = True
    except Exception as e:
        print(f"[generate] PaddleOCR unavailable, falling back to Claude-only: {e}")
        _paddle_available = False
    return _paddle_ocr


# ── Helpers ───────────────────────────────────────────────────────────────────

def _detect_mime(b64: str) -> str:
    raw = base64.b64decode(b64[:16] + "==")
    if raw[0] == 0x89 and raw[1] == 0x50:
        return "image/png"
    if raw[0] == 0xFF and raw[1] == 0xD8:
        return "image/jpeg"
    if raw[0] == 0x52 and raw[1] == 0x49:
        return "image/webp"
    if raw[0] == 0x47 and raw[1] == 0x49:
        return "image/gif"
    return "image/jpeg"


def _strip_fences(text: str) -> str:
    return re.sub(r"^```(?:json)?\s*", "", text.strip(), flags=re.IGNORECASE).rstrip("` \n")


def _poly_to_bbox(poly: np.ndarray, img_w: int, img_h: int, pad: int = 3):
    """
    Convert a (4, 2) polygon to a padded axis-aligned bounding box.
    Returns two tuples: (original_bbox, padded_bbox) both as (x1, y1, x2, y2) pixel ints.
    """
    x1 = int(poly[:, 0].min())
    y1 = int(poly[:, 1].min())
    x2 = int(poly[:, 0].max())
    y2 = int(poly[:, 1].max())
    px1 = max(0, x1 - pad)
    py1 = max(0, y1 - pad)
    px2 = min(img_w, x2 + pad)
    py2 = min(img_h, y2 + pad)
    return (x1, y1, x2, y2), (px1, py1, px2, py2)


def _crop_b64(pil_image: Image.Image, x1: int, y1: int, x2: int, y2: int) -> str:
    """Crop a region and return as JPEG base64."""
    crop = pil_image.crop((x1, y1, x2, y2))
    buf = io.BytesIO()
    crop.save(buf, format="JPEG", quality=92)
    return base64.b64encode(buf.getvalue()).decode()


def _union_boxes(boxes: list[tuple]) -> tuple:
    """Return the smallest bounding box enclosing all supplied boxes."""
    return (
        min(b[0] for b in boxes),
        min(b[1] for b in boxes),
        max(b[2] for b in boxes),
        max(b[3] for b in boxes),
    )


def _pil_to_b64(pil_image: Image.Image, quality: int = 95) -> str:
    """Encode a PIL image as JPEG base64."""
    buf = io.BytesIO()
    pil_image.save(buf, format="JPEG", quality=quality)
    return base64.b64encode(buf.getvalue()).decode()


def _extract_diagram_crop(
    pil_image: Image.Image,
    image_b64: str,
    mime: str,
    client: Anthropic,
) -> tuple[Image.Image, str]:
    """
    Ask Claude to locate the main diagram/illustration within a slide and return
    a cropped PIL image + its JPEG base64.

    Adds 1 % padding on each side so arrows and leader lines aren't clipped.
    Falls back to the full image if no clear region is found or the crop is tiny.
    """
    img_w, img_h = pil_image.size

    message, _ = _create_message_with_fallback(
        client,
        max_tokens=256,
        timeout=_CLAUDE_TIMEOUT,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": mime, "data": image_b64}},
                {"type": "text", "text": CROP_DETECT},
            ],
        }],
    )

    raw = "".join(b.text for b in message.content if b.type == "text")
    try:
        data = json.loads(_strip_fences(raw))
        if not data or not isinstance(data, dict):
            raise ValueError("no region")

        # Parse + add 1 % padding on each side
        x  = max(0.0,   data["x"]   / 100 - 0.01)
        y  = max(0.0,   data["y"]   / 100 - 0.01)
        x2 = min(1.0,  (data["x"] + data["width"])  / 100 + 0.01)
        y2 = min(1.0,  (data["y"] + data["height"]) / 100 + 0.01)

        px1, py1 = int(x * img_w),  int(y * img_h)
        px2, py2 = int(x2 * img_w), int(y2 * img_h)

        # Skip if the crop is too small or is basically the whole image
        if (px2 - px1) < 80 or (py2 - py1) < 80:
            raise ValueError("crop too small")
        if (px2 - px1) > img_w * 0.95 and (py2 - py1) > img_h * 0.95:
            raise ValueError("crop is full image — no benefit")

        cropped = pil_image.crop((px1, py1, px2, py2))
        return cropped, _pil_to_b64(cropped)

    except Exception:
        # Fallback: use the full image as-is
        return pil_image, image_b64


# ── Schema ────────────────────────────────────────────────────────────────────

class GenerateBody(BaseModel):
    imageBase64: str
    setId: str
    extractedText: Optional[str] = None


# ── /labels endpoint ──────────────────────────────────────────────────────────

@router.post("/labels")
async def generate_labels(body: GenerateBody, current_user=Depends(get_current_user)):
    if not body.imageBase64 or not body.setId:
        raise HTTPException(status_code=400, detail="imageBase64 and setId are required")
    if len(body.imageBase64) > _MAX_B64_BYTES:
        raise HTTPException(status_code=400, detail="Image too large (max 20 MB)")

    mime = _detect_mime(body.imageBase64)
    image_bytes = base64.b64decode(body.imageBase64)
    pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    client = get_anthropic()
    # Normalize the saved/reviewed diagram to JPEG without changing its geometry.
    working_b64 = _pil_to_b64(pil_image)
    working_mime = "image/jpeg"

    img_w, img_h = pil_image.size
    img_array = np.array(pil_image)

    # ── Stage 1: PaddleOCR — pixel-precise text region detection ─────────────
    orig_boxes: list[tuple[int, int, int, int]] = []   # (x1,y1,x2,y2) no padding
    ocr_regions: list[dict] = []

    ocr = get_paddle_ocr()
    if ocr is not None:
        try:
            results = list(ocr.predict(img_array))
            if results:
                r = results[0]
                polys: list = r.get("dt_polys", []) or []
                texts: list = r.get("rec_texts", []) or []
                scores: list = r.get("rec_scores", []) or []
                for i, poly in enumerate(polys):
                    text = str(texts[i]).strip() if i < len(texts) else ""
                    confidence = float(scores[i]) if i < len(scores) else None
                    if not text or (confidence is not None and confidence < 0.2):
                        continue
                    poly_arr = np.array(poly, dtype=float)
                    if poly_arr.shape != (4, 2):
                        continue
                    orig, _ = _poly_to_bbox(poly_arr, img_w, img_h, pad=3)
                    ox1, oy1, ox2, oy2 = orig
                    # Skip degenerate boxes
                    if (ox2 - ox1) < 4 or (oy2 - oy1) < 4:
                        continue
                    orig_boxes.append(orig)
                    ocr_regions.append({
                        "text": text,
                        "confidence": round(confidence, 3) if confidence is not None else None,
                    })
        except Exception as e:
            print(f"[generate] PaddleOCR predict failed: {e}")

    # ── Fallback: no boxes detected — let Claude do full-image localization ───
    if not orig_boxes:
        result = _claude_full_image_labels(working_b64, working_mime)
        result["croppedImageBase64"] = working_b64
        return result

    # One Claude call receives the image plus compact OCR text/coordinates.
    if len(orig_boxes) > 50:
        orig_boxes = orig_boxes[:50]
        ocr_regions = ocr_regions[:50]

    structured_regions = []
    for i, ((x1, y1, x2, y2), region) in enumerate(zip(orig_boxes, ocr_regions)):
        structured_regions.append({
            "index": i,
            **region,
            "bbox": {
                "x": round(x1 / img_w * 100, 3),
                "y": round(y1 / img_h * 100, 3),
                "width": round((x2 - x1) / img_w * 100, 3),
                "height": round((y2 - y1) / img_h * 100, 3),
            },
        })

    content: list = [
        {"type": "text", "text": LABEL_CONTEXT},
        {
            "type": "image",
            "source": {"type": "base64", "media_type": working_mime, "data": working_b64},
        },
    ]

    content.append({"type": "text", "text": "OCR regions:\n" + json.dumps(structured_regions)})
    content.append({"type": "text", "text": LABEL_ASSEMBLY})

    message, used_model = _create_message_with_fallback(
        client,
        max_tokens=2048,
        timeout=_CLAUDE_TIMEOUT,
        messages=[{"role": "user", "content": content}],
    )

    raw = "".join(b.text for b in message.content if b.type == "text")
    try:
        items: list = json.loads(_strip_fences(raw))
        if not isinstance(items, list):
            items = []
    except Exception:
        items = []

    # ── Build labels: union the OCR boxes for each label's regions ────────────
    labels = []
    for item in items:
        if not isinstance(item, dict):
            continue
        label_text = item.get("label", "").strip()
        region_indices = item.get("regions", [])
        if not label_text or not isinstance(region_indices, list):
            continue

        boxes = [
            orig_boxes[idx]
            for idx in region_indices
            if isinstance(idx, int) and 0 <= idx < len(orig_boxes)
        ]
        if not boxes:
            continue

        ox1, oy1, ox2, oy2 = _union_boxes(boxes)
        labels.append({
            "label":  label_text,
            "x":      round(ox1 / img_w * 100, 3),
            "y":      round(oy1 / img_h * 100, 3),
            "width":  round((ox2 - ox1) / img_w * 100, 3),
            "height": round((oy2 - oy1) / img_h * 100, 3),
        })

    return {"labels": labels, "croppedImageBase64": working_b64, "model": used_model}


# ── Claude-only fallback (no PaddleOCR boxes available) ──────────────────────

def _claude_full_image_labels(image_b64: str, mime: str) -> dict:
    """
    Last resort: ask Claude to both localize and read labels from the full image.
    Less spatially accurate than the hybrid pipeline but always produces output.
    """
    client = get_anthropic()
    message, used_model = _create_message_with_fallback(
        client,
        max_tokens=2048,
        timeout=_CLAUDE_TIMEOUT,
        system=FULL_IMAGE_SYSTEM,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": mime, "data": image_b64}},
                {"type": "text", "text": FULL_IMAGE_USER},
            ],
        }],
    )
    raw = "".join(b.text for b in message.content if b.type == "text")
    try:
        labels = json.loads(_strip_fences(raw))
        if not isinstance(labels, list):
            labels = []
    except Exception:
        labels = []
    return {"labels": labels, "model": used_model}


# ── /flashcards endpoint ─────────────────────────────────────────────────────

@router.post("/flashcards")
async def generate_flashcards(body: GenerateBody, current_user=Depends(get_current_user)):
    if not body.imageBase64 or not body.setId:
        raise HTTPException(status_code=400, detail="imageBase64 and setId are required")
    if len(body.imageBase64) > _MAX_B64_BYTES:
        raise HTTPException(status_code=400, detail="Image too large (max 20 MB)")

    client = get_anthropic()

    extracted_text = (body.extractedText or "").strip()
    use_text = len(re.sub(r"\s+", "", extracted_text)) >= 80
    if use_text:
        content = FLASHCARD_TEXT_USER.format(text=extracted_text[:30000])
    else:
        mime = _detect_mime(body.imageBase64)
        content = [
            {"type": "image", "source": {"type": "base64", "media_type": mime, "data": body.imageBase64}},
            {"type": "text", "text": FLASHCARD_USER},
        ]

    message, used_model = _create_message_with_fallback(
        client,
        max_tokens=4096,
        timeout=_CLAUDE_TIMEOUT,
        system=FLASHCARD_SYSTEM,
        messages=[{
            "role": "user",
            "content": content,
        }],
    )

    raw = "".join(b.text for b in message.content if b.type == "text")
    try:
        cards = json.loads(_strip_fences(raw))
        if not isinstance(cards, list):
            cards = []
    except Exception:
        cards = []

    return {"cards": cards, "source": "text" if use_text else "vision", "model": used_model}
