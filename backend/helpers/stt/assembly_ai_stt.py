import logging
from typing import Optional

import assemblyai as aai

from backend.helpers.stt.base import BaseSTTProvider, STTResult, STTSegment

logger = logging.getLogger(__name__)


class AssemblyAIProvider(BaseSTTProvider):
    def __init__(self, api_key: str):
        if not api_key:
            raise ValueError("AssemblyAI API key is required")

        aai.settings.api_key = api_key
        logger.info("AssemblyAI provider initialized")

    def transcribe(
            self,
            filepath: str,
            language: Optional[str] = None,
            vad_filter: bool = True,
    ) -> STTResult:
        config = aai.TranscriptionConfig(
            speech_models=["universal-3-pro", "universal-2"],
            language_code=language,
            language_detection=language is None,
            speaker_labels=True,
            punctuate=True,
            format_text=True,
        )

        logger.info(f"Submitting to AssemblyAI: {filepath} (language={language or 'auto'})")

        transcriber = aai.Transcriber(config=config)
        transcript = transcriber.transcribe(filepath)

        if transcript.status == aai.TranscriptStatus.error:
            raise RuntimeError(f"AssemblyAI transcription failed: {transcript.error}")

        detected_language = transcript.language_code or language or "unknown"
        confidence = transcript.confidence or 1.0

        logger.info(f"AssemblyAI detected language: {detected_language} (transcript confidence: {confidence:.2f})")

        segments = []
        if transcript.utterances:
            for utt in transcript.utterances:
                segments.append(STTSegment(
                    start=utt.start / 1000.0,
                    end=utt.end / 1000.0,
                    text=utt.text.strip(),
                ))
        elif transcript.words:
            current_text = []
            current_start = None
            current_end = None
            for word in transcript.words:
                if current_start is None:
                    current_start = word.start / 1000.0
                current_text.append(word.text)
                current_end = word.end / 1000.0
                if word.text.endswith((".", "?", "!")):
                    segments.append(STTSegment(
                        start=current_start,
                        end=current_end,
                        text=" ".join(current_text).strip(),
                    ))
                    current_text = []
                    current_start = None
                    current_end = None
            if current_text:
                segments.append(STTSegment(
                    start=current_start,
                    end=current_end,
                    text=" ".join(current_text).strip(),
                ))
        elif transcript.text:
            segments.append(STTSegment(start=0.0, end=0.0, text=transcript.text.strip()))

        logger.info(f"AssemblyAI transcription done: {len(segments)} segments")

        return STTResult(
            language=detected_language,
            language_probability=round(confidence, 2),
            segments=segments,
        )
