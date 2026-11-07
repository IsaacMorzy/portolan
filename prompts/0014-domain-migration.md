# 0014 — Clerk renamed, and the domain made a single variable

## Categorised request

| Kind | Request | Verdict |
| --- | --- | --- |
| **Rebrand** | Rename the app in Clerk | **done** — `codegraph` → `Portolan`, via the Clerk API (not the dashboard) |
| **Migration** | Move the deploy URL to `portolan.vercel.app` | **blocked, with evidence** — the slug is live for another project, the publishable key embeds the host, and the proxy is dashboard-only |
| **Code** | Make the origin changeable | **build** — `lib/site.ts` is the one place the deploy origin is written down |

## Why the URL cannot move today

1. `https://portolan.vercel.app` already serves a project called **MelozSee**. Same
   for `rhumb` and `soundings`. Renaming the Vercel project would therefore not
   produce that domain — it would drop the current default domain instead.
2. The production publishable key is `pk_live_Y2xlcmsuY29kZWdyYXBoLW5hdnkudmVyY2VsLmFwcCQ`,
   which base64-decodes to `clerk.codegraph-navy.vercel.app$`. The host is **inside
   the key**; a new domain means a new key, a new env value and a redeploy.
3. Clerk's proxy is not in the platform-config schema (`proxy` is an unknown key),
   so it is a Dashboard change on the Clerk side, not an API call this repo can make.

## The migration, when a domain is bought

1. Add the domain in Vercel and point DNS at it.
2. Clerk Dashboard → production instance → set the proxy/frontend API host.
3. Copy the new publishable key into `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and
   `NEXT_PUBLIC_APP_URL`; redeploy.
4. Update `metadataBase`, JSON-LD and the GitHub App manifest — **already one
   variable** (`lib/site.ts`), so this step is now a no-op in code.
5. Re-point the GitHub repo homepage and the test harness base URLs.

## Failure modes

- Renaming the Vercel project and discovering the domain is gone, with Clerk's key
  pointing at a host that no longer serves the app.
- Treating "Clerk app renamed" as "URL migrated". They are unrelated controls.
