from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from lib.supabase import get_admin_client

router = APIRouter(prefix="/image", tags=["image"])


def _detect_mime(data: bytes) -> str:
    if data[0] == 0x89 and data[1] == 0x50:
        return "image/png"
    if data[0] == 0xFF and data[1] == 0xD8:
        return "image/jpeg"
    if data[0] == 0x52 and data[1] == 0x49:
        return "image/webp"
    if data[0] == 0x47 and data[1] == 0x49:
        return "image/gif"
    return "image/jpeg"


@router.get("")
async def proxy_image(path: str):
    if not path:
        raise HTTPException(status_code=400, detail="path is required")

    db = get_admin_client()
    try:
        data = db.storage.from_("card-images").download(path)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

    mime = _detect_mime(data[:4])
    return Response(
        content=data,
        media_type=mime,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )
