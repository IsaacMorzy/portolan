"use client";

import { useRouter } from "next/navigation";
import { RerunButton } from "./progress/rerun-button";

// Above the shell, not in it: the map's columns stay where they are. Re-running
// hands the page back to the progress view, which the server renders once the
// row says running.
// previousCommitSha is only set when the scheduler refreshed this map. It is
// shown rather than hidden because a refresh replaces the map in place, and
// without the old sha the only evidence anything changed would be gone.
export function AnalysisHeader({
  analysisId,
  repository,
  commitSha,
  previousCommitSha,
}: {
  analysisId: string;
  repository: { owner: string; name: string };
  commitSha: string;
  previousCommitSha?: string | null;
}) {
  const router = useRouter();
  return (
    <div className="flex h-9 shrink-0 items-center gap-3 border-b border-line px-3 text-xs">
      <h1 className="font-mono text-[13px]">
        <span className="text-fg-muted">{repository.owner}/</span>
        {repository.name}
      </h1>
      <span className="font-mono text-fg-muted" title={commitSha}>
        {commitSha.slice(0, 7)}
      </span>
      {previousCommitSha ? (
        <span className="text-fg-muted" title={`Refreshed from ${previousCommitSha}`}>
          was <span className="font-mono">{previousCommitSha.slice(0, 7)}</span>
        </span>
      ) : null}
      <span className="ml-auto">
        <RerunButton analysisId={analysisId} onStarted={() => router.refresh()} />
      </span>
    </div>
  );
}
