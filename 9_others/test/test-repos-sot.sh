#!/usr/bin/env bash
# #1073/#1295/#1301 tester for the ONE master source projects-repos.json (-> repos.json, repos-github.json, README.md,
# 0_repos-tree/*, 1_repo-folders-tree/* via the one generator gen-registry.js), clone.sh, repos-sot.js.
# Fails on: registry/link drift, a pending_creation repo being cloned or linked,
# a missing reorganisation entry, a subset/copy guard that does not bite.
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
fail=0
ok()  { echo "PASS  $*"; }
bad() { echo "FAIL  $*"; fail=1; }
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT

node "$ROOT/repos-sot.js" check "$ROOT/repos.json" >/dev/null 2>&1 && ok "registry consistent, links match" || { bad "repos-sot.js check"; node "$ROOT/repos-sot.js" check; }
node "$ROOT/repos-sot.js" check >/dev/null 2>&1 && ok "projects-repos.json valid; repos.json, repos-github.json, README.md, 0_repos-tree/*, 1_repo-folders-tree/* equal a fresh render byte-for-byte" || { bad "repos-sot.js check (full)"; node "$ROOT/repos-sot.js" check; }
if python3 -c 'import jsonschema' 2>/dev/null; then
  python3 - "$ROOT" <<'PY' && ok "projects-repos.json valid against projects-repos.schema.json (python jsonschema, draft 2020-12)" || bad "projects-repos.json fails projects-repos.schema.json (python jsonschema)"
import json, sys, jsonschema
r = sys.argv[1]; s = json.load(open(r + '/projects-repos.schema.json')); d = json.load(open(r + '/projects-repos.json'))
jsonschema.Draft202012Validator.check_schema(s); e = list(jsonschema.Draft202012Validator(s).iter_errors(d))
for x in e[:10]: print(list(x.path), x.message)
sys.exit(1 if e else 0)
PY
fi
# the generated files say so and point at the source
for f in repos.json repos-github.json README.md 0_repos-tree/repos-tree.json 1_repo-folders-tree/repo-folders-tree.json 1_repo-folders-tree/repo-folders-tree.md; do grep -q 'projects-repos.json' "$ROOT/$f" && ok "$f names its source projects-repos.json" || bad "$f does not name projects-repos.json"; done
# #1301 the old separate sources/generators are gone; the folder data has no second home
for f in repos.v3.json repos.v3.schema.json gen-repos-tree.js gen-repo-folders-tree.js; do [ -e "$ROOT/$f" ] && bad "$f still present (superseded by projects-repos.json / gen-registry.js)" || ok "$f gone"; done
node -e 'const M=require(process.argv[1]+"/registry-model.js"),s=M.load(),n=[s.root];const w=x=>{if(x.hub)n.push(x.hub);(x.children||[]).forEach(c=>c.kind==="repo"?n.push(c):w(c))};s.tree.forEach(w);
const pub=n.filter(r=>r.visibility==="public"),t=pub.filter(r=>r.tree);if(n.some(r=>r.visibility!=="public"&&r.tree)||t.length<pub.length*0.9)process.exit(1)' "$ROOT" && ok "folder trees live in projects-repos.json (public repos have tree, private repos none)" || bad "folder trees missing from the master or a private repo has one"
grep -q 'DO NOT EDIT' "$ROOT/README.md" && ok "README.md carries the DO NOT EDIT banner" || bad "README.md lacks the DO NOT EDIT banner"

# #1295 the README / compat guards bite: a scratch copy is clean, then each mutation fails `check`
SRCS="repos-sot.js registry-model.js gen-registry.js render-repos-tree.js render-folders-tree.js refresh-folders-tree.js projects-repos.json projects-repos.schema.json repos.json repos-github.json README.md"
gmk() { rm -rf "$T/g"; mkdir -p "$T/g/9_others"; cp -r "$ROOT/9_others/templates" "$T/g/9_others/"; for f in $SRCS; do cp "$ROOT/$f" "$T/g/"; done
  cp -a "$ROOT/0_repos-tree" "$ROOT/1_repo-folders-tree" "$ROOT"/[1-9].* "$T/g/"; for f in canvas html md json xml; do ln -s "0_repos-tree/repos-tree.$f" "$T/g/repos-tree.$f"; done
  for f in json md html; do ln -s "1_repo-folders-tree/repo-folders-tree.$f" "$T/g/repo-folders-tree.$f"; done; }
jmut() { node -e 'const M=require(process.argv[1]+"/registry-model.js"),fs=require("fs"),j=M.load();'"$1"';fs.writeFileSync(M.SRC,M.serialize(j))' "$T/g"; }
gchk() { node "$T/g/repos-sot.js" check >/dev/null 2>&1; }
gmk; gchk && ok "README guard: scratch copy is clean" || { bad "README guard: scratch copy not clean"; node "$T/g/repos-sot.js" check | head -5; }
gmk; sed -i '0,/repositories/s/repositories/repos/' "$T/g/README.md"; gchk && bad "hand-edited README.md accepted" || ok "hand-edited README.md (one word) fails the check"
gmk; printf ' ' >> "$T/g/README.md"; gchk && bad "README.md with one trailing byte accepted" || ok "README.md one byte off fails the check (byte-for-byte)"
gmk; sed -i 's/^## Clone depth$/## Clone Depth/' "$T/g/9_others/templates/README.md.tpl"; gchk && bad "template edit without re-render accepted" || ok "template edited, README not re-rendered: fails"
gmk; jmut 'j.tree[0].children[0].description+=" x"'; gchk && bad "master edit without re-render accepted" || ok "projects-repos.json edited, outputs not re-rendered: fails"
gmk; jmut 'j.tree[0].children[0].description+=" x"'; (cd "$T/g" && node gen-registry.js >/dev/null); gchk && ok "master edit + re-render passes" || bad "master edit + re-render still fails"
gmk; jmut 'j.root.tree.entries.pop()'; gchk && bad "master folder tree edited without re-render accepted" || ok "a repo tree in projects-repos.json edited, 1_repo-folders-tree not re-rendered: fails"
gmk; jmut 'j.root.tree.entries.pop()'; (cd "$T/g" && node gen-registry.js >/dev/null); gchk && ok "master tree edit + re-render passes" || bad "master tree edit + re-render still fails"
gmk; sed -i '0,/"status": "ok"/s//"status": "unreadable"/' "$T/g/1_repo-folders-tree/repo-folders-tree.json"; gchk && bad "hand-edited repo-folders-tree.json accepted" || ok "hand-edited 1_repo-folders-tree/repo-folders-tree.json fails the check"
gmk; echo x >> "$T/g/1_repo-folders-tree/repo-folders-tree.md"; gchk && bad "hand-edited repo-folders-tree.md accepted" || ok "hand-edited 1_repo-folders-tree/repo-folders-tree.md fails the check"
gmk; echo x >> "$T/g/0_repos-tree/repos-tree.xml"; gchk && bad "hand-edited repos-tree.xml accepted" || ok "hand-edited 0_repos-tree/repos-tree.xml fails the check"
gmk; jmut 'const p=j.tree[0].children[1].children.find(x=>x.kind==="subcategory"&&x.name==="Pvt");p.children[0].children[0].tree=j.root.tree'; gchk && bad "private repo with a folder tree accepted" || ok "a PRIVATE repo carrying a folder tree in the master fails"
gmk; jmut 'let e=j.root.tree.entries.find(x=>x.children&&x.children.some(c=>c.children&&c.children.some(d=>d.children)));const c=e.children.find(c=>c.children&&c.children.some(d=>d.children)),d=c.children.find(d=>d.children);d.children.push({name:"deep",type:"dir",children:[{name:"x",type:"file"}]})'; gchk && bad "tree deeper than max_depth accepted" || ok "a tree entry deeper than folders.max_depth fails"
gmk; rm "$T/g/repo-folders-tree.html"; gchk && bad "missing root symlink accepted" || ok "a missing root symlink (repo-folders-tree.html) fails"
gmk; sed -i 's/"private": true/"private": false/' "$T/g/repos.json"; gchk && bad "hand-edited repos.json accepted" || ok "hand-edited repos.json fails the check"
gmk; sed -i '0,/"visibility": "private"/s//"visibility": "public"/' "$T/g/repos-github.json"; gchk && bad "hand-edited repos-github.json accepted" || ok "hand-edited repos-github.json fails the check"
gmk; sed -i '0,/"code": "1.1"/s//"code": "1.9"/' "$T/g/projects-repos.json"; gchk && bad "non-positional code accepted" || ok "a non-positional code in projects-repos.json fails"
gmk; sed -i '0,/"kind": "family"/s//"kind": "famly"/' "$T/g/projects-repos.json"; gchk && bad "schema violation accepted" || ok "a schema violation (bad kind) fails"
gmk; sed -i 's/"farm": "4.HardTech"/"farm": "9.DeepSc"/' "$T/g/projects-repos.json"; gchk && bad "farm folder not named after its code accepted" || ok "a top farm folder not prefixed by its node code fails"
gmk; jmut 'j.tree[1].hub.visibility="private"'; gchk && bad "private hub accepted" || ok "a private hub fails (hub always public)"

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
{"_schema":"cloud-repos/v1","shared_store_dir":"cloud-shared-store","farms":{"01.A":"x"},"repos":[
 {"name":"live","farm":"01.A/b","url":"$T/src/live.git","private":false},
 {"name":"nope","farm":"01.A/b","url":"$T/src/does-not-exist.git","private":false,"status":"pending_creation"}]}
JSON
out="$(cd "$T/idx" && CLOUD_GIT_BASE="$T/base" ./clone.sh --all 2>&1)"; rc=$?
[ $rc -eq 0 ] && ok "--all exits 0 with a pending entry" || bad "--all rc=$rc: $out"
[ -d "$T/base/live/.git" ] && [ "$(readlink "$T/idx/01.A/b/live")" = ../../../live ] && ok "live repo cloned + linked at its nested farm (../../../live)" || bad "live repo not cloned/linked"
[ ! -e "$T/base/nope" ] && [ ! -L "$T/idx/01.A/b/nope" ] && ok "pending repo: no clone, no link" || bad "pending repo was cloned or linked"
echo "$out" | grep -q 'pending_creation' && ok "pending repo reported as skipped" || bad "no skip message"
(cd "$T/idx" && CLOUD_GIT_BASE="$T/base" ./clone.sh nope >/dev/null 2>&1) && [ ! -e "$T/base/nope" ] && ok "explicit clone of a pending repo is a no-op" || bad "explicit pending clone"
(cd "$T/idx" && CLOUD_GIT_BASE="$T/base" ./clone.sh --relink >/dev/null 2>&1; [ ! -L 01.A/b/nope ]) && ok "--relink skips pending" || bad "--relink linked a pending repo"
(cd "$T/idx" && ./clone.sh --list 2>&1 | grep -q 'nope.*pending_creation') && ok "--list shows pending" || bad "--list"
ln -s ../../../nope "$T/idx/01.A/b/nope"
node "$T/idx/repos-sot.js" check "$T/idx/repos.json" >/dev/null 2>&1 && bad "check did not flag a link for a pending repo" || ok "check flags a link for a pending repo"

# default clone depth is 1; --full / CLONE_DEPTH=0 is the opt-out (file:// because git ignores --depth for plain local paths)
git init -q "$T/w" && ( cd "$T/w" && git -c user.name=t -c user.email=t@t commit -q --allow-empty -m one && git -c user.name=t -c user.email=t@t commit -q --allow-empty -m two )
cat > "$T/idx/repos.json" <<JSON
{"_schema":"cloud-repos/v1","shared_store_dir":"cloud-shared-store","farms":{"01.A":"x"},"repos":[
 {"name":"d1","farm":"01.A","url":"file://$T/w","private":false},
 {"name":"d2","farm":"01.A","url":"file://$T/w","private":false},
 {"name":"d3","farm":"01.A","url":"file://$T/w","private":false}]}
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

# #1291 farm guards: numbered hub folders, nesting by the hub chain, Archived/Others rules, no legacy group dirs
farm_mut() { # $1 = label, $2 = node expression mutating r (the registry)
  rm -rf "$T/fm"; mkdir -p "$T/fm"; cp "$ROOT/repos-sot.js" "$T/fm/"; cp -a "$ROOT"/[1-9].* "$T/fm/"
  node -e 'const fs=require("fs"),r=JSON.parse(fs.readFileSync(process.argv[1]));const by=n=>r.repos.find(x=>x.name===n);'"$2"';fs.writeFileSync(process.argv[2],JSON.stringify(r))' "$ROOT/repos.json" "$T/fm/repos.json"
  node "$T/fm/repos-sot.js" check "$T/fm/repos.json" >/dev/null 2>&1 && bad "farm mutation accepted: $1" || ok "farm mutation caught: $1"; }
rm -rf "$T/fm"; mkdir -p "$T/fm"; cp "$ROOT/repos-sot.js" "$ROOT/repos.json" "$T/fm/"; cp -a "$ROOT"/[1-9].* "$T/fm/"
node "$T/fm/repos-sot.js" check "$T/fm/repos.json" >/dev/null 2>&1 && ok "farm copy is clean" || bad "farm copy not clean"
farm_mut "z-archived_* outside 8.Archived" 'by("z-archived_front-data").farm="6.Projects"'
farm_mut "7.Others repo with a hub" 'by("front-diegonmarcos").hub="Projects-___"'
farm_mut "member two folders below its hub" 'by("cloud-me-pvt-notes").farm="1.2.Cloud-me/Pvt/x"'
farm_mut "farm top folder not declared" 'delete r.farms["4.HardTech"]'
farm_mut "farm top folder not <code>.<Name>" 'r.farms["DeepSc"]=r.farms["4.HardTech"]'
farm_mut "entry without farm" 'delete by("CG-unity").farm'
farm_mut "link moved off its farm" 'by("CG-unity").farm="2.CG/Sub"'
rm -rf "$T/fm"; mkdir -p "$T/fm/a_cloud"; cp "$ROOT/repos-sot.js" "$ROOT/repos.json" "$T/fm/"; cp -a "$ROOT"/[1-9].* "$T/fm/"
node "$T/fm/repos-sot.js" check "$T/fm/repos.json" >/dev/null 2>&1 && bad "legacy group folder a_cloud/ accepted" || ok "legacy group folder a_cloud/ fails the check"
for d in 2_vault a_cloud b_projects c_gh d_lecole; do [ -e "$ROOT/$d" ] && bad "legacy farm folder $d/ still present"; done

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
