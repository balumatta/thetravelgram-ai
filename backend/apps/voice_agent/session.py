import json
import os
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Optional

from apps.voice_agent.constants import SessionState
from main.settings import BASE_DIR

SESSION_FILE = os.path.join(BASE_DIR, "sessions", "current.json")


@dataclass
class Message:
    role: str  # "user" | "assistant"
    content: str


@dataclass
class AgentSession:
    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    state: SessionState = SessionState.OVERVIEW
    current_day: int = 1
    total_days: int = 0
    conversation: list[Message] = field(default_factory=list)
    blog_output: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def save(self):
        os.makedirs(os.path.dirname(SESSION_FILE), exist_ok=True)
        data = {
            "session_id": self.session_id,
            "state": self.state.value,
            "current_day": self.current_day,
            "total_days": self.total_days,
            "conversation": [{"role": m.role, "content": m.content} for m in self.conversation],
            "blog_output": self.blog_output,
            "created_at": self.created_at,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        with open(SESSION_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    @classmethod
    def load(cls) -> Optional["AgentSession"]:
        if not os.path.isfile(SESSION_FILE):
            return None
        with open(SESSION_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        session = cls(
            session_id=data["session_id"],
            state=SessionState(data["state"]),
            current_day=data["current_day"],
            total_days=data["total_days"],
            conversation=[Message(**m) for m in data["conversation"]],
            blog_output=data.get("blog_output"),
            created_at=data["created_at"],
            updated_at=data["updated_at"],
        )
        return session

    @classmethod
    def delete(cls):
        if os.path.isfile(SESSION_FILE):
            os.remove(SESSION_FILE)

    @classmethod
    def exists(cls) -> bool:
        return os.path.isfile(SESSION_FILE)

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "state": self.state.value,
            "current_day": self.current_day,
            "total_days": self.total_days,
            "conversation": [{"role": m.role, "content": m.content} for m in self.conversation],
            "blog_output": self.blog_output,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
