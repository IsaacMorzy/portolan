# 0030 — L5: Agent surface — MCP over stored graph (issue #48)

## Ask
Lane L5 of wayfinder map #43: Build an MCP server over the stored dependency graph so an agent can answer "what imports X" and "what does X import" without a browser.

**Check:** an MCP client answers both questions for a stored analysis and refuses a foreign workspace. (map: #43)

## Reading
The MVP already parses repos into node/edge graphs and stores them in Supabase (analyses, files, edges tables). The graph data is accessible via server-side Supabase client. The lane needs:

1. An MCP server (stdio or HTTP) that exposes graph query tools
2. Tools: `graph_imports` (what imports a file), `graph_imported_by` (what a file imports)
3. Organization scoping: queries must be filtered by org_id, never cross workspace boundaries
4. Must refuse/return empty for repositories not in the caller's org

Existing patterns:
- `lib/graph/churn.ts` — reads from GitHub API, rate limited
- `app/api/churn/route.ts` — Clerk auth + Supabase + rate limiting
- `lib/supabase/server.ts` — server-side Supabase client (bypasses RLS, entry point verifies org)
- `lib/supabase/admin.ts` — admin Supabase client (service key)
- `proxy.ts` — clerkMiddleware with auth protection

Scope: MCP server only — not a dashboard UI, not scheduled review, not rule config (those are other lanes).

## Done when
- MCP server exists and responds to graph queries
- `graph_imports` and `graph_imported_by` tools work
- Organization scoping enforced (cross-org queries return empty)
- `pnpm gate` + `npx tsc --noEmit` + `npx eslint . --quiet` + `pnpm build` pass
- Issue #48 closed with commit SHA; map #43 updated

## Known unknowns
- Whether to use stdio MCP or HTTP MCP
- Exact MCP server framework (@modelcontextprotocol/sdk or manual)
- Where to mount the MCP endpoint (existing /api routes or new)
