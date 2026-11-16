#!/usr/bin/env bash
# On VPS: point ~/ai-sdk-pro at GitHub (replace stale Cloudflare artifact remote).
set -euo pipefail
cd "${1:-$HOME/ai-sdk-pro}"
echo "Before:"
git remote -v
git remote set-url origin https://github.com/z-ey3eiei/ai-sdk-pro.git
echo "After:"
git remote -v
echo ""
echo "Private repo: run ONE of these before fetch (do not paste tokens in chat):"
echo "  git config credential.helper store   # then one successful git fetch will prompt"
echo "  export GH_TOKEN=...; git -c http.extraHeader=\"Authorization: Bearer \$GH_TOKEN\" fetch origin"
echo "Or: git remote set-url origin git@github.com:z-ey3eiei/ai-sdk-pro.git  # if VPS has GitHub SSH key"