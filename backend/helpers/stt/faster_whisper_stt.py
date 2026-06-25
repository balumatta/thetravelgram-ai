import logging
from typing import Optional

from faster_whisper import WhisperModel

from backend.helpers.stt.base import BaseSTTProvider, STTResult, STTSegment

logger = logging.getLogger(__name__)


class FasterWhisperProvider(BaseSTTProvider):
    def __init__(
            self,
            model_size: str = "small",
            device: str = "cpu",
            compute_type: str = "int8",
            beam_size: int = 3,
    ):
        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type
        self.beam_size = beam_size

        logger.info(f"Loading Whisper model: {self.model_size} on {self.device}")
        self.model = WhisperModel(self.model_size, device=self.device, compute_type=self.compute_type)
        logger.info("Whisper model loaded successfully")

    def transcribe(
            self,
            filepath: str,
            language: Optional[str] = None,
            vad_filter: bool = True,
    ) -> STTResult:
        segments_iter, info = self.model.transcribe(
            filepath,
            beam_size=self.beam_size,
            language=language,
            task="transcribe",
            vad_filter=vad_filter,
            word_timestamps=True
        )

        segments = []
        for seg in segments_iter:
            text = seg.text.strip()
            if text:
                logger.debug(f"  [{seg.start:.1f}s -> {seg.end:.1f}s] {text}")
                segments.append(STTSegment(start=seg.start, end=seg.end, text=text))

        return STTResult(
            language=info.language,
            language_probability=round(info.language_probability, 2),
            segments=segments,
        )
