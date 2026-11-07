"use client";

import { useCallback, useEffect, useState } from "react";
import type { Progress, Stage, Status } from "@/lib/pipeline/stages";

const STATUSES: readonly Status[] = ["queued", "running", "complete", "failed"];
const STAGE_NAMES: readonly Stage[] = ["fetch", "select", "parse", "store"];

// Long enough to be one request per stage change, short enough that a stage
// lands while the person is still looking at it.
const POLL_MS = 2000;

// Follows one analysis while it's unfinished, starting from what the server
// rendered. A stage can move between the render and the first poll, so the
// first poll happens immediately; after that, only this route, never a socket.
export function useProgress(analysisId: string, initial: Progress) {
  const [progress, setProgress] = useState(initial);
  const [lost, setLost] = useState<string | null>(null);
  const following = progress.status === "queued" || progress.status === "running";

  useEffect(() => {
    if (!following) return;
    let cancelled = false;

    const read = async () => {
      try {
        const response = await fetch(`/api/progress/${analysisId}`, { cache: "no-store" });
        if (response.status === 404) throw new Error("This analysis is no longer available");
        if (!response.ok) throw new Error(`Progress request failed (${response.status})`);
        const next = parseProgress(await response.json());
        if (cancelled) return;
        setLost(null);
        // Same content keeps the same object, so "unchanged since render" stays true.
        if (next) setProgress((current) => (sameProgress(current, next) ? current : next));
      } catch (error) {
        // Said out loud: a page that silently stops updating looks like a stuck run.
        if (!cancelled) setLost(error instanceof Error ? error.message : "Lost the connection");
      }
    };

    void read();
    const timer = setInterval(read, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [analysisId, following]);

  // A re-run was just claimed: follow again from its first stage.
  const restarted = useCallback(() => setProgress({ status: "running", stage: "fetch", message: "Starting" }), []);

  return { progress, lost, restarted };
}

export function sameProgress(a: Progress, b: Progress): boolean {
  return a.status === b.status && a.stage === b.stage && a.message === b.message;
}

// The payload crosses a network boundary, so it's checked, not asserted.
function parseProgress(value: unknown): Progress | null {
  if (typeof value !== "object" || value === null) return null;
  const status = STATUSES.find((s) => s === Reflect.get(value, "status"));
  const rawStage = Reflect.get(value, "stage");
  const stage = rawStage === null ? null : STAGE_NAMES.find((s) => s === rawStage);
  const message = Reflect.get(value, "message");
  if (!status || stage === undefined || (message !== null && typeof message !== "string")) return null;
  return { status, stage, message };
}
