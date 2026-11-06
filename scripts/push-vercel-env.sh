#!/usr/bin/env bash
# Push the production environment variables from .env.local to the linked
# Vercel project. Run this AFTER `vercel login` and `vercel link`.
#
#   ./scripts/push-vercel-env.sh [production|preview|development]
#
# Values are read from .env.local so the secrets never appear on a command line
# (and therefore never in shell history or `ps` output).
set -euo pipefail

ENV_FILE=".env.local"
TARGET="${1:-production}"

[ -f "$ENV_FILE" ] || { echo "missing $ENV_FILE" >&2; exit 1; }

# These two are server-only and must never reach preview/dev branches by accident;
# they are still required per-environment because next.config.ts asserts on them.
KEYS=(
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  CLERK_SECRET_KEY
  NEXT_PUBLIC_CLERK_SIGN_IN_URL
  NEXT_PUBLIC_CLERK_SIGN_UP_URL
  NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
  NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  SUPABASE_SECRET_KEY
  SUPABASE_JWKS_URL
  LANGSMITH_TRACING
  LANGSMITH_PROJECT
  LANGSMITH_ENDPOINT
  AGENT_URL
)

# Values that may legitimately be blank locally (no key yet) are skipped rather
# than written empty, so `assertEnv` fails loudly in Vercel instead of silently.
OPTIONAL_IF_EMPTY=(
  LANGSMITH_API_KEY
  OPENAI_API_KEY
  SUPABASE_DB_PASSWORD
)

get() { sed -n "s/^$1=//p" "$ENV_FILE" | tail -1 | sed -e "s/^'//" -e "s/'$//"; }

for key in "${KEYS[@]}"; do
  val="$(get "$key")"
  if [ -z "$val" ]; then
    echo "SKIP $key (empty in $ENV_FILE)"
    continue
  fi
  printf '%s' "$val" | vercel env add "$key" "$TARGET" --force >/dev/null
  echo "SET  $key"
done

for key in "${OPTIONAL_IF_EMPTY[@]}"; do
  val="$(get "$key")"
  if [ -z "$val" ]; then
    echo "SKIP $key (empty — set it in the Vercel dashboard if needed)"
    continue
  fi
  printf '%s' "$val" | vercel env add "$key" "$TARGET" --force >/dev/null
  echo "SET  $key"
done

echo "Done. Verify with: vercel env ls $TARGET"
