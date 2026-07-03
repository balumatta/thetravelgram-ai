import json
import logging
import os
from datetime import datetime, timezone

from helpers.wix import LIST_POSTS_LIMIT, WixBlogClient
from main.settings import BASE_DIR, WIX_ACCOUNT_ID, WIX_API_KEY, WIX_SITE_ID

logger = logging.getLogger(__name__)

BLOG_DATA_DIR = os.path.join(BASE_DIR, "blog_data")


class BlogService:
    def __init__(self):
        self.client = WixBlogClient(
            api_key=WIX_API_KEY,
            site_id=WIX_SITE_ID,
            account_id=WIX_ACCOUNT_ID,
        )
        os.makedirs(BLOG_DATA_DIR, exist_ok=True)

    def _fetch_all_post_ids(self) -> list[str]:
        post_ids = []
        offset = 0

        while True:
            posts = self.client.list_posts(limit=LIST_POSTS_LIMIT, offset=offset)
            if not posts:
                break
            post_ids.extend(post["id"] for post in posts if post.get("id"))
            if len(posts) < LIST_POSTS_LIMIT:
                break
            offset += LIST_POSTS_LIMIT

        logger.info(f"Found {len(post_ids)} posts")
        return post_ids

    def _store_post(self, post: dict) -> str:
        post_id = post["id"]
        post["fetched_at"] = datetime.now(timezone.utc).isoformat()
        file_path = os.path.join(BLOG_DATA_DIR, f"{post_id}.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(post, f, ensure_ascii=False, indent=2)
        logger.info(f"Stored post {post_id}")
        return file_path

    def sync_all_posts(self) -> dict:
        logger.info("Starting full blog sync from Wix")
        post_ids = self._fetch_all_post_ids()
        stored, failed = [], []

        for post_id in post_ids:
            try:
                post = self.client.get_post(post_id)
                self._store_post(post)
                stored.append(post_id)
            except Exception as e:
                logger.error(f"Failed to sync post {post_id}: {e}")
                failed.append(post_id)

        logger.info(f"Sync complete: {len(stored)} synced, {len(failed)} failed")
        return {"synced": len(stored), "failed": len(failed), "post_ids": stored, "failed_ids": failed}

    def sync_post(self, post_id: str) -> dict:
        logger.info(f"Syncing post: {post_id}")
        post = self.client.get_post(post_id)
        file_path = self._store_post(post)
        return {"post_id": post_id, "file_path": file_path}

    def list_stored_posts(self) -> list[dict]:
        posts = []
        for filename in os.listdir(BLOG_DATA_DIR):
            if not filename.endswith(".json"):
                continue
            try:
                with open(os.path.join(BLOG_DATA_DIR, filename), "r", encoding="utf-8") as f:
                    data = json.load(f)
                posts.append({
                    "id": data.get("id"),
                    "title": data.get("title"),
                    "slug": data.get("slug"),
                    "firstPublishedDate": data.get("firstPublishedDate"),
                    "fetched_at": data.get("fetched_at"),
                })
            except Exception as e:
                logger.error(f"Failed to read {filename}: {e}")
        return posts

    def get_stored_post(self, post_id: str) -> dict:
        file_path = os.path.join(BLOG_DATA_DIR, f"{post_id}.json")
        if not os.path.isfile(file_path):
            raise FileNotFoundError(f"No stored post found for id: {post_id}")
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    service = BlogService()
    result = service.sync_all_posts()
    print(json.dumps(result, indent=2))
