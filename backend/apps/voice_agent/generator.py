import asyncio
import logging
from typing import AsyncGenerator

import anthropic

from apps.voice_agent.prompts import (
    BLOG_GENERATOR_SYSTEM_PROMPT,
    REFORMAT_BLOG_SYSTEM_PROMPT,
    SECTION_DAY,
    SECTION_OPENING,
    SECTION_WRAPUP,
)
from apps.voice_agent.blog_schema import STRUCTURED_BLOG_TOOL
from apps.voice_agent.session import Message
from main.settings import ANTHROPIC_API_KEY

logger = logging.getLogger(__name__)

GENERATOR_MODEL = "claude-opus-5"


class BlogGenerator:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    def _build_transcript(self, conversation: list[Message]) -> str:
        lines = []
        for msg in conversation:
            label = "Interviewer" if msg.role == "assistant" else "Traveler"
            lines.append(f"{label}: {msg.content}")
        return "\n\n".join(lines)

    def _make_system(self, transcript: str) -> list[dict]:
        """Cached system block — same across all sequential section calls."""
        return [
            {
                "type": "text",
                "text": BLOG_GENERATOR_SYSTEM_PROMPT.format(transcript=transcript),
                "cache_control": {"type": "ephemeral"},
            }
        ]

    async def _stream_section(
        self, system: list[dict], user_message: str
    ) -> AsyncGenerator[str, None]:
        """Run one section call in a background thread and yield chunks."""
        loop = asyncio.get_event_loop()
        queue: asyncio.Queue = asyncio.Queue()

        def _run():
            try:
                with self.client.messages.stream(
                    model=GENERATOR_MODEL,
                    max_tokens=4000,
                    system=system,
                    messages=[{"role": "user", "content": user_message}],
                ) as stream:
                    for text in stream.text_stream:
                        loop.call_soon_threadsafe(queue.put_nowait, text)
                    usage = stream.get_final_message().usage
                    logger.info(
                        f"Section tokens — input: {usage.input_tokens} "
                        f"cache_read: {getattr(usage, 'cache_read_input_tokens', 0)} "
                        f"output: {usage.output_tokens}"
                    )
            except Exception as e:
                loop.call_soon_threadsafe(queue.put_nowait, e)
            finally:
                loop.call_soon_threadsafe(queue.put_nowait, None)

        asyncio.ensure_future(asyncio.to_thread(_run))

        while True:
            item = await queue.get()
            if item is None:
                break
            if isinstance(item, Exception):
                raise item
            yield item

    async def generate_sequential(
        self, conversation: list[Message], total_days: int
    ) -> AsyncGenerator[tuple[str, str], None]:
        """
        Yields (chunk, section_label) tuples.
        section_label changes at each section boundary so views.py can fire status events.
        """
        transcript = self._build_transcript(conversation)
        system = self._make_system(transcript)
        written_so_far = ""

        # ── Opening + Day 1 ──────────────────────────────────────────
        label = "Opening & Day 1"
        async for chunk in self._stream_section(system, SECTION_OPENING):
            written_so_far += chunk
            yield chunk, label

        # ── Day 2 … N ───────────────────────────────────────────────
        for day in range(2, total_days + 1):
            label = f"Day {day}"
            user_msg = SECTION_DAY.format(written_so_far=written_so_far, day_num=day)
            async for chunk in self._stream_section(system, user_msg):
                written_so_far += chunk
                yield chunk, label

        # ── Wrapup sections ─────────────────────────────────────────
        label = "Itinerary & Tips"
        user_msg = SECTION_WRAPUP.format(written_so_far=written_so_far)
        async for chunk in self._stream_section(system, user_msg):
            written_so_far += chunk
            yield chunk, label

    async def generate_stream(self, conversation: list[Message]) -> AsyncGenerator[str, None]:
        """Single-shot fallback (used by continue endpoint)."""
        transcript = self._build_transcript(conversation)
        system = self._make_system(transcript)

        loop = asyncio.get_event_loop()
        queue: asyncio.Queue = asyncio.Queue()

        from apps.voice_agent.prompts import SECTION_OPENING  # single-shot reuses opening instruction

        def _run():
            try:
                with self.client.messages.stream(
                    model=GENERATOR_MODEL,
                    max_tokens=16000,
                    system=system,
                    messages=[{"role": "user", "content": "Write the complete blog post now. Start with a compelling in-scene opening line. Do NOT write the title."}],
                ) as stream:
                    for text in stream.text_stream:
                        loop.call_soon_threadsafe(queue.put_nowait, text)
            except Exception as e:
                loop.call_soon_threadsafe(queue.put_nowait, e)
            finally:
                loop.call_soon_threadsafe(queue.put_nowait, None)

        asyncio.ensure_future(asyncio.to_thread(_run))

        while True:
            item = await queue.get()
            if item is None:
                break
            if isinstance(item, Exception):
                raise item
            yield item

    def reformat_to_structured(self, blog_content: str, content_format: str) -> dict:
        """
        Synchronous tool_use call.
        Returns the structured blog dict: {title, subtitle, sections}.
        """
        import re

        # Strip HTML tags to give the LLM clean text to work with
        if content_format == "html":
            clean = re.sub(r"<[^>]+>", " ", blog_content)
            clean = re.sub(r"&nbsp;", " ", clean)
            clean = re.sub(r"&amp;", "&", clean)
            clean = re.sub(r"&lt;", "<", clean)
            clean = re.sub(r"&gt;", ">", clean)
            clean = re.sub(r"\s{3,}", "\n\n", clean).strip()
        else:
            clean = blog_content

        response = self.client.messages.create(
            model=GENERATOR_MODEL,
            max_tokens=16000,
            system=REFORMAT_BLOG_SYSTEM_PROMPT,
            tools=[STRUCTURED_BLOG_TOOL],
            tool_choice={"type": "tool", "name": "create_structured_blog"},
            messages=[{
                "role": "user",
                "content": f"Here is the existing travel blog to reformat:\n\n{clean}"
            }],
        )

        for block in response.content:
            if block.type == "tool_use":
                return block.input

        raise ValueError("LLM did not call the structured blog tool")

    async def continue_stream(
        self, conversation: list[Message], partial_blog: str
    ) -> AsyncGenerator[str, None]:
        """Continue a cut-off blog from partial content."""
        transcript = self._build_transcript(conversation)
        system = self._make_system(transcript)

        continuation_prompt = (
            f"The blog post was cut off and is incomplete. Here is what was written so far:\n\n"
            f"{partial_blog}\n\n"
            f"Continue writing from exactly where it stopped. Do not repeat any content already written. "
            f"Complete all remaining days and sections (Itinerary, Must Visit, Tips, Special Thanks) if missing."
        )

        loop = asyncio.get_event_loop()
        queue: asyncio.Queue = asyncio.Queue()

        def _run():
            try:
                with self.client.messages.stream(
                    model=GENERATOR_MODEL,
                    max_tokens=16000,
                    system=system,
                    messages=[{"role": "user", "content": continuation_prompt}],
                ) as stream:
                    for text in stream.text_stream:
                        loop.call_soon_threadsafe(queue.put_nowait, text)
            except Exception as e:
                loop.call_soon_threadsafe(queue.put_nowait, e)
            finally:
                loop.call_soon_threadsafe(queue.put_nowait, None)

        asyncio.ensure_future(asyncio.to_thread(_run))

        while True:
            item = await queue.get()
            if item is None:
                break
            if isinstance(item, Exception):
                raise item
            yield item
