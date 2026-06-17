import asyncio
import logging
import time
from asyncio import Semaphore

from anthropic import BadRequestError
from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import PromptTemplate
from pydantic import BaseModel

from apps.agents.commons.constants import LLMProviders
from helpers.llms.exceptions import QuotaExceededException
from helpers.utils import time_it
from main.settings import ANTHROPIC_API_KEY

load_dotenv()
logger = logging.getLogger(__name__)


class ClaudeLLM:
    def __init__(self, api_key, llm_model, temperature=0, max_tokens=20000):
        self.llm_model = llm_model
        if not self.llm_model:
            raise ValueError("LLM model is required")

        self.api_key = api_key
        if not self.api_key or self.api_key.strip() == "":
            raise ValueError(
                "API key is required but not provided. Please check your LLM model API Key in environment variable."
            )

        self.llm_model = llm_model if llm_model else "claude-opus-4-5"
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.semaphore = Semaphore(3)

    @time_it
    def get_prompt(self, prompt_str, parser_required=False):
        # Define the prompt template
        if parser_required:
            prompt_str += "\n\n{format_instruction}\n\nIMPORTANT: Return ONLY valid JSON that matches the schema exactly. No additional text, explanations, or markdown formatting."

        prompt = PromptTemplate.from_template(prompt_str)
        return prompt

    @time_it
    def get_llm_chain(self, prompt, claude_llm):
        chain = prompt | claude_llm
        return chain

    @time_it
    def get_output_parser(self, pydantic_object):
        output_parser = PydanticOutputParser(pydantic_object=pydantic_object)
        return output_parser

    @time_it
    def print_token_usage(self, token_info):
        """Print token usage information"""
        if token_info.get("input_tokens", 0) > 0 or token_info.get("output_tokens", 0) > 0:
            print(f"🔢 Claude Token Usage - Model: {self.llm_model}")
            print(f"   📥 Input tokens: {token_info['input_tokens']}")
            print(f"   📤 Output tokens: {token_info['output_tokens']}")
            print(f"   📊 Total tokens: {token_info['total_tokens']}")

    @time_it
    def extract_token_info(self, raw_response):
        """Extract token usage information from raw response"""
        response_metadata = getattr(raw_response, "response_metadata", {})
        usage_info = response_metadata.get("usage", {})

        token_info = {"provider": LLMProviders.CLAUDE, "input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
        if usage_info:
            token_info["input_tokens"] = usage_info.get("input_tokens", 0)
            token_info["output_tokens"] = usage_info.get("output_tokens", 0)
            token_info["total_tokens"] = token_info["input_tokens"] + token_info["output_tokens"]

        return token_info

    @time_it
    def _clean_json_content(self, content):
        """Clean JSON content by replacing smart quotes with regular quotes"""
        if not content:
            return content

        # Replace smart quotes with regular quotes
        cleaned = content.replace('"', '"').replace('"', '"').replace(""", "'").replace(""", "'")
        return cleaned

    @time_it
    def is_quota_exceeded_claude_error(self, exception):
        """Detect if Claude error is quota exceeded vs rate limiting"""

        error_str = str(exception)
        error_str_lower = error_str.lower()

        # Check for Claude-specific quota indicators
        quota_indicators = [
            "credit balance is too low",
            "plans & billing",
            "upgrade or purchase credits",
            "billing",
            "credits",
            "credit balance",
            "payment required",
            "quota exceeded",
            "usage limit",
        ]

        # Check for quota patterns in error message
        for indicator in quota_indicators:
            if indicator in error_str_lower:
                return True

        # Check for BadRequestError with billing messages
        if isinstance(exception, BadRequestError):
            if any(indicator in error_str_lower for indicator in quota_indicators):
                return True

        return False

    @time_it
    async def invoke_llm_with_rate_limiting(self, llm_chain, prompt_arguments):
        """Handle LLM invocation with semaphore and rate limiting"""
        async with self.semaphore:
            try:
                start_time = time.time()
                raw_response = await llm_chain.ainvoke(prompt_arguments)
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
                return raw_response
            except Exception as e:
                if self.is_quota_exceeded_claude_error(e):
                    # Quota exceeded - don't retry, raise QuotaExceededException
                    raise QuotaExceededException(
                        f"Claude API quota exceeded: {str(e)}", provider=LLMProviders.CLAUDE, original_error=e
                    )
                else:
                    # Re-raise the original exception for other error types
                    raise

    @time_it
    def handle_pydantic_response(self, response, expected_pydantic_class):
        """Handle responses from LangChain pydantic parsing that might be malformed"""
        try:
            # If response is already the expected pydantic object, return it
            if isinstance(response, expected_pydantic_class):
                return response

            # If response is a list, convert to proper format for objects with 'questions' field
            if isinstance(response, list):
                print(f"🔧 Claude: Converting LangChain array response to proper format")
                # Check if the expected class has a 'questions' field
                if hasattr(expected_pydantic_class, "__fields__") and "questions" in expected_pydantic_class.__fields__:
                    return expected_pydantic_class(questions=response)
                else:
                    # For other pydantic classes, try to create with the list as the first field
                    field_names = list(expected_pydantic_class.__fields__.keys())
                    if field_names:
                        return expected_pydantic_class(**{field_names[0]: response})

            # If response is already a dict, try to create the object directly
            if isinstance(response, dict):
                return expected_pydantic_class(**response)

        except Exception as e:
            print(f"❌ Claude: Error handling LangChain response: {e}")
            # Return a default object with empty data
            if hasattr(expected_pydantic_class, "__fields__") and "questions" in expected_pydantic_class.__fields__:
                return expected_pydantic_class(questions=[])
            else:
                # Create empty object with default values
                field_names = list(expected_pydantic_class.__fields__.keys())
                if field_names:
                    return expected_pydantic_class(**{field_names[0]: []})

        return response

    @time_it
    async def get_response(self, prompt_str, prompt_arguments, parser_required=False, **parser_info):
        try:
            output_parser = None
            if parser_required:
                pydantic_object = parser_info.get("pydantic_object", None)
                if not pydantic_object or not issubclass(pydantic_object, BaseModel):
                    raise Exception("Pydantic Object is mandatory if parser_required=True")

                output_parser = self.get_output_parser(pydantic_object)
                prompt_arguments["format_instruction"] = output_parser.get_format_instructions()

            prompt = self.get_prompt(prompt_str, parser_required)
            claude_llm = ChatAnthropic(
                model=self.llm_model, temperature=self.temperature, api_key=self.api_key, max_tokens=self.max_tokens
            )

            llm_chain = self.get_llm_chain(prompt, claude_llm=claude_llm)

            # Get raw response with rate limiting
            raw_response = await self.invoke_llm_with_rate_limiting(llm_chain, prompt_arguments)

            # Extract token usage and print
            token_info = self.extract_token_info(raw_response)
            self.print_token_usage(token_info)

            # Parse the content if parser is required
            if output_parser:
                # Clean smart quotes from JSON response before parsing
                cleaned_content = self._clean_json_content(raw_response.content)
                parsed_response = output_parser.parse(cleaned_content)
                # Handle potential pydantic response issues
                pydantic_object = parser_info.get("pydantic_object", None)
                if pydantic_object:
                    claude_response = self.handle_pydantic_response(parsed_response, pydantic_object)
                else:
                    claude_response = parsed_response
            else:
                claude_response = raw_response

            return claude_response, token_info

        except Exception as e:
            print(str(e))
            raise


async def main():
    claude_llm = ClaudeLLM(ANTHROPIC_API_KEY, temperature=0.3, llm_model="claude-sonnet-4-20250514")
    response, token_info = await claude_llm.get_response(
        "What are the 7 wonders of the world", {}, parser_required=False
    )
    print(token_info)


if __name__ == "__main__":
    asyncio.run(main())
