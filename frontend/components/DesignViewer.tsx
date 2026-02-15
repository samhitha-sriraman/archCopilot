"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { MermaidDiagram } from "@/components/MermaidDiagram";
import { TopNavIcons } from "@/components/TopNavIcons";
import { fetchDiff } from "@/lib/api";
import { DiffSummary, VersionListItem, VersionResponse } from "@/lib/types";

const TABS = ["Services", "DB Schema", "API Contract", "Diagram", "Risks"] as const;
type Tab = (typeof TABS)[number];

function extractAppName(spec: string) {
  const singleLine = spec.replace(/\s+/g, " ").trim();

  const quoted = singleLine.match(/["']([^"']{2,80})["']/);
  if (quoted?.[1]) return quoted[1];

  const appPattern = singleLine.match(/([A-Z][A-Za-z0-9&\-\s]{1,60})\s+app\b/i);
  if (appPattern?.[1]) return appPattern[1].trim();

  const forPattern = singleLine.match(/\bfor\s+([A-Z][A-Za-z0-9&\-\s]{1,60})\b/);
  if (forPattern?.[1]) return forPattern[1].trim();

  const firstWords = singleLine.split(" ").slice(0, 4).join(" ").trim();
  return firstWords || "Untitled App";
}

export function DesignViewer({
  version,
  versions,
}: {
  version: VersionResponse;
  versions: VersionListItem[];
}) {
  const [tab, setTab] = useState<Tab>("Services");
  const [diff, setDiff] = useState<DiffSummary | null>(null);
  const [diffError, setDiffError] = useState<string | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const router = useRouter();
  const appTitle = useMemo(() => extractAppName(version.spec_text), [version.spec_text]);

  const previous = useMemo(() => {
    const sorted = [...versions].sort((a, b) => a.version_num - b.version_num);
    const idx = sorted.findIndex((v) => v.id === version.id);
    return idx > 0 ? sorted[idx - 1] : null;
  }, [version.id, versions]);

  async function onDiff() {
    if (!previous) return;
    setLoadingDiff(true);
    setDiffError(null);
    try {
      const data = await fetchDiff(version.id, previous.id);
      setDiff(data);
    } catch (err) {
      setDiffError(err instanceof Error ? err.message : "Failed to load diff");
    } finally {
      setLoadingDiff(false);
    }
  }

  function onDownloadArtifacts() {
    const bundle = {
      design_id: version.design_id,
      version_id: version.id,
      version_num: version.version_num,
      created_at: version.created_at,
      spec_text: version.spec_text,
      artifacts: version.output,
      files: {
        "db_schema.sql": version.output.db_schema_sql,
        "openapi.yaml": version.output.openapi_yaml,
        "sequence.mmd": version.output.mermaid,
        "risks.json": JSON.stringify(version.output.risks, null, 2),
      },
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `archcopilot-design-v${version.version_num}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-5 rounded-xl border border-ink/15 bg-panel p-5 shadow-sm animate-fade-up">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-shimmer">{appTitle}</h1>
              <p className="text-sm text-ink/70">v{version.version_num} • ArchCopilot Output</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TopNavIcons />
            <Link
              href="/new"
              className="btn-primary px-3 py-1.5"
            >
              New Design
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-ink/75">Version</label>
          <select
            className="rounded border border-ink/25 bg-white px-2 py-1 text-sm"
            value={version.id}
            onChange={(e) =>
              router.push(`/designs/${version.design_id}/versions/${e.target.value}`)
            }
          >
            {versions
              .sort((a, b) => b.version_num - a.version_num)
              .map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version_num} - {new Date(v.created_at).toLocaleString()}
                </option>
              ))}
          </select>

          <button
            type="button"
            disabled={!previous || loadingDiff}
            onClick={onDiff}
            className="btn-secondary px-3 py-1"
          >
            {loadingDiff ? "Loading..." : "Compare"}
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 animate-fade-up-delay-1">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            className={`rounded-full px-3 py-1 text-sm ${
              tab === name ? "bg-violet-600 text-white" : "bg-white text-ink/80"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-ink/20 bg-panel p-4 shadow-sm animate-fade-up-delay-2">
        {tab === "Services" && (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left">
                <th className="border-b border-ink/15 pb-2">Service</th>
                <th className="border-b border-ink/15 pb-2">Responsibility</th>
                <th className="border-b border-ink/15 pb-2">Dependencies</th>
              </tr>
            </thead>
            <tbody>
              {version.output.services.map((svc) => (
                <tr key={svc.name}>
                  <td className="border-b border-ink/10 py-2 pr-2 font-medium">{svc.name}</td>
                  <td className="border-b border-ink/10 py-2 pr-2">{svc.responsibility}</td>
                  <td className="border-b border-ink/10 py-2">{svc.dependencies.join(", ") || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "DB Schema" && (
          <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-ink p-4 text-xs text-white">
            {version.output.db_schema_sql}
          </pre>
        )}

        {tab === "API Contract" && (
          <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-ink p-4 text-xs text-white">
            {version.output.openapi_yaml}
          </pre>
        )}

        {tab === "Diagram" && <MermaidDiagram chart={version.output.mermaid} />}

        {tab === "Risks" && (
          <div className="grid gap-3 md:grid-cols-2">
            {version.output.risks.map((risk) => (
              <article key={risk.code} className="rounded border border-ink/20 bg-white p-3">
                <div className="mb-1 text-xs uppercase tracking-wide text-violet-600">
                  {risk.severity}
                </div>
                <h3 className="font-medium">{risk.code}</h3>
                <p className="text-sm text-ink/85">{risk.message}</p>
              </article>
            ))}
            {version.output.risks.length === 0 && <p>No deterministic risks found.</p>}
          </div>
        )}
      </section>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onDownloadArtifacts}
          className="btn-secondary px-3 py-1"
        >
          Download Artifacts
        </button>
      </div>

      {(diff || diffError) && (
        <section className="mt-6 rounded-2xl border border-ink/20 bg-panel p-4 shadow-sm animate-fade-up-delay-3">
          <h2 className="mb-3 text-lg font-semibold">Diff Summary</h2>
          {diffError && <p className="text-sm text-red-600">{diffError}</p>}
          {diff && (
            <div className="grid gap-3 md:grid-cols-2">
              <DiffCard title="Services" added={diff.services_added} removed={diff.services_removed} />
              <DiffCard title="APIs" added={diff.apis_added} removed={diff.apis_removed} />
              <DiffCard title="Tables" added={diff.tables_added} removed={diff.tables_removed} />
              <DiffCard title="Risks" added={diff.risks_added} removed={diff.risks_removed} />
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function DiffCard({
  title,
  added,
  removed,
}: {
  title: string;
  added: string[];
  removed: string[];
}) {
  return (
    <article className="rounded border border-ink/20 bg-white p-3 text-sm">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-green-700">+ {added.join(", ") || "None"}</p>
      <p className="text-red-700">- {removed.join(", ") || "None"}</p>
    </article>
  );
}
