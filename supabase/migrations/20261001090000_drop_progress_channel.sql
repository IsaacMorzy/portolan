-- Drop the progress broadcast. Progress is now polled from
-- app/api/progress/[id]/route.ts, which reads the row through a scoped query;
-- no browser subscribes to "analysis:<id>" any more.
--
-- The trigger was not merely unused: it fired realtime.send on every update of
-- status, stage, stage_message or error, so every write to analyses paid for a
-- broadcast that reached nobody. Dropped rather than left in place, because a
-- subscriber that does not exist cannot be reasoned about later.
--
-- The columns it read (status, stage, stage_message, error) stay: the progress
-- route and the dashboard both select them.

drop trigger if exists publish_progress on public.analyses;

drop function if exists public.publish_analysis_progress();

drop policy if exists "members receive their organization's analysis progress"
  on realtime.messages;
