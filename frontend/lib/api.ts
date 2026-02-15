import { DesignListItem, DiffSummary, VersionListItem, VersionResponse } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function withViewerCookie(cookieHeader?: string): RequestInit {
  if (!cookieHeader) {
    return { credentials: "include" };
  }
  return {
    credentials: "include",
    headers: { Cookie: cookieHeader },
  };
}

export async function generateDesign(spec: string, designId?: string) {
  const res = await fetch(`${API_BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ spec, design_id: designId }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json() as Promise<{ design_id: string; version: VersionResponse }>;
}

export async function fetchVersion(versionId: string, cookieHeader?: string) {
  const res = await fetch(`${API_BASE}/design_versions/${versionId}`, {
    cache: "no-store",
    ...withViewerCookie(cookieHeader),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json() as Promise<VersionResponse>;
}

export async function fetchVersions(designId: string, cookieHeader?: string) {
  const res = await fetch(`${API_BASE}/designs/${designId}/versions`, {
    cache: "no-store",
    ...withViewerCookie(cookieHeader),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json() as Promise<VersionListItem[]>;
}

export async function fetchDesigns(cookieHeader?: string) {
  const res = await fetch(`${API_BASE}/designs`, {
    cache: "no-store",
    ...withViewerCookie(cookieHeader),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json() as Promise<DesignListItem[]>;
}

export async function fetchDiff(versionId: string, otherVersionId: string, cookieHeader?: string) {
  const res = await fetch(
    `${API_BASE}/design_versions/${versionId}/diff?other=${encodeURIComponent(otherVersionId)}`,
    { cache: "no-store", ...withViewerCookie(cookieHeader) }
  );
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json() as Promise<DiffSummary>;
}
