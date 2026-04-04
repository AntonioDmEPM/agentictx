"""Readiness Agent — one-shot non-streaming call.

Receives an agent scope + cognitive map context,
returns structured readiness scores across 9 dimensions.
"""
import json
import uuid
from typing import Any

from app.agents.prompts.suitability_agent import SUITABILITY_SYSTEM_PROMPT
from app.schemas.discovery import ReadinessScores, SuitabilityScores
from app.services.llm_client import get_anthropic_client, fast_model


def _build_scoring_prompt(
    scope_name: str,
    scope_purpose: str | None,
    cognitive_items: list[dict[str, Any]],
    activities: list[dict[str, Any]],
) -> str:
    lines = [
        f"## Agent Scope: {scope_name}",
    ]
    if scope_purpose:
        lines.append(f"**Purpose:** {scope_purpose}")

    lines.append("\n### Cognitive Load Items in this scope:")
    for item in cognitive_items:
        desc = item.get("description", "")
        zone = item.get("cognitive_zone", "")
        intensity = item.get("load_intensity", "?")
        lines.append(f"- {desc} (zone: {zone}, intensity: {intensity}/3)")

    if activities:
        lines.append("\n### Associated Activities (context):")
        for activity in activities:
            desc = activity.get("description", "")
            sys_ctx = activity.get("system_context", "")
            lines.append(f"- {desc}" + (f" [{sys_ctx}]" if sys_ctx else ""))

    lines.append("\nScore this agent scope across all nine dimensions.")
    return "\n".join(lines)


async def score_scope(
    scope_id: uuid.UUID,
    scope_name: str,
    scope_purpose: str | None,
    cognitive_items: list[dict[str, Any]],
    activities: list[dict[str, Any]],
) -> ReadinessScores:
    """
    Call the Readiness Agent and return parsed ReadinessScores.
    Raises ValueError if the response cannot be parsed.
    """
    client = get_anthropic_client()

    prompt = _build_scoring_prompt(
        scope_name=scope_name,
        scope_purpose=scope_purpose,
        cognitive_items=cognitive_items,
        activities=activities,
    )

    response = await client.messages.create(
        model=fast_model(),
        max_tokens=512,
        system=SUITABILITY_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    raw_text = ""
    for block in response.content:
        if block.type == "text":
            raw_text += block.text

    # Extract JSON from the response (may be wrapped in markdown code fences)
    raw_text = raw_text.strip()
    if raw_text.startswith("```"):
        lines = raw_text.split("\n")
        # Drop first and last fence lines
        inner = "\n".join(lines[1:-1]) if lines[-1].startswith("```") else "\n".join(lines[1:])
        raw_text = inner.strip()

    try:
        scores_dict = json.loads(raw_text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Readiness agent returned non-JSON response: {e}\nRaw: {raw_text}")

    return ReadinessScores(**scores_dict)


# Keep old name as alias for backward compatibility
score_cluster = score_scope
