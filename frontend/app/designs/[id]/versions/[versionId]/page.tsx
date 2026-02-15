import { cookies } from "next/headers";

import { DesignViewer } from "@/components/DesignViewer";
import { fetchVersion, fetchVersions } from "@/lib/api";

export default async function VersionPage({
  params,
}: {
  params: { id: string; versionId: string };
}) {
  const viewerId = cookies().get("viewer_id")?.value;
  const cookieHeader = viewerId ? `viewer_id=${viewerId}` : undefined;
  const [version, versions] = await Promise.all([
    fetchVersion(params.versionId, cookieHeader),
    fetchVersions(params.id, cookieHeader),
  ]);

  return <DesignViewer version={version} versions={versions} />;
}
