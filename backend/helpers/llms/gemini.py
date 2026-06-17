import asyncio
import logging
import time
from asyncio import Semaphore

from dotenv import load_dotenv
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel

from apps.agents.commons.constants import LLMProviders
from helpers.llms.exceptions import QuotaExceededException
from helpers.utils import time_it
from main.settings import GEMINI_API_KEY

load_dotenv()
logger = logging.getLogger(__name__)


class GeminiLLM:
    def __init__(self, api_key, llm_model, temperature=0, max_tokens=20000):
        self.llm_model = llm_model
        if not self.llm_model:
            raise ValueError("LLM model is required")

        self.api_key = api_key
        if not self.api_key or self.api_key.strip() == "":
            raise ValueError(
                "API key is required but not provided. Please check your LLM model API Key in environment variable."
            )

        self.llm_model = llm_model if llm_model else "claude-sonnet-4-20250514"
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.semaphore = Semaphore(3)

    @time_it
    def get_prompt(self, prompt_str, parser_required=False):
        # Define the prompt template
        if parser_required:
            prompt_str += (
                "\n\n**FORMAT INSTRUCTIONS (CRITICAL)** {format_instruction}\n\n"
                "IMPORTANT: Return ONLY valid JSON that matches the schema exactly. "
                "No additional text, explanations, or markdown formatting."
            )

        prompt = PromptTemplate.from_template(prompt_str)
        return prompt

    @time_it
    def get_llm_chain(self, prompt, llm):
        chain = prompt | llm
        return chain

    @time_it
    def get_output_parser(self, pydantic_object):
        output_parser = PydanticOutputParser(pydantic_object=pydantic_object)
        return output_parser

    @time_it
    def print_token_usage(self, token_info):
        """Print token usage information"""
        if token_info.get("input_tokens", 0) > 0 or token_info.get("output_tokens", 0) > 0:
            print(f"🔢 Gemini Token Usage - Model: {self.llm_model}")
            print(f"   📥 Input tokens: {token_info['input_tokens']}")
            print(f"   📤 Output tokens: {token_info['output_tokens']}")
            print(f"   📊 Total tokens: {token_info['total_tokens']}")

    @time_it
    def extract_token_info(self, raw_response):
        """Extract token usage information from raw response"""
        response_metadata = getattr(raw_response, "response_metadata", {})
        usage_info = response_metadata.get("usage", {})

        token_info = {"provider": LLMProviders.GEMINI, "input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
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

        # Handle different response formats
        text_content = content

        # Case 1: content is a list with dict elements containing 'text' key
        if isinstance(content, list) and len(content) > 0:
            if isinstance(content[0], dict) and "text" in content[0]:
                print(f"🔍 _clean_json_content: list[dict] with 'text' key")
                text_content = content[0]["text"]
            elif isinstance(content[0], str):
                print(f"🔍 _clean_json_content: list[str]")
                text_content = content[0]
            else:
                print(f"🔍 _clean_json_content: list[{type(content[0]).__name__}] (converted to str)")
                text_content = str(content[0])

        # Case 2: content is already a string
        elif isinstance(content, str):
            print(f"🔍 _clean_json_content: str")
            text_content = content

        # Case 3: content is some other type, convert to string
        else:
            print(f"🔍 _clean_json_content: {type(content).__name__} (converted to str)")
            text_content = str(content)

        # PRESERVE LATEX COMMANDS FIRST - before any other cleaning
        latex_commands = [
            r"\frac",
            r"\sqrt",
            r"\sum",
            r"\int",
            r"\prod",
            r"\lim",
            r"\alpha",
            r"\beta",
            r"\gamma",
            r"\delta",
            r"\epsilon",
            r"\theta",
            r"\lambda",
            r"\mu",
            r"\pi",
            r"\sigma",
            r"\phi",
            r"\psi",
            r"\omega",
            r"\Delta",
            r"\Gamma",
            r"\Lambda",
            r"\Omega",
            r"\Phi",
            r"\Pi",
            r"\Psi",
            r"\sin",
            r"\cos",
            r"\tan",
            r"\log",
            r"\ln",
            r"\exp",
            r"\left",
            r"\right",
            r"\begin",
            r"\end",
            r"\cdot",
            r"\times",
            r"\div",
            r"\pm",
            r"\mp",
            r"\le",
            r"\ge",
            r"\ne",
            r"\approx",
            r"\equiv",
            r"\infty",
            r"\partial",
            r"\nabla",
            r"\angle",
        ]

        preserved_latex = {}
        cleaned = text_content

        # Preserve LaTeX commands by replacing with unique placeholders
        for i, cmd in enumerate(latex_commands):
            if cmd in cleaned:
                placeholder = f"__LATEX_CMD_{i}__"
                preserved_latex[placeholder] = cmd
                cleaned = cleaned.replace(cmd, placeholder)
                print(f"📐 Preserved LaTeX command: {cmd} -> {placeholder}")

        # Replace smart quotes with regular quotes and other problematic characters
        cleaned = cleaned.replace('"', '"').replace('"', '"').replace(""", "'").replace(""", "'")

        # Clean Unicode escape sequences (convert \u20b9 to ₹, etc.)
        cleaned = self._clean_unicode_escapes(cleaned)

        # Also clean up any triple quotes or other problematic markdown
        cleaned = cleaned.replace("```json", "").replace("```", "").strip()

        # Additional cleanup for common LLM artifacts
        cleaned = cleaned.replace("**", "").replace("##", "").replace("###", "")

        # Fix invalid escape sequences that commonly occur in LLM responses
        import re

        # Fix cases like \n\The -> \n\nThe (missing newline after \n)
        cleaned = re.sub(r"\\n\\([A-Z])", r"\\n\\n\1", cleaned)
        # Fix cases like \\The -> \nThe (backslash before capital letter)
        cleaned = re.sub(r"\\([A-Z][a-z])", r"\n\1", cleaned)
        # ONLY do escape sequence cleaning if no LaTeX placeholders are present
        # This prevents corruption of mathematical notation
        if not preserved_latex:
            # Fix any remaining invalid escape sequences by escaping the backslash
            # But be careful not to break valid escapes like \n, \t, \", \\, etc.
            valid_escapes = ["n", "t", "r", "b", "f", "v", "0", '"', "'", "\\", "/"]
            for char in valid_escapes:
                # Temporarily replace valid escapes with placeholders
                cleaned = cleaned.replace(f"\\{char}", f"__VALID_ESC_{char}__")
            # Now escape any remaining backslashes
            cleaned = cleaned.replace("\\", "\\\\")
            # Restore valid escapes
            for char in valid_escapes:
                cleaned = cleaned.replace(f"__VALID_ESC_{char}__", f"\\{char}")
        else:
            print(f"📐 Skipping aggressive escape cleaning due to LaTeX content")

        # RESTORE LATEX COMMANDS LAST - after all other cleaning
        for placeholder, latex_cmd in preserved_latex.items():
            cleaned = cleaned.replace(placeholder, latex_cmd)
            print(f"📐 Restored LaTeX command: {placeholder} -> {latex_cmd}")

        print(f"🧹 Original length: {len(text_content)}, Cleaned length: {len(cleaned)}")

        # Check for specific problematic characters
        has_triple_quotes = "```" in text_content
        has_smart_quotes = any(char in text_content for char in ['"', '"', """, """])
        has_latex = bool(preserved_latex)

        if has_triple_quotes:
            print(f"🚨 Found triple quotes in original content!")
        if has_smart_quotes:
            print(f"🚨 Found smart quotes in original content!")
        if has_latex:
            print(f"📐 Found and preserved {len(preserved_latex)} LaTeX commands!")

        if len(text_content) != len(cleaned) or has_triple_quotes or has_smart_quotes or has_latex:
            print(f"🧹 Original content (first 300 chars): {repr(text_content[:300])}...")
            print(f"🧹 Cleaned content (first 300 chars): {repr(cleaned[:300])}...")

        return cleaned

    @time_it
    def _clean_unicode_escapes(self, content):
        """Convert Unicode escape sequences to actual characters"""
        if not content:
            return content

        import re

        # Pattern to match Unicode escape sequences like \u20b9
        unicode_pattern = r"\\u[0-9a-fA-F]{4}"

        def decode_unicode(match):
            try:
                # Convert \uXXXX to actual character
                return match.group(0).encode().decode("unicode_escape")
            except:
                # If conversion fails, return original
                return match.group(0)

        # Replace all Unicode escape sequences
        cleaned = re.sub(unicode_pattern, decode_unicode, content)

        # Log if any Unicode escapes were found and converted
        if cleaned != content:
            import re

            found_escapes = re.findall(unicode_pattern, content)
            print(
                f"🔤 Converted {len(found_escapes)} Unicode escape sequences: {found_escapes[:5]}{'...' if len(found_escapes) > 5 else ''}"
            )

        return cleaned

    @time_it
    def is_quota_exceeded_gemini_error(self, exception):
        """Detect if Gemini error is quota exceeded vs rate limiting"""

        error_str = str(exception)
        error_str_lower = error_str.lower()

        # Check for Google-specific quota indicators
        quota_indicators = [
            "resource_exhausted",
            "quota exceeded for metric",
            "exceeded your current quota",
            "check your plan and billing details",
            "quota exceeded",
            "free_tier_input_token_count",
            "free_tier_requests",
            "billing details",
        ]

        # Check for quota patterns in error message
        for indicator in quota_indicators:
            if indicator in error_str_lower:
                return True

        # Check for status code 429 combined with quota-related messages
        if "429" in error_str and any(
            indicator in error_str_lower for indicator in ["quota", "billing", "resource_exhausted"]
        ):
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
                # remaining_wait = 60 - request_duration
                if request_duration < 60:
                    print(f"Request took {request_duration:.1f}s. ")
                    # f"Waiting additional {remaining_wait:.1f}s to maintain TPM limits")
                    # await asyncio.sleep(remaining_wait)
                return raw_response
            except Exception as e:
                if self.is_quota_exceeded_gemini_error(e):
                    # Quota exceeded - don't retry, raise QuotaExceededException
                    raise QuotaExceededException(
                        f"Gemini API quota exceeded: {str(e)}", provider=LLMProviders.GEMINI, original_error=e
                    )
                else:
                    # Re-raise the original exception for other error types
                    raise

    @time_it
    def _fix_base64_data_urls(self, content):
        """Fix truncated base64 data URLs"""
        import re

        # Handle different response formats
        text_content = content

        # Case 1: content is a list with dict elements containing 'text' key
        if isinstance(content, list) and len(content) > 0:
            if isinstance(content[0], dict) and "text" in content[0]:
                print(f"🔍 _fix_base64_data_urls: list[dict] with 'text' key")
                text_content = content[0]["text"]
            elif isinstance(content[0], str):
                print(f"🔍 _fix_base64_data_urls: list[str]")
                text_content = content[0]
            else:
                print(f"🔍 _fix_base64_data_urls: list[{type(content[0]).__name__}] (converted to str)")
                text_content = str(content[0])

        # Case 2: content is already a string
        elif isinstance(content, str):
            print(f"🔍 _fix_base64_data_urls: str")
            text_content = content

        # Case 3: content is some other type, convert to string
        else:
            print(f"🔍 _fix_base64_data_urls: {type(content).__name__} (converted to str)")
            text_content = str(content)

        # Find all data URLs in the content
        data_url_pattern = r"data:image/[^;]+;base64,([A-Za-z0-9+/]+={0,2})"

        def fix_base64_match(match):
            base64_part = match.group(1)
            # Check if base64 is properly padded
            missing_padding = len(base64_part) % 4
            if missing_padding:
                base64_part += "=" * (4 - missing_padding)
                print(f"🔧 Fixed base64 padding: added {4 - missing_padding} padding characters")
            return f"data:image/{match.group(0).split('/')[1].split(';')[0]};base64,{base64_part}"

        return re.sub(data_url_pattern, fix_base64_match, text_content)

    @time_it
    def is_schema_response(self, content):
        """Detect if response is schema definition instead of actual data"""
        try:
            # Check if content is a dict containing schema indicators
            if isinstance(content, dict):
                # Check for JSON schema indicators
                schema_indicators = ["$defs", "properties", "$schema", "definitions"]
                if any(indicator in content for indicator in schema_indicators):
                    print(f"🚨 Gemini: Detected schema response instead of data!")
                    return True

                # Check if it has schema structure but no actual questions data
                if "properties" in str(content) and "questions" not in content:
                    print(f"🚨 Gemini: Detected schema structure without data!")
                    return True

            # Check if content is a string containing schema-like content
            elif isinstance(content, str):
                schema_keywords = ['"$defs":', '"properties":', '"required":', '"type": "object"']
                if any(keyword in content for keyword in schema_keywords):
                    print(f"🚨 Gemini: Detected schema in string response!")
                    return True

            return False
        except Exception as e:
            print(f"⚠️ Gemini: Error checking schema response: {e}")
            return False

    @time_it
    def handle_pydantic_response(self, response, expected_pydantic_class):
        """Handle responses from LangChain pydantic parsing that might be malformed"""
        try:
            # If response is already the expected pydantic object, return it
            if isinstance(response, expected_pydantic_class):
                return response

            # If response is a list, convert to proper format for objects with 'questions' field
            if isinstance(response, list):
                print(f"🔧 Gemini: Converting LangChain array response to proper format")
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
            print(f"❌ Gemini: Error handling LangChain response: {e}")
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
    async def _get_single_response(self, prompt_str, prompt_arguments, parser_required=False, **parser_info):
        """Get a single response without retry logic"""
        output_parser = None
        if parser_required:
            pydantic_object = parser_info.get("pydantic_object", None)
            if not pydantic_object or not issubclass(pydantic_object, BaseModel):
                raise Exception("Pydantic Object is mandatory if parser_required=True")

            output_parser = self.get_output_parser(pydantic_object)
            prompt_arguments["format_instruction"] = output_parser.get_format_instructions()

        prompt = self.get_prompt(prompt_str, parser_required)
        gemini_llm = ChatGoogleGenerativeAI(
            model=self.llm_model, temperature=self.temperature, api_key=self.api_key, max_tokens=self.max_tokens
        )

        llm_chain = self.get_llm_chain(prompt, llm=gemini_llm)

        # Get raw response with rate limiting
        raw_response = await self.invoke_llm_with_rate_limiting(llm_chain, prompt_arguments)

        # Extract token usage
        token_info = self.extract_token_info(raw_response)

        # Parse the content if parser is required
        if output_parser:
            # Clean smart quotes from JSON response before parsing
            cleaned_content = self._clean_json_content(raw_response.content)
            # Fix any truncated base64 data URLs
            cleaned_content = self._fix_base64_data_urls(cleaned_content)

            # Check if response is schema instead of data
            if self.is_schema_response(cleaned_content):
                raise ValueError("Schema response detected instead of actual data")

            parsed_response = output_parser.parse(cleaned_content)
            # Handle potential pydantic response issues
            pydantic_object = parser_info.get("pydantic_object", None)
            if pydantic_object:
                response = self.handle_pydantic_response(parsed_response, pydantic_object)
            else:
                response = parsed_response
        else:
            # Fix base64 data URLs in non-parsed responses too
            response_content = self._fix_base64_data_urls(raw_response.content)
            response = type(raw_response)(content=response_content)
            # Copy other attributes if needed
            for attr in ["response_metadata", "usage_metadata"]:
                if hasattr(raw_response, attr):
                    setattr(response, attr, getattr(raw_response, attr))

        return response, token_info

    @time_it
    async def get_response_with_retry(
        self, prompt_str, prompt_arguments, parser_required=False, max_retries=2, **parser_info
    ):
        """Get response with intelligent retry logic for schema confusion"""
        original_prompt_str = prompt_str
        total_token_info = {"provider": LLMProviders.GEMINI, "input_tokens": 0, "output_tokens": 0, "total_tokens": 0}

        for attempt in range(max_retries + 1):
            try:
                response, token_info = await self._get_single_response(
                    prompt_str, prompt_arguments, parser_required, **parser_info
                )

                # Accumulate token usage
                total_token_info["input_tokens"] += token_info["input_tokens"]
                total_token_info["output_tokens"] += token_info["output_tokens"]
                total_token_info["total_tokens"] += token_info["total_tokens"]

                # Print accumulated token usage
                self.print_token_usage(total_token_info)
                return response, total_token_info

            except Exception as e:
                error_str = str(e)
                error_type = await self.categorize_gemini_error(error_str)
                if attempt < max_retries:
                    print(f"🔄 Gemini: Retrying due to {error_type} (attempt {attempt + 1}/{max_retries + 1})")
                    prompt_str = self.get_retry_prompt(original_prompt_str, attempt + 1, error_type)
                    continue
                else:
                    logger.error(f"Gemini error after {max_retries + 1} attempts: {str(e)}")
                    raise

    @time_it
    async def get_response(self, prompt_str, prompt_arguments, parser_required=False, max_retries=1, **parser_info):
        """Main entry point - delegates to retry logic by default"""
        return await self.get_response_with_retry(
            prompt_str, prompt_arguments, parser_required, max_retries, **parser_info
        )

    async def categorize_gemini_error(self, error_str):
        """Categorize different types of Gemini parsing failures"""

        if "Input to PromptTemplate is missing variables" in error_str:
            return "template_error"
        elif "Schema response detected" in error_str or "$defs" in error_str:
            return "schema_confusion"
        elif "validation error for QuestionsResponseSerializer" in error_str:
            return "structure_error"
        elif "Field required" in error_str:
            return "missing_fields"
        else:
            return "general_parsing_error"

    async def get_retry_prompt(self, original_prompt, attempt_number, error_type):
        """Generate progressively stronger retry prompts"""

        if error_type == "schema_confusion":
            retry_prompt_string = ""
            if attempt_number == 1:
                retry_prompt_string = """
                                           CRITICAL: You returned a JSON schema instead of actual question data.
                                            Please generate actual educational questions with real content.
                                        """
            elif attempt_number == 2:
                retry_prompt_string = """
                                ***SCHEMA ERROR DETECTED***: You provided format specifications instead of data.

                                REQUIRED: Generate actual questions like this example following FORMAT INSTRUCTIONS (CRITICAL) SECTION:
                                {{
                                  "questions": [
                                    {{
                                      "type_of_question": "mcq",
                                      "question": "What process is shown in this diagram?",
                                      "class_field": 7,
                                      "difficulty_level": "medium",
                                      "options": ["Photosynthesis", "Respiration", "Digestion", "Circulation"],
                                      "answer": "A. Photosynthesis"
                                    }}
                                  ]
                                }}
                                Generate REAL questions with actual educational content, not format examples.
                            """

        elif error_type == "template_error":
            # Handle the specific template variable issue
            retry_prompt_string = """
                TEMPLATE ERROR DETECTED: Return valid JSON data only.
                Use actual question content, not template placeholders.
                """
        else:
            retry_prompt_string = """
                    PARSING ERROR: Please return valid JSON that exactly matches the required format.
                """

        return original_prompt + retry_prompt_string


async def main():
    llm = GeminiLLM(GEMINI_API_KEY, llm_model="gemini-3-pro-image-preview", temperature=0.3)
    response, token_info = await llm.get_response("What are the 7 wonders of the world", {}, parser_required=False)
    print(token_info)


if __name__ == "__main__":
    asyncio.run(main())
