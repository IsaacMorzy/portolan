# 0024 — R2: Review state schema + RLS policy

## Ask
Lane R2 of wayfinder map #50: design the Supabase schema for review state (reviews, review_comments) and the RLS policy that scopes reviews to the organization that owns the repo. Apply to local Supabase via a migration.

## Reading
Existing tables follow a strict pattern: `organization_id text not null references public.organizations (id) on delete cascade`, RLS enabled with `alter table ... enable row level security`, no policies (service-key only = deny-by-default), functions granted to `service_role` only, migrations numbered with timestamps, comments explaining the "why". The `analyses` table is the parent a review would attach to (one analysis per repo snapshot).

## Scope
**In:** Design `public.reviews` and `public.review_comments` tables following the existing pattern; write RLS policy; create a migration file; apply to local Supabase.
**Out:** Writing the API endpoint that creates reviews (T1), building the GitHub App (T2), building rule config (T3), any UI.

## Done when
- Migration file created at `supabase/migrations/YYYYMMDDHHMMSS_review_schema.sql`
- Migration applied to local Supabase (`supabase db reset` or equivalent)
- `pnpm gate` + `npx tsc --noEmit` + `npx eslint . --quiet` pass
- Decision + schema summary posted as a comment on #52; map #50 updated

## Known unknowns
- Whether a review belongs to an analysis or directly to a repo/org (lean: analysis, since a review reviews a parsed snapshot)
- Whether comments target specific lines or whole files (lean: file + optional line range)
