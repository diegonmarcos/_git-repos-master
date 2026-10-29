#!/usr/bin/env bash
# Fetch the community plugins listed in plugins.list from each plugin's GitHub
# latest release into <repo>/.obsidian/plugins/<id>/ (manifest.json, main.js,
# styles.css when present). data.json (our defaults) is never touched.
# Writes plugins.lock (id version licence repo) next to this script.
# Usage: 9_others/obsidian/install-plugins.sh [--only id,id]
set -eu
here=$(cd "$(dirname "$0")" && pwd); root=$(cd "$here/../.." && pwd)
dest="$root/.obsidian/plugins"; lock="$here/plugins.lock"; only="${2:-}"
[ "${1:-}" = "--only" ] || only=""
licence() { # $1=repo -> SPDX-ish id or NONE
  for br in HEAD master main; do for f in LICENSE LICENSE.md LICENSE.txt LICENCE COPYING; do
    t=$(curl -fsSL "https://raw.githubusercontent.com/$1/$br/$f" 2>/dev/null | head -c 4000 | tr -s ' \n\t' '   ') || continue
    [ -n "$t" ] || continue
    case "$t" in
      *"MIT License"*|*"Permission is hereby granted, free of charge"*) echo MIT; return;;
      *"GNU GENERAL PUBLIC LICENSE"*"Version 3"*) echo GPL-3.0; return;;
      *"GNU AFFERO"*) echo AGPL-3.0; return;;
      *"Apache License"*) echo Apache-2.0; return;;
      *"ISC License"*|*"Permission to use, copy, modify, and/or distribute"*) echo ISC; return;;
      *"BSD"*) echo BSD; return;;
      *"Mozilla Public License"*) echo MPL-2.0; return;;
      *) echo OTHER; return;;
    esac
  done; done
  t=$(curl -fsSL "https://raw.githubusercontent.com/$1/HEAD/package.json" 2>/dev/null | sed -n 's/.*"license" *: *"\([^"]*\)".*/\1/p' | head -1)
  echo "${t:-NONE}"
}
: > "$lock.tmp"
grep -v '^#' "$here/plugins.list" | while read -r id repo; do
  [ -n "$id" ] || continue
  if [ -n "$only" ] && ! echo ",$only," | grep -q ",$id,"; then grep "^$id " "$lock" >> "$lock.tmp" 2>/dev/null || true; continue; fi
  base="https://github.com/$repo/releases/latest/download"; d="$dest/$id"; mkdir -p "$d"
  for f in manifest.json main.js; do curl -fsSL -o "$d/$f" "$base/$f" || { echo "FAIL $id $f" >&2; continue 2; }; done
  curl -fsSL -o "$d/styles.css" "$base/styles.css" 2>/dev/null || rm -f "$d/styles.css"
  v=$(sed -n 's/.*"version" *: *"\([^"]*\)".*/\1/p' "$d/manifest.json" | head -1)
  echo "$id $v $(licence "$repo") $repo" | tee -a "$lock.tmp"
done
mv "$lock.tmp" "$lock"
