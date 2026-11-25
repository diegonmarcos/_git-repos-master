#!/usr/bin/env bash
# Drift check for the generated mirror of this directory in cloud-u-linux
# (da_my-ai/data/claude). Run it from either place; exit 1 when the mirror differs
# from _git-repos-master/0_claude-sot. Fix by running `sh 0_claude-sot/deploy-all.sh`
# in _git-repos-master, never by editing the mirror.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$HERE/deploy-all.sh" ]; then exec bash "$HERE/deploy-all.sh" --check-child; fi
SOT="${SOT_DIR:-$HERE/../../../../git-repos-master/0_claude-sot}"
[ -f "$SOT/deploy-all.sh" ] || { echo "SoT not found at $SOT (set SOT_DIR)"; exit 2; }
CLOUD_U_LINUX_REPO="$(git -C "$HERE" rev-parse --show-toplevel)" exec bash "$SOT/deploy-all.sh" --check-child
