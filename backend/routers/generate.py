import os
import base64
import io
import json
import re
import numpy as np
from PIL import Image
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from anthropic import Anthropic
from lib.auth import get_current_user

# Skip PaddleOCR's network connectivity check on every init
os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")

router = APIRouter(prefix="/generate", tags=["generate"])

# ── Singletons ────────────────────────────────────────────────────────────────

_anthropic: Anthropic | None = None


def get_anthropic() -> Anthropic:
    global _anthropic
    if _anthropic is None:
        _anthropic = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    return _anthropic


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
            lang="en",
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


# ── Schema ────────────────────────────────────────────────────────────────────

class GenerateBody(BaseModel):
    imageBase64: str
    setId: str


# ── /labels endpoint ──────────────────────────────────────────────────────────

@router.post("/labels")
async def generate_labels(body: GenerateBody, current_user=Depends(get_current_user)):
    if not body.imageBase64 or not body.setId:
        raise HTTPException(status_code=400, detail="imageBase64 and setId are required")

    mime = _detect_mime(body.imageBase64)
    image_bytes = base64.b64decode(body.imageBase64)
    pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_w, img_h = pil_image.size
    img_array = np.array(pil_image)

    # ── Stage 1: PaddleOCR — pixel-precise text region detection ─────────────
    orig_boxes: list[tuple[int, int, int, int]] = []   # (x1,y1,x2,y2) no padding
    padded_boxes: list[tuple[int, int, int, int]] = []  # (x1,y1,x2,y2) with padding

    ocr = get_paddle_ocr()
    if ocr is not None:
        try:
            results = list(ocr.predict(img_array))
            if results:
                r = results[0]
                polys: list = r.get("dt_polys", []) or []
                for poly in polys:
                    poly_arr = np.array(poly, dtype=float)
                    if poly_arr.shape != (4, 2):
                        continue
                    orig, padded = _poly_to_bbox(poly_arr, img_w, img_h, pad=3)
                    ox1, oy1, ox2, oy2 = orig
                    # Skip degenerate boxes
                    if (ox2 - ox1) < 4 or (oy2 - oy1) < 4:
                        continue
                    orig_boxes.append(orig)
                    padded_boxes.append(padded)
        except Exception as e:
            print(f"[generate] PaddleOCR predict failed: {e}")

    # ── Fallback: no boxes detected — let Claude do full-image localization ───
    if not orig_boxes:
        return _claude_full_image_labels(body.imageBase64, mime)

    # ── Stage 2: Claude reads text from each crop (single API call) ───────────
    #
    # We send the original image for context, followed by each numbered crop.
    # Claude returns a JSON array of strings (one per crop, null if unreadable).
    # This eliminates Claude's spatial-estimation weakness entirely.

    # Cap at 50 regions — more usually means noise on a typical diagram
    if len(orig_boxes) > 50:
        orig_boxes = orig_boxes[:50]
        padded_boxes = padded_boxes[:50]

    content: list = [
        {
            "type": "text",
            "text": (
                "Below is a medical/educational diagram followed by cropped regions "
                "extracted from it by a text detector."
            ),
        },
        {
            "type": "image",
            "source": {"type": "base64", "media_type": mime, "data": body.imageBase64},
        },
    ]

    for i, (px1, py1, px2, py2) in enumerate(padded_boxes):
        content.append({"type": "text", "text": f"Region {i + 1}:"})
        content.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/jpeg",
                "data": _crop_b64(pil_image, px1, py1, px2, py2),
            },
        })

    n = len(orig_boxes)
    content.append({
        "type": "text",
        "text": (
            f"For each of the {n} numbered regions above, provide the exact text label shown "
            "in that cropped image. Use the full diagram for context when a crop is ambiguous. "
            f"Return ONLY a JSON array of {n} strings in order. "
            "Use null for any region that contains no readable text or is a non-text element. "
            "No explanation, no markdown."
        ),
    })

    client = get_anthropic()
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": content}],
    )

    raw = "".join(b.text for b in message.content if b.type == "text")
    try:
        texts: list = json.loads(_strip_fences(raw))
        if not isinstance(texts, list):
            texts = []
    except Exception:
        texts = []

    # ── Merge: PaddleOCR boxes + Claude text ─────────────────────────────────
    labels = []
    for i, (ox1, oy1, ox2, oy2) in enumerate(orig_boxes):
        text = texts[i] if i < len(texts) else None
        if not text or not isinstance(text, str) or not text.strip():
            continue
        labels.append({
            "label": text.strip(),
            "x":      round(ox1 / img_w * 100, 3),
            "y":      round(oy1 / img_h * 100, 3),
            "width":  round((ox2 - ox1) / img_w * 100, 3),
            "height": round((oy2 - oy1) / img_h * 100, 3),
        })

    return {"labels": labels}


# ── Claude-only fallback (no PaddleOCR boxes available) ──────────────────────

def _claude_full_image_labels(image_b64: str, mime: str) -> dict:
    """
    Last resort: ask Claude to both localize and read labels from the full image.
    Less spatially accurate than the hybrid pipeline but always produces output.
    """
    client = get_anthropic()
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=(
            "You analyze educational diagrams and return the exact location of every text label.\n"
            "Return ONLY a raw JSON array — no markdown fences, no explanation.\n"
            "Each element: {label, x, y, width, height} where coordinates are percentages "
            "of image dimensions (0–100). x, y = top-left corner. "
            "Cover each label tightly with ~0.5% padding per side."
        ),
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": mime, "data": image_b64}},
                {"type": "text", "text": "Return all text label locations as JSON."},
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
    return {"labels": labels}


# ── /flashcards endpoint (unchanged) ─────────────────────────────────────────

@router.post("/flashcards")
async def generate_flashcards(body: GenerateBody, current_user=Depends(get_current_user)):
    if not body.imageBase64 or not body.setId:
        raise HTTPException(status_code=400, detail="imageBase64 and setId are required")

    mime = _detect_mime(body.imageBase64)
    client = get_anthropic()

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=(
            "You are a medical education assistant. Extract high-yield facts from this page and generate "
            "flashcard Q&A pairs. Return ONLY a raw JSON array, no markdown. "
            "Each element: {front: string, back: string}. Front should be a specific question. "
            "Back should be a concise answer. Generate between 3-8 cards per page depending on content density. "
            "Focus on facts a student would need to memorize."
        ),
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": mime, "data": body.imageBase64}},
                {"type": "text", "text": "Generate flashcard Q&A pairs from this page."},
            ],
        }],
    )

    raw = "".join(b.text for b in message.content if b.type == "text")
    try:
        cards = json.loads(_strip_fences(raw))
        if not isinstance(cards, list):
            cards = []
    except Exception:
        cards = []

    return {"cards": cards}
