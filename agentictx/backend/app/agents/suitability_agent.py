"""Suitability Agent — one-shot non-streaming call.

Receives a delegation cluster + cognitive map context,
returns structured suitability scores across 9 dimensions.
"""
import json
import uuid
from typing import Any

from app.agents.prompts.suitability_agent import SUITABILITY_SYSTEM_PROMPT
from app.schemas.discovery import SuitabilityScores
from app.services.llm_client import get_anthropic_client, fast_model


def _build_scoring_prompt(
    cluster_name: str,
    cluster_purpose: str | None,
    cognitive_jtds: list[dict[str, Any]],
    lived_jtds: list[dict[str, Any]],
) -> str:
    lines = [
        f"## Delegation Cluster: {cluster_name}",
    ]
    if cluster_purpose:
        lines.append(f"**Purpose:** {cluster_purpose}")

    lines.append("\n### Cognitive JTDs in this cluster:")
    for jtd in cognitive_jtds:
        desc = jtd.get("description", "")
        zone = jtd.get("cognitive_zone", "")
        intensity = jtd.get("load_intensity", "?")
        lines.append(f"- {desc} (zone: {zone}, intensity: {intensity}/3)")

    if lived_jtds:
        lines.append("\n### Associated Lived JTDs (context):")
        for jtd in lived_jtds:
            desc = jtd.get("description", "")
            sys_ctx = jtd.get("system_context", "")
            lines.append(f"- {desc}" + (f" [{sys_ctx}]" if sys_ctx else ""))

    lines.append("\nScore this delegation cluster across all nine dimensions.")
    return "\n".join(lines)


async def score_cluster(
    cluster_id: uuid.UUID,
    cluster_name: str,
    cluster_purpose: str | None,
    cognitive_jtds: list[dict[str, Any]],
    lived_jtds: list[dict[str, Any]],
) -> SuitabilityScores:
    """
    Call the Suitability Agent and return parsed SuitabilityScores.
    Raises ValueError if the response cannot be parsed.
    """
    client = get_anthropic_client()

    prompt = _build_scoring_prompt(
        cluster_name=cluster_name,
        cluster_purpose=cluster_purpose,
        cognitive_jtds=cognitive_jtds,
        lived_jtds=lived_jtds,
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
        raise ValueError(f"Suitability agent returned non-JSON response: {e}\nRaw: {raw_text}")

    return SuitabilityScores(**scores_dict)
