from datetime import datetime, timezone

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from apps.blog.published_store import PublishedStore

api_router = APIRouter()


async def list_published():
    return {"blogs": PublishedStore.list()}


async def get_published(slug: str):
    blog = PublishedStore.get(slug)
    if not blog:
        return JSONResponse({"error": "Not found"}, status_code=404)
    return blog


EDITABLE = {"title", "subtitle", "banner_url", "content", "sections"}


async def update_published(slug: str, request: Request):
    """Save edits to a published blog: S3 published/<slug>/blog.json and the frontend copy."""
    blog = PublishedStore.get(slug)
    if not blog:
        return JSONResponse({"error": "Not found"}, status_code=404)
    body = await request.json()
    changes = {k: v for k, v in body.items() if k in EDITABLE}
    if not changes:
        return JSONResponse({"error": "Nothing to update"}, status_code=400)
    blog.update(changes)
    blog["content_format"] = "rich"
    blog["updated_at"] = datetime.now(timezone.utc).isoformat()
    PublishedStore.save(blog)
    return {"success": True, "updated_at": blog["updated_at"]}


api_router.add_api_route("/api/blogs/published", list_published, methods=["GET"])
api_router.add_api_route("/api/blogs/published/{slug}", get_published, methods=["GET"])
api_router.add_api_route("/api/blogs/published/{slug}", update_published, methods=["PUT"])
