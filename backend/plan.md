# Wix Blog Integration Plan

## Overview

Fetch blog posts from a Wix site using the Wix Blog REST API v3, preserve full rich content (code blocks, bold, italic, headings, images, etc.), and store each post as a JSON file on disk keyed by post ID. Always re-fetch replaces existing files. Data is used as LLM feed — no API endpoints needed.

---

## Wix Blog API Summary

### Base URL
```
https://www.wixapis.com/blog/v3
```

### Authentication (API Key)
```
Authorization: <WIX_API_KEY>
wix-site-id: <WIX_SITE_ID>
Content-Type: application/json
```

### Endpoints Used

| Endpoint | Method | Purpose |
|---|---|---|
| `/posts` | GET | List all published posts (paginated, up to 100/page) |
| `/posts/{postId}` | GET | Get a single post with full rich content |

### Key Query Parameters
- `fieldsToInclude`: `RICH_CONTENT`, `CONTENT_TEXT`
- `paging.limit`: max 100
- `paging.offset`: for pagination

### Rich Content (`richContent`)
Posts are stored in **Ricos Document** format — a structured JSON with `nodes[]` array. Node types include:
- `PARAGRAPH` — wraps `TEXT` nodes
- `HEADING` — h1–h6 with `headingData.level`
- `TEXT` — with `textData.decorations` for bold/italic/underline/code
- `CODE_BLOCK` — code with language info
- `IMAGE` — Wix media images
- `LIST` / `LIST_ITEM` — ordered/unordered lists
- `BLOCKQUOTE` — quotes

**Important**: List endpoint doesn't reliably return `richContent`. Strategy: list posts for IDs/metadata → get each post individually with `fieldsToInclude=RICH_CONTENT`.

---

## New Env Variables Required

Add to `.env`:
```
WIX_API_KEY=<your_api_key>
WIX_SITE_ID=<your_site_id>
WIX_ACCOUNT_ID=<your_account_id>
```

Add to `main/settings.py`:
```python
WIX_API_KEY = os.getenv("WIX_API_KEY", "").strip()
WIX_SITE_ID = os.getenv("WIX_SITE_ID", "").strip()
WIX_ACCOUNT_ID = os.getenv("WIX_ACCOUNT_ID", "").strip()
```

---

## Files to Create / Modify

### 1. `backend/helpers/wix.py` — Wix API Client (class-based)

```
class WixBlogClient:
    - __init__(api_key, site_id, account_id)
    - _get_headers() -> dict
    - _list_posts(limit, offset) -> dict            # raw API call, metadata only
    - _get_post_with_content(post_id) -> dict       # raw API call, RICH_CONTENT + CONTENT_TEXT
    - fetch_all_post_ids() -> list[str]             # paginates, returns all post IDs
    - fetch_and_store_all() -> dict                 # main entry point: fetch + save all
    - fetch_and_store_post(post_id) -> str          # fetch one post + save, return file path
```

### 2. `backend/apps/blog/__init__.py` — empty package init

### 3. `backend/apps/blog/service.py` — Blog service (orchestration layer)

```
class BlogService:
    - __init__()                                    # instantiates WixBlogClient from settings
    - sync_all_posts() -> dict                      # calls fetch_and_store_all, returns summary
    - sync_post(post_id: str) -> dict               # syncs a single post
    - list_stored_posts() -> list[dict]             # scans blog_data/, returns id+title per file
    - get_stored_post(post_id: str) -> dict         # reads blog_data/<post_id>.json
```

### 4. `backend/blog_data/` — directory for JSON files (already exists)

Each file: `blog_data/<post_id>.json`

---

## Data Storage Format (per post JSON)

```json
{
  "id": "abc123",
  "title": "My Blog Post",
  "slug": "my-blog-post",
  "url": "https://...",
  "excerpt": "...",
  "coverMedia": {},
  "author": {},
  "firstPublishedDate": "2024-01-01T00:00:00Z",
  "lastPublishedDate": "2024-01-02T00:00:00Z",
  "tags": [],
  "categories": [],
  "contentText": "plain text version",
  "richContent": {
    "nodes": [
      {
        "type": "HEADING",
        "headingData": {"level": 2},
        "nodes": [{"type": "TEXT", "textData": {"text": "Hello", "decorations": []}}]
      },
      {
        "type": "CODE_BLOCK",
        "codeBlockData": {"language": "python"},
        "nodes": [{"type": "TEXT", "textData": {"text": "print('hi')"}}]
      }
    ]
  },
  "fetched_at": "2026-07-03T10:00:00Z"
}
```

---

## Flow

```
BlogService.sync_all_posts()
  → WixBlogClient.fetch_all_post_ids()        # GET /posts paginated, collect all IDs
  → for each post_id:
      WixBlogClient._get_post_with_content()  # GET /posts/{id}?fieldsToInclude=RICH_CONTENT,CONTENT_TEXT
      save to blog_data/<post_id>.json        # always overwrite
  → return { "synced": N, "post_ids": [...] }
```

---

## Decisions & Notes

1. **Always replace**: `open(path, 'w')` — no existence check, always overwrites.
2. **Rich content per post**: Call `GET /posts/{id}` individually — more reliable than list for `richContent`.
3. **No DB, no API endpoints**: Pure service + file-based storage, called directly (e.g. from a script or CLI).
4. **Pagination**: Loop with offset until response `posts` array is empty or fewer than limit.
5. **`requests` library**: Used by boto3/assemblyai transitively; import directly in wix.py.
6. **`blog_data/` path**: Resolved relative to `BASE_DIR` from `main.settings`.
7. **Entry point**: Run `BlogService().sync_all_posts()` from a standalone script or wherever needed.
