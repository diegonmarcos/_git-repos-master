#!/usr/bin/env bash
# Drift guard: every repo's generated Claude/agent mirror must equal the SoT.
# usage: check-mirrors.sh [repo-dir ...]   (default: every sibling checkout of
# _git-repos-master that has a _dotfiles/ folder). Exit 1 on any drift or on a repo
# listed in mirror-repos.txt that has no mirror at all (when run with --all).
# Fix drift by regenerating with deploy-dotfiles.sh, never by editing a mirror.
set -u
SOT="$(cd "$(dirname "$0")" && pwd)"
P="$SOT/cloud-marketplace/c3-infra"
repos=()
if [ $# -gt 0 ]; then repos=("$@"); else
  base="$(cd "$SOT/../.." && pwd)"
  for d in "$base"/*/; do [ -d "$d/_dotfiles" ] && repos+=("${d%/}"); done
fi
fail=0
bad() { echo "DRIFT $(basename "$1"): $2"; fail=1; }
same_tree() { # <sot-dir> <mirror-dir> <excluded-file>
  [ -d "$2" ] || return 1
  diff -r -x "$3" "$1" "$2" >/dev/null 2>&1
}
for r in "${repos[@]}"; do
  [ -d "$r/_dotfiles" ] || { bad "$r" "no _dotfiles folder"; continue; }
  for pair in "agents:.claude/agents:-" "cloud-marketplace/c3-infra/skills/c3-infra:.claude/skills/c3-infra:-" \
              "cloud-marketplace/c3-infra/hooks:.claude/hooks/c3:hooks.json" \
              "agents:_dotfiles/apps/src/claude/agents:-" "cloud-marketplace/c3-infra/skills/c3-infra:_dotfiles/apps/src/claude/skills/c3-infra:-" \
              "cloud-marketplace/c3-infra/hooks:_dotfiles/apps/src/claude/hooks/c3:hooks.json"; do
    IFS=: read -r a b x <<<"$pair"
    same_tree "$SOT/$a" "$r/$b" "$x" || bad "$r" "$b differs from SoT $a"
  done
  for pair in "settings.project.json:.claude/settings.json" "mcp-auth-headers.sh:.claude/mcp-auth-headers.sh" \
              "mcp-connect.mjs:.claude/mcp-connect.mjs" "settings.project.json:_dotfiles/apps/src/claude/settings.json"; do
    a=${pair%%:*}; b=${pair##*:}
    cmp -s "$SOT/$a" "$r/$b" || bad "$r" "$b differs from SoT $a"
  done
  # .mcp.json must hold EVERY fleet server (default + opt-in tiers) and no secret value.
  want=$(jq -r '(.tiers.default + .tiers["opt-in"])|sort|.[]' "$SOT/mcp-policy.json")
  have=$(jq -r '.mcpServers|keys|sort|.[]' "$r/.mcp.json" 2>/dev/null)
  miss=$(comm -23 <(echo "$want") <(echo "$have") | tr '\n' ' ')
  [ -z "$miss" ] || bad "$r" ".mcp.json lacks fleet servers: $miss"
  cmp -s "$r/.mcp.json" "$r/_dotfiles/apps/dist/dotfiles/root/mcp.json" || bad "$r" ".mcp.json != _dotfiles/.../root/mcp.json"
  grep -Eq 'Bearer [A-Za-z0-9_-]{20,}|eyJ[A-Za-z0-9_-]{20,}' "$r/.mcp.json" && bad "$r" ".mcp.json holds a literal secret"
  if [ "$(jq -r '.tiers.opt_in_everywhere' "$SOT/mcp-policy.json")" = true ]; then
    [ "$(jq -c '.servers' "$r/.claude/mcp-optin.json" 2>/dev/null)" = "$(jq -c '.tiers["opt-in"]' "$SOT/mcp-policy.json")" ] \
      || bad "$r" ".claude/mcp-optin.json != policy opt-in tier"
  fi
done
echo "mirror drift guard: ${#repos[@]} repo(s) checked, $([ $fail = 0 ] && echo clean || echo DRIFT)"
exit $fail
