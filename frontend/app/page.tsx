import Link from "next/link";
import type { ReactNode } from "react";

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl p-8">
      <section className="mb-8 rounded-3xl border border-violet-200/70 bg-white/70 p-8 shadow-sm backdrop-blur animate-fade-up">
        <p className="mb-2 inline-flex items-center rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700 animate-pulse-soft">
          AI Architecture Copilot
        </p>
        <h1 className="mb-3 text-5xl font-bold tracking-tight text-shimmer">ArchCopilot</h1>
        <p className="mb-6 max-w-3xl text-lg text-ink/85 animate-fade-up-delay-1">
          Turn a raw product spec into architecture outputs in one pass: services, schema, API
          contracts, sequence flow, and deterministic risk checks.
        </p>
        <Link
          href="/new"
          className="btn-primary mr-3 rounded-full px-5"
        >
          Create New Design
        </Link>
        <Link
          href="/designs"
          className="btn-secondary rounded-full px-5"
        >
          View Dashboard
        </Link>
      </section>

      <section className="mb-8 grid gap-4 md:grid-cols-3 animate-fade-up-delay-1">
        <FeatureCard
          title="Generate"
          description="Paste or upload a product spec and generate versioned architecture outputs."
          delayClass="animate-fade-up-delay-1"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v18" />
              <path d="M3 12h18" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          }
        />
        <FeatureCard
          title="Compare"
          description="Track changes across versions with fast diffs for services, APIs, and risks."
          delayClass="animate-fade-up-delay-2"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 7h10" />
              <path d="M7 12h10" />
              <path d="M7 17h6" />
              <rect x="3" y="4" width="18" height="16" rx="2" />
            </svg>
          }
        />
        <FeatureCard
          title="Share"
          description="Open previous designs instantly from a dashboard built for quick iteration."
          delayClass="animate-fade-up-delay-3"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 12h8" />
              <path d="M12 8l4 4-4 4" />
              <rect x="3" y="4" width="18" height="16" rx="2" />
            </svg>
          }
        />
      </section>

      <section className="rounded-3xl border border-violet-200/70 bg-white/70 p-6 shadow-sm backdrop-blur animate-fade-up-delay-2">
        <h2 className="mb-4 text-xl font-semibold text-shimmer">Architecture Template</h2>
        <div className="grid gap-3 text-sm md:grid-cols-5">
          <DiagramNode label="Product Spec" />
          <DiagramNode label="Service Map" />
          <DiagramNode label="DB Schema" />
          <DiagramNode label="OpenAPI" />
          <DiagramNode label="Risk Report" />
        </div>
        <div className="mt-4 rounded-2xl border border-violet-200/80 bg-violet-50/40 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-700">Flow</p>
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-violet-700">
            <span className="rounded-full border border-violet-300 bg-white px-3 py-1">Spec</span>
            <span className="text-violet-500">→</span>
            <span className="rounded-full border border-violet-300 bg-white px-3 py-1">
              Structured Design
            </span>
            <span className="text-violet-500">→</span>
            <span className="rounded-full border border-violet-300 bg-white px-3 py-1">
              Versioned Output
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  title,
  description,
  icon,
  delayClass,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  delayClass?: string;
}) {
  return (
    <article
      className={`rounded-2xl border border-violet-200/70 bg-white/75 p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${delayClass ?? ""}`}
    >
      <div className="mb-2 inline-flex rounded-lg bg-violet-100 p-2 text-violet-700 transition hover:scale-105">
        {icon}
      </div>
      <h3 className="mb-1 font-semibold">{title}</h3>
      <p className="text-sm text-ink/80">{description}</p>
    </article>
  );
}

function DiagramNode({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/60 px-3 py-2 text-center font-medium text-violet-700 transition hover:-translate-y-0.5 hover:bg-violet-100/80">
      {label}
    </div>
  );
}
