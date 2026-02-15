import json
from uuid import uuid4
from typing import Any, Optional

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, inspect, select, text
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .example_specs import EXAMPLE_SPECS
from .generator import (
    build_mermaid,
    build_openapi_yaml,
    build_sql_ddl,
    generate_structured_design,
    run_risk_rules,
)
from .models import Design, DesignVersion
from .schemas import (
    DesignListItem,
    DesignVersionResponse,
    DiffSummary,
    GenerateRequest,
    GenerateResponse,
    GeneratedArtifacts,
    VersionListItem,
)

app = FastAPI(title="ArchCopilot API")
VIEWER_COOKIE_NAME = "viewer_id"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_owner_column()


def _ensure_owner_column() -> None:
    with engine.begin() as conn:
        inspector = inspect(conn)
        if not inspector.has_table("designs"):
            return
        column_names = {column["name"] for column in inspector.get_columns("designs")}
        if "owner_id" in column_names:
            return
        conn.execute(text("ALTER TABLE designs ADD COLUMN owner_id VARCHAR NOT NULL DEFAULT 'legacy'"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_designs_owner_id ON designs (owner_id)"))


def get_viewer_id(request: Request, response: Response) -> str:
    viewer_id = request.cookies.get(VIEWER_COOKIE_NAME)
    if viewer_id:
        return viewer_id

    viewer_id = str(uuid4())
    response.set_cookie(
        key=VIEWER_COOKIE_NAME,
        value=viewer_id,
        max_age=60 * 60 * 24 * 30,
        httponly=True,
        samesite="lax",
        secure=request.url.scheme == "https",
    )
    return viewer_id


def _get_owned_design(db: Session, design_id: str, viewer_id: str) -> Optional[Design]:
    return db.scalars(
        select(Design).where(Design.id == design_id, Design.owner_id == viewer_id)
    ).first()


def _get_owned_version(db: Session, version_id: str, viewer_id: str) -> Optional[DesignVersion]:
    return db.scalars(
        select(DesignVersion)
        .join(Design, DesignVersion.design_id == Design.id)
        .where(DesignVersion.id == version_id, Design.owner_id == viewer_id)
    ).first()


def _to_artifacts(spec_text: str, output_json: str) -> GeneratedArtifacts:
    raw: dict[str, Any] = json.loads(output_json)
    artifacts = GeneratedArtifacts.model_validate(raw)
    if not artifacts.risks:
        artifacts.risks = run_risk_rules(spec_text, artifacts.endpoints, artifacts.sequence_steps)
    return artifacts


def _version_to_response(version: DesignVersion) -> DesignVersionResponse:
    artifacts = _to_artifacts(version.spec_text, version.output_json)
    return DesignVersionResponse(
        id=version.id,
        design_id=version.design_id,
        spec_text=version.spec_text,
        version_num=version.version_num,
        created_at=version.created_at,
        output=artifacts,
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/examples")
def examples() -> list[dict[str, str]]:
    return EXAMPLE_SPECS


@app.post("/generate", response_model=GenerateResponse)
def generate(
    payload: GenerateRequest,
    viewer_id: str = Depends(get_viewer_id),
    db: Session = Depends(get_db),
) -> GenerateResponse:
    if payload.design_id:
        design = _get_owned_design(db, payload.design_id, viewer_id)
        if not design:
            raise HTTPException(status_code=404, detail="Design not found")
    else:
        design = Design(owner_id=viewer_id)
        db.add(design)
        db.flush()

    llm_output = generate_structured_design(payload.spec)
    db_schema_sql = build_sql_ddl(llm_output.tables)
    openapi_yaml = build_openapi_yaml(llm_output.endpoints)
    mermaid = build_mermaid(llm_output.sequence_steps)
    risks = run_risk_rules(payload.spec, llm_output.endpoints, llm_output.sequence_steps)

    version_num = (
        db.scalar(
            select(func.coalesce(func.max(DesignVersion.version_num), 0)).where(
                DesignVersion.design_id == design.id
            )
        )
        + 1
    )

    artifacts = GeneratedArtifacts(
        services=llm_output.services,
        tables=llm_output.tables,
        endpoints=llm_output.endpoints,
        sequence_steps=llm_output.sequence_steps,
        db_schema_sql=db_schema_sql,
        openapi_yaml=openapi_yaml,
        mermaid=mermaid,
        risks=risks,
    )

    version = DesignVersion(
        design_id=design.id,
        spec_text=payload.spec,
        output_json=artifacts.model_dump_json(),
        version_num=version_num,
    )
    db.add(version)
    db.commit()
    db.refresh(version)

    return GenerateResponse(design_id=design.id, version=_version_to_response(version))


@app.get("/designs/{design_id}/versions", response_model=list[VersionListItem])
def list_versions(
    design_id: str,
    viewer_id: str = Depends(get_viewer_id),
    db: Session = Depends(get_db),
) -> list[VersionListItem]:
    design = _get_owned_design(db, design_id, viewer_id)
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")

    versions = db.scalars(
        select(DesignVersion)
        .where(DesignVersion.design_id == design.id)
        .order_by(DesignVersion.version_num.desc())
    ).all()
    return [
        VersionListItem(
            id=v.id,
            design_id=v.design_id,
            version_num=v.version_num,
            created_at=v.created_at,
        )
        for v in versions
    ]


@app.get("/designs", response_model=list[DesignListItem])
def list_designs(
    viewer_id: str = Depends(get_viewer_id),
    db: Session = Depends(get_db),
) -> list[DesignListItem]:
    designs = db.scalars(
        select(Design)
        .where(Design.owner_id == viewer_id)
        .order_by(Design.created_at.desc())
    ).all()
    items: list[DesignListItem] = []
    for design in designs:
        latest_version = db.scalars(
            select(DesignVersion)
            .where(DesignVersion.design_id == design.id)
            .order_by(DesignVersion.version_num.desc())
            .limit(1)
        ).first()
        if not latest_version:
            continue
        items.append(
            DesignListItem(
                design_id=design.id,
                created_at=design.created_at,
                latest_version_id=latest_version.id,
                latest_version_num=latest_version.version_num,
                latest_version_created_at=latest_version.created_at,
                latest_spec_text=latest_version.spec_text,
            )
        )
    items.sort(key=lambda item: item.latest_version_created_at, reverse=True)
    return items


@app.get("/design_versions/{version_id}", response_model=DesignVersionResponse)
def get_version(
    version_id: str,
    viewer_id: str = Depends(get_viewer_id),
    db: Session = Depends(get_db),
) -> DesignVersionResponse:
    version = _get_owned_version(db, version_id, viewer_id)
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    return _version_to_response(version)


def _api_sig(path: str, method: str) -> str:
    return f"{method.upper()} {path}"


@app.get("/design_versions/{version_id}/diff", response_model=DiffSummary)
def diff_versions(
    version_id: str,
    other: str = Query(..., description="Version id to compare against"),
    viewer_id: str = Depends(get_viewer_id),
    db: Session = Depends(get_db),
) -> DiffSummary:
    current = _get_owned_version(db, version_id, viewer_id)
    previous = _get_owned_version(db, other, viewer_id)
    if not current or not previous:
        raise HTTPException(status_code=404, detail="One or both versions not found")

    current_artifacts = _to_artifacts(current.spec_text, current.output_json)
    previous_artifacts = _to_artifacts(previous.spec_text, previous.output_json)

    curr_services = {s.name for s in current_artifacts.services}
    prev_services = {s.name for s in previous_artifacts.services}

    curr_apis = {_api_sig(ep.path, ep.method) for ep in current_artifacts.endpoints}
    prev_apis = {_api_sig(ep.path, ep.method) for ep in previous_artifacts.endpoints}

    curr_tables = {t.name for t in current_artifacts.tables}
    prev_tables = {t.name for t in previous_artifacts.tables}

    curr_risks = {r.code for r in current_artifacts.risks}
    prev_risks = {r.code for r in previous_artifacts.risks}

    return DiffSummary(
        services_added=sorted(curr_services - prev_services),
        services_removed=sorted(prev_services - curr_services),
        apis_added=sorted(curr_apis - prev_apis),
        apis_removed=sorted(prev_apis - curr_apis),
        tables_added=sorted(curr_tables - prev_tables),
        tables_removed=sorted(prev_tables - curr_tables),
        risks_added=sorted(curr_risks - prev_risks),
        risks_removed=sorted(prev_risks - curr_risks),
    )
