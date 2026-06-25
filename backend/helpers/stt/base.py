from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class STTSegment:
    start: float
    end: float
    text: str


@dataclass
class STTResult:
    language: str
    language_probability: float
    segments: List[STTSegment]


class BaseSTTProvider(ABC):
    @abstractmethod
    def transcribe(
        self,
        filepath: str,
        language: Optional[str] = None,
        vad_filter: bool = True,
    ) -> STTResult:
        pass
