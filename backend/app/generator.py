import json
import re
from typing import Any

import yaml
from openai import OpenAI
from pydantic import ValidationError

from .config import settings
from .schemas import EndpointItem, LLMDesignOutput, RiskItem, SequenceStep, TableItem


SYSTEM_PROMPT = """You are a software architect assistant.
Return only strict JSON matching the provided schema. Do not include markdown fences.
Use practical service names and realistic API/data models.
"""


def _json_schema() -> dict[str, Any]:
    return LLMDesignOutput.model_json_schema()


def generate_structured_design(spec: str) -> LLMDesignOutput:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is required to generate designs.")

    client = OpenAI(api_key=settings.openai_api_key)

    user_prompt = (
        "Convert the following product spec into architecture artifacts.\n"
        "Include services, tables, endpoints, and sequence_steps.\n"
        f"Product spec:\n{spec}\n\n"
        f"JSON schema:\n{json.dumps(_json_schema())}"
    )

    def _extract_text_from_response_api(response: Any) -> str:
        return (response.output_text or "").strip()

    def _extract_text_from_chat_api(response: Any) -> str:
        choices = getattr(response, "choices", None) or []
        if not choices:
            return ""
        message = getattr(choices[0], "message", None)
        if not message:
            return ""
        content = getattr(message, "content", "")
        return content.strip() if isinstance(content, str) else ""

    last_error: Exception | None = None
    for _ in range(3):  # first attempt + up to 2 retries
        if hasattr(client, "responses"):
            response = client.responses.create(
                model=settings.openai_model,
                input=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0,
            )
            text = _extract_text_from_response_api(response)
        else:
            response = client.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0,
                response_format={"type": "json_object"},
            )
            text = _extract_text_from_chat_api(response)

        try:
            return LLMDesignOutput.model_validate_json(text)
        except ValidationError as exc:
            last_error = exc
            continue

    raise RuntimeError(f"Failed to parse LLM JSON output after retries: {last_error}")


def build_sql_ddl(tables: list[TableItem]) -> str:
    statements: list[str] = []
    for table in tables:
        cols: list[str] = []
        for col in table.columns:
            constraints = " ".join(col.constraints).strip()
            definition = f"  {col.name} {col.type}".rstrip()
            if constraints:
                definition += f" {constraints}"
            cols.append(definition)
        body = ",\n".join(cols) if cols else "  id INTEGER PRIMARY KEY"
        statements.append(f"CREATE TABLE {table.name} (\n{body}\n);")
    return "\n\n".join(statements)


def _response_schema_for_openapi(endpoint: EndpointItem) -> dict[str, Any]:
    return endpoint.response_schema or {"type": "object", "additionalProperties": True}


def build_openapi_yaml(endpoints: list[EndpointItem]) -> str:
    doc: dict[str, Any] = {
        "openapi": "3.0.3",
        "info": {"title": "ArchCopilot Generated API", "version": "1.0.0"},
        "paths": {},
    }

    for ep in endpoints:
        path_item = doc["paths"].setdefault(ep.path, {})
        op: dict[str, Any] = {
            "summary": ep.summary,
            "responses": {
                "200": {
                    "description": "OK",
                    "content": {
                        "application/json": {
                            "schema": _response_schema_for_openapi(ep),
                        }
                    },
                }
            },
        }
        if ep.query_params:
            op["parameters"] = [
                {
                    "in": "query",
                    "name": p.name,
                    "required": p.required,
                    "schema": {"type": p.type},
                }
                for p in ep.query_params
            ]
        if ep.request_body_schema:
            op["requestBody"] = {
                "required": True,
                "content": {"application/json": {"schema": ep.request_body_schema}},
            }
        path_item[ep.method.lower()] = op

    return yaml.safe_dump(doc, sort_keys=False)


def build_mermaid(sequence_steps: list[SequenceStep]) -> str:
    lines = ["sequenceDiagram"]
    participant_ids: dict[str, str] = {}

    def register_participant(name: str) -> str:
        label = _normalize_mermaid_label(name)
        participant_id = participant_ids.get(label)
        if participant_id:
            return participant_id

        participant_id = f"svc_{len(participant_ids) + 1}"
        participant_ids[label] = participant_id
        lines.append(f'  participant {participant_id} as "{_escape_mermaid_label(label)}"')
        return participant_id

    if not sequence_steps:
        participant_id = register_participant("System")
        lines.append(f"  Note over {participant_id}: No sequence steps generated")
        return "\n".join(lines)

    for step in sequence_steps:
        from_id = register_participant(step.from_service)
        to_id = register_participant(step.to_service)
        message = _normalize_mermaid_message(step.message)
        arrow = "-->>" if step.is_async else "->>"
        lines.append(f"  {from_id}{arrow}{to_id}: {message}")
    return "\n".join(lines)


def _normalize_mermaid_label(value: str) -> str:
    normalized = re.sub(r"\s+", " ", value).strip()
    return normalized or "Unknown Service"


def _escape_mermaid_label(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


def _normalize_mermaid_message(value: str) -> str:
    normalized = re.sub(r"\s+", " ", value).strip()
    return normalized or "request"


def _has_pagination(endpoint: EndpointItem) -> bool:
    pagination_tokens = {"page", "limit", "cursor", "offset", "per_page"}
    return any(p.name.lower() in pagination_tokens for p in endpoint.query_params)


def _sync_chain_length(sequence_steps: list[SequenceStep]) -> int:
    max_len = 0
    current = 0
    for step in sequence_steps:
        if step.is_async:
            max_len = max(max_len, current)
            current = 0
        else:
            current += 1
            max_len = max(max_len, current)
    return max_len


def run_risk_rules(spec: str, endpoints: list[EndpointItem], sequence_steps: list[SequenceStep]) -> list[RiskItem]:
    spec_l = spec.lower()
    risks: list[RiskItem] = []

    list_gets = [ep for ep in endpoints if ep.method.lower() == "get" and ep.path.count("{") == 0]
    if any(not _has_pagination(ep) for ep in list_gets):
        risks.append(
            RiskItem(
                code="missing-pagination",
                severity="medium",
                message="List endpoints without pagination can cause scalability bottlenecks.",
            )
        )

    if _sync_chain_length(sequence_steps) > 4:
        risks.append(
            RiskItem(
                code="long-sync-chain",
                severity="medium",
                message="Synchronous call chain longer than 4 steps can increase tail latency.",
            )
        )

    mentions_db = any(token in spec_l for token in ["database", "db", "sqlite", "postgres", "mysql"])
    mentions_replica = any(token in spec_l for token in ["replica", "replication", "read-replica", "read replica"])
    if mentions_db and not mentions_replica:
        risks.append(
            RiskItem(
                code="single-db-spof",
                severity="medium",
                message="Single database with no replica mention introduces a single point of failure.",
            )
        )

    mentions_payment_or_webhook = any(token in spec_l for token in ["payment", "payments", "webhook", "webhooks"])
    mentions_idempotency = "idempot" in spec_l
    if mentions_payment_or_webhook and not mentions_idempotency:
        risks.append(
            RiskItem(
                code="missing-idempotency",
                severity="high",
                message="Payments/webhooks without idempotency handling risk duplicate side effects.",
            )
        )

    return risks
