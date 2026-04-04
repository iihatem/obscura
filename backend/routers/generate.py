import os
import base64
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from anthropic import Anthropic
from lib.auth import get_current_user

router = APIRouter(prefix="/generate", tags=["generate"])

_anthropic: Anthropic | None = None


def get_anthropic() -> Anthropic:
    global _anthropic
    if _anthropic is None:
        _anthropic = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    return _anthropic


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
    import re
    return re.sub(r"^```(?:json)?\s*", "", text.strip(), flags=re.IGNORECASE).rstrip("` \n")


class GenerateBody(BaseModel):
    imageBase64: str
    setId: str


@router.post("/labels")
async def generate_labels(body: GenerateBody, current_user=Depends(get_current_user)):
    if not body.imageBase64 or not body.setId:
        raise HTTPException(status_code=400, detail="imageBase64 and setId are required")

    mime = _detect_mime(body.imageBase64)
    client = get_anthropic()

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=(
            "You analyze educational diagrams and locate all visible text labels. "
            "Return ONLY a raw JSON array, no markdown. "
            "Each element: {label, x, y, width, height} as percentages of image dimensions. "
            "x,y = top-left of bounding box. Add generous padding (1-2%) so boxes fully cover labels. "
            "Include every visible text label."
        ),
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": mime, "data": body.imageBase64},
                    },
                    {"type": "text", "text": "Identify and return all text labels in this diagram as JSON."},
                ],
            }
        ],
    )

    raw = "".join(b.text for b in message.content if b.type == "text")
    try:
        import json
        labels = json.loads(_strip_fences(raw))
        if not isinstance(labels, list):
            labels = []
    except Exception:
        labels = []

    return {"labels": labels}


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
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": mime, "data": body.imageBase64},
                    },
                    {"type": "text", "text": "Generate flashcard Q&A pairs from this page."},
                ],
            }
        ],
    )

    raw = "".join(b.text for b in message.content if b.type == "text")
    try:
        import json
        cards = json.loads(_strip_fences(raw))
        if not isinstance(cards, list):
            cards = []
    except Exception:
        cards = []

    return {"cards": cards}
