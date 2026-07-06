from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any

from pydantic.alias_generators import to_camel

from app.core.errors import AppError

LIFECYCLE_STATUSES = ("draft", "active", "completed", "archived")
FORWARD_TRANSITIONS = {
    ("draft", "active"),
    ("active", "completed"),
}
ARCHIVE_TRANSITIONS = {
    ("draft", "archived"),
    ("active", "archived"),
    ("completed", "archived"),
}
REACTIVATE_TRANSITIONS = {
    ("archived", "draft"),
}
ALLOWED_TRANSITIONS = FORWARD_TRANSITIONS | ARCHIVE_TRANSITIONS | REACTIVATE_TRANSITIONS


@dataclass(frozen=True)
class GateConfig:
    fields: Sequence[str]
    message: str


def transition_status(
    record: Any,
    to_status: str,
    gate: GateConfig,
    allowed_transitions: set[tuple[str, str]] = ALLOWED_TRANSITIONS,
) -> None:
    from_status = record.status or "draft"
    if (from_status, to_status) not in allowed_transitions:
        raise AppError(
            "invalid_transition",
            "Invalid status transition",
            409,
            {"from": from_status, "to": to_status},
        )
    if to_status == "active":
        ensure_gate(record, gate)
    record.status = to_status


def ensure_gate(record: Any, gate: GateConfig) -> None:
    missing = missing_gate_fields(record, gate.fields)
    if missing:
        raise AppError("activation_gate", gate.message, 409, {"missing": missing})


def ensure_active_gate_maintenance(record: Any, gate: GateConfig) -> None:
    if record.status == "active":
        ensure_gate(record, gate)


def missing_gate_fields(record: Any, gate_fields: Sequence[str]) -> list[str]:
    return [to_camel(field) for field in gate_fields if not has_value(getattr(record, field))]


def has_value(value: Any) -> bool:
    return value is not None and (not isinstance(value, str) or value.strip() != "")
