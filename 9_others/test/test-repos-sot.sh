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

node "$ROOT/repos-sot.js" check-hubs >/dev/null 2>&1 && ok "hub hierarchy sound (no cycles, no public->private hub)" || { bad "repos-sot.js check-hubs"; node "$ROOT/repos-sot.js" check-hubs; }
# live drift (needs gh): node repos-sot.js check-hubs --remote

# reorganisations are declared
node -e '
const r=require(process.argv[1]); const by=n=>r.repos.find(x=>x.name===n); let e=[];
for (const n of ["cloudy-h-webapps","cloud-me-pvt-containers"]) { const x=by(n); if(!x) e.push(n+" missing"); else if(x.status==="pending_creation") e.push(n+" still pending_creation although the repo exists"); }
if (r.repos.some(x=>x.name==="cloud-mobile")) e.push("cloud-mobile is a repo entry");
if (!(r.renames||[]).some(x=>x.from==="cloud-mobile"&&x.to==="cloud-superapp")) e.push("rename cloud-mobile->cloud-superapp missing");
const f=by("front-diegonmarcos"); if(!f) e.push("front-diegonmarcos missing");
for (const p of ((f&&f.parts)||[])) if (p.status==="split" && !by(p.path)) e.push("front-diegonmarcos part "+p.name+" split into unregistered "+p.path);
const pj=by("Projects-___"); if(!pj||!pj.url.includes("/Projects-___.git")||!["front","Projects","Projects___"].every(o=>(pj.renamed_from||[]).includes(o))) e.push("Projects-___ (renamed from front, Projects) missing or wrong url");
for (const h of ["cloud","cloud-me-pub","cloud-me-pvt","cloud-me-pub-profiles","Projects","CG","Fin-CM","DeepSc","DuckPeng","lecole-42"]) { const f=h==="cloud"?"cloudy-___":h==="Fin-CM"?"Fin-___":h+"-___", x=by(f), mid=h==="lecole-42"?[]:h==="cloud"?["cloud___","cloud-___"]:h==="Fin-CM"?["Fin-CM___","Fin-CM-___"]:[h+"___"]; for (const o of [h,...mid]) { if(by(o)) e.push(o+" is still a live entry (hub is "+f+")"); if(!(r.renames||[]).some(y=>y.from===o&&(y.to===f||(r.renames||[]).some(z=>z.from===y.to&&z.to===f)))) e.push("rename "+o+"->"+f+" missing"); if(r.consumers.some(c=>c.repo===o)) e.push("consumer still named "+o); } if(!x||!x.url.endsWith("/"+f+".git")||![h,...mid].every(o=>(x.renamed_from||[]).includes(o))) e.push(f+" missing, wrong url or incomplete renamed_from"); }
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

# default clone depth is 1; --full / CLONE_DEPTH=0 is the opt-out (file:// because git ignores --depth for plain local paths)
git init -q "$T/w" && ( cd "$T/w" && git -c user.name=t -c user.email=t@t commit -q --allow-empty -m one && git -c user.name=t -c user.email=t@t commit -q --allow-empty -m two )
cat > "$T/idx/repos.json" <<JSON
{"_schema":"cloud-repos/v1","shared_store_dir":"cloud-shared-store","groups":{"a":"x"},"repos":[
 {"name":"d1","group":"a","url":"file://$T/w","private":false},
 {"name":"d2","group":"a","url":"file://$T/w","private":false},
 {"name":"d3","group":"a","url":"file://$T/w","private":false}]}
JSON
(cd "$T/idx" && CLOUD_GIT_BASE="$T/dbase" ./clone.sh d1 >/dev/null 2>&1; CLOUD_GIT_BASE="$T/dbase" ./clone.sh --full d2 >/dev/null 2>&1; CLONE_DEPTH=0 CLOUD_GIT_BASE="$T/dbase" ./clone.sh d3 >/dev/null 2>&1)
[ "$(git -C "$T/dbase/d1" rev-list --count HEAD 2>/dev/null)" = 1 ] && [ "$(git -C "$T/dbase/d1" rev-parse --is-shallow-repository)" = true ] && ok "default clone is --depth 1" || bad "default clone is not depth 1"
[ "$(git -C "$T/dbase/d2" rev-list --count HEAD 2>/dev/null)" = 2 ] && ok "--full clones full history" || bad "--full not full"
[ "$(git -C "$T/dbase/d3" rev-list --count HEAD 2>/dev/null)" = 2 ] && ok "CLONE_DEPTH=0 clones full history" || bad "CLONE_DEPTH=0 not full"
# hub clone scripts (siblings of this repo, when present) carry the same default
for h in "$ROOT"/../*-___; do [ -f "$h/clone.sh" ] || continue
  grep -q 'CLONE_DEPTH="${CLONE_DEPTH:-1}"' "$h/clone.sh" && grep -q -- '--shallow-submodules' "$h/clone.sh" && ok "$(basename "$h")/clone.sh defaults to depth 1" || bad "$(basename "$h")/clone.sh lacks the depth-1 default"
done

# hub clone.sh files are rendered from the one template (skipped when no hub sibling exists)
mkdir -p "$T/hubs/cloudy-___"; cp "$ROOT"/../cloudy-___/clone.sh "$T/hubs/cloudy-___/" 2>/dev/null
if [ -f "$T/hubs/cloudy-___/clone.sh" ]; then
  node "$ROOT/repos-sot.js" sync-hub-scripts "$T/hubs" >/dev/null 2>&1; node "$ROOT/repos-sot.js" check-hub-scripts "$T/hubs" >/dev/null 2>&1 && ok "hub clone.sh sync renders the template" || bad "hub clone.sh sync"
  echo "# drift" >> "$T/hubs/cloudy-___/clone.sh"; node "$ROOT/repos-sot.js" check-hub-scripts "$T/hubs" >/dev/null 2>&1 && bad "edited hub clone.sh accepted" || ok "edited hub clone.sh fails the check"
fi
node "$ROOT/repos-sot.js" check-hub-scripts >/dev/null 2>&1 && ok "sibling hub clone.sh files match the template" || bad "sibling hub clone.sh drift"

# subset guard bites
cat > "$T/sub.json" <<'JSON'
{"repos":[{"name":"cloudy-t-infra","url":"git@github.com:diegonmarcos/WRONG.git","private":false},{"name":"cloud-mobile","url":"x","private":false}]}
JSON
node "$ROOT/repos-sot.js" check-subset "$T/sub.json" >/dev/null 2>&1 && bad "subset guard accepted drift" || ok "subset guard fails on wrong url / old name"
node -e 'const r=require(process.argv[1]);require("fs").writeFileSync(process.argv[2],JSON.stringify({repos:r.repos.filter(x=>x.group==="a_cloud")}))' "$ROOT/repos.json" "$T/good.json"
node "$ROOT/repos-sot.js" check-subset "$T/good.json" >/dev/null 2>&1 && ok "a faithful subset passes" || bad "faithful subset rejected"
cp "$ROOT/repos.json" "$T/copy.json"; node "$ROOT/repos-sot.js" copy-of "$T/copy.json" >/dev/null 2>&1 && ok "byte copy passes" || bad "byte copy"
echo " " >> "$T/copy.json"; node "$ROOT/repos-sot.js" copy-of "$T/copy.json" >/dev/null 2>&1 && bad "edited copy accepted" || ok "edited copy fails"

# no git filters: this repo is plain metadata (GitSync treats in-tree attributes/filters as premium, #1284)
no_filters() {  # $1 = repo dir; prints offenders, returns 1 if any
  local d="$1" out=""
  out+=$(git -C "$d" ls-files | grep -E '(^|/)\.gitattributes$|(^|/)\.lfsconfig$' | sed 's/^/in-tree: /')
  out+=$(grep -nE '(^|[[:space:]])filter=' "$d/.gitattributes_ours" 2>/dev/null | sed 's/^/filter attr: /')
  out+=$(git -C "$d" config --local --get-regexp '^filter\.' 2>/dev/null | sed 's/^/local filter config: /')
  [ -z "$out" ] || { echo "$out"; return 1; }
}
off=$(no_filters "$ROOT") && ok "no git filters (no in-tree .gitattributes/.lfsconfig, no filter= attribute, no local filter.* config)" || bad "git filters present: $off"
F="$T/filtrepo"; git init -q "$F"; cp "$ROOT/.gitattributes_ours" "$F/"; echo '*.bin filter=lfs' >> "$F/.gitattributes_ours"
no_filters "$F" >/dev/null && bad "a filter= attribute was accepted" || ok "a filter= attribute fails the guard"
F2="$T/filtrepo2"; git init -q "$F2"; echo '* text=auto' > "$F2/.gitattributes"; git -C "$F2" add .gitattributes
no_filters "$F2" >/dev/null && bad "an in-tree .gitattributes was accepted" || ok "an in-tree .gitattributes fails the guard"

exit $fail
