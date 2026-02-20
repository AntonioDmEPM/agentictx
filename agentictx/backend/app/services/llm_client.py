"""Anthropic client factory — never hardcodes model names or API keys."""
import anthropic

from app.core.config import settings


def get_anthropic_client() -> anthropic.AsyncAnthropic:
    return anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)


def reasoning_model() -> str:
    return settings.llm_reasoning_model


def fast_model() -> str:
    return settings.llm_fast_model
