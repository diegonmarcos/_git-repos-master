#!/usr/bin/env bash
# Tester for 1_repo-folders-tree/ (#1291, #1301): the folder data lives in the master projects-repos.json (each public repo
# node's `tree`); repo-folders-tree.json/md/html are renders of it by the one generator gen-registry.js.
# Fails on: any render drifting from the master (edit a render, or edit the master without re-render), schema violations,
# depth > max_depth, any folder/file listing or head for a private repo (policy: private repos show
# name + URL + "private" only; contents stay private), a repo without its URL, excluded dirs present, external urls in html.
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
fail=0
ok()  { echo "PASS  $*"; }
bad() { echo "FAIL  $*"; fail=1; }

node "$ROOT/gen-registry.js" --check && ok "json/md/html equal a fresh render of projects-repos.json; root symlinks present" || bad "gen-registry.js --check"
for f in json md html; do [ "$(readlink "$ROOT/repo-folders-tree.$f")" = "1_repo-folders-tree/repo-folders-tree.$f" ] && [ -f "$ROOT/repo-folders-tree.$f" ] || bad "root symlink repo-folders-tree.$f"; done

node -e '
const fs=require("fs"),root=process.argv[1],e=[];
const j=JSON.parse(fs.readFileSync(root+"/1_repo-folders-tree/repo-folders-tree.json","utf8"));
if(j.max_depth!==3) e.push("default depth is 3, JSON has "+j.max_depth);
const farms=Object.keys(require(root+"/repos.json").farms), tops=j.tree.children.filter(c=>c.kind==="group").map(c=>c.name);
if(JSON.stringify(tops)!==JSON.stringify(farms)) e.push("top groups "+tops+" != farms{}");
const gh=require(root+"/repos-github.json").repos, priv=new Set(gh.filter(r=>r.visibility!=="public").map(r=>r.name));
const EXCLUDE=new Set(require(root+"/projects-repos.json").folders.excluded);
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

# mutations: a render edited, or the master edited without re-render, must fail; master edit + re-render passes
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
mk() { rm -rf "$T/w"; mkdir -p "$T/w/9_others"; cp -r "$ROOT/9_others/templates" "$T/w/9_others/"; cp -r "$ROOT"/*.js "$ROOT/projects-repos.json" "$ROOT/projects-repos.schema.json" "$ROOT/repos.json" "$ROOT/repos-github.json" "$ROOT/README.md" "$ROOT/0_repos-tree" "$ROOT/1_repo-folders-tree" "$T/w/"
  for f in canvas html md json xml; do ln -s "0_repos-tree/repos-tree.$f" "$T/w/repos-tree.$f"; done; for f in json md html; do ln -s "1_repo-folders-tree/repo-folders-tree.$f" "$T/w/repo-folders-tree.$f"; done; }
chk() { node "$T/w/gen-registry.js" --check >/dev/null 2>&1; }
jmut() { node -e 'const M=require(process.argv[1]+"/registry-model.js"),fs=require("fs"),j=M.load();'"$1"';fs.writeFileSync(M.SRC,M.serialize(j))' "$T/w"; }
mk; chk && ok "copy is clean" || bad "copy not clean"
mk; echo x >> "$T/w/1_repo-folders-tree/repo-folders-tree.md"; chk && bad "mutation (edited md) missed" || ok "mutation (edited md) is caught"
mk; node -e 'const f=process.argv[1],j=JSON.parse(require("fs").readFileSync(f));j.tree.children.pop();require("fs").writeFileSync(f,JSON.stringify(j,null,1)+"\n")' "$T/w/1_repo-folders-tree/repo-folders-tree.json"; chk && bad "mutation (group dropped from the rendered JSON) missed" || ok "mutation (group dropped from the rendered JSON) is caught"
mk; sed -i 's/Repo folders - Dolphin/Repo folders/' "$T/w/1_repo-folders-tree/repo-folders-tree.html"; chk && bad "mutation (edited html) missed" || ok "mutation (edited html) is caught"
mk; rm "$T/w/repo-folders-tree.md"; chk && bad "mutation (root symlink removed) missed" || ok "mutation (root symlink removed) is caught"
mk; jmut 'j.root.tree.entries.push({name:"zz-new",type:"file",size:1})'; chk && bad "mutation (master tree edited, not re-rendered) missed" || ok "mutation (master tree edited, not re-rendered) is caught"
mk; jmut 'const r=[];const w=x=>(x.children||[]).forEach(c=>c.kind==="repo"?r.push(c):w(c));j.tree.forEach(w);r.find(x=>x.tree).tree.entries.push({name:"zz-new",type:"file",size:1})'; (cd "$T/w" && node gen-registry.js >/dev/null); chk && grep -q 'zz-new' "$T/w/1_repo-folders-tree/repo-folders-tree.md" && ok "master tree edit + re-render passes and reaches the md" || bad "master tree edit + re-render"
mk; jmut 'j.root.tree.entries.push({name:"node_modules",type:"dir",children:[]})'; chk && bad "mutation (excluded dir in the master) missed" || ok "mutation (excluded dir in a master tree) is caught"
exit $fail
