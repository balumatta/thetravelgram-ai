import logging
from typing import AsyncGenerator

import anthropic

from apps.voice_agent.prompts import BLOG_GENERATOR_SYSTEM_PROMPT
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

    async def generate_stream(self, conversation: list[Message]) -> AsyncGenerator[str, None]:
        transcript = self._build_transcript(conversation)
        system_prompt = BLOG_GENERATOR_SYSTEM_PROMPT.format(transcript=transcript)

        with self.client.messages.stream(
            model=GENERATOR_MODEL,
            max_tokens=8000,
            system=system_prompt,
            messages=[{"role": "user", "content": "Write the blog post now."}],
        ) as stream:
            for text in stream.text_stream:
                yield text
