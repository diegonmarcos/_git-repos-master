#!/usr/bin/env bash
# Tester for 0_repos-tree/ (#1291, #1301): repos-tree.json and every UI in it (canvas, html, md, xml, repos-tree/ graph
# notes) are rendered by the one generator gen-registry.js (render-repos-tree.js) from the master projects-repos.json.
# Fails on: JSON drifting from the registry, a UI drifting from the JSON, schema violations, a repo missing or
# duplicated, a group not matching farms{}/farm, edges not matching hub/parent_hub, overlapping cards, external URLs
# in the HTML, a missing root symlink.
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
D="$ROOT/0_repos-tree"
fail=0
ok()  { echo "PASS  $*"; }
bad() { echo "FAIL  $*"; fail=1; }

node "$ROOT/gen-registry.js" --check && ok "every rendered file equals a fresh render of projects-repos.json, root symlinks present" || bad "gen-registry.js --check (run node gen-registry.js)"

for f in canvas html md json xml; do [ "$(readlink "$ROOT/repos-tree.$f")" = "0_repos-tree/repos-tree.$f" ] && [ -f "$ROOT/repos-tree.$f" ] || bad "root symlink repos-tree.$f"; done

# the JSON: root -> numbered groups -> hubs -> repos, consistent with the registry
node -e '
const fs=require("fs"),root=process.argv[1],e=[],TOP="_git-repos-master";
const R=require(root+"/repos.json"), reg=R.repos, gh=require(root+"/repos-github.json").repos;
const gn=u=>u.replace(/^.*[/:]/,"").replace(/\.git$/,""), byGh=new Map(reg.map(r=>[gn(r.url),r]));
const par=n=>n===TOP?null:((byGh.get(n)||{}).parent_hub||(byGh.get(n)||{}).hub||TOP);
const j=JSON.parse(fs.readFileSync(root+"/0_repos-tree/repos-tree.json","utf8"));
if(j._schema!=="repos-tree/v3") e.push("json schema"); if(j.tree.name!==TOP) e.push("root is not "+TOP);
const tops=j.tree.children.filter(c=>c.kind==="group").map(c=>c.name);
if(JSON.stringify(tops)!==JSON.stringify(Object.keys(R.farms))) e.push("top groups "+tops+" != farms{} "+Object.keys(R.farms));
if(j.tree.children.some(c=>c.kind!=="group")) e.push("root has a non-group child");
const seen=new Map(); const walk=(o,hub,grp)=>{
  if(o.kind==="group"){ if(!o.path||!o.path.endsWith(o.name)) e.push("group path "+o.path); if(grp&&!o.path.startsWith(grp+"/")) e.push("group "+o.path+" not under "+grp); if(!o.children.length) e.push("empty group "+o.path); o.children.forEach(c=>walk(c,hub,o.path)); return; }
  if(seen.has(o.name)) e.push("json dup "+o.name); seen.set(o.name,hub);
  if(!["hub","repo"].includes(o.kind)) e.push("json kind "+o.name); if(!/^https:\/\/github\.com\/diegonmarcos\//.test(o.url||"")) e.push("json url "+o.name);
  const r=byGh.get(o.name); if(r&&o.farm!==r.farm) e.push(o.name+" farm "+o.farm+" != registry "+r.farm);
  if(r&&grp&&o.farm!==grp) e.push(o.name+" sits in group "+grp+" but farm is "+o.farm);
  (o.children||[]).forEach(c=>walk(c,o.name,grp)); };
walk(j.tree,null,null);
for(const r of gh){ if(!seen.has(r.name)) e.push("json lacks "+r.name); else if(seen.get(r.name)!==par(r.name)) e.push("json parent "+r.name+" "+seen.get(r.name)+" != "+par(r.name)); }
if(seen.size!==gh.length||j.count!==gh.length) e.push("json count");
for(const n of reg) if(n.name.startsWith("z-archived_")&&!/^\d+(\.\d+)*\.Archived(\/|$)/.test(n.farm)) e.push(n.name+" not in the Archived farm folder");
const codes=new Map(); const walk2=(o)=>{ if(o.kind!=="group"){ if(typeof o.code!=="string"||!/^(0|[1-9]\d*(\.\d+)*)$/.test(o.code)) e.push("json code "+o.name+" "+o.code); if(codes.has(o.code)) e.push("json dup code "+o.code); codes.set(o.code,o.name); } (o.children||[]).forEach(walk2); }; walk2(j.tree);
if(e.length){ console.error(e.slice(0,30).join("\n")); process.exit(1); }' "$ROOT" && ok "json: root -> farms{} groups -> hubs -> repos, every repo once, parents and farms match the registry" || bad "repos-tree.json content"

# canvas + html, read against the JSON
node -e '
const fs=require("fs"),root=process.argv[1],e=[];
const j=require(root+"/0_repos-tree/repos-tree.json"), all=[], want=new Set();
const w=(o,hub)=>{ if(o.kind!=="group"){ all.push(o); if(hub) want.add(hub+">"+o.name); } (o.children||[]).forEach(c=>w(c,o.kind==="group"?hub:o.name)); }; w(j.tree,null);
const c=JSON.parse(fs.readFileSync(root+"/0_repos-tree/repos-tree.canvas","utf8"));
if(!Array.isArray(c.nodes)||!Array.isArray(c.edges)) e.push("nodes/edges not arrays");
const ids=new Set(), COL=/^([1-6]|#[0-9a-fA-F]{6})$/;
for(const n of c.nodes){ if(typeof n.id!=="string"||ids.has(n.id)) e.push("bad/duplicate node id "+n.id); ids.add(n.id);
  if(!["text","link","group","file"].includes(n.type)) e.push("node type "+n.type);
  for(const k of ["x","y","width","height"]) if(!Number.isInteger(n[k])) e.push(n.id+" "+k+" not integer");
  if(n.color!==undefined&&!COL.test(n.color)) e.push(n.id+" bad color"); }
for(const x of c.edges) if(!ids.has(x.fromNode)||!ids.has(x.toNode)) e.push("edge to unknown node "+x.id);
const cards=c.nodes.filter(n=>n.type==="text"), cardOf=new Map();
for(const r of all){ const m=cards.filter(n=>n.text.startsWith("**"+r.name+"**\n")); if(m.length!==1) e.push(r.name+" has "+m.length+" cards"); else { cardOf.set(r.name,m[0]); if(!m[0].text.includes("("+r.url+")")) e.push(r.name+" card lacks GitHub link"); } }
if(cards.length!==all.length) e.push("cards "+cards.length+" != repos "+all.length);
for(const g of j.groups) if(!c.nodes.some(n=>n.type==="group"&&n.label===g)) e.push("canvas lacks group box "+g);
const byId=new Map([...cardOf].map(([k,v])=>[v.id,k])), got=c.edges.map(x=>byId.get(x.fromNode)+">"+byId.get(x.toNode));
if(got.length!==want.size) e.push("edge count "+got.length+" != "+want.size);
for(const x of want) if(!got.includes(x)) e.push("missing edge "+x);
for(let i=0;i<cards.length;i++) for(let k=i+1;k<cards.length;k++){ const a=cards[i],b=cards[k];
  if(a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height) e.push("cards overlap "+byId.get(a.id)+" / "+byId.get(b.id)); }
const groups=c.nodes.filter(n=>n.type==="group");
for(const g of groups) for(const o of cards) if(o.x<g.x+g.width&&g.x<o.x+o.width&&o.y<g.y+g.height&&g.y<o.y+o.height&&!(o.x>=g.x&&o.y>=g.y&&o.x+o.width<=g.x+g.width&&o.y+o.height<=g.y+g.height)) e.push("card straddles group "+g.label);
const h=fs.readFileSync(root+"/0_repos-tree/repos-tree.html","utf8");
for(const r of all) if(!h.includes("\""+r.name+"\"")) e.push("html lacks "+r.name);
for(const g of j.groups) if(!h.includes("\"group:"+g+"\"")) e.push("html lacks group "+g);
for(const u of h.match(/(https?:)?\/\/[^\s"\x27<>)\\]+/g)||[]) if(!/^https:\/\/github\.com\/diegonmarcos\//.test(u)) e.push("external url in html: "+u);
if(/<script[^>]+src=|<link[^>]+href=|@import/i.test(h)) e.push("html loads an external resource");
if(!/prefers-color-scheme:\s*dark/.test(h)) e.push("html lacks dark scheme");
if(e.length){ console.error(e.slice(0,30).join("\n")); process.exit(1); }' "$ROOT" && ok "canvas: every repo once, group boxes, edges = hub links, no overlap; html: groups, offline" || bad "canvas/html content"

# md / xml / graph notes, read against the JSON
node -e '
const fs=require("fs"),path=require("path"),root=process.argv[1],e=[];
const j=require(root+"/0_repos-tree/repos-tree.json"), all=[];
const nn=o=>o.kind==="group"?o.path.replace(/\//g,"."):o.name;
const w=(o,anc)=>{ all.push({o,anc}); (o.children||[]).forEach(c=>w(c,[...anc,o])); }; w(j.tree,[]);
const x=fs.readFileSync(root+"/0_repos-tree/repos-tree.xml","utf8"); if(!/^<\?xml /.test(x)) e.push("xml prolog");
const st=[]; for(const m of x.matchAll(/<(\/?)(hub|repo|group|repos-tree)([^>]*?)(\/?)>/g)){ if(m[1]){ if(st.pop()!==m[2]) e.push("xml nesting"); continue; } if(!m[4]) st.push(m[2]); }
if(st.length) e.push("xml unclosed");
for(const {o} of all) if(!x.includes(o.kind==="group"?` path="${o.path}"`:` name="${o.name}"`)) e.push("xml lacks "+nn(o));
const md=fs.readFileSync(root+"/0_repos-tree/repos-tree.md","utf8"); if(!/^---\n[\s\S]*?\nrepos: \d+\n[\s\S]*?\n---\n/.test(md)) e.push("md frontmatter");
if(!md.includes("```mermaid")) e.push("md mermaid");
for(const {o} of all) if(o.kind==="group"?!md.includes("**"+o.name+"/**"):!md.includes("[["+o.name+"]]")) e.push("md lacks "+nn(o));
const files=[]; const fw=d=>fs.readdirSync(d,{withFileTypes:true}).forEach(f=>f.isDirectory()?fw(path.join(d,f.name)):files.push(path.join(d,f.name))); fw(root+"/0_repos-tree/repos-tree");
const names=files.map(f=>path.basename(f,".md")); if(new Set(names).size!==names.length) e.push("note names not unique");
if(files.length!==all.length) e.push("notes "+files.length+" != nodes "+all.length);
for(const {o,anc} of all){ const f=files.find(a=>path.basename(a,".md")===nn(o)); if(!f){ e.push("no note "+nn(o)); continue; }
  const segs=path.relative(root+"/0_repos-tree/repos-tree",f).split(path.sep).slice(0,-1).join("/"), exp=[...anc,...(o.children?[o]:[])].map(nn).join("/");
  if(segs!==exp) e.push("note path "+nn(o)+" "+segs+" != "+exp);
  const t=fs.readFileSync(f,"utf8"), fm=(t.match(/^---\n([\s\S]*?)\n---\n/)||[])[1]; if(!fm){ e.push("note fm "+nn(o)); continue; }
  if(o.kind!=="group"){ for(const k of ["name","kind","group","hub","parent_hub","project","area","family","subcategory","visibility","developer","url","tags"]) if(!new RegExp("^"+k+":","m").test(fm)) e.push("note "+o.name+" lacks "+k);
    if(!fm.includes("url: \""+o.url+"\"")) e.push("note url "+o.name); }
  if(anc.length&&!t.includes("[["+nn(anc[anc.length-1])+"]]")&&!t.includes("[["+nn([...anc].reverse().find(a=>a.kind!=="group"))+"]]")) e.push("note "+nn(o)+" lacks link up");
  for(const c of o.children||[]) if(!t.includes("[["+nn(c)+"]]")) e.push("note "+nn(o)+" lacks child "+nn(c)); }
if(e.length){ console.error(e.slice(0,30).join("\n")); process.exit(1); }' "$ROOT" && ok "md/xml/notes: every node once, notes nested like the JSON, links up and down, urls (private too)" || bad "md/xml/notes content"

# mutations: each must be caught by --check
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
mk() { rm -rf "$T/w"; mkdir -p "$T/w/9_others"; cp -r "$ROOT/9_others/templates" "$T/w/9_others/"; cp -r "$ROOT"/*.js "$ROOT/projects-repos.json" "$ROOT/projects-repos.schema.json" "$ROOT/repos.json" "$ROOT/repos-github.json" "$ROOT/README.md" "$D" "$ROOT/1_repo-folders-tree" "$T/w/"
  for f in canvas html md json xml; do ln -s "0_repos-tree/repos-tree.$f" "$T/w/repos-tree.$f"; done; for f in json md html; do ln -s "1_repo-folders-tree/repo-folders-tree.$f" "$T/w/repo-folders-tree.$f"; done; }
mk; node "$T/w/gen-registry.js" --check >/dev/null 2>&1 && ok "copy is clean" || bad "copy not clean"
mk; f=$(find "$T/w/0_repos-tree/repos-tree" -name '*.md' | head -1); echo x >> "$f"
node "$T/w/gen-registry.js" --check >/dev/null 2>&1 && bad "mutation (edited note) missed" || ok "mutation (edited note) is caught"
mk; touch "$T/w/0_repos-tree/repos-tree/stray.md"; node "$T/w/gen-registry.js" --check >/dev/null 2>&1 && bad "mutation (stray note) missed" || ok "mutation (stray note) is caught"
mk; node -e 'const f=process.argv[1],c=JSON.parse(require("fs").readFileSync(f));c.nodes.splice(c.nodes.findIndex(n=>n.type==="text"),1);require("fs").writeFileSync(f,JSON.stringify(c,null,2)+"\n")' "$T/w/0_repos-tree/repos-tree.canvas"
node "$T/w/gen-registry.js" --check >/dev/null 2>&1 && bad "mutation (dropped card) missed" || ok "mutation (dropped card) is caught"
mk; node -e 'const f=process.argv[1],j=JSON.parse(require("fs").readFileSync(f));j.tree.children.pop();require("fs").writeFileSync(f,JSON.stringify(j,null,2)+"\n")' "$T/w/0_repos-tree/repos-tree.json"
node "$T/w/gen-registry.js" --check >/dev/null 2>&1 && bad "mutation (group dropped from JSON) missed" || ok "mutation (group dropped from JSON) is caught"
mk; rm "$T/w/repos-tree.html"; node "$T/w/gen-registry.js" --check >/dev/null 2>&1 && bad "mutation (root symlink removed) missed" || ok "mutation (root symlink removed) is caught"
mk; sed -i 's/"farm": "2.CG"/"farm": "2.CG-x"/' "$T/w/projects-repos.json"; node "$T/w/gen-registry.js" --check >/dev/null 2>&1 && bad "mutation (source farm changed) missed" || ok "mutation (source farm in projects-repos.json changed) is caught"
mk; node -e 'const f=process.argv[1],j=JSON.parse(require("fs").readFileSync(f));const c=j.tree[1].children[1].children[0].children;c.push(j.tree[1].children[0].children[0].children.pop());require("fs").writeFileSync(f,require(process.argv[2]+"/registry-model.js").serialize(j))' "$T/w/projects-repos.json" "$T/w"; node "$T/w/gen-registry.js" --check >/dev/null 2>&1 && bad "mutation (repo moved between families in the source) missed" || ok "mutation (repo moved in projects-repos.json) is caught"
exit $fail
