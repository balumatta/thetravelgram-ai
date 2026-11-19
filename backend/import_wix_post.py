"""
Migrate a Wix blog export to our format and publish it to S3.

    python import_wix_post.py blog_data/<wix-post-id>.json [--dry-run] [--out path.json]

--dry-run still copies media and calls the AI, but writes the result only to --out (no publish).
Re-running keeps the existing AI sections; pass --rebuild-sections to regenerate them.
"""
import argparse
import json
import sys

from apps.blog.published_store import PublishedStore
from apps.blog.wix_import import import_wix_post


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--out")
    ap.add_argument("--rebuild-sections", action="store_true", help="ask the AI again even if this blog was imported before")
    args = ap.parse_args()

    post = json.load(open(args.file, encoding="utf-8"))
    slug = post.get("slug")
    previous = None if args.rebuild_sections or not slug else PublishedStore.get(slug)
    blog, warnings = import_wix_post(post, previous)

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(blog, f, ensure_ascii=False, indent=2)
    if not args.dry_run:
        print("published →", PublishedStore.save(blog))

    print(f"title: {blog['title']} | subtitle: {blog['subtitle']}")
    print("sections:", [(s["type"], len(next(v for k, v in s.items() if k != "type"))) for s in blog["sections"]])
    for w in warnings:
        print("note:", w)


if __name__ == "__main__":
    sys.exit(main())
