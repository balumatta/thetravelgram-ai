import asyncio
import json
import logging

from fastapi import Request
from sse_starlette.sse import EventSourceResponse

from apps.voice_agent.constants import SessionState
from apps.voice_agent.generator import BlogGenerator
from apps.voice_agent.interviewer import Interviewer
from apps.voice_agent.session import AgentSession, Message

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

                    # Signal blog generation start
                    yield {"data": json.dumps({"type": "blog_start"})}

                    blog_content = ""
                    async for chunk in generator.generate_stream(session.conversation):
                        blog_content += chunk
                        yield {"data": json.dumps({"type": "blog_token", "content": chunk})}

                    session.blog_output = blog_content
                    session.state = SessionState.DONE
                    session.save()
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
