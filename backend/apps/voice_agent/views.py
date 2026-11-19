import asyncio
import json
import logging
import math
import os
import re
import uuid
from datetime import datetime, timezone

from fastapi import Request
from sse_starlette.sse import EventSourceResponse

from apps.voice_agent.blog_store import BlogStore
from apps.voice_agent.constants import SessionState
from apps.voice_agent.generator import BlogGenerator
from apps.voice_agent.interviewer import Interviewer
from apps.voice_agent.session import AgentSession, Message
from main.settings import BASE_DIR

GENERATED_BLOGS_DIR = os.path.join(BASE_DIR, "generated_blogs")

logger = logging.getLogger(__name__)

interviewer = Interviewer()
generator = BlogGenerator()

OPENING_MESSAGE = "Hey! I'm so excited to hear about your trip. Tell me — where did you go, for how many days, and who came with you?"


class VoiceAgentView:

    async def get_session(self, request: Request):
        session = AgentSession.load()
        if not session:
            return {"exists": False}
        return {"exists": True, **session.to_dict()}

    async def new_session(self, request: Request):
        AgentSession.delete()
        session = AgentSession()
        session.conversation.append(Message(role="assistant", content=OPENING_MESSAGE))
        session.save()
        return {"exists": True, **session.to_dict()}

    async def send_message(self, request: Request):
        body = await request.json()
        user_message = body.get("message", "").strip()
        if not user_message:
            return {"error": "empty message"}

        async def event_stream():
            try:
                session = AgentSession.load()
                if not session:
                    yield {"data": json.dumps({"type": "error", "content": "No active session. Start a new trip first."})}
                    return

                # Append user message
                session.conversation.append(Message(role="user", content=user_message))

                # Get next interviewer response
                response = interviewer.get_next_response(session)

                # Stream the interviewer's question/message character by character
                for char in response.question:
                    yield {"data": json.dumps({"type": "token", "content": char})}
                    await asyncio.sleep(0.012)

                # Append assistant message to conversation
                session.conversation.append(Message(role="assistant", content=response.question))

                # Handle state transitions
                signal = response.signal
                if signal == "NEXT_DAY":
                    if session.state == SessionState.OVERVIEW and response.total_days:
                        session.total_days = response.total_days
                    session.current_day += 1
                    if session.current_day > session.total_days:
                        session.state = SessionState.WRAPUP
                    else:
                        session.state = SessionState.DAY
                elif signal == "WRAPUP":
                    session.state = SessionState.WRAPUP
                elif signal == "GENERATE":
                    session.state = SessionState.GENERATE
                    session.save()

                    yield {"data": json.dumps({"type": "blog_start"})}
                    yield {"data": json.dumps({"type": "blog_status", "content": "Starting with your opening scene…"})}

                    blog_content = ""
                    current_label = ""

                    async for chunk, label in generator.generate_sequential(session.conversation, session.total_days):
                        blog_content += chunk
                        yield {"data": json.dumps({"type": "blog_token", "content": chunk})}

                        if label != current_label:
                            current_label = label
                            if label == "Itinerary & Tips":
                                msg = "Writing Itinerary, Tips & Special Thanks…"
                            else:
                                msg = f"Writing {label}…"
                            yield {"data": json.dumps({"type": "blog_status", "content": msg})}

                    session.blog_output = blog_content
                    session.state = SessionState.DONE
                    session.save()

                    interview_context = [{"role": m.role, "content": m.content} for m in session.conversation]
                    BlogStore.save(blog_content, interview_context)

                    os.makedirs(GENERATED_BLOGS_DIR, exist_ok=True)
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    blog_file = os.path.join(GENERATED_BLOGS_DIR, f"blog_{timestamp}.md")
                    with open(blog_file, "w", encoding="utf-8") as f:
                        f.write(blog_content)
                    logger.info(f"Blog saved to {blog_file}")

                    yield {"data": json.dumps({"type": "blog_status", "content": "Done! Your blog is ready ✓"})}
                    yield {"data": json.dumps({"type": "blog_done"})}
                    return

                session.save()
                yield {
                    "data": json.dumps({
                        "type": "message_done",
                        "state": session.state.value,
                        "current_day": session.current_day,
                        "total_days": session.total_days,
                    })
                }

            except Exception as e:
                logger.exception("Error in voice agent stream")
                yield {"data": json.dumps({"type": "error", "content": str(e)})}

        return EventSourceResponse(event_stream())

    async def regenerate_blog(self, request: Request):
        body = await request.json()
        mode = body.get("mode", "regenerate")  # "regenerate" | "continue"

        async def event_stream():
            try:
                session = AgentSession.load()
                if not session:
                    yield {"data": json.dumps({"type": "error", "content": "No active session."})}
                    return

                yield {"data": json.dumps({"type": "blog_start"})}

                if mode == "continue" and session.blog_output:
                    yield {"data": json.dumps({"type": "blog_status", "content": "Continuing from where it stopped…"})}
                    partial = session.blog_output
                    new_content = partial  # start with existing content
                    # Yield the existing partial content first so the UI shows it
                    yield {"data": json.dumps({"type": "blog_token", "content": partial})}
                    yield {"data": json.dumps({"type": "blog_status", "content": "Writing the remaining sections…"})}
                    async for chunk in generator.continue_stream(session.conversation, partial):
                        new_content += chunk
                        yield {"data": json.dumps({"type": "blog_token", "content": chunk})}
                else:
                    yield {"data": json.dumps({"type": "blog_status", "content": "Starting fresh — writing opening scene…"})}
                    new_content = ""
                    current_label = ""
                    async for chunk, label in generator.generate_sequential(session.conversation, session.total_days):
                        new_content += chunk
                        yield {"data": json.dumps({"type": "blog_token", "content": chunk})}
                        if label != current_label:
                            current_label = label
                            msg = "Writing Itinerary, Tips & Special Thanks…" if label == "Itinerary & Tips" else f"Writing {label}…"
                            yield {"data": json.dumps({"type": "blog_status", "content": msg})}

                session.blog_output = new_content
                session.state = SessionState.DONE
                session.save()

                interview_context = [{"role": m.role, "content": m.content} for m in session.conversation]
                BlogStore.save(new_content, interview_context)

                os.makedirs(GENERATED_BLOGS_DIR, exist_ok=True)
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                blog_file = os.path.join(GENERATED_BLOGS_DIR, f"blog_{timestamp}.md")
                with open(blog_file, "w", encoding="utf-8") as f:
                    f.write(new_content)

                yield {"data": json.dumps({"type": "blog_status", "content": "Done! Your blog is ready ✓"})}
                yield {"data": json.dumps({"type": "blog_done"})}

            except Exception as e:
                logger.exception("Error in regenerate stream")
                yield {"data": json.dumps({"type": "error", "content": str(e)})}

        return EventSourceResponse(event_stream())

    async def get_blog(self, request: Request):
        blog = BlogStore.load()
        if not blog:
            return {"exists": False}
        return {
            "exists": True,
            "id": blog.get("id", "general"),
            "title": blog.get("title", ""),
            "subtitle": blog.get("subtitle", ""),
            "banner_url": blog.get("banner_url", ""),
            "theme": blog.get("theme", "warm"),
            "content": blog.get("content", ""),
            "content_format": blog.get("content_format", "markdown"),
            "sections": blog.get("sections", None),
            "created_at": blog.get("created_at", ""),
            "updated_at": blog.get("updated_at", ""),
        }

    async def update_blog(self, request: Request):
        from fastapi.responses import JSONResponse
        body = await request.json()
        payload = {k: v for k, v in body.items() if k in {"content", "content_format", "title", "subtitle", "banner_url", "theme", "sections"}}
        if not payload:
            return JSONResponse({"error": "Nothing to update"}, status_code=400)
        result = BlogStore.update(payload)
        if result is None:
            return JSONResponse({"error": "No blog found"}, status_code=404)
        return {"success": True, "title": result["title"], "updated_at": result["updated_at"]}

    async def reformat_blog(self, request: Request):
        """Reformat existing markdown/HTML blog into structured JSON sections via LLM tool_use."""
        async def event_stream():
            try:
                blog = BlogStore.load()
                if not blog:
                    yield {"data": json.dumps({"type": "error", "content": "No blog found."})}
                    return

                content = blog.get("content", "")
                content_format = blog.get("content_format", "markdown")

                if not content:
                    yield {"data": json.dumps({"type": "error", "content": "Blog has no content to reformat."})}
                    return

                yield {"data": json.dumps({"type": "status", "content": "Reading your blog…"})}
                await asyncio.sleep(0)

                yield {"data": json.dumps({"type": "status", "content": "LLM structuring conversations, facts, itinerary…"})}

                result = await asyncio.to_thread(
                    generator.reformat_to_structured, content, content_format
                )

                sections = result.get("sections", [])
                title = result.get("title", blog.get("title", ""))
                subtitle = result.get("subtitle", "")

                BlogStore.save_sections(sections, title, subtitle)

                yield {"data": json.dumps({"type": "status", "content": "Done! Structured blog ready ✓"})}
                yield {"data": json.dumps({
                    "type": "done",
                    "title": title,
                    "subtitle": subtitle,
                    "sections": sections,
                })}

            except Exception as e:
                logger.exception("Error in reformat_blog")
                yield {"data": json.dumps({"type": "error", "content": str(e)})}

        return EventSourceResponse(event_stream())

    async def upload_media(self, request: Request):
        """All media goes to S3, in every environment: s3://$S3_BUCKET/media/<blog_id>/<uuid>.<ext>"""
        from fastapi.responses import JSONResponse
        import boto3

        form = await request.form()
        file = form.get("file")
        blog_id = str(form.get("blog_id") or "general")

        if not file:
            return JSONResponse({"error": "No file"}, status_code=400)

        bucket = os.environ.get("S3_BUCKET")
        region = os.environ.get("AWS_REGION", "ap-south-1")
        if not bucket:
            return JSONResponse({"error": "S3 not configured: set S3_BUCKET"}, status_code=500)

        ext = os.path.splitext(file.filename)[1].lower() if file.filename else ".bin"
        filename = f"{uuid.uuid4().hex}{ext}"
        key = f"media/{blog_id}/{filename}"

        try:
            # Default credential chain: access keys from .env locally, the ECS task role when deployed.
            s3 = boto3.client("s3", region_name=region)
            s3.upload_fileobj(
                file.file, bucket, key,
                ExtraArgs={"ContentType": file.content_type or "application/octet-stream"},
            )
        except Exception as e:
            logger.exception("S3 upload failed")
            return JSONResponse({"error": str(e)}, status_code=500)

        return {"url": f"https://{bucket}.s3.{region}.amazonaws.com/{key}", "filename": filename}

    async def publish_blog(self, request: Request):
        """Publish the draft: S3 published/<slug>/blog.json + frontend/content/blogs/<slug>.json, then archive the draft."""
        from fastapi.responses import JSONResponse
        from apps.blog.published_store import PublishedStore
        from apps.blog.wix_import import build_highlights

        draft = BlogStore.load()
        if not draft or not (draft.get("content") or "").strip():
            return JSONResponse({"error": "There's no draft to publish."}, status_code=404)
        if draft.get("content_format") != "rich":
            return JSONResponse({"error": "Open the draft in the editor and save it once before publishing."}, status_code=400)
        title = (draft.get("title") or "").strip()
        if not title:
            return JSONResponse({"error": "Give the blog a title before publishing."}, status_code=400)

        try:
            body = await request.json()
        except Exception:
            body = {}
        slug = re.sub(r"[^a-z0-9]+", "-", (body.get("slug") or title).lower()).strip("-")
        if not slug:
            return JSONResponse({"error": "Couldn't make a URL from the title."}, status_code=400)
        if await asyncio.to_thread(PublishedStore.get, slug):
            return JSONResponse({"error": f"A published blog already lives at /blog/{slug}. Change the title and try again."}, status_code=409)

        content = draft["content"]
        words = len(re.sub(r"<[^>]+>", " ", content).split())
        try:
            highlights = await asyncio.to_thread(build_highlights, title, content)
        except Exception as e:  # highlights are a nice-to-have for the home page; never block publishing
            logger.warning(f"Highlights skipped for {slug}: {e}")
            highlights = []

        now = datetime.now(timezone.utc).isoformat()
        blog = {
            "id": draft.get("id") or uuid.uuid4().hex[:12],
            "slug": slug,
            "status": "published",
            "title": title,
            "subtitle": draft.get("subtitle", ""),
            "excerpt": draft.get("excerpt", ""),
            "banner_url": draft.get("banner_url", ""),
            "theme": draft.get("theme", "warm"),
            "content": content,
            "content_format": "rich",
            "sections": draft.get("sections") or [],
            "minutes_to_read": max(1, math.ceil(words / 200)),
            "published_at": now,
            "highlights": highlights,
            "source": {"type": "composer"},
            "created_at": draft.get("created_at") or now,
            "updated_at": now,
        }
        try:
            await asyncio.to_thread(PublishedStore.save, blog)
        except Exception as e:
            logger.exception("Publish failed")
            return JSONResponse({"error": f"Publishing failed: {e}"}, status_code=500)

        # Keep the draft and its finished interview on disk instead of deleting them; the draft slot is now free.
        # (The interview has to move too, or the admin would show its text as a draft again.)
        from apps.voice_agent.session import SESSION_FILE
        archive_dir = os.path.join(BASE_DIR, "sessions", "published")
        os.makedirs(archive_dir, exist_ok=True)
        os.replace(os.path.join(BASE_DIR, "sessions", "blog.json"), os.path.join(archive_dir, f"{slug}.json"))
        session = AgentSession.load()
        if session and session.state == SessionState.DONE and os.path.isfile(SESSION_FILE):
            os.replace(SESSION_FILE, os.path.join(archive_dir, f"{slug}.interview.json"))
        return {"success": True, "slug": slug, "published_at": now}

    async def delete_blog(self, request: Request):
        deleted = BlogStore.delete()
        AgentSession.delete()
        return {"success": deleted}
