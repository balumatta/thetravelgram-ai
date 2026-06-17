import asyncio
import time
from asyncio import Semaphore

from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from apps.agents.commons.constants import LLMProviders


class OpenAILLM:
    def __init__(self, openai_api_key, llm_model=None, temperature=0.4, max_tokens=12000):
        self.openai_api_key = openai_api_key
        self.llm_model = llm_model if llm_model else "gpt-4o"
        self.temperature = temperature
        self.max_tokens = max_tokens

        self.semaphore = Semaphore(3)

    def get_prompt(self, prompt_str, parser_required=False):
        # Define the prompt template
        if parser_required:
            prompt_str += "output format instruction : {format_instruction}"

        prompt = PromptTemplate.from_template(prompt_str)
        return prompt

    def get_llm_chain(self, prompt, openai_llm):
        chain = prompt | openai_llm
        return chain

    def get_output_parser(self, pydantic_object):
        output_parser = PydanticOutputParser(pydantic_object=pydantic_object)
        # output_parser = JsonOutputParser(pydantic_object=pydantic_object)
        return output_parser

    def print_token_usage(self, token_info):
        """Print token usage information"""
        if token_info.get("input_tokens", 0) > 0 or token_info.get("output_tokens", 0) > 0:
            print(f"🔢 OpenAI Token Usage - Model: {self.llm_model}")
            print(f"   📥 Prompt tokens: {token_info['input_tokens']}")
            print(f"   📤 Completion tokens: {token_info['output_tokens']}")
            print(f"   📊 Total tokens: {token_info['total_tokens']}")

    def extract_token_info(self, raw_response):
        """Extract token usage information from raw response"""
        response_metadata = getattr(raw_response, "response_metadata", {})
        usage_info = response_metadata.get("usage", {})

        token_info = {"provider": LLMProviders.OPENAI_GPT, "input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
        if usage_info:
            token_info["input_tokens"] = usage_info.get("prompt_tokens", 0)
            token_info["output_tokens"] = usage_info.get("completion_tokens", 0)
            token_info["total_tokens"] = usage_info.get("total_tokens", 0)

        return token_info

    async def invoke_llm_with_rate_limiting(self, llm_chain, prompt_arguments):
        """Handle LLM invocation with semaphore and rate limiting"""
        async with self.semaphore:
            try:
                start_time = time.time()
                raw_response = await llm_chain.ainvoke(prompt_arguments)
                end_time = time.time()

                request_duration = end_time - start_time
                remaining_wait = 60 - request_duration
                if request_duration < 60:
                    print(
                        f"Request took {request_duration:.1f}s. "
                        f"Waiting additional {remaining_wait:.1f}s to maintain TPM limits"
                    )
                    await asyncio.sleep(remaining_wait)
                return raw_response
            except Exception as e:
                if "rate limit" in str(e).lower():
                    print(f"OpenAI Rate limit hit: {str(e)} \n Waiting for 60s")
                    await asyncio.sleep(60)
                    return await llm_chain.ainvoke(prompt_arguments)
                else:
                    raise

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
            llm = ChatOpenAI(
                model=self.llm_model,
                temperature=self.temperature,
                openai_api_key=self.openai_api_key,
                model_kwargs={"response_format": {"type": "json_object"}},
            )

            llm_chain = self.get_llm_chain(prompt, openai_llm=llm)

            # Get raw response with rate limiting
            raw_response = await self.invoke_llm_with_rate_limiting(llm_chain, prompt_arguments)

            # Extract token usage and print
            token_info = self.extract_token_info(raw_response)
            self.print_token_usage(token_info)

            # Parse the content if parser is required
            if output_parser:
                openai_response = output_parser.parse(raw_response.content)
            else:
                openai_response = raw_response

            return openai_response, token_info
        except Exception as e:
            print(str(e))
            raise
