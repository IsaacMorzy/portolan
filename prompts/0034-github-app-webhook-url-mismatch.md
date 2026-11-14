# Prompt 0035 — GitHub App webhook URL mismatch

## Verbatim ask
Fix the webhook URL mismatch: GitHub App is configured to receive webhooks at `https://codegraph-navy.vercel.app/api/github/app/webhook` but the code route exists at `https://codegraph-navy.vercel.app/api/github/webhook`. The `.github/app-manifest.json` already declares the correct URL (`/api/github/webhook`), but the live GitHub App (created earlier) points to `/api/github/app/webhook`. Create a route at `/api/github/app/webhook` so webhooks delivered there are handled.

## Reading chosen
- `app/api/github/webhook/route.ts` — existing webhook POST handler with HMAC-SHA256 verification
- `.github/app-manifest.json` — declares `webhook_url: https://codegraph-navy.vercel.app/api/github/webhook`
- `app/api/github/app/callback/route.ts` and `app/api/github/app/manifest/route.ts` — existing app sub-routes for reference on route structure

## What is out of scope
- Changing the GitHub App setting in the GitHub UI (requires interactive browser auth that is blocked in headless sessions)
- Modifying the manifest URL (it is already correct)
- Verifying tokens against a live private repo (requires GitHub network access)

## How the result will be checked
- `npx tsc --noEmit` passes
- `pnpm gate` passes (secrets, guards, slop, design, bar, workflow checks)
- New route `app/api/github/app/webhook/route.ts` exists and re-exports the webhook POST handler
