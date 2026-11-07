-- G9 (#30): a map is not a photograph.
--
-- A scheduled refresh re-runs an analysis when the repository's default branch
-- has moved. One analysis row per repository is a unique constraint that every
-- read depends on, so a refresh replaces the map in place rather than creating
-- a second row — which means the commit it replaced has to be recorded, or the
-- only evidence that anything changed is gone.
--
-- Nullable, so every existing row stays valid and a first run has nothing to
-- report.

alter table public.analyses
  add column if not exists previous_commit_sha text;

alter table public.analyses
  add column if not exists refreshed_at timestamptz;

comment on column public.analyses.previous_commit_sha is
  'The commit this analysis read before the last refresh. Null until one happens.';
comment on column public.analyses.refreshed_at is
  'When a refresh last replaced this analysis. Null for a run a person started.';
