"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { TopNavIcons } from "@/components/TopNavIcons";
import { generateDesign } from "@/lib/api";
import { EXAMPLE_SPECS } from "@/lib/examples";

export default function NewPage() {
  const [spec, setSpec] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const router = useRouter();

  async function onGenerate() {
    setLoading(true);
    setError(null);
    try {
      const data = await generateDesign(spec);
      router.push(`/designs/${data.design_id}/versions/${data.version.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate design");
    } finally {
      setLoading(false);
    }
  }

  async function onUploadSpec(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setSpec(text);
      setUploadedFileName(file.name);
      setError(null);
    } catch {
      setError("Failed to read uploaded file");
      setUploadedFileName(null);
    } finally {
      // Allow selecting the same file again if needed.
      event.target.value = "";
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl p-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 animate-fade-up">
        <h1 className="text-4xl font-bold text-shimmer">ArchCopilot Design Studio</h1>
        <TopNavIcons />
      </div>
      <p className="mb-4 animate-fade-up-delay-1">
        Paste a product spec, upload a spec file, or start from an example.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3 animate-fade-up-delay-1">
        <label
          htmlFor="spec-upload"
          className="btn-secondary cursor-pointer gap-2 rounded-full shadow-sm"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 16V4" />
            <path d="m7 9 5-5 5 5" />
            <path d="M4 20h16" />
          </svg>
          Upload Product Spec
        </label>
        <input
          id="spec-upload"
          type="file"
          accept=".txt,.md,.markdown,.json,text/plain,text/markdown,application/json"
          onChange={onUploadSpec}
          className="hidden"
        />
        {uploadedFileName && <p className="text-sm text-ink/80">Loaded: {uploadedFileName}</p>}
      </div>

      <div className="mb-4 flex flex-wrap gap-2 font-bold animate-fade-up-delay-2">
        {EXAMPLE_SPECS.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={() => setSpec(item.spec)}
            className="btn-ghost rounded-full font-bold"
          >
            {item.title}
          </button>
        ))}
      </div>

      <textarea
        value={spec}
        onChange={(e) => setSpec(e.target.value)}
        className="h-64 w-full rounded-2xl border border-ink/20 bg-panel p-4 animate-fade-up-delay-2"
        placeholder="Describe your product..."
      />

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={loading || !spec.trim()}
          onClick={onGenerate}
          className="btn-primary"
        >
          {loading ? "Generating..." : "Generate"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );
}
