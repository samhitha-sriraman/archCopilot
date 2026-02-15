import Link from "next/link";
import { cookies } from "next/headers";

import { TopNavIcons } from "@/components/TopNavIcons";
import { fetchDesigns } from "@/lib/api";

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

function previewSpec(spec: string) {
  const singleLine = spec.replace(/\s+/g, " ").trim();
  if (singleLine.length <= 140) return singleLine;
  return `${singleLine.slice(0, 140)}...`;
}

export default async function DesignsDashboardPage() {
  const viewerId = cookies().get("viewer_id")?.value;
  const cookieHeader = viewerId ? `viewer_id=${viewerId}` : undefined;
  const designs = await fetchDesigns(cookieHeader);

  return (
    <main className="mx-auto min-h-screen max-w-6xl p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 animate-fade-up">
        <div>
          <h1 className="text-4xl font-bold text-shimmer">Design Dashboard</h1>
          <p className="text-ink/80 animate-fade-up-delay-1">
            Browse previously generated designs and jump back into any version.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TopNavIcons />
          <Link
            href="/new"
            className="btn-primary rounded-full px-5"
          >
            Generate New Design
          </Link>
        </div>
      </div>

      {designs.length === 0 ? (
        <section className="rounded-2xl border border-ink/20 bg-panel p-6 animate-fade-up-delay-2">
          <p className="mb-3 text-lg font-medium">No designs yet</p>
          <p className="mb-4 text-sm text-ink/80">
            Create your first design to see it appear in this dashboard.
          </p>
          <Link
            href="/new"
            className="btn-primary"
          >
            Create First Design
          </Link>
        </section>
      ) : (
        <section className="grid gap-4 animate-fade-up-delay-2">
          {designs.map((design) => (
            <article
              key={design.design_id}
              className="rounded-2xl border border-ink/20 bg-panel p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-base font-semibold text-ink">{extractAppName(design.latest_spec_text)}</p>
                <span className="rounded-full bg-violet-600 px-3 py-1 text-xs text-white">
                  v{design.latest_version_num}
                </span>
              </div>
              <p className="mb-3 text-sm text-ink/85">{previewSpec(design.latest_spec_text)}</p>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink/70">
                <span>Updated {new Date(design.latest_version_created_at).toLocaleString()}</span>
                <Link
                  href={`/designs/${design.design_id}/versions/${design.latest_version_id}`}
                  className="btn-primary px-3 py-1"
                >
                  Open Design
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
