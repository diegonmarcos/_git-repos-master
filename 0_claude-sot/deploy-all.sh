#!/usr/bin/env bash
# deploy-all.sh: THE entry point of the Claude Code dotfiles source of truth.
# SoT = this directory (0_claude-sot/ in _git-repos-master). Owner order 2026-11-25.
#   deploy-all.sh           regenerate this repo's mirrors, sync cloud-u-linux's
#                           da_my-ai/data/claude, then for every repo in mirror-repos.txt
#                           with a clone under $BASE: write the minimal _dotfiles skeleton
#                           when the repo has none, run the engine, restore .mcp.json,
#                           stage the mirror paths only, commit, push origin main.
#   deploy-all.sh --check-child   only the cloud-u-linux mirror (see check-child.sh)
#   deploy-all.sh --check   change nothing; exit 1 when any mirror differs from the SoT.
# Env: BASE (clone root, default /home/user), MSG (commit subject), NO_PUSH=1 (commit only).
[ -n "${BASH_VERSION:-}" ] || exec bash "$0" "$@"
set -u
SOT="$(cd "$(dirname "$0")" && pwd)"
HOME_REPO="$(cd "$SOT/.." && pwd)"
BASE="${BASE:-$(cd "$HOME_REPO/.." && pwd)}"
ENGINE="$SOT/engine/deploy-dotfiles.sh"
MSG="${MSG:-claude mirrors: source of truth is _git-repos-master/0_claude-sot}"
TRAILER='Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_0172rQF2sCRHaeMtr1E7pzQ8'
CHILD="${CLOUD_U_LINUX_REPO:-$BASE/cloud-u-linux}/da_my-ai/data/claude"
# engine/ and deploy-all.sh only make sense inside the SoT repo: not copied to the child mirror.
# Paths a mirror run may stage (nothing else).
MIRROR_PATHS=(.claude/agents .claude/skills/c3-infra .claude/hooks/c3 .claude/settings.json
  .claude/mcp-auth-headers.sh .claude/mcp-connect.mjs .claude/mcp-optin.json
  _dotfiles/apps/src/claude _dotfiles/apps/dist/dotfiles/claude)

repos() { # repo dirs, this repo first, then mirror-repos.txt entries with a clone
  # mirror-repos.txt line: <github-name> [<clone-dir-name>]  (second column only when the
  # local clone keeps an older folder name, e.g. cloudy-u-linux cloud-u-linux)
  echo "$HOME_REPO"
  grep -vE '^\s*(#|$)' "$SOT/mirror-repos.txt" | while read -r name alias _; do
    r="${alias:-${name##*/}}"
    d="$BASE/$r"; [ -d "$d/.git" ] && [ "$d" != "$HOME_REPO" ] && echo "$d"
  done
}

# Paths staged in addition to MIRROR_PATHS for a repo whose skeleton this run created.
BOOT_PATHS=(_dotfiles/apps/src/manifest.json _dotfiles/apps/src/root _dotfiles/apps/dist/dotfiles/root .mcp.json)

bootstrap() { # <repo>  a repo with no _dotfiles/apps/src gets the minimal skeleton (claude + root mcp)
  [ -f "$1/_dotfiles/apps/src/manifest.json" ] && return 1
  mkdir -p "$1/_dotfiles/apps/src/root" || return 2
  cp "$SOT/bootstrap/manifest.json" "$1/_dotfiles/apps/src/manifest.json" || return 2
  cp "$HOME_REPO/_dotfiles/apps/src/root/mcp.json" "$HOME_REPO/_dotfiles/apps/src/root/mcp.optin.json" "$1/_dotfiles/apps/src/root/" || return 2
  return 0
}

header() { printf '<!-- GENERATED from _git-repos-master/0_claude-sot, DO NOT EDIT. Edit the source and run `sh 0_claude-sot/deploy-all.sh`. -->\n\n'; }

sync_child() { # cloud-u-linux da_my-ai/data/claude = SoT + README header
  [ -d "$(dirname "$CHILD")" ] || { echo "child: no cloud-u-linux clone, skipped"; return 0; }
  mkdir -p "$CHILD" && find "$CHILD" -mindepth 1 -delete || return 1
  ( cd "$SOT" && tar cf - --exclude=./engine --exclude=./deploy-all.sh --exclude=./README.md . ) | ( cd "$CHILD" && tar xf - ) || return 1
  { header; cat "$SOT/README.md"; } > "$CHILD/README.md"
}

check_child() {
  [ -d "$CHILD" ] || { echo "child: no clone, skipped"; return 0; }
  local bad=0
  diff -rq -x engine -x deploy-all.sh -x README.md "$SOT" "$CHILD" >/dev/null 2>&1 || bad=1
  cmp -s "$CHILD/README.md" <({ header; cat "$SOT/README.md"; }) || bad=1
  [ $bad = 0 ] || echo "DRIFT cloud-u-linux: da_my-ai/data/claude differs from SoT"
  return $bad
}

if [ "${1:-}" = "--check-child" ]; then check_child && echo "cloud-u-linux mirror: clean"; exit $?; fi
if [ "${1:-}" = "--check" ]; then
  fail=0
  check_child || fail=1
  list=(); while read -r d; do list+=("$d"); done < <(repos)
  "$SOT/check-mirrors.sh" "${list[@]}" || fail=1
  [ $fail = 0 ] && echo "deploy-all --check: clean" || echo "deploy-all --check: DRIFT"
  exit $fail
fi

run_engine() { # <repo>  regenerate the mirrors of one repo from the SoT
  ( cd "$1" && CLAUDE_SOT_DIR="$SOT" sh "$ENGINE" _dotfiles/apps/src _dotfiles/apps/dist/dotfiles . >/dev/null 2>&1 ) || return 1
  git -C "$1" checkout -q -- .mcp.json 2>/dev/null
  return 0
}

ok=0; fail=""
# 1. this repo
run_engine "$HOME_REPO" || fail="$fail $(basename "$HOME_REPO")(engine)"
# 2. cloud-u-linux child (generated copy of this SoT)
sync_child || fail="$fail cloud-u-linux(sync)"
# 3. every other repo with a clone
while read -r d; do
  r=$(basename "$d")
  if [ "$d" != "$HOME_REPO" ]; then
    git -C "$d" pull -q --no-rebase --no-edit origin main >/dev/null 2>&1
    boot=0
    if ! git -C "$d" ls-files --error-unmatch _dotfiles/apps/src/manifest.json >/dev/null 2>&1; then
      bootstrap "$d"; [ $? = 2 ] && { fail="$fail $r(bootstrap)"; continue; }; boot=1
    fi
    run_engine "$d" || { fail="$fail $r(engine)"; continue; }
  fi
  paths=(); [ "$r" = cloud-u-linux ] && paths+=(da_my-ai/data/claude)
  [ "${boot:-0}" = 1 ] && for p in "${BOOT_PATHS[@]}"; do [ -e "$d/$p" ] && paths+=("$p"); done
  # the SoT repo also commits the source itself (0_claude-sot/ and its CLAUDE.md) with its mirrors
  [ "$d" = "$HOME_REPO" ] && paths+=("${SOT#"$HOME_REPO"/}" CLAUDE.md)
  for p in "${MIRROR_PATHS[@]}"; do [ -e "$d/$p" ] && paths+=("$p"); done
  git -C "$d" add -A -- "${paths[@]}" 2>/dev/null
  if git -C "$d" diff --cached --quiet -- "${paths[@]}"; then ok=$((ok+1)); continue; fi
  # commit only the mirror paths, even if other files are already staged
  git -C "$d" commit -q -m "$MSG

$TRAILER" -- "${paths[@]}" >/dev/null 2>&1 || { fail="$fail $r(commit)"; continue; }
  if [ "${NO_PUSH:-}" = 1 ]; then ok=$((ok+1)); continue; fi
  if git -C "$d" push -q origin main >/dev/null 2>&1; then ok=$((ok+1)); else fail="$fail $r(push)"; fi
done < <(repos)
# 4. cloud-u-linux child: commit + push the generated mirror (not in mirror-repos.txt)
C="${CHILD%/da_my-ai/data/claude}"
if [ -d "$C/.git" ]; then
  git -C "$C" add -A -- da_my-ai/data/claude 2>/dev/null
  if ! git -C "$C" diff --cached --quiet -- da_my-ai/data/claude; then
    git -C "$C" commit -q -m "$MSG

$TRAILER" -- da_my-ai/data/claude >/dev/null 2>&1 || fail="$fail cloud-u-linux(commit)"
    [ "${NO_PUSH:-}" = 1 ] || git -C "$C" push -q origin main >/dev/null 2>&1 || fail="$fail cloud-u-linux(push)"
  fi
fi
echo "deploy-all: ok=$ok fail=[${fail# }]"
[ -z "$fail" ]
