import os
from abc import ABC

from apps.agents.commons.constants import LLMProviders
from helpers.llms.claude import ClaudeLLM
from helpers.llms.gemini import GeminiLLM
from helpers.llms.litellm import LiteLLM


class BaseLLMProvider(ABC):
    def __init__(self, llm_model: str, temperature: float = 0.5, max_tokens: int = 12000, api_key: str = None):
        self.llm_model = llm_model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.api_key = api_key
        self.litellm = None


class GPTModelProvider(BaseLLMProvider):
    def __init__(self, llm_model: str, temperature: float = 0.5, max_tokens: int = 12000, api_key: str = None):
        super().__init__(llm_model, temperature, max_tokens, api_key)
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY") or os.environ.get("OPEN_API_KEY")
        self.llm_model = LiteLLM(llm_model, self.api_key, temperature, max_tokens)


class ClaudeModelProvider(BaseLLMProvider):
    def __init__(self, llm_model: str, temperature: float = 0.5, max_tokens: int = 20000, api_key: str = None):
        super().__init__(llm_model, temperature, max_tokens, api_key)
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        self.llm_model = ClaudeLLM(self.api_key, llm_model, temperature, max_tokens)


class GeminiModelProvider(BaseLLMProvider):
    def __init__(self, llm_model: str, temperature: float = 0.5, max_tokens: int = 12000, api_key: str = None):
        super().__init__(llm_model, temperature, max_tokens, api_key)
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        self.llm_model = GeminiLLM(self.api_key, llm_model, temperature, max_tokens)


class LLMProviderFactory:
    @staticmethod
    def create_provider(provider_type: str):
        """
        Create LLM provider with defaults based on provider type.
        Each provider uses its specific default model, temperature, and API key.
        """
        if provider_type == LLMProviders.OPENAI_GPT:
            # Default GPT configuration for question generation
            return GPTModelProvider(
                llm_model="gpt-5.2", temperature=1.0, max_tokens=12000, api_key=None  # Will use environment variable
            )
        elif provider_type == LLMProviders.CLAUDE:
            # Default Claude configuration for reviews and complex tasks
            return ClaudeModelProvider(
                llm_model="claude-opus-4-5",
                temperature=0.3,
                max_tokens=20000,
                api_key=None,  # Will use environment variable
            )
        elif provider_type == LLMProviders.GEMINI:
            # Default Gemini configuration for image generation
            return GeminiModelProvider(
                llm_model="gemini-3-pro-image-preview",
                temperature=0.7,
                max_tokens=64000,
                api_key=None,  # Will use environment variable
            )
        else:
            raise ValueError(f"Unsupported provider type: {provider_type}")
