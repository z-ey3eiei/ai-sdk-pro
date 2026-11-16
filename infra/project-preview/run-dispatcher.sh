#!/usr/bin/env bash
set -euo pipefail

: "${NEON_DATABASE_URL:?Configure the staging Neon connection}"
: "${PREVIEW_PILOT_PROJECT_ID:?Configure the staging pilot project ID}"
: "${PREVIEW_PILOT_REPOSITORY:?Configure the GitHub pilot repository}"
: "${PREVIEW_PILOT_INSTALLATION_ID:?Configure the GitHub App installation ID}"
: "${PREVIEW_PILOT_WORKFLOW_REF:?Configure the trusted workflow branch}"
: "${PREVIEW_PILOT_GITHUB_TOKEN:?Configure pilot-only GitHub Actions access}"

trap 'exit 0' INT TERM
while true; do
  if timeout --kill-after=5s 45s node --experimental-strip-types --disable-warning=ExperimentalWarning apps/web/scripts/dispatch-preview.ts; then
    sleep 30 &
  else
    echo 'Preview dispatch did not finish successfully; check job state before retrying any uncertain delivery.' >&2
    sleep 60 &
  fi
  wait "$!"
done
