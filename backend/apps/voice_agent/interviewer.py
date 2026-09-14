import json
import logging
import re
from dataclasses import dataclass
from typing import Optional

import anthropic

from apps.voice_agent.constants import SessionState
from apps.voice_agent.prompts import (
    DAY_CONTEXT,
    INTERVIEWER_DYNAMIC_PROMPT,
    INTERVIEWER_STATIC_PROMPT,
    OVERVIEW_CONTEXT,
    WRAPUP_CONTEXT,
)
from apps.voice_agent.session import AgentSession
from main.settings import ANTHROPIC_API_KEY

logger = logging.getLogger(__name__)

INTERVIEWER_MODEL = "claude-sonnet-5"


@dataclass
class InterviewerResponse:
    question: str
    signal: Optional[str]       # None | "NEXT_DAY" | "WRAPUP" | "GENERATE"
    total_days: Optional[int] = None


class Interviewer:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    def _build_dynamic_prompt(self, session: AgentSession) -> str:
        if session.state == SessionState.OVERVIEW:
            phase = "OVERVIEW"
            phase_context = OVERVIEW_CONTEXT
        elif session.state == SessionState.WRAPUP:
            phase = "WRAPUP"
            phase_context = WRAPUP_CONTEXT.format(total_days=session.total_days)
        else:
            is_last_day = session.current_day == session.total_days
            next_signal = "WRAPUP" if is_last_day else "NEXT_DAY"
            phase = f"DAY {session.current_day} of {session.total_days}"
            phase_context = DAY_CONTEXT.format(
                current_day=session.current_day,
                total_days=session.total_days,
                next_signal=next_signal,
            )

        return INTERVIEWER_DYNAMIC_PROMPT.format(phase=phase, phase_context=phase_context)

    def get_next_response(self, session: AgentSession) -> InterviewerResponse:
        dynamic_prompt = self._build_dynamic_prompt(session)
        messages = [{"role": m.role, "content": m.content} for m in session.conversation]

        response = self.client.messages.create(
            model=INTERVIEWER_MODEL,
            max_tokens=512,
            system=[
                {
                    # Static block: style DNA + rules — cached after first call
                    "type": "text",
                    "text": INTERVIEWER_STATIC_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                },
                {
                    # Dynamic block: current phase/day — changes every call, not cached
                    "type": "text",
                    "text": dynamic_prompt,
                },
            ],
            messages=messages,
        )

        # Log cache usage so you can see savings
        usage = response.usage
        logger.info(
            f"Interviewer tokens — input: {usage.input_tokens} | "
            f"cache_read: {getattr(usage, 'cache_read_input_tokens', 0)} | "
            f"cache_write: {getattr(usage, 'cache_creation_input_tokens', 0)} | "
            f"output: {usage.output_tokens}"
        )

        raw = response.content[0].text.strip()
        logger.debug(f"Interviewer raw: {raw}")

        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            if match:
                parsed = json.loads(match.group())
            else:
                logger.error(f"Failed to parse interviewer JSON: {raw}")
                parsed = {"question": raw, "signal": None, "total_days": None}

        return InterviewerResponse(
            question=parsed.get("question", ""),
            signal=parsed.get("signal"),
            total_days=parsed.get("total_days"),
        )
