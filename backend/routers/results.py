from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional
from lib.auth import get_current_user
from lib.supabase import get_admin_client

router = APIRouter(prefix="/results", tags=["results"])


class ResultEntry(BaseModel):
    card_id: str
    grade: str  # correct | close | wrong | empty
    time_taken_ms: Optional[int] = None


class SubmitResultsBody(BaseModel):
    session_id: str
    results: list[ResultEntry]


@router.post("", status_code=204)
async def submit_results(body: SubmitResultsBody, current_user=Depends(get_current_user)):
    db = get_admin_client()

    session_resp = (
        db.table("study_sessions")
        .select("id, user_id")
        .eq("id", body.session_id)
        .execute()
    )
    if not session_resp.data or session_resp.data[0]["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    rows = [
        {
            "session_id": body.session_id,
            "card_id": r.card_id,
            "grade": r.grade,
            "time_taken_ms": r.time_taken_ms,
        }
        for r in body.results
    ]

    db.table("card_results").insert(rows).execute()

    db.table("study_sessions").update(
        {"completed_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", body.session_id).execute()

    return Response(status_code=204)
