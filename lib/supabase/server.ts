import { createAdminSupabase } from "./admin";

// Supabase signed the project's keys with an ES256 key it never exports, so the
// app can't mint a token PostgREST will accept and row policies can't identify
// the caller. Reads therefore use the secret key — the same client the pipeline
// already writes with — which bypasses policies.
//
// That moves the workspace boundary into code: every entry point must filter by
// organization_id before it reads anything else. The policies stay in the
// migrations as a second line, correct if a user token ever reaches PostgREST.
export const createServerSupabase = createAdminSupabase;
