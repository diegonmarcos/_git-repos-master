#!/usr/bin/env bash
# #1073 tester for the repo-list source of truth (repos.json + clone.sh + repos-sot.js).
# Fails on: registry/link drift, a pending_creation repo being cloned or linked,
# a missing reorganisation entry, a subset/copy guard that does not bite.
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
fail=0
ok()  { echo "PASS  $*"; }
bad() { echo "FAIL  $*"; fail=1; }
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT

node "$ROOT/repos-sot.js" check "$ROOT/repos.json" >/dev/null 2>&1 && ok "registry consistent, links match" || { bad "repos-sot.js check"; node "$ROOT/repos-sot.js" check; }

# reorganisations are declared
node -e '
const r=require(process.argv[1]); const by=n=>r.repos.find(x=>x.name===n); let e=[];
for (const n of ["cloud-h-webapps","cloud-me-pvt-containers"]) { const x=by(n); if(!x) e.push(n+" missing"); else if(x.status==="pending_creation") e.push(n+" still pending_creation although the repo exists"); }
if (r.repos.some(x=>x.name==="cloud-mobile")) e.push("cloud-mobile is a repo entry");
if (!(r.renames||[]).some(x=>x.from==="cloud-mobile"&&x.to==="cloud-superapp")) e.push("rename cloud-mobile->cloud-superapp missing");
const f=by("front-diegonmarcos"); if(!f) e.push("front-diegonmarcos missing");
for (const p of ((f&&f.parts)||[])) if (p.status==="split" && !by(p.path)) e.push("front-diegonmarcos part "+p.name+" split into unregistered "+p.path);
const pj=by("Projects"); if(!pj||!pj.url.includes("/Projects.git")||!(pj.renamed_from||[]).includes("front")) e.push("Projects (renamed from front) missing or wrong url");
if (e.length) { console.error(e.join("\n")); process.exit(1); }' "$ROOT/repos.json" && ok "webapps/me-containers registered (repo exists), cloud-superapp rename, #1072 placeholders" || bad "reorganisation entries"

# clone.sh skips pending entries: a mini registry with one live (local bare repo) and one pending
mkdir -p "$T/idx" "$T/base" "$T/src"
git init -q --bare "$T/src/live.git"
cp "$ROOT/clone.sh" "$ROOT/repos-sot.js" "$T/idx/"
cat > "$T/idx/repos.json" <<JSON
{"_schema":"cloud-repos/v1","shared_store_dir":"cloud-shared-store","groups":{"a":"x"},"repos":[
 {"name":"live","group":"a","url":"$T/src/live.git","private":false},
 {"name":"nope","group":"a","url":"$T/src/does-not-exist.git","private":false,"status":"pending_creation"}]}
JSON
out="$(cd "$T/idx" && CLOUD_GIT_BASE="$T/base" ./clone.sh --all 2>&1)"; rc=$?
[ $rc -eq 0 ] && ok "--all exits 0 with a pending entry" || bad "--all rc=$rc: $out"
[ -d "$T/base/live/.git" ] && [ -L "$T/idx/a/live" ] && ok "live repo cloned + linked" || bad "live repo not cloned/linked"
[ ! -e "$T/base/nope" ] && [ ! -L "$T/idx/a/nope" ] && ok "pending repo: no clone, no link" || bad "pending repo was cloned or linked"
echo "$out" | grep -q 'pending_creation' && ok "pending repo reported as skipped" || bad "no skip message"
(cd "$T/idx" && CLOUD_GIT_BASE="$T/base" ./clone.sh nope >/dev/null 2>&1) && [ ! -e "$T/base/nope" ] && ok "explicit clone of a pending repo is a no-op" || bad "explicit pending clone"
(cd "$T/idx" && CLOUD_GIT_BASE="$T/base" ./clone.sh --relink >/dev/null 2>&1; [ ! -L a/nope ]) && ok "--relink skips pending" || bad "--relink linked a pending repo"
(cd "$T/idx" && ./clone.sh --list 2>&1 | grep -q 'nope.*pending_creation') && ok "--list shows pending" || bad "--list"
ln -s ../../nope "$T/idx/a/nope"
node "$T/idx/repos-sot.js" check "$T/idx/repos.json" >/dev/null 2>&1 && bad "check did not flag a link for a pending repo" || ok "check flags a link for a pending repo"

# subset guard bites
cat > "$T/sub.json" <<'JSON'
{"repos":[{"name":"cloud-t-infra","url":"git@github.com:diegonmarcos/WRONG.git","private":false},{"name":"cloud-mobile","url":"x","private":false}]}
JSON
node "$ROOT/repos-sot.js" check-subset "$T/sub.json" >/dev/null 2>&1 && bad "subset guard accepted drift" || ok "subset guard fails on wrong url / old name"
node -e 'const r=require(process.argv[1]);require("fs").writeFileSync(process.argv[2],JSON.stringify({repos:r.repos.filter(x=>x.group==="a_cloud")}))' "$ROOT/repos.json" "$T/good.json"
node "$ROOT/repos-sot.js" check-subset "$T/good.json" >/dev/null 2>&1 && ok "a faithful subset passes" || bad "faithful subset rejected"
cp "$ROOT/repos.json" "$T/copy.json"; node "$ROOT/repos-sot.js" copy-of "$T/copy.json" >/dev/null 2>&1 && ok "byte copy passes" || bad "byte copy"
echo " " >> "$T/copy.json"; node "$ROOT/repos-sot.js" copy-of "$T/copy.json" >/dev/null 2>&1 && bad "edited copy accepted" || ok "edited copy fails"

exit $fail
