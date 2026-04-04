from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from lib.auth import get_current_user
from lib.supabase import get_admin_client

router = APIRouter(prefix="/sessions", tags=["sessions"])


class CreateSessionBody(BaseModel):
    set_id: str
    mode: str


@router.post("", status_code=201)
async def create_session(body: CreateSessionBody, current_user=Depends(get_current_user)):
    if body.mode not in ("flashcard", "diagram", "mixed"):
        raise HTTPException(status_code=400, detail="Invalid mode")

    db = get_admin_client()

    set_resp = (
        db.table("sets")
        .select("id, owner_id, visibility")
        .eq("id", body.set_id)
        .execute()
    )
    if not set_resp.data:
        raise HTTPException(status_code=404, detail="Set not found")

    s = set_resp.data[0]
    if s["owner_id"] != current_user.id and s["visibility"] == "private":
        raise HTTPException(status_code=403, detail="Forbidden")

    resp = (
        db.table("study_sessions")
        .insert({"user_id": current_user.id, "set_id": body.set_id, "mode": body.mode})
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to create session")
    return resp.data[0]
