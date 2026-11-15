#!/usr/bin/env bash
set -euo pipefail
set +x

repository="${1:?Usage: mint-jit.sh OWNER/PRIVATE_REPOSITORY}"
[[ "$repository" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] || exit 2
if [[ "$(gh api "repos/$repository" --jq .visibility)" != private ]]; then
  printf '%s\n' 'Choose a private runner-control repository.' >&2
  exit 1
fi
name="aisdk-build-$(date +%s)-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')"
jq -n --arg name "$name" '{name:$name,runner_group_id:1,labels:["aisdk-build-ephemeral"],work_folder:"_work"}' |
  gh api --method POST "repos/$repository/actions/runners/generate-jitconfig" --input - --jq .encoded_jit_config
