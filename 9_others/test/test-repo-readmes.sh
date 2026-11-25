#!/usr/bin/env bash
# Tester for A2_repo-readmes (#1933): README.html + README.canvas per registry repo (render-repo-readmes.js, deploy-readmes.sh).
# Checks: one pair per deployable repo; canvas validates against JSON Canvas 1.0; html self-contained; determinism; privacy (nothing of a
# private clone in master or in a public repo); deploy + drift guard on scratch clones. Every assertion is proven by a mutation.
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
fail=0; ok() { echo "PASS  $*"; }; bad() { echo "FAIL  $*"; fail=1; }
CHK="$ROOT/9_others/test/check-readmes.js"; DIST="$ROOT/A2_repo-readmes/dist"
PRIVN="$(node -e 'console.log(require(process.argv[1]).repos.filter(r=>r.visibility==="private").map(r=>r.name).join(","))' "$ROOT/0_registry/repos-github.json")"
G() { git -C "$ROOT" "$@"; }

# 1. a pair per public repo of the registry (non-archived) in dist; private ones never in dist
node -e '
const M=require(process.argv[1]+"/0_registry/registry-model.js"),fs=require("fs");const x=M.expand(M.load());
const miss=x.repos.filter(r=>!/^z-archived/.test(r.github)&&r.visibility==="public").flatMap(r=>["README.html","README.canvas"].filter(f=>!fs.existsSync(process.argv[1]+"/A2_repo-readmes/dist/"+r.github+"/"+f)).map(f=>r.github+"/"+f));
console.log(miss.join("\n"));process.exit(miss.length?1:0)' "$ROOT" >"$T/o" && ok "every public non-archived repo has README.html and README.canvas in dist" || bad "missing: $(cat "$T/o" | head -3 | tr '\n' ' ')"
cp -r "$DIST" "$T/m1"; rm "$T/m1/$(ls "$T/m1" | head -1)/README.canvas"; node "$CHK" "$T/m1" >/dev/null && bad "mutation (deleted canvas) missed" || ok "mutation (deleted canvas) is caught"

# 2. canvas schema + html self-contained + no private page in dist
node "$CHK" "$DIST" --private-names "$PRIVN" >"$T/o" && ok "all dist canvases validate, all pages are self-contained" || bad "$(head -3 "$T/o" | tr '\n' ' ')"
n=$(ls "$DIST" | wc -l); [ "$n" -gt 40 ] && ok "dist has $n repo folders" || bad "dist has only $n repo folders"
mut() { # <label> <sed|node edit on copy> ; each must make the checker fail
  rm -rf "$T/m"; cp -r "$DIST" "$T/m"; d="$T/m/$(ls "$T/m" | sed -n 3p)"; eval "$2"
  node "$CHK" "$T/m" --private-names "$PRIVN" >/dev/null && bad "mutation ($1) missed" || ok "mutation ($1) is caught"; }
mut "dangling edge" 'node -e "const f=process.argv[1],c=JSON.parse(require(\"fs\").readFileSync(f));c.edges[0].toNode=\"nope\";require(\"fs\").writeFileSync(f,JSON.stringify(c))" "$d/README.canvas"'
mut "duplicate node id" 'node -e "const f=process.argv[1],c=JSON.parse(require(\"fs\").readFileSync(f));c.nodes[1].id=c.nodes[0].id;require(\"fs\").writeFileSync(f,JSON.stringify(c))" "$d/README.canvas"'
mut "text node without text" 'node -e "const f=process.argv[1],c=JSON.parse(require(\"fs\").readFileSync(f));delete c.nodes.find(n=>n.type===\"text\").text;require(\"fs\").writeFileSync(f,JSON.stringify(c))" "$d/README.canvas"'
mut "link node without url" 'node -e "const f=process.argv[1],c=JSON.parse(require(\"fs\").readFileSync(f));delete c.nodes.find(n=>n.type===\"link\").url;require(\"fs\").writeFileSync(f,JSON.stringify(c))" "$d/README.canvas"'
mut "overlapping cards" 'node -e "const f=process.argv[1],c=JSON.parse(require(\"fs\").readFileSync(f)),t=c.nodes.filter(n=>n.type===\"text\");t[1].x=t[0].x;t[1].y=t[0].y;require(\"fs\").writeFileSync(f,JSON.stringify(c))" "$d/README.canvas"'
mut "script tag" 'sed -i "s#</body>#<script src=\"https://x/y.js\"></script></body>#" "$d/README.html"'
mut "external stylesheet" 'sed -i "s#</head>#<link rel=stylesheet href=\"https://x/y.css\"></head>#" "$d/README.html"'
mut "remote image" 'sed -i "s#</body>#<img src=\"https://x/y.png\"></body>#" "$d/README.html"'
mut "private repo page in dist" 'mkdir -p "$T/m/$(echo "$PRIVN" | cut -d, -f1)"; cp "$d/README.html" "$d/README.canvas" "$T/m/$(echo "$PRIVN" | cut -d, -f1)/"'

# 3. privacy: no tracked/dist path of a private repo, no private content in a public page
bad_tr=$(G ls-files A2_repo-readmes/dist | awk -F/ '{print $3}' | sort -u | grep -Fx -f <(echo "$PRIVN" | tr ',' '\n') || true)
[ -z "$bad_tr" ] && ok "no private repo path is tracked under A2_repo-readmes/dist" || bad "private repo path tracked: $bad_tr"
bad_wt=$(ls "$DIST" | grep -Fx -f <(echo "$PRIVN" | tr ',' '\n') || true)
[ -z "$bad_wt" ] && ok "no private repo folder in the working dist" || bad "private repo folder in dist: $bad_wt"
# the same assertion proven on a fake tracked path (mutation): the check must flag it
echo "A2_repo-readmes/dist/$(echo "$PRIVN" | cut -d, -f1)/README.html" | awk -F/ '{print $3}' | grep -Fxq -f <(echo "$PRIVN" | tr ',' '\n') && ok "mutation (private path tracked) is caught" || bad "mutation (tracked private path) missed"

# 4. determinism: two renders into two dirs are byte-equal
OUT="$T/r1" node "$ROOT/0_registry/render-repo-readmes.js" >/dev/null && OUT="$T/r2" node "$ROOT/0_registry/render-repo-readmes.js" >/dev/null && diff -r "$T/r1" "$T/r2" >/dev/null && ok "two runs are byte-equal" || bad "render is not deterministic"
diff -r "$T/r1" "$DIST" >/dev/null && ok "dist equals a fresh render (run ./build.sh when this fails)" || bad "dist drifted from a fresh render (run ./build.sh)"
cp -r "$T/r2" "$T/r3"; echo x >> "$T/r3/$(ls "$T/r3" | head -1)/README.html"; diff -r "$T/r1" "$T/r3" >/dev/null && bad "mutation (edited dist) missed" || ok "mutation (edited dist) is caught by the byte comparison"

# 5. deploy on scratch clones: only the two files committed, README.md untouched, private content only in the private clone, drift guard
B="$T/base"; mkdir -p "$B"
for r in cloudy-a-docs cloud-me-pvt-vault; do mkdir "$B/$r"; git -C "$B/$r" init -q -b main; git -C "$B/$r" config user.email t@t; git -C "$B/$r" config user.name t
  echo "# $r PRIVMARK-$r" > "$B/$r/README.md"; mkdir "$B/$r/PRIVDIR-$r"; echo x > "$B/$r/PRIVDIR-$r/f.txt"; git -C "$B/$r" add -A; git -C "$B/$r" commit -q -m init; done
echo "dirty" > "$B/cloudy-a-docs/other.txt"
BASE="$B" OUT="$T/pubdist" node "$ROOT/0_registry/render-repo-readmes.js" >/dev/null
export BASE="$B" DIST="$T/pubdist" ONLY="cloudy-a-docs cloud-me-pvt-vault" NO_PUSH=1
bash "$ROOT/A2_repo-readmes/deploy-readmes.sh" >"$T/dep.log" 2>&1 && ok "deploy-readmes.sh runs on scratch clones ($(tail -1 "$T/dep.log"))" || bad "deploy failed: $(tail -2 "$T/dep.log")"
for r in cloudy-a-docs cloud-me-pvt-vault; do
  [ "$(git -C "$B/$r" show --stat --format= HEAD | grep -c '|')" = 2 ] && git -C "$B/$r" show --stat --format= HEAD | grep -q 'README.html' && ok "$r: the commit holds only README.html and README.canvas" || bad "$r: commit has other files"
  [ "$(cat "$B/$r/README.md")" = "# $r PRIVMARK-$r" ] && ok "$r: README.md untouched" || bad "$r: README.md changed"
  sed -n 2p "$B/$r/README.html" | grep -q 'generated by' && ok "$r: README.html carries the generated-by comment after the doctype" || bad "$r: no generated-by comment"
done
[ -n "$(git -C "$B/cloudy-a-docs" status --short other.txt)" ] && ok "unrelated untracked file left alone" || bad "unrelated file was staged/committed"
grep -q 'PRIVMARK-cloud-me-pvt-vault' "$B/cloud-me-pvt-vault/README.html" && ok "private page carries its own README (deployed to the private repo only)" || bad "private page lacks its README"
if grep -rlq 'PRIVMARK-cloud-me-pvt-vault\|PRIVDIR-cloud-me-pvt-vault' "$B/cloudy-a-docs" "$T/pubdist" 2>/dev/null; then bad "private clone content leaked into a public page or dist"; else ok "no private clone content in a public repo page or in the public dist"; fi
cp "$B/cloudy-a-docs/README.html" "$T/leak"; echo "PRIVMARK-cloud-me-pvt-vault" >> "$T/leak"; grep -q 'PRIVMARK-cloud-me-pvt-vault' "$T/leak" && ok "mutation (private text in a public page) is caught by the leak grep"
bash "$ROOT/A2_repo-readmes/deploy-readmes.sh" --check >/dev/null 2>&1 && ok "--check is clean after deploy" || bad "--check reports drift right after deploy"
git -C "$B/cloudy-a-docs" log --oneline | wc -l | grep -qx 2 && NO_PUSH=1 bash "$ROOT/A2_repo-readmes/deploy-readmes.sh" >/dev/null 2>&1 && [ "$(git -C "$B/cloudy-a-docs" log --oneline | wc -l)" = 2 ] && ok "deploy is idempotent (second run commits nothing)" || bad "deploy is not idempotent"
echo x >> "$B/cloudy-a-docs/README.html"; bash "$ROOT/A2_repo-readmes/deploy-readmes.sh" --check >/dev/null 2>&1 && bad "mutation (edited deployed html) missed" || ok "mutation (edited deployed html) is caught by --check"
git -C "$B/cloudy-a-docs" checkout -q -- README.html; echo x >> "$B/cloudy-a-docs/README.canvas"; bash "$ROOT/A2_repo-readmes/deploy-readmes.sh" --check >/dev/null 2>&1 && bad "mutation (edited deployed canvas) missed" || ok "mutation (edited deployed canvas) is caught by --check"
exit $fail
