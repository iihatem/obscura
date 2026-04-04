from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional
from lib.auth import get_current_user
from lib.supabase import get_admin_client

router = APIRouter(prefix="/sets", tags=["sets"])


class CreateSetBody(BaseModel):
    title: str
    description: Optional[str] = None
    subject: Optional[str] = None
    visibility: str = "private"


class UpdateSetBody(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    subject: Optional[str] = None
    visibility: Optional[str] = None


@router.get("")
async def list_sets(current_user=Depends(get_current_user)):
    db = get_admin_client()
    resp = (
        db.table("sets")
        .select("*")
        .eq("owner_id", current_user.id)
        .order("updated_at", desc=True)
        .execute()
    )
    return resp.data


@router.post("", status_code=201)
async def create_set(body: CreateSetBody, current_user=Depends(get_current_user)):
    if not body.title.strip():
        raise HTTPException(status_code=400, detail="Title is required")

    db = get_admin_client()
    resp = (
        db.table("sets")
        .insert(
            {
                "owner_id": current_user.id,
                "title": body.title.strip(),
                "description": body.description.strip() if body.description else None,
                "subject": body.subject.strip() if body.subject else None,
                "visibility": body.visibility,
            }
        )
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to create set")
    return resp.data[0]


@router.get("/share/{token}")
async def get_set_by_share_token(token: str):
    """Public endpoint — no auth required. Returns set + cards for link/public sets."""
    db = get_admin_client()

    set_resp = (
        db.table("sets")
        .select("*, profiles!owner_id(display_name)")
        .eq("share_token", token)
        .in_("visibility", ["link", "public"])
        .execute()
    )
    if not set_resp.data:
        raise HTTPException(status_code=404, detail="Set not found")

    s = set_resp.data[0]
    profiles = s.pop("profiles", None) or {}
    owner_display_name = profiles.get("display_name") if isinstance(profiles, dict) else None

    cards_resp = (
        db.table("cards")
        .select("*")
        .eq("set_id", s["id"])
        .order("position", desc=False)
        .execute()
    )
    return {"set": {**s, "owner_display_name": owner_display_name}, "cards": cards_resp.data or []}


@router.get("/{set_id}")
async def get_set(set_id: str, current_user=Depends(get_current_user)):
    db = get_admin_client()

    set_resp = db.table("sets").select("*").eq("id", set_id).execute()
    if not set_resp.data:
        raise HTTPException(status_code=404, detail="Not found")

    s = set_resp.data[0]
    if s["owner_id"] != current_user.id and s["visibility"] == "private":
        raise HTTPException(status_code=403, detail="Forbidden")

    cards_resp = (
        db.table("cards")
        .select("*")
        .eq("set_id", set_id)
        .order("position", desc=False)
        .execute()
    )
    return {"set": s, "cards": cards_resp.data or []}


@router.patch("/{set_id}")
async def update_set(
    set_id: str, body: UpdateSetBody, current_user=Depends(get_current_user)
):
    db = get_admin_client()

    owner_resp = db.table("sets").select("owner_id").eq("id", set_id).execute()
    if not owner_resp.data or owner_resp.data[0]["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    if body.title is not None and not body.title.strip():
        raise HTTPException(status_code=400, detail="Title cannot be empty")

    updates = {}
    if body.title is not None:
        updates["title"] = body.title.strip()
    if body.description is not None:
        updates["description"] = body.description.strip() or None
    if body.subject is not None:
        updates["subject"] = body.subject.strip() or None
    if body.visibility is not None:
        updates["visibility"] = body.visibility

    resp = db.table("sets").update(updates).eq("id", set_id).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Update failed")
    return resp.data[0]


@router.delete("/{set_id}", status_code=204)
async def delete_set(set_id: str, current_user=Depends(get_current_user)):
    db = get_admin_client()

    owner_resp = db.table("sets").select("owner_id").eq("id", set_id).execute()
    if not owner_resp.data or owner_resp.data[0]["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    db.table("sets").delete().eq("id", set_id).execute()
    return Response(status_code=204)


@router.post("/{set_id}/fork", status_code=201)
async def fork_set(set_id: str, current_user=Depends(get_current_user)):
    db = get_admin_client()

    orig_resp = db.table("sets").select("*").eq("id", set_id).execute()
    if not orig_resp.data:
        raise HTTPException(status_code=404, detail="Set not found")

    orig = orig_resp.data[0]
    if orig["owner_id"] != current_user.id and orig["visibility"] == "private":
        raise HTTPException(status_code=403, detail="Forbidden")

    # Create the forked set record
    new_set_resp = (
        db.table("sets")
        .insert(
            {
                "owner_id": current_user.id,
                "title": orig["title"],
                "description": orig["description"],
                "subject": orig["subject"],
                "visibility": "private",
                "forked_from": set_id,
            }
        )
        .execute()
    )
    if not new_set_resp.data:
        raise HTTPException(status_code=500, detail="Failed to fork set")

    new_set_id = new_set_resp.data[0]["id"]

    # Duplicate all cards — image_url refs are kept as-is (publicly readable)
    cards_resp = (
        db.table("cards")
        .select("*")
        .eq("set_id", set_id)
        .order("position", desc=False)
        .execute()
    )
    if cards_resp.data:
        new_cards = []
        for card in cards_resp.data:
            new_card: dict = {
                "set_id": new_set_id,
                "type": card["type"],
                "position": card["position"],
            }
            if card["type"] == "flashcard":
                new_card["front"] = card["front"]
                new_card["back"] = card["back"]
            else:
                new_card["image_url"] = card["image_url"]
                new_card["labels"] = card["labels"]
            new_cards.append(new_card)
        db.table("cards").insert(new_cards).execute()

    return {"new_set_id": new_set_id}


@router.get("/{set_id}/star")
async def get_star(set_id: str, current_user=Depends(get_current_user)):
    db = get_admin_client()

    star_resp = (
        db.table("set_stars")
        .select("set_id")
        .eq("user_id", current_user.id)
        .eq("set_id", set_id)
        .execute()
    )
    starred = bool(star_resp.data)

    count_resp = db.table("sets").select("star_count").eq("id", set_id).execute()
    count = count_resp.data[0]["star_count"] if count_resp.data else 0

    return {"starred": starred, "count": count}


@router.post("/{set_id}/star")
async def toggle_star(set_id: str, current_user=Depends(get_current_user)):
    db = get_admin_client()

    # Verify the set exists and is accessible
    set_resp = db.table("sets").select("id, owner_id, visibility, star_count").eq("id", set_id).execute()
    if not set_resp.data:
        raise HTTPException(status_code=404, detail="Set not found")
    s = set_resp.data[0]
    if s["owner_id"] != current_user.id and s["visibility"] == "private":
        raise HTTPException(status_code=403, detail="Forbidden")

    star_resp = (
        db.table("set_stars")
        .select("set_id")
        .eq("user_id", current_user.id)
        .eq("set_id", set_id)
        .execute()
    )

    if star_resp.data:
        db.table("set_stars").delete().eq("user_id", current_user.id).eq("set_id", set_id).execute()
        starred = False
    else:
        db.table("set_stars").insert({"user_id": current_user.id, "set_id": set_id}).execute()
        starred = True

    # Re-fetch star_count (trigger has updated it)
    count_resp = db.table("sets").select("star_count").eq("id", set_id).execute()
    count = count_resp.data[0]["star_count"] if count_resp.data else 0

    return {"starred": starred, "count": count}
