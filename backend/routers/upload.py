import base64
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from lib.auth import get_current_user
from lib.supabase import get_admin_client

router = APIRouter(prefix="/upload", tags=["upload"])


class UploadImageBody(BaseModel):
    dataUrl: str
    path: str


@router.post("/pdf")
async def render_pdf(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """Render each page of an uploaded PDF to a JPEG data URL using PyMuPDF."""
    content = await file.read()

    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise HTTPException(status_code=500, detail="PyMuPDF is not installed")

    try:
        doc = fitz.open(stream=content, filetype="pdf")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not open PDF: {e}")

    pages = []
    mat = fitz.Matrix(1.5, 1.5)  # 1.5x scale — matches original pdfjs setting

    for i in range(len(doc)):
        page = doc.load_page(i)
        extracted_text = page.get_text("text").strip()
        pix = page.get_pixmap(matrix=mat)
        img_bytes = pix.tobytes("jpeg")
        b64 = base64.b64encode(img_bytes).decode("utf-8")
        pages.append({
            "dataUrl": f"data:image/jpeg;base64,{b64}",
            "pageIndex": i,
            "extractedText": extracted_text,
        })

    doc.close()
    return {"pages": pages}


@router.post("/image")
async def upload_image(body: UploadImageBody, current_user=Depends(get_current_user)):
    """Upload a base64 data URL image to Supabase Storage."""
    if not body.dataUrl or not body.path:
        raise HTTPException(status_code=400, detail="dataUrl and path are required")

    if not body.path.startswith(f"{current_user.id}/"):
        raise HTTPException(status_code=403, detail="Forbidden")

    comma_idx = body.dataUrl.find(",")
    if comma_idx == -1:
        raise HTTPException(status_code=400, detail="Invalid dataUrl")

    header = body.dataUrl[:comma_idx]
    b64_data = body.dataUrl[comma_idx + 1:]
    mime_match = __import__("re").search(r":(.*?);", header)
    mime_type = mime_match.group(1) if mime_match else "image/jpeg"
    raw_bytes = base64.b64decode(b64_data)

    db = get_admin_client()
    bucket = db.storage.from_("card-images")

    try:
        bucket.upload(
            body.path,
            raw_bytes,
            {"content-type": mime_type, "upsert": "true"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    public_url = bucket.get_public_url(body.path)
    return {"publicUrl": public_url}
