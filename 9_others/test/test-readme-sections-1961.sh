#!/usr/bin/env bash
# Tester (#1961): every generated README.html (A2_repo-readmes/dist, and the private render when OUT_PRIV is given) carries the sections in order:
# title, metadata, urls, languages (inline SVG), commits (inline SVG), workflows, hooks, tree, explorer (<details>, no JS), siblings, parents, links,
# then README.md; the template keeps every placeholder the pre-#1961 page had (rule 16 parity). Each check is proven red by a mutation of a copy.
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
fail=0; ok() { echo "PASS  $*"; }; bad() { echo "FAIL  $*"; fail=1; }
CHK="$T/chk.js"; cat > "$CHK" <<'JS'
const fs = require('fs'), path = require('path');
const ORDER = ['title', 'metadata', 'urls', 'languages', 'commits', 'workflows', 'hooks', 'tree', 'explorer', 'siblings', 'parents', 'links', 'readme'];
const OLD = ['title', 'style', 'crumbs', 'owner', 'name', 'visibility', 'hubbadge', 'description', 'topics', 'stats', 'langbar', 'langs', 'branch', 'files', 'readme', 'meta', 'clonenote', 'parents', 'ptree', 'nsib', 'siblings', 'links', 'foot'];
const NEW = ['urls', 'langsvg', 'commitsvg', 'nwf', 'workflows', 'nhooks', 'hooks', 'tree', 'explorer'];
const [mode, target] = process.argv.slice(2), P = [];
function page(name, h) {
  const at = ORDER.map(s => h.indexOf(`data-section="${s}"`));
  ORDER.forEach((s, i) => { if (at[i] < 0) P.push(`${name}: no ${s} section`); });
  for (let i = 1; i < at.length; i++) if (at[i] >= 0 && at[i - 1] >= 0 && at[i] < at[i - 1]) P.push(`${name}: ${ORDER[i]} before ${ORDER[i - 1]}`);
  const sec = s => { const a = h.indexOf(`data-section="${s}"`); return a < 0 ? '' : h.slice(a, h.indexOf('</section>', a)); };
  const clone = !/no local clone at render time/.test(sec('tree'));
  if (!/<svg [^>]*aria-label="languages"/.test(sec('languages')) && !/no language detected/.test(sec('languages'))) P.push(`${name}: languages has no inline SVG`);
  if (clone && !/<svg [^>]*aria-label="commit activity"/.test(sec('commits'))) P.push(`${name}: commits has no inline SVG`);
  if (clone && !/<details open><summary>/.test(sec('explorer'))) P.push(`${name}: explorer is not a <details> navigator`);
  if (clone && !/└─ |├─ /.test(sec('tree'))) P.push(`${name}: tree is not drawn`);
  if (!/<ul class="l">/.test(sec('urls')) || !/github\.com\//.test(sec('urls'))) P.push(`${name}: urls lists no GitHub URL`);
  if (/<script|<link[^>]+stylesheet|<image|xlink:href|<img[^>]+src="https?:/i.test(h)) P.push(`${name}: not self-contained`);
}
if (mode === 'tpl') { const t = fs.readFileSync(target, 'utf8');
  for (const n of [...OLD, ...NEW]) if (!t.includes(`{{${n}}}`)) P.push(`template lost {{${n}}}`);
  page('template', t.replace(/\{\{(\w+)\}\}/g, (_, n) => n === 'langsvg' ? '<svg aria-label="languages"></svg>' : n === 'commitsvg' ? '<svg aria-label="commit activity"></svg>' : n === 'explorer' ? '<details open><summary>' : n === 'tree' ? '├─ x' : n === 'urls' ? 'https://github.com/x' : ''));
} else { let n = 0; for (const d of fs.readdirSync(target).sort()) { const f = path.join(target, d, 'README.html'); if (fs.existsSync(f)) { n++; page(d, fs.readFileSync(f, 'utf8')); } }
  if (n < (+process.env.MIN || 1)) P.push(`only ${n} pages`); }
if (P.length) { console.log(P.slice(0, 12).join('\n')); process.exit(1); }
JS
DIST="$ROOT/A2_repo-readmes/dist"; TPL="$ROOT/A2_repo-readmes/src/README.html.tmpl"
MIN=40 node "$CHK" dist "$DIST" >"$T/o" && ok "every dist README.html ($(ls "$DIST" | wc -l) repos) has the 13 sections in order, inline SVGs, a <details> explorer" || bad "$(head -5 "$T/o" | tr '\n' ' ')"
[ -n "${OUT_PRIV:-}" ] && { node "$CHK" dist "$OUT_PRIV" >"$T/o" && ok "every private README.html has the sections" || bad "private: $(head -3 "$T/o" | tr '\n' ' ')"; }
node "$CHK" tpl "$TPL" >"$T/o" && ok "template keeps every pre-#1961 placeholder and declares the sections in order" || bad "$(head -3 "$T/o" | tr '\n' ' ')"
grep -q 'CG-___\|CG-galaxy' <(ls "$DIST") && for r in CG-___ CG-galaxy CG-circus CG-voxel-rust; do [ -s "$DIST/$r/README.html" ] && [ -s "$DIST/$r/README.canvas" ] || bad "CG repo $r lacks its dist pair"; done && ok "CG's public repos have their README.html + README.canvas in dist"
mut() { rm -rf "$T/m"; mkdir -p "$T/m"; for r in CG-galaxy cloudy-u-android _git-repos-master; do [ -d "$DIST/$r" ] && cp -r "$DIST/$r" "$T/m/"; done; f="$T/m/CG-galaxy/README.html"; eval "$2"
  node "$CHK" dist "$T/m" >/dev/null && bad "mutation ($1) missed" || ok "mutation ($1) is caught"; }
mut "workflows section removed" 'sed -i "s/data-section=\"workflows\"/data-section=\"x\"/" "$f"'
mut "hooks section removed" 'sed -i "s/data-section=\"hooks\"/data-section=\"x\"/" "$f"'
mut "explorer before tree" 'sed -i "s/data-section=\"tree\"/data-section=\"TMP\"/;s/data-section=\"explorer\"/data-section=\"tree\"/;s/data-section=\"TMP\"/data-section=\"explorer\"/" "$f"'
mut "commit graphic dropped" 'sed -i "s/aria-label=\"commit activity\"/aria-label=\"x\"/" "$f"'
mut "languages graphic dropped" 'sed -i "s/aria-label=\"languages\"/aria-label=\"x\"/" "$f"'
mut "explorer is not details" 'sed -i "s/<details open><summary>/<div><summary>/g" "$f"'
mut "a remote script" 'sed -i "s#</body>#<script src=\"https://x/y.js\"></script></body>#" "$f"'
mut "siblings section removed" 'sed -i "s/data-section=\"siblings\"/data-section=\"x\"/" "$f"'
for ph in topics ptree langbar explorer; do cp "$TPL" "$T/t"; sed -i "s/{{$ph}}//" "$T/t"; node "$CHK" tpl "$T/t" >/dev/null && bad "template mutation (drop {{$ph}}) missed" || ok "template mutation (drop {{$ph}}) is caught"; done
cp "$TPL" "$T/t"; sed -i 's/data-section="links"/data-section="LX"/;s/data-section="parents"/data-section="links"/;s/data-section="LX"/data-section="parents"/' "$T/t"; node "$CHK" tpl "$T/t" >/dev/null && bad "template mutation (links before parents) missed" || ok "template mutation (links before parents) is caught"
[ $fail = 0 ] && echo "test-readme-sections-1961: all passed" || echo "test-readme-sections-1961: FAILED"; exit $fail
