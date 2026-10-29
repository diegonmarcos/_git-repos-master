#!/usr/bin/env bash
# Tester for gen-repo-folders-tree.js: 1_repo-folders-tree/repo-folders-tree.json (SoT) and its md/html renders (#1291).
# Fails on: md/html drifting from the JSON, JSON drifting from the registry, schema violations,
# depth > max_depth, any folder/file listing or head for a private repo (policy: private repos show
# name + URL + "private" only; contents stay private), a repo without its URL, excluded dirs present, external urls in html.
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
fail=0
ok()  { echo "PASS  $*"; }
bad() { echo "FAIL  $*"; fail=1; }

node "$ROOT/gen-repo-folders-tree.js" --check && ok "md/html match the JSON; JSON matches the registry; root symlinks present" || bad "gen-repo-folders-tree.js --check"
for f in json md html; do [ "$(readlink "$ROOT/repo-folders-tree.$f")" = "1_repo-folders-tree/repo-folders-tree.$f" ] && [ -f "$ROOT/repo-folders-tree.$f" ] || bad "root symlink repo-folders-tree.$f"; done

node -e '
const fs=require("fs"),root=process.argv[1],e=[];
const j=JSON.parse(fs.readFileSync(root+"/1_repo-folders-tree/repo-folders-tree.json","utf8"));
if(j.max_depth!==3) e.push("default depth is 3, JSON has "+j.max_depth);
const farms=Object.keys(require(root+"/repos.json").farms), tops=j.tree.children.filter(c=>c.kind==="group").map(c=>c.name);
if(JSON.stringify(tops)!==JSON.stringify(farms)) e.push("top groups "+tops+" != farms{}");
const gh=require(root+"/repos-github.json").repos, priv=new Set(gh.filter(r=>r.visibility!=="public").map(r=>r.name));
const {EXCLUDE}=require(root+"/gen-repo-folders-tree.js");
if(j._schema!=="repo-folders-tree/v1") e.push("schema id"); if(!(Number.isInteger(j.max_depth)&&j.max_depth>=1)) e.push("max_depth");
const T=new Set(["dir","file","submodule","symlink"]), seen=new Set();
const ent=(x,d,r)=>{ if(d>j.max_depth) e.push(r+": depth "+d+" > "+j.max_depth+" at "+x.name);
  if(!T.has(x.type)) e.push(r+": type "+x.type); if(typeof x.name!=="string"||!x.name) e.push(r+": name");
  if(EXCLUDE.has(x.name)) e.push(r+": excluded dir listed "+x.name);
  if(x.type==="dir"&&!Array.isArray(x.children)) e.push(r+": dir without children"); if(x.type!=="dir"&&x.children) e.push(r+": non-dir with children");
  if(x.size!==undefined&&!(Number.isInteger(x.size)&&x.size>=0)) e.push(r+": size");
  (x.children||[]).forEach(c=>ent(c,d+1,r)); };
const walk=n=>{ if(n.kind==="group"){ if(!n.path||!Array.isArray(n.children)) e.push("group "+n.name); n.children.forEach(walk); return; }
  if(seen.has(n.name)) e.push("dup "+n.name); seen.add(n.name);
  if(!["hub","repo"].includes(n.kind)) e.push(n.name+": kind");
  if(!["ok","private","unreadable",undefined].includes(n.status)) e.push(n.name+": status "+n.status);
  if(n.kind==="repo"&&!n.status) e.push(n.name+": no status");
  if(priv.has(n.name)||n.visibility!=="public"){ if(n.entries||n.head||n.source) e.push(n.name+": PRIVATE repo has a listing"); if(n.kind==="repo"&&n.status!=="private") e.push(n.name+": private not marked"); }
  if(n.status==="ok"){ if(!Array.isArray(n.entries)) e.push(n.name+": no entries"); else n.entries.forEach(x=>ent(x,1,n.name)); if(!/^[0-9a-f]{40}$/.test(n.head||"")) e.push(n.name+": head"); }
  if(n.url!=="https://github.com/diegonmarcos/"+n.name) e.push(n.name+": url missing");
  (n.children||[]).forEach(walk); };
walk(j.tree);
for(const r of gh) if(!seen.has(r.name)) e.push("missing "+r.name);
const h=fs.readFileSync(root+"/1_repo-folders-tree/repo-folders-tree.html","utf8"), m=fs.readFileSync(root+"/1_repo-folders-tree/repo-folders-tree.md","utf8");
for(const p of priv){ const re=new RegExp("github\\.com/diegonmarcos/"+p.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"/(tree|blob)/"); if(re.test(h)||re.test(m)) e.push("private contents rendered: "+p); }
for(const u of h.match(/(https?:)?\/\/[^\s"\x27<>)\\]+/g)||[]) if(!/^https:\/\/github\.com\/diegonmarcos\//.test(u)) { e.push("external url in html: "+u); break; }
if(/<script[^>]+src=|<link[^>]+href=/i.test(h)) e.push("html loads an external resource");
if(!new RegExp("^max_depth: "+j.max_depth+"$","m").test(m)) e.push("md max_depth");
if(e.length){ console.error(e.slice(0,30).join("\n")); process.exit(1); }' "$ROOT" && ok "schema, depth <= max_depth, private repos name+url only, no excluded dirs, html offline" || bad "repo-folders-tree content"

# mutations
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
mkdir -p "$T/9_others"; cp -r "$ROOT/9_others/templates" "$T/9_others/"; cp "$ROOT"/gen-repo-folders-tree.js "$ROOT"/gen-repos-tree.js "$ROOT"/repos.json "$ROOT"/repos-github.json "$T/"; cp -r "$ROOT/1_repo-folders-tree" "$T/"
for f in json md html; do ln -s "1_repo-folders-tree/repo-folders-tree.$f" "$T/repo-folders-tree.$f"; done
node "$T/gen-repo-folders-tree.js" --check >/dev/null 2>&1 && ok "copy is clean" || bad "copy not clean"
echo x >> "$T/1_repo-folders-tree/repo-folders-tree.md"
node "$T/gen-repo-folders-tree.js" --check >/dev/null 2>&1 && bad "mutation (edited md) missed" || ok "mutation (edited md) is caught"
cp "$ROOT/1_repo-folders-tree/repo-folders-tree.md" "$T/1_repo-folders-tree/"
node -e 'const f=process.argv[1],j=JSON.parse(require("fs").readFileSync(f));j.tree.children.pop();require("fs").writeFileSync(f,JSON.stringify(j))' "$T/1_repo-folders-tree/repo-folders-tree.json"
node "$T/gen-repo-folders-tree.js" --check >/dev/null 2>&1 && bad "mutation (repo dropped from JSON) missed" || ok "mutation (repo dropped from JSON) is caught"
cp "$ROOT/1_repo-folders-tree/repo-folders-tree.json" "$T/1_repo-folders-tree/"; rm "$T/repo-folders-tree.md"
node "$T/gen-repo-folders-tree.js" --check >/dev/null 2>&1 && bad "mutation (root symlink removed) missed" || ok "mutation (root symlink removed) is caught"
exit $fail
