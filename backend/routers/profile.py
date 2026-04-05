from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from lib.auth import get_current_user
from lib.supabase import get_admin_client

router = APIRouter(prefix="/profile", tags=["profile"])


class UpdateProfileBody(BaseModel):
    display_name: Optional[str] = None


@router.get("")
async def get_profile(current_user=Depends(get_current_user)):
    db = get_admin_client()

    profile_resp = db.table("profiles").select("*").eq("id", current_user.id).execute()
    profile = profile_resp.data[0] if profile_resp.data else {}

    sets_resp = db.table("sets").select("id").eq("owner_id", current_user.id).execute()
    sets_count = len(sets_resp.data or [])

    sessions_resp = (
        db.table("study_sessions").select("id").eq("user_id", current_user.id).execute()
    )
    session_ids = [s["id"] for s in (sessions_resp.data or [])]

    cards_studied = 0
    if session_ids:
        results_resp = (
            db.table("card_results")
            .select("id", count="exact")
            .in_("session_id", session_ids)
            .execute()
        )
        cards_studied = results_resp.count or 0

    return {
        **profile,
        "email": current_user.email,
        "sets_count": sets_count,
        "cards_studied": cards_studied,
    }


@router.patch("")
async def update_profile(body: UpdateProfileBody, current_user=Depends(get_current_user)):
    db = get_admin_client()

    updates: dict = {}
    if body.display_name is not None:
        updates["display_name"] = body.display_name.strip() or None

    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")

    resp = db.table("profiles").update(updates).eq("id", current_user.id).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Update failed")
    return resp.data[0]
