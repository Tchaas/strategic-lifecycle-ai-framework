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

# One-line meaning of every populatable field, per resource type. Keys are the camelCase
# schema aliases the model must emit. This is what lets the model tell, e.g., a journeyMap
# from a personaFindings and keep every field distinct — the schema itself carries only names.
FIELD_GLOSSARY: dict[str, dict[str, str]] = {
    "strategic_objective": {
        "strategicInitiativeName": "Short, specific name of the strategic initiative.",
        "executiveObjective": "The leadership-level objective — what success looks like to executives.",
        "strategicValueCategory": "Enum: the primary category of strategic value this pursues.",
        "expectedBusinessOutcome": "The concrete business outcome expected once the initiative succeeds.",
        "financialImpact": "The anticipated financial impact, described in the user's terms.",
        "urgencyRationale": "Why this initiative is urgent to act on now.",
        "targetImplementationYear": "The target year for implementation.",
        "targetImplementationStartDate": "Target start date (YYYY-MM-DD) if the user indicated one.",
        "targetImplementationEndDate": "Target end date (YYYY-MM-DD) if the user indicated one.",
        "problemOpportunityStatement": "The underlying problem or opportunity the initiative addresses.",
        "costOfInaction": "The cost, risk, or consequence of not acting.",
        "currentLimitation": "The current limitation, gap, or constraint being addressed.",
        "impactedTeams": "The teams, functions, or groups affected by this initiative.",
        "problemType": "Enum: whether the problem is customer-facing, internal, or both.",
        "valueHypothesis": "The hypothesis for how and why this initiative creates value.",
        "valueMeasurementApproach": "How the realized value will be measured and tracked.",
        "expectedValueType": "Enum: the nature of the expected value.",
        "valueRealizationTimeframe": "When the value is expected to be realized.",
    },
    "lean_business_case": {
        "title": "Short, specific title for the business case.",
        "summary": "An executive summary of the case — the pitch in a few sentences.",
        "problemOpportunityStatement": "The problem or opportunity this case is built around.",
        "valueHypothesis": "The hypothesis for the value this case delivers and to whom.",
        "priority": "Enum: the case's priority.",
        "forecastCost": "Forecast cost as a number — only if the user supplied a figure.",
        "forecastValue": "Forecast value as a number — only if the user supplied a figure.",
        "valueType": "Enum: the type of value the case is expected to produce.",
    },
    "discovery": {
        "problemStatement": "The core problem under investigation — the what and the why of the issue.",
        "personaFindings": "Who the users/stakeholders are: their roles, goals, pains, and behaviours.",
        "journeyMap": "The end-to-end experience those personas move through, stage by stage, and where it breaks down.",
        "currentStateProcessMap": "How the work is actually done today — the sequence of steps, systems, and handoffs.",
        "bottleneckAnalysis": "The specific constraints, delays, and inefficiencies in the current process and their causes.",
        "dataFindings": "What the data shows — volumes, patterns, metrics, and evidence gathered.",
        "legacyConstraints": "Existing technical, organisational, or contractual constraints that limit solutions.",
        "futureStateNeeds": "The requirements and capabilities the desired future state must satisfy.",
        "discoveryMetrics": "The metrics or KPIs that will show whether the future state succeeds.",
        "governanceFindings": "Governance findings — ownership, compliance, decision rights, risk, and controls.",
    },
}

SYSTEM_PROMPT = (
    "You are a senior business analyst drafting structured field values for a strategic "
    "lifecycle planning tool. You are given a user's answers to a short questionnaire and, "
    "when relevant, the linked parent record.\n\n"
    "The user's answers are ROUGH NOTES, not finished copy. Your job is to SYNTHESIZE and "
    "EXPAND those notes into the polished, professional artifact a business analyst would "
    "write FROM them — never to echo, quote, or lightly reword what the user typed.\n\n"
    "How to write the fields:\n"
    "- Write each field as proper prose appropriate to THAT field's meaning, using the field "
    "guide below. A journey map is not a persona finding; a bottleneck analysis is not a "
    "process map. Match the register and content each field's name implies.\n"
    "- Every field must be DISTINCT. NEVER put the same or near-identical text in two fields. "
    "If two fields threaten to overlap, sharpen each to its own specific purpose.\n"
    "- Where the user's input for a field is thin or absent, INFER sensible, domain-appropriate "
    "content that is consistent with what they did say — do not repeat their words, and do not "
    "leave an applicable field as a bare copy of another. Only omit a field when you genuinely "
    "cannot infer anything consistent for it.\n"
    "- Stay grounded: do NOT invent specific numbers, dates, monetary figures, product names, "
    "or people the user did not provide. Stay within the user's domain, terminology, and level "
    "of specificity.\n\n"
    "Output format:\n"
    "- Produce a single JSON object whose keys are the camelCase field names from the provided "
    "schema. Use enum values exactly as listed in the schema. Format dates as YYYY-MM-DD.\n"
    "- Never invent or set status, identifiers, workspace, ownership, or audit fields.\n"
    "- Respond with the JSON object only — no prose, no markdown fences."
)


def _build_system_prompt(resource_type: str) -> str:
    """Base instructions plus the field guide for this resource type."""
    glossary = FIELD_GLOSSARY.get(resource_type, {})
    if not glossary:
        return SYSTEM_PROMPT
    guide = "\n".join(f"- {name}: {meaning}" for name, meaning in glossary.items())
    return f"{SYSTEM_PROMPT}\n\nField guide for this resource — write each one for its own distinct meaning:\n{guide}"


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
    system_prompt = _build_system_prompt(resource_type)
    user_prompt = _build_user_prompt(resource_type, answers, context, schema_cls)

    for _attempt in range(2):
        try:
            response = client.messages.create(
                model=model,
                max_tokens=4096,
                system=system_prompt,
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
