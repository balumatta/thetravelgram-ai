"""
Published blogs live in S3; drafts stay where the composer keeps them (sessions/blog.json).

    s3://$S3_BUCKET/published/<slug>/blog.json   ← the published blog document (private, served by the API)
    s3://$S3_BUCKET/media/<blog>/<file>          ← all media, drafts and published alike (public read)
    frontend/content/blogs/<slug>.json           ← same document, bundled into the static frontend build
"""
import json
import logging
import os
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from main.settings import BASE_DIR

logger = logging.getLogger(__name__)

# The frontend builds blog pages from these files, so the site can be hosted without the backend.
FRONTEND_BLOGS_DIR = os.path.join(BASE_DIR, "..", "frontend", "content", "blogs")

PUBLISHED_PREFIX = "published/"
MEDIA_PREFIX = "media/"


def _bucket() -> str:
    bucket = os.environ.get("S3_BUCKET")
    if not bucket:
        raise RuntimeError("S3_BUCKET is not set")
    return bucket


def _region() -> str:
    return os.environ.get("AWS_REGION", "ap-south-1")


def s3_client():
    # Default credential chain: access keys from .env locally, the ECS task role when deployed.
    return boto3.client("s3", region_name=_region())


def public_url(key: str) -> str:
    return f"https://{_bucket()}.s3.{_region()}.amazonaws.com/{key}"


def put_media(data: bytes, key: str, content_type: str) -> str:
    """Upload bytes under media/ and return the public URL."""
    if not key.startswith(MEDIA_PREFIX):
        key = MEDIA_PREFIX + key
    s3_client().put_object(Bucket=_bucket(), Key=key, Body=data, ContentType=content_type)
    return public_url(key)


class PublishedStore:
    @staticmethod
    def _key(slug: str) -> str:
        return f"{PUBLISHED_PREFIX}{slug}/blog.json"

    @staticmethod
    def save(blog: dict) -> str:
        slug = blog["slug"]
        s3_client().put_object(
            Bucket=_bucket(),
            Key=PublishedStore._key(slug),
            Body=json.dumps(blog, ensure_ascii=False, indent=2).encode("utf-8"),
            ContentType="application/json",
        )
        logger.info(f"Published blog saved: {slug}")
        PublishedStore.write_frontend_copy(blog)
        return PublishedStore._key(slug)

    @staticmethod
    def write_frontend_copy(blog: dict) -> Optional[str]:
        """Write the blog into the frontend repo (skipped where the frontend isn't checked out, e.g. ECS)."""
        frontend_root = os.path.normpath(os.path.join(FRONTEND_BLOGS_DIR, "..", ".."))
        if not os.path.isfile(os.path.join(frontend_root, "package.json")):
            return None
        os.makedirs(FRONTEND_BLOGS_DIR, exist_ok=True)
        path = os.path.join(FRONTEND_BLOGS_DIR, f"{blog['slug']}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(blog, f, ensure_ascii=False, indent=2)
        return path

    @staticmethod
    def sync_to_frontend() -> list[str]:
        """Pull every published blog from S3 into frontend/content/blogs."""
        return [PublishedStore.write_frontend_copy(PublishedStore.get(b["slug"])) for b in PublishedStore.list()]

    @staticmethod
    def get(slug: str) -> Optional[dict]:
        try:
            obj = s3_client().get_object(Bucket=_bucket(), Key=PublishedStore._key(slug))
        except ClientError as e:
            if e.response["Error"]["Code"] in ("NoSuchKey", "404"):
                return None
            raise
        return json.loads(obj["Body"].read())

    @staticmethod
    def list() -> list[dict]:
        """Summaries of every published blog, newest first."""
        s3 = s3_client()
        out = []
        for page in s3.get_paginator("list_objects_v2").paginate(Bucket=_bucket(), Prefix=PUBLISHED_PREFIX):
            for obj in page.get("Contents", []):
                if not obj["Key"].endswith("/blog.json"):
                    continue
                blog = json.loads(s3.get_object(Bucket=_bucket(), Key=obj["Key"])["Body"].read())
                out.append({k: blog.get(k) for k in ("slug", "title", "subtitle", "excerpt", "banner_url", "published_at", "updated_at")})
        return sorted(out, key=lambda b: b.get("published_at") or "", reverse=True)
