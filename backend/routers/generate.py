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

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=256,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": mime, "data": image_b64}},
                {"type": "text", "text": (
                    "This is a lecture slide. Find the bounding box of the main diagram, "
                    "illustration, or figure — the graphical/visual content only. "
                    "Exclude slide titles, headings, bullet-point text, captions, and logos. "
                    "Return ONLY JSON: {\"x\": <0-100>, \"y\": <0-100>, \"width\": <0-100>, \"height\": <0-100>} "
                    "where all values are percentages of the image dimensions (x,y = top-left corner). "
                    "If there is no distinct diagram region, return null."
                )},
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


# ── /labels endpoint ──────────────────────────────────────────────────────────

@router.post("/labels")
async def generate_labels(body: GenerateBody, current_user=Depends(get_current_user)):
    if not body.imageBase64 or not body.setId:
        raise HTTPException(status_code=400, detail="imageBase64 and setId are required")

    mime = _detect_mime(body.imageBase64)
    image_bytes = base64.b64decode(body.imageBase64)
    pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    # ── Stage 0: Crop to the diagram region within the slide ─────────────────
    # Claude detects the bounding box of the illustration and we crop to it so
    # that slide titles, captions, and body text are excluded from OCR entirely.
    client = get_anthropic()
    pil_image, working_b64 = _extract_diagram_crop(pil_image, body.imageBase64, mime, client)
    working_mime = "image/jpeg"   # crop is always re-encoded as JPEG

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
        result = _claude_full_image_labels(working_b64, working_mime)
        result["croppedImageBase64"] = working_b64
        return result

    # ── Stage 2: Claude identifies complete labels and maps them to regions ─────
    #
    # We send the cropped diagram image plus every numbered crop.
    # Claude returns complete label texts and which region indices belong to each,
    # handling any OCR fragments that were split across multiple boxes.

    # Cap at 50 regions — beyond that we're likely picking up noise
    if len(orig_boxes) > 50:
        orig_boxes = orig_boxes[:50]
        padded_boxes = padded_boxes[:50]

    content: list = [
        {
            "type": "text",
            "text": (
                "Below is a medical/educational diagram followed by text regions "
                "extracted from it by an OCR detector (numbered from 0)."
            ),
        },
        {
            "type": "image",
            "source": {"type": "base64", "media_type": working_mime, "data": working_b64},
        },
    ]

    for i, (px1, py1, px2, py2) in enumerate(padded_boxes):
        content.append({"type": "text", "text": f"Region {i}:"})
        content.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/jpeg",
                "data": _crop_b64(pil_image, px1, py1, px2, py2),
            },
        })

    content.append({
        "type": "text",
        "text": (
            "Identify every text label that is part of the diagram itself — "
            "meaning labels pointing to or naming anatomical structures, components, or parts directly on the illustration. "
            "Ignore anything that is slide or document text: titles, headings, captions, footnotes, "
            "figure numbers, page numbers, copyright notices, or any body text that describes the diagram from outside it. "
            "A single label may be split across multiple regions — combine those fragments into the full label text. "
            "For each complete diagram label: "
            "(1) write the exact full text as it appears in the diagram, "
            "(2) list the region indices (0-based) whose crops contain parts of that label. "
            "Only include labels that correspond to at least one region. "
            'Return ONLY a JSON array, e.g. [{"label": "aortic semilunar valve (open)", "regions": [0, 1, 2]}]. '
            "No explanation, no markdown."
        ),
    })

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
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

    return {"labels": labels, "croppedImageBase64": working_b64}


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
