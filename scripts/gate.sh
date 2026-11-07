#!/bin/sh
# The gate. One list of what must be true, two callers:
#
#   .githooks/pre-commit   this file, no arguments — stops a bad commit on the
#                          machine that wrote it, and dies the moment somebody
#                          types --no-verify
#   .github/workflows      this file, --full — the version that holds, because a
#                          failure here fails the pull request instead of a
#                          terminal somebody scrolled past
#
# It lives here rather than in the workflow because .github/workflows/ can only
# hold YAML that GitHub reads, and because two copies of the same list drift. The
# checks and their order are the same everywhere; only the tail differs, since a
# commit should not wait for a build and CI should not skip one.
#
# Every check prints the reason a finding exists, not just its location, so a
# failure reads like a review comment rather than a stack trace.

set -e
cd "$(dirname "$0")/.."

FULL=0
for argument in "$@"; do
  case "$argument" in
    --full) FULL=1 ;;
    *) echo "gate: unknown argument $argument" >&2; exit 2 ;;
  esac
done

# Style and rules first: they read files, need no network, and take under a
# second. Types and lint come after, because a type error in a file the slop
# check would have flagged is the less interesting failure.
for check in secrets guards slop design bar; do
  printf '==> %s\n' "$check"
  node "scripts/check/$check.mjs"
done

printf '==> workflow\n'
if [ "$FULL" -eq 1 ]; then
  node scripts/check/workflow.mjs
else
  node scripts/check/workflow.mjs --staged
fi

printf '==> types\n'
npx tsc --noEmit

printf '==> lint\n'
npx eslint . --quiet

if [ "$FULL" -eq 1 ]; then
  printf '==> tests\n'
  pnpm test

  # A build with no environment at all is the honest test: if this step needs a
  # secret to compile, the app will not deploy from a clean checkout either.
  printf '==> build\n'
  pnpm build
fi

echo "gate ok"
