import asyncio
import json
import logging
import os
import uuid
from datetime import datetime

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
        from fastapi.responses import JSONResponse
        from fastapi import UploadFile
        import shutil

        env = os.environ.get("ENVIRONMENT", "local")
        form = await request.form()
        file = form.get("file")
        blog_id = form.get("blog_id", "general")

        if not file:
            return JSONResponse({"error": "No file"}, status_code=400)

        ext = os.path.splitext(file.filename)[1].lower() if file.filename else ".bin"
        filename = f"{uuid.uuid4().hex}{ext}"

        if env == "production":
            # S3 upload
            try:
                import boto3
                s3 = boto3.client("s3")
                bucket = os.environ.get("S3_BUCKET", "thetravelgram.in")
                key = f"{blog_id}/{filename}"
                s3.upload_fileobj(file.file, bucket, key, ExtraArgs={"ContentType": file.content_type or "application/octet-stream"})
                region = os.environ.get("AWS_REGION", "ap-south-1")
                url = f"https://{bucket}.s3.{region}.amazonaws.com/{key}"
                return {"url": url, "filename": filename}
            except Exception as e:
                logger.exception("S3 upload failed")
                return JSONResponse({"error": str(e)}, status_code=500)
        else:
            # Local: save to frontend/public/media/[blog_id]/
            media_dir = os.path.join(BASE_DIR, "..", "frontend", "public", "media", blog_id)
            os.makedirs(media_dir, exist_ok=True)
            dest = os.path.join(media_dir, filename)
            with open(dest, "wb") as f:
                shutil.copyfileobj(file.file, f)
            return {"url": f"/media/{blog_id}/{filename}", "filename": filename}

    async def delete_blog(self, request: Request):
        deleted = BlogStore.delete()
        AgentSession.delete()
        return {"success": deleted}
