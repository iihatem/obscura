from fastapi import APIRouter, Depends
from lib.auth import get_current_user
from lib.supabase import get_admin_client

router = APIRouter(prefix="/explore", tags=["explore"])


@router.get("")
async def list_public_sets(current_user=Depends(get_current_user)):
    db = get_admin_client()

    resp = (
        db.table("sets")
        .select("*, profiles!owner_id(display_name)")
        .eq("visibility", "public")
        .order("star_count", desc=True)
        .limit(50)
        .execute()
    )

    sets = resp.data or []

    # Collect set ids to check which ones the current user has starred
    set_ids = [s["id"] for s in sets]
    starred_ids: set[str] = set()
    if set_ids:
        stars_resp = (
            db.table("set_stars")
            .select("set_id")
            .eq("user_id", current_user.id)
            .in_("set_id", set_ids)
            .execute()
        )
        starred_ids = {row["set_id"] for row in (stars_resp.data or [])}

    # Fetch first diagram card image per set for thumbnails
    thumb_map: dict[str, str] = {}
    if set_ids:
        cards_resp = (
            db.table("cards")
            .select("set_id, image_url")
            .in_("set_id", set_ids)
            .eq("type", "diagram")
            .order("position", desc=False)
            .execute()
        )
        for card in cards_resp.data or []:
            if card.get("image_url") and card["set_id"] not in thumb_map:
                thumb_map[card["set_id"]] = card["image_url"]

    # Flatten the profiles join and attach star state
    result = []
    for s in sets:
        profiles = s.pop("profiles", None) or {}
        display_name = profiles.get("display_name") if isinstance(profiles, dict) else None
        result.append(
            {
                **s,
                "owner_display_name": display_name,
                "starred_by_me": s["id"] in starred_ids,
                "thumbnail_url": thumb_map.get(s["id"]),
            }
        )

    return result
