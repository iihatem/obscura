from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from lib.auth import get_current_user
from lib.supabase import get_admin_client

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("/history")
async def get_session_history(current_user=Depends(get_current_user)):
    db = get_admin_client()

    sessions_resp = (
        db.table("study_sessions")
        .select("id, set_id, mode, completed_at, sets(title)")
        .eq("user_id", current_user.id)
        .filter("completed_at", "not.is", "null")
        .order("completed_at", desc=True)
        .limit(10)
        .execute()
    )

    result = []
    for s in sessions_resp.data or []:
        results_resp = (
            db.table("card_results")
            .select("grade")
            .eq("session_id", s["id"])
            .execute()
        )
        grades = [r["grade"] for r in (results_resp.data or [])]
        total = len(grades)
        correct = sum(1 for g in grades if g in ("correct", "close"))
        score_pct = round(correct / total * 100) if total > 0 else 0

        sets_data = s.get("sets")
        set_title = (
            sets_data["title"] if isinstance(sets_data, dict)
            else sets_data[0]["title"] if isinstance(sets_data, list) and sets_data
            else "Unknown"
        )

        result.append({
            "id": s["id"],
            "set_id": s["set_id"],
            "set_title": set_title,
            "mode": s["mode"],
            "completed_at": s["completed_at"],
            "total_cards": total,
            "score_pct": score_pct,
        })

    return result


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
