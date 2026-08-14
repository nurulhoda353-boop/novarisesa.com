from __future__ import annotations


def rfq_stage_for_operational(current: str, operational: str) -> str:
    if operational == "completed":
        return "won"
    if operational == "cancelled":
        return "lost"
    if operational == "confirmed" and current in {"new", "under_review"}:
        return "qualified"
    if operational == "pending" and current in {"won", "lost"}:
        return "under_review"
    return current


def application_stage_for_operational(current: str, operational: str) -> str:
    if operational == "completed":
        return "hired"
    if operational == "cancelled":
        return "rejected"
    if operational == "confirmed" and current in {"new", "under_review"}:
        return "contacted"
    if operational == "pending" and current in {"hired", "rejected", "withdrawn"}:
        return "under_review"
    return current


def operational_for_rfq_stage(current: str, stage: str) -> str:
    if stage == "won":
        return "completed"
    if stage == "lost":
        return "cancelled"
    if current in {"completed", "cancelled"}:
        return "pending" if stage in {"new", "under_review"} else "confirmed"
    return current


def operational_for_application_stage(current: str, stage: str) -> str:
    if stage == "hired":
        return "completed"
    if stage in {"rejected", "withdrawn"}:
        return "cancelled"
    if current in {"completed", "cancelled"}:
        return "pending" if stage in {"new", "under_review"} else "confirmed"
    return current
