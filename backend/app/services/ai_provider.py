"""The single structured Claude call.

Assembles one request, validates the model's output against the resource's existing
Pydantic schema, retries once silently on malformed output, then fails. Token counts
and computed cost come back on the result so the caller can persist an ai_usage row.

ANTHROPIC_API_KEY is read only here, server-side, and never returned or logged.
"""

import json
from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from anthropic import Anthropic
from pydantic import BaseModel, ValidationError

from app.core.config import settings
from app.core.errors import AppError
from app.schemas.business_cases import LeanBusinessCaseBase
from app.schemas.discovery import DiscoveryFindingsBase
from app.schemas.strategy import StrategicObjectiveBase

RESOURCE_SCHEMAS: dict[str, type[BaseModel]] = {
    "strategic_objective": StrategicObjectiveBase,
    "lean_business_case": LeanBusinessCaseBase,
    "discovery": DiscoveryFindingsBase,
}

_MICRO = Decimal(1_000_000)

SYSTEM_PROMPT = (
    "You are a strategy assistant that drafts structured field values for a strategic "
    "lifecycle planning tool. You are given a user's answers to a short questionnaire and, "
    "when relevant, the linked parent record. Produce a single JSON object whose keys are the "
    "camelCase field names from the provided schema. Only include fields you can reasonably "
    "populate from the answers and context; omit any field you have no basis for. Use enum "
    "values exactly as listed in the schema. Format dates as YYYY-MM-DD. Never invent or set "
    "status, identifiers, workspace, ownership, or audit fields. Respond with the JSON object "
    "only — no prose, no markdown fences."
)


@dataclass(frozen=True)
class GenerationResult:
    fields: dict[str, Any]
    model: str
    input_tokens: int
    output_tokens: int
    input_price_per_mtok: Decimal
    output_price_per_mtok: Decimal
    cost_usd: Decimal


def _build_user_prompt(
    resource_type: str,
    answers: dict[str, str],
    context: dict[str, Any],
    schema_cls: type[BaseModel],
) -> str:
    schema = schema_cls.model_json_schema(by_alias=True)
    payload = {
        "resourceType": resource_type,
        "questionnaireAnswers": answers,
        "linkedContext": context,
        "targetSchema": schema,
    }
    return (
        "Draft field values for this resource. Populate only the fields defined in "
        "targetSchema, using questionnaireAnswers and linkedContext.\n\n"
        + json.dumps(payload, ensure_ascii=False)
    )


def _first_text(response: Any) -> str:
    for block in response.content:
        if getattr(block, "type", None) == "text":
            text = block.text
            return text if isinstance(text, str) else ""
    return ""


def _extract_json(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("```"):
        # Drop an opening ```json / ``` fence and the trailing ```.
        stripped = stripped.split("\n", 1)[-1] if "\n" in stripped else stripped
        if stripped.endswith("```"):
            stripped = stripped[: -len("```")]
    return stripped.strip()


def _compute_cost(input_tokens: int, output_tokens: int) -> tuple[Decimal, Decimal, Decimal]:
    in_price = Decimal(str(settings.ai_input_price_per_mtok))
    out_price = Decimal(str(settings.ai_output_price_per_mtok))
    cost = (Decimal(input_tokens) / _MICRO) * in_price + (Decimal(output_tokens) / _MICRO) * out_price
    return in_price, out_price, cost.quantize(Decimal("0.000001"))


def generate_fields(
    resource_type: str,
    answers: dict[str, str],
    context: dict[str, Any],
) -> GenerationResult:
    schema_cls = RESOURCE_SCHEMAS[resource_type]
    client = Anthropic(api_key=settings.require_anthropic_api_key())
    model = settings.ai_model
    user_prompt = _build_user_prompt(resource_type, answers, context, schema_cls)

    for _attempt in range(2):
        try:
            response = client.messages.create(
                model=model,
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_prompt}],
            )
        except Exception as exc:  # SDK / network / auth failure
            raise AppError("ai_provider_error", "AI provider request failed", 502) from exc

        if getattr(response, "stop_reason", None) == "refusal":
            raise AppError("ai_provider_error", "AI provider declined the request", 502)

        try:
            data = json.loads(_extract_json(_first_text(response)))
            validated = schema_cls.model_validate(data)
        except (json.JSONDecodeError, ValidationError, ValueError, TypeError):
            continue  # malformed — silently retry once

        fields = validated.model_dump(mode="json", by_alias=True, exclude_none=True)
        input_tokens = response.usage.input_tokens
        output_tokens = response.usage.output_tokens
        in_price, out_price, cost = _compute_cost(input_tokens, output_tokens)
        return GenerationResult(
            fields=fields,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            input_price_per_mtok=in_price,
            output_price_per_mtok=out_price,
            cost_usd=cost,
        )

    raise AppError("ai_output_invalid", "AI produced output that did not match the schema", 502)
