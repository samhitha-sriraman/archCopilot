from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ServiceItem(BaseModel):
    name: str
    responsibility: str
    dependencies: list[str] = Field(default_factory=list)


class ColumnItem(BaseModel):
    name: str
    type: str
    constraints: list[str] = Field(default_factory=list)


class TableItem(BaseModel):
    name: str
    columns: list[ColumnItem]


class ParameterItem(BaseModel):
    name: str
    type: str
    required: bool = False


class EndpointItem(BaseModel):
    method: str
    path: str
    summary: str
    query_params: list[ParameterItem] = Field(default_factory=list)
    request_body_schema: dict[str, Any] = Field(default_factory=dict)
    response_schema: dict[str, Any] = Field(default_factory=dict)


class SequenceStep(BaseModel):
    from_service: str
    to_service: str
    message: str
    is_async: bool = False


class LLMDesignOutput(BaseModel):
    services: list[ServiceItem]
    tables: list[TableItem]
    endpoints: list[EndpointItem]
    sequence_steps: list[SequenceStep]


class RiskItem(BaseModel):
    code: str
    severity: str
    message: str


class GeneratedArtifacts(BaseModel):
    services: list[ServiceItem]
    tables: list[TableItem]
    endpoints: list[EndpointItem]
    sequence_steps: list[SequenceStep]
    db_schema_sql: str
    openapi_yaml: str
    mermaid: str
    risks: list[RiskItem]


class GenerateRequest(BaseModel):
    design_id: str = ""
    spec: str


class DesignVersionResponse(BaseModel):
    id: str
    design_id: str
    spec_text: str
    version_num: int
    created_at: datetime
    output: GeneratedArtifacts


class GenerateResponse(BaseModel):
    design_id: str
    version: DesignVersionResponse


class VersionListItem(BaseModel):
    id: str
    design_id: str
    version_num: int
    created_at: datetime


class DesignListItem(BaseModel):
    design_id: str
    created_at: datetime
    latest_version_id: str
    latest_version_num: int
    latest_version_created_at: datetime
    latest_spec_text: str


class DiffSummary(BaseModel):
    services_added: list[str]
    services_removed: list[str]
    apis_added: list[str]
    apis_removed: list[str]
    tables_added: list[str]
    tables_removed: list[str]
    risks_added: list[str]
    risks_removed: list[str]
