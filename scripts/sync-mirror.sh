#!/usr/bin/env bash
# Syncs changed files from source repo to the Vercel mirror repo via GitHub API.
# Runs automatically after git push. Requires GITHUB_PERSONAL_ACCESS_TOKEN env var.

set -euo pipefail

MIRROR="reinaldoromero2/programacao-entrega"
API="https://api.github.com/repos/${MIRROR}/contents"
TOKEN="${GITHUB_PERSONAL_ACCESS_TOKEN:-}"

if [ -z "$TOKEN" ]; then
  echo "⚠ GITHUB_PERSONAL_ACCESS_TOKEN not set, skipping mirror sync"
  exit 0
fi

sync_file() {
  local path="$1"
  local local_path="$2"

  local sha
  sha=$(curl -s \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/vnd.github+json" \
    "${API}/${path}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('sha',''))" 2>/dev/null || true)

  local content
  content=$(base64 -w 0 "$local_path")

  local payload
  payload=$(python3 -c "
import json, sys
sha=sys.argv[1]; content=sys.argv[2]; path=sys.argv[3]
d={'message': 'sync: $path', 'content': content}
if sha: d['sha'] = sha
print(json.dumps(d))
" "$sha" "$content" "$path")

  local result
  result=$(curl -s -X PUT \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/vnd.github+json" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "${API}/${path}")

  local commit_sha
  commit_sha=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('commit',{}).get('sha','')[:7] if 'commit' in d else 'ERR:'+d.get('message','?'))" 2>/dev/null || echo "ERR")
  echo "  ✓ ${path} → ${commit_sha}"
}

echo "🔄 Syncing mirror ${MIRROR}..."

# Files to keep in sync
sync_file "artifacts/programacao-entrega/src/components/relatorio-modal.tsx" \
          "artifacts/programacao-entrega/src/components/relatorio-modal.tsx"

sync_file "artifacts/api-server/src/routes/entregas.ts" \
          "artifacts/api-server/src/routes/entregas.ts"

sync_file "vercel.json" "vercel.json"

echo "✅ Mirror sync done"
