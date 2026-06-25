from backend.helpers.stt.base import BaseSTTProvider
from backend.helpers.stt.faster_whisper_stt import FasterWhisperProvider
from backend.helpers.stt.assembly_ai_stt import AssemblyAIProvider
import os


class STTProviderFactory:
    @staticmethod
    def _create_faster_whisper() -> BaseSTTProvider:
        return FasterWhisperProvider(
            model_size="small",
            device="cpu",
            compute_type="int8",
            beam_size=1,
        )

    @staticmethod
    def _create_assembly_ai() -> BaseSTTProvider:
        return AssemblyAIProvider(
            api_key=os.environ.get("ASSEMBLY_AI_API_KEY", ""),
        )

    @classmethod
    def create_provider(cls, provider_type: str = "faster_whisper") -> BaseSTTProvider:
        if provider_type == "faster_whisper":
            return cls._create_faster_whisper()
        elif provider_type == "assembly_ai":
            return cls._create_assembly_ai()
        else:
            raise ValueError(f"Unsupported STT provider: {provider_type}")
