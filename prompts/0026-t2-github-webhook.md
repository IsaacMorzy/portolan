# 0026 — T2: GitHub App webhook ingestion

## Ask
Lane T2 of wayfinder map #50: implement a GitHub App webhook endpoint that receives PR webhooks, verifies the signature, extracts the PR diff, and triggers a review via /api/review. Acceptance check: a real PR webhook triggers a review.

## Reading
Depends on T1 (/api/review endpoint exists, closed #53) and R2 (reviews table exists). Existing GitHub App patterns: `lib/github/app.ts` (manifest exchange, JWT, installation token), `github_apps` table stores `webhook_secret` per organization, `appFromEnv()` reads GITHUB_APP_ID/GITHUB_APP_PRIVATE_KEY. Webhook signature is HMAC-SHA256 of the raw body using `x-hub-signature-256` header with the webhook_secret. GitHub webhook payload includes `installation.id` to find the org's app row, and `pull_request` events carry repo + PR info.

## Scope
**In:** `app/api/github/webhook/route.ts` — verify HMAC-SHA256 signature, handle `pull_request` (opened/synchronize/reopened), look up org by installation_id from `github_apps`, fetch PR diff via GitHub installation token, trigger /api/review logic. Extract /api/review's core into a shared function if needed to avoid HTTP-over-HTTP.
**Out:** GitHub App marketplace listing, registering the webhook URL with GitHub (manual step), rule config (T3), UI.

## Done when
- Webhook endpoint exists and verifies signature
- For PR events: finds org, fetches diff, triggers review
- `pnpm gate` + `npx tsc --noEmit` + `npx eslint . --quiet` + `pnpm build` pass
- Demo noted as comment on #54; map #50 updated

## Known unknowns
- Whether to call /api/review via internal fetch or shared function
- How to map PR repo → analysisId (lean: latest complete analysis for the org's repo)
