/**
 * A sliding-window rate limit, with no dependency and no store.
 *
 * What this is: a speed bump. Next runs several instances of this app, and an
 * in-memory counter is per-instance, so the real ceiling is (limit × instances)
 * per window. Saying that plainly is the point — a limit described as airtight
 * when it is not is worse than no limit, because it stops anyone looking again.
 *
 * What it is honestly good for: an agent or script in a retry loop. Those hit
 * one instance in a tight burst, which is exactly the shape this catches.
 *
 * The store is a Map of arrays, swept on write, so an idle process holds
 * nothing and a busy one holds one small array per key.
 */

type Window = number[];

const hits = new Map<string, Window>();

export type Limit = { limit: number; windowMs: number };

export type Verdict = { ok: true } | { ok: false; retryAfter: number };

const DAY = 24 * 60 * 60 * 1000;

// Named per cost, not per route: what matters is what the call spends.
export const LIMITS = {
  // A model call, when one is asked for. Cached per file, so this bounds the
  // number of *files* a loop can drive into the model, not the number of calls.
  explain: { limit: 20, windowMs: 60_000 },
  // Reads of the graph. Cheap, but unbounded by design until now.
  graph: { limit: 120, windowMs: 60_000 },
  // GitHub's rate limit, which is shared with every other use of the token.
  churn: { limit: 60, windowMs: 60_000 },
  // A refresh re-parses and calls a model. It is scheduled, but the endpoint is
  // reachable, so its budget is a day rather than a minute.
  refresh: { limit: 12, windowMs: DAY },
} satisfies Record<string, Limit>;

export function rateLimit(key: string, limit: Limit): Verdict {
  const now = Date.now();
  const cutoff = now - limit.windowMs;

  const window = (hits.get(key) ?? []).filter((at) => at > cutoff);
  if (window.length >= limit.limit) {
    // The caller is told how long to wait, in the unit a retry loop wants.
    const retryAfter = Math.max(1, Math.ceil((window[0] + limit.windowMs - now) / 1000));
    hits.set(key, window);
    return { ok: false, retryAfter };
  }

  window.push(now);
  hits.set(key, window);

  // Sweep: a key with nothing in the current window is a key nobody is using.
  if (hits.size > 512) {
    for (const [k, w] of hits) {
      if (w.length === 0 || w[w.length - 1] < cutoff) hits.delete(k);
    }
  }
  return { ok: true };
}

/** Test hook. Not called anywhere in the app. */
export function resetLimits(): void {
  hits.clear();
}
