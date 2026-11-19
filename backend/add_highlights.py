"""
Add home-page highlights to published blogs that don't have them yet.

    python add_highlights.py [slug ...]      # default: every published blog missing highlights
"""
import sys

from apps.blog.published_store import PublishedStore
from apps.blog.wix_import import build_highlights

slugs = sys.argv[1:] or [b["slug"] for b in PublishedStore.list()]
for slug in slugs:
    blog = PublishedStore.get(slug)
    if not blog or (blog.get("highlights") and len(sys.argv) == 1):
        continue
    blog["highlights"] = build_highlights(blog["title"], blog["content"])
    PublishedStore.save(blog)
    print(f"{slug}: {len(blog['highlights'])} highlights")
