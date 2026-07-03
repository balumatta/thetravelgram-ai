import logging

import requests

logger = logging.getLogger(__name__)

WIX_BLOG_BASE_URL = "https://www.wixapis.com/blog/v3"
LIST_POSTS_LIMIT = 100


class WixAPIError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        super().__init__(f"Wix API error {status_code}: {message}")


class WixBlogClient:
    def __init__(self, api_key: str, site_id: str, account_id: str):
        self.api_key = api_key
        self.site_id = site_id
        self.account_id = account_id

    def _get_headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "wix-site-id": self.site_id,
            "Content-Type": "application/json",
        }

    def _handle_response(self, response: requests.Response) -> dict:
        if not response.ok:
            raise WixAPIError(response.status_code, response.text)
        return response.json()

    def list_posts(self, limit: int = LIST_POSTS_LIMIT, offset: int = 0) -> list[dict]:
        params = {
            "paging.limit": limit,
            "paging.offset": offset,
        }
        response = requests.get(
            f"{WIX_BLOG_BASE_URL}/posts",
            headers=self._get_headers(),
            params=params,
            timeout=30,
        )
        data = self._handle_response(response)
        return data.get("posts", [])

    def get_post(self, post_id: str) -> dict:
        params = {
            "fieldsToInclude": ["RICH_CONTENT", "CONTENT_TEXT"],
        }
        response = requests.get(
            f"{WIX_BLOG_BASE_URL}/posts/{post_id}",
            headers=self._get_headers(),
            params=params,
            timeout=30,
        )
        data = self._handle_response(response)
        return data.get("post", data)
