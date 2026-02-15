export type ServiceItem = {
  name: string;
  responsibility: string;
  dependencies: string[];
};

export type ColumnItem = {
  name: string;
  type: string;
  constraints: string[];
};

export type TableItem = {
  name: string;
  columns: ColumnItem[];
};

export type ParameterItem = {
  name: string;
  type: string;
  required: boolean;
};

export type EndpointItem = {
  method: string;
  path: string;
  summary: string;
  query_params: ParameterItem[];
  request_body_schema: Record<string, unknown>;
  response_schema: Record<string, unknown>;
};

export type SequenceStep = {
  from_service: string;
  to_service: string;
  message: string;
  is_async: boolean;
};

export type RiskItem = {
  code: string;
  severity: string;
  message: string;
};

export type GeneratedArtifacts = {
  services: ServiceItem[];
  tables: TableItem[];
  endpoints: EndpointItem[];
  sequence_steps: SequenceStep[];
  db_schema_sql: string;
  openapi_yaml: string;
  mermaid: string;
  risks: RiskItem[];
};

export type VersionResponse = {
  id: string;
  design_id: string;
  spec_text: string;
  version_num: number;
  created_at: string;
  output: GeneratedArtifacts;
};

export type VersionListItem = {
  id: string;
  design_id: string;
  version_num: number;
  created_at: string;
};

export type DesignListItem = {
  design_id: string;
  created_at: string;
  latest_version_id: string;
  latest_version_num: number;
  latest_version_created_at: string;
  latest_spec_text: string;
};

export type DiffSummary = {
  services_added: string[];
  services_removed: string[];
  apis_added: string[];
  apis_removed: string[];
  tables_added: string[];
  tables_removed: string[];
  risks_added: string[];
  risks_removed: string[];
};
