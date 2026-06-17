import asyncio
import logging
import os
import time
from asyncio import Semaphore

import litellm
from dotenv import load_dotenv
from litellm import RateLimitError

from apps.agents.commons.constants import LLMProviders
from helpers.llms.exceptions import QuotaExceededException
from helpers.utils import time_it

load_dotenv()
logger = logging.getLogger(__name__)


class LiteLLM:
    def __init__(self, llm_model, api_key, temperature=0.5, max_tokens=12000):
        self.llm_model = llm_model
        if not self.llm_model:
            raise ValueError("LLM model is required")

        self.api_key = api_key
        if not self.api_key or self.api_key.strip() == "":
            raise ValueError(
                "API key is required but not provided. Please check your LLM model API Key in environment variable."
            )

        self.temperature = temperature
        self.max_tokens = max_tokens
        self.semaphore = Semaphore(3)

        # Configure litellm logging if needed
        if os.getenv("LITELLM_LOG"):
            litellm.set_verbose = True

    @time_it
    def get_provider_from_model(self):
        """Determine the provider based on the model name"""
        if self.llm_model.startswith("claude"):
            return LLMProviders.CLAUDE
        elif self.llm_model.startswith("gpt") or "gpt" in self.llm_model.lower():
            return LLMProviders.OPENAI_GPT
        else:
            # Default fallback - could be extended for other providers
            return LLMProviders.OPENAI_GPT

    @time_it
    def get_prompt(self, prompt_str, json_format_required=False):
        """Format prompt string, optionally adding JSON format instructions"""
        if json_format_required:
            prompt_str += "\n\nIMPORTANT: Return ONLY valid JSON that matches the required format exactly. No additional text, explanations, or markdown formatting."
        return prompt_str

    @time_it
    def prepare_messages(self, formatted_prompt):
        """Prepare messages array for litellm"""
        return [{"role": "user", "content": formatted_prompt}]

    @time_it
    def get_response_format(self, json_format_required=False, json_schema=None):
        """Get response format configuration"""
        if json_schema:
            return {"type": "json_schema", "json_schema": json_schema}
        elif json_format_required:
            return {"type": "json_object"}
        return None

    @time_it
    def print_token_usage(self, token_info):
        """Print token usage information"""
        if token_info.get("input_tokens", 0) > 0 or token_info.get("output_tokens", 0) > 0:
            provider = token_info.get("provider", "Unknown")
            print(f"🔢 LiteLLM Token Usage - Model: {self.llm_model} (Provider: {provider})")
            print(f"   📥 Prompt tokens: {token_info['input_tokens']}")
            print(f"   📤 Completion tokens: {token_info['output_tokens']}")
            print(f"   📊 Total tokens: {token_info['total_tokens']}")

    @time_it
    def extract_token_info(self, response):
        """Extract token usage information from response"""
        provider = self.get_provider_from_model()
        token_info = {"provider": provider, "input_tokens": 0, "output_tokens": 0, "total_tokens": 0}

        if hasattr(response, "usage") and response.usage:
            token_info["input_tokens"] = getattr(response.usage, "prompt_tokens", 0)
            token_info["output_tokens"] = getattr(response.usage, "completion_tokens", 0)
            token_info["total_tokens"] = getattr(response.usage, "total_tokens", 0)

        return token_info

    @time_it
    def is_quota_exceeded_litellm_error(self, rate_limit_error):
        """Detect if LiteLLM RateLimitError is quota exceeded vs rate limiting"""
        # Get the message
        message = getattr(rate_limit_error, "message", str(rate_limit_error))
        message_lower = message.lower()

        # Quota exceeded indicators
        quota_indicators = [
            "exceeded your current quota",
            "check your plan and billing details",
            "quota exceeded",
            "insufficient quota",
            "budget exceeded",
            "billing details",
            "payment required",
            "credit limit exceeded",
        ]

        # Check for quota patterns
        for indicator in quota_indicators:
            if indicator in message_lower:
                return True

        return False

    @time_it
    async def invoke_llm_with_rate_limiting(self, common_params):
        """Handle LLM invocation with semaphore and rate limiting"""
        async with self.semaphore:
            try:
                start_time = time.time()
                response = await litellm.acompletion(**common_params)
                end_time = time.time()

                request_duration = end_time - start_time

                # Dynamic rate limiting: 5-15 seconds based on request duration
                import random

                min_delay = 5.0
                max_delay = 15.0
                base_delay = min_delay + (max_delay - min_delay) * random.random()
                remaining_wait = max(0, base_delay - request_duration)

                if remaining_wait > 0:
                    print(
                        f"Request took {request_duration:.1f}s. "
                        f"Waiting additional {remaining_wait:.1f}s (dynamic 5-15s range)"
                    )
                    await asyncio.sleep(remaining_wait)
                return response
            except RateLimitError as e:
                if self.is_quota_exceeded_litellm_error(e):
                    # Quota exceeded - don't retry, raise QuotaExceededException
                    provider = self.get_provider_from_model()
                    raise QuotaExceededException(
                        f"API quota exceeded: {getattr(e, 'message', str(e))}", provider=provider, original_error=e
                    )
                else:
                    # Regular rate limit - wait and retry
                    print(f"LiteLLM Rate limit hit: {str(e)} \n Waiting for 60s")
                    await asyncio.sleep(60)
                    return await litellm.acompletion(**common_params)
            except Exception:
                raise

    @time_it
    async def get_response(self, prompt_str, prompt_arguments, json_format_required=False, json_schema=None, **kwargs):
        """
        Get response from LiteLLM - follows the same pattern as claude.py and openai.py

        Args:
            prompt_str: The prompt template string
            prompt_arguments: Dictionary of arguments to format into the prompt
            json_format_required: Whether to request JSON format response
            json_schema: Optional JSON schema for structured output
            **kwargs: Additional arguments (for compatibility)
        """
        try:
            # Format the prompt with arguments
            formatted_prompt = prompt_str.format(**prompt_arguments)

            # Add JSON formatting instruction if needed
            formatted_prompt = self.get_prompt(formatted_prompt, json_format_required)

            # Prepare messages
            messages = self.prepare_messages(formatted_prompt)

            # Get response format
            response_format = self.get_response_format(json_format_required, json_schema)

            # Prepare API call parameters
            common_params = {
                "model": self.llm_model,
                "messages": messages,
                "api_key": self.api_key,
                "temperature": self.temperature,
                "max_completion_tokens": self.max_tokens,
            }

            # Add response format if specified
            if response_format:
                common_params["response_format"] = response_format

            # Make the API call using litellm with rate limiting
            logger.info(f"LiteLLM API call started for model: {self.llm_model}")

            # Get response with rate limiting
            response = await self.invoke_llm_with_rate_limiting(common_params)

            # Extract and return content with token info
            if response and response.choices and len(response.choices) > 0:
                content = response.choices[0].message.content

                # Extract token usage and print
                token_info = self.extract_token_info(response)
                self.print_token_usage(token_info)

                if content and content.strip():
                    return content.strip(), token_info

            logger.warning("Empty response from LiteLLM API")
            provider = self.get_provider_from_model()
            return "", {
                "provider": provider,
                "model": self.llm_model,
                "input_tokens": 0,
                "output_tokens": 0,
                "total_tokens": 0,
            }
        except Exception as e:
            logger.error(f"LiteLLM error: {str(e)}")
            raise
