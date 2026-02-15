"use client";

import mermaid from "mermaid";
import { useEffect, useMemo, useState } from "react";

type MermaidDebugError = {
  message: string;
  details: string[];
};

export function MermaidDiagram({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<MermaidDebugError | null>(null);
  const chartId = useMemo(() => `mmd-${Math.random().toString(36).slice(2)}`, []);

  useEffect(() => {
    let cancelled = false;
    setSvg("");
    setError(null);

    async function renderDiagram() {
      try {
        mermaid.initialize({ startOnLoad: false, theme: "default" });
        await mermaid.parse(chart);
        const res = await mermaid.render(chartId, chart);
        if (!cancelled) {
          setSvg(res.svg);
        }
      } catch (err) {
        if (cancelled) return;
        const parsedError = parseMermaidError(err);
        setError(parsedError);
        console.error("Mermaid render failed", {
          chartId,
          chart,
          err,
          parsedError,
        });
      }
    }

    void renderDiagram();
    return () => {
      cancelled = true;
    };
  }, [chart, chartId]);

  if (error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        <p className="font-medium">Failed to render Mermaid diagram.</p>
        <p className="mt-1">{error.message}</p>
        {error.details.map((detail, index) => (
          <p key={`${index}-${detail}`} className="mt-1 text-xs text-red-800">
            {detail}
          </p>
        ))}
        <details className="mt-3">
          <summary className="cursor-pointer font-medium">Mermaid source</summary>
          <pre className="mt-2 max-h-80 overflow-auto rounded bg-red-100 p-3 text-xs text-red-950">
            {addLineNumbers(chart)}
          </pre>
        </details>
      </div>
    );
  }

  if (!svg) {
    return <p className="text-sm text-ink/70">Rendering diagram...</p>;
  }

  return <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function parseMermaidError(err: unknown): MermaidDebugError {
  if (!err || typeof err !== "object") {
    return { message: "Unknown Mermaid parsing error.", details: [] };
  }

  const error = err as {
    message?: string;
    str?: string;
    hash?: {
      text?: string;
      token?: string;
      loc?: { first_line?: number; first_column?: number };
    };
  };

  const details: string[] = [];
  if (error.hash?.token) {
    details.push(`Token: ${error.hash.token}`);
  }
  if (error.hash?.text) {
    details.push(`Text: ${error.hash.text}`);
  }
  if (error.hash?.loc?.first_line != null && error.hash?.loc?.first_column != null) {
    details.push(
      `Location: line ${error.hash.loc.first_line}, column ${error.hash.loc.first_column}`,
    );
  } else if (error.hash?.loc?.first_line != null) {
    details.push(`Location: line ${error.hash.loc.first_line}`);
  }

  return {
    message: error.str || error.message || "Unknown Mermaid parsing error.",
    details,
  };
}

function addLineNumbers(source: string): string {
  return source
    .split("\n")
    .map((line, index) => `${String(index + 1).padStart(3, "0")}: ${line}`)
    .join("\n");
}
