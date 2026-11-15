#!/usr/bin/env bash
set -euo pipefail
set +x

if [[ $(id -u) == 0 || $(hostname -s) == ai-sdk-pro-prod ]]; then
  printf '%s\n' 'Run as an unprivileged user on the dedicated build VM.' >&2
  exit 1
fi
runner_directory="${1:?Usage: run-once.sh RUNNER_DIRECTORY}"
cd -- "$runner_directory"
test -x ./run.sh
umask 077
if ! mkdir .aisdk-runner-used; then
  printf '%s\n' 'Create a fresh runner VM and installation for the next job.' >&2
  exit 1
fi
IFS= read -rs config
if [[ ! "$config" =~ ^[A-Za-z0-9+/=_-]{32,}$ ]]; then
  printf '%s\n' 'Missing GitHub JIT configuration.' >&2
  exit 2
fi
exec env -i PATH=/usr/bin:/bin HOME="$PWD" LANG=C.UTF-8 timeout --kill-after=30s 20m ./run.sh --jitconfig "$config"
