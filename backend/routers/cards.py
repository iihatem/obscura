from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional, Any
from lib.auth import get_current_user
from lib.supabase import get_admin_client

router = APIRouter(prefix="/cards", tags=["cards"])


class CreateCardBody(BaseModel):
    set_id: str
    type: str
    front: Optional[str] = None
    back: Optional[str] = None
    image_url: Optional[str] = None
    labels: Optional[list[Any]] = None


class UpdateCardBody(BaseModel):
    front: Optional[str] = None
    back: Optional[str] = None
    image_url: Optional[str] = None
    labels: Optional[list[Any]] = None
    position: Optional[int] = None


def _resolve_owner(db, card_id: str, user_id: str):
    resp = (
        db.table("cards")
        .select("id, set_id, sets!inner(owner_id)")
        .eq("id", card_id)
        .execute()
    )
    if not resp.data:
        return None
    card = resp.data[0]
    sets = card.get("sets", {})
    owner_id = sets[0]["owner_id"] if isinstance(sets, list) else sets.get("owner_id")
    if owner_id != user_id:
        return None
    return card


@router.post("", status_code=201)
async def create_card(body: CreateCardBody, current_user=Depends(get_current_user)):
    db = get_admin_client()

    if body.type not in ("flashcard", "diagram"):
        raise HTTPException(status_code=400, detail="Invalid type")

    set_resp = db.table("sets").select("owner_id").eq("id", body.set_id).execute()
    if not set_resp.data or set_resp.data[0]["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Next position
    pos_resp = (
        db.table("cards")
        .select("position")
        .eq("set_id", body.set_id)
        .eq("type", body.type)
        .order("position", desc=True)
        .limit(1)
        .execute()
    )
    position = (pos_resp.data[0]["position"] + 1) if pos_resp.data else 0

    insert: dict = {"set_id": body.set_id, "type": body.type, "position": position}
    if body.type == "flashcard":
        if not body.front or not body.front.strip() or not body.back or not body.back.strip():
            raise HTTPException(status_code=400, detail="Front and back are required")
        insert["front"] = body.front.strip()
        insert["back"] = body.back.strip()
    else:
        if not body.image_url:
            raise HTTPException(status_code=400, detail="image_url is required for diagram cards")
        insert["image_url"] = body.image_url
        insert["labels"] = body.labels or []

    resp = db.table("cards").insert(insert).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to create card")
    return resp.data[0]


@router.patch("/{card_id}")
async def update_card(
    card_id: str, body: UpdateCardBody, current_user=Depends(get_current_user)
):
    db = get_admin_client()

    if not _resolve_owner(db, card_id, current_user.id):
        raise HTTPException(status_code=403, detail="Forbidden")

    updates = {}
    if body.front is not None:
        updates["front"] = body.front.strip() or None
    if body.back is not None:
        updates["back"] = body.back.strip() or None
    if body.image_url is not None:
        updates["image_url"] = body.image_url
    if body.labels is not None:
        updates["labels"] = body.labels
    if body.position is not None:
        updates["position"] = body.position

    resp = db.table("cards").update(updates).eq("id", card_id).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Update failed")
    return resp.data[0]


@router.delete("/{card_id}", status_code=204)
async def delete_card(card_id: str, current_user=Depends(get_current_user)):
    db = get_admin_client()

    if not _resolve_owner(db, card_id, current_user.id):
        raise HTTPException(status_code=403, detail="Forbidden")

    db.table("cards").delete().eq("id", card_id).execute()
    return Response(status_code=204)
