import json
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from main.settings import BASE_DIR

BLOG_FILE = os.path.join(BASE_DIR, "sessions", "blog.json")


def _extract_title(content: str) -> str:
    for line in content.split("\n"):
        stripped = line.strip()
        if stripped.startswith("# "):
            return stripped[2:].strip()
    return "My Travel Blog"


def _extract_meta(content: str) -> dict:
    """Extract destination and dates hints from first few lines."""
    lines = content.split("\n")[:20]
    text = " ".join(lines)
    return {"excerpt": text[:300].strip()}


class BlogStore:
    @staticmethod
    def save(content: str, interview_context: list[dict]) -> dict:
        os.makedirs(os.path.dirname(BLOG_FILE), exist_ok=True)
        existing = BlogStore.load()
        now = datetime.now(timezone.utc).isoformat()
        data = {
            "id": existing.get("id") if existing else uuid.uuid4().hex[:12],
            "title": existing.get("title") or _extract_title(content) if existing else _extract_title(content),
            "banner_url": existing.get("banner_url", "") if existing else "",
            "theme": existing.get("theme", "warm") if existing else "warm",
            "content": content,
            "content_format": "markdown",
            "interview_context": interview_context,
            "created_at": existing["created_at"] if existing else now,
            "updated_at": now,
            **_extract_meta(content),
        }
        with open(BLOG_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return data

    @staticmethod
    def load() -> Optional[dict]:
        if not os.path.isfile(BLOG_FILE):
            return None
        with open(BLOG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def save_sections(sections: list, title: str, subtitle: str) -> Optional[dict]:
        data = BlogStore.load()
        if data is None:
            return None
        data["sections"] = sections
        if title:
            data["title"] = title
        if subtitle:
            data["subtitle"] = subtitle
        data["content_format"] = "structured"
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        with open(BLOG_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return data

    @staticmethod
    def update(payload: dict) -> Optional[dict]:
        data = BlogStore.load()
        if data is None:
            return None
        allowed = {"content", "content_format", "title", "subtitle", "banner_url", "theme", "sections"}
        for key in allowed:
            if key in payload:
                data[key] = payload[key]
        # Auto-derive title from content if not explicitly set
        if "content" in payload and "title" not in payload:
            data["title"] = _extract_title(payload["content"])
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        with open(BLOG_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return data

    @staticmethod
    def delete() -> bool:
        if os.path.isfile(BLOG_FILE):
            os.remove(BLOG_FILE)
            return True
        return False

    @staticmethod
    def exists() -> bool:
        return os.path.isfile(BLOG_FILE)
