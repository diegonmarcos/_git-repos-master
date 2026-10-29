#!/usr/bin/env bash
# Tester for gen-repos-tree.js: repos-tree.canvas (JSON Canvas 1.0) and repos-tree.html vs the registry.
# Fails on: committed files drifting from the registry, schema violations, a repo missing/duplicated,
# edges not matching parent_hub/hub, overlapping cards, external URLs in the HTML.
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
fail=0
ok()  { echo "PASS  $*"; }
bad() { echo "FAIL  $*"; fail=1; }

node "$ROOT/gen-repos-tree.js" --check && ok "committed canvas/html match the registry" || bad "gen-repos-tree.js --check (run node gen-repos-tree.js)"

node -e '
const fs=require("fs"),root=process.argv[1],e=[];
const reg=require(root+"/repos.json").repos, gh=require(root+"/repos-github.json").repos;
const gn=u=>u.replace(/^.*[/:]/,"").replace(/\.git$/,""), TOP="_git-repos-master";
const up=new Map(reg.map(r=>[gn(r.url),r.parent_hub||r.hub||null]));
const c=JSON.parse(fs.readFileSync(root+"/repos-tree.canvas","utf8"));
if(!Array.isArray(c.nodes)||!Array.isArray(c.edges)) e.push("nodes/edges not arrays");
const ids=new Set(), COL=/^([1-6]|#[0-9a-fA-F]{6})$/;
for(const n of c.nodes){ if(typeof n.id!=="string"||ids.has(n.id)) e.push("bad/duplicate node id "+n.id); ids.add(n.id);
  if(!["text","link","group","file"].includes(n.type)) e.push("node type "+n.type);
  for(const k of ["x","y","width","height"]) if(!Number.isInteger(n[k])) e.push(n.id+" "+k+" not integer");
  if(n.type==="text"&&typeof n.text!=="string") e.push(n.id+" no text"); if(n.type==="link"&&typeof n.url!=="string") e.push(n.id+" no url");
  if(n.color!==undefined&&!COL.test(n.color)) e.push(n.id+" bad color"); }
const sides=["top","right","bottom","left"], eids=new Set();
for(const x of c.edges){ if(eids.has(x.id)) e.push("duplicate edge id"); eids.add(x.id);
  if(!ids.has(x.fromNode)||!ids.has(x.toNode)) e.push("edge to unknown node "+x.id);
  for(const k of ["fromSide","toSide"]) if(x[k]!==undefined&&!sides.includes(x[k])) e.push("edge "+k+" "+x[k]); }
// every registry/snapshot repo exactly once, as a text card
const cards=c.nodes.filter(n=>n.type==="text"), cardOf=new Map();
for(const r of gh){ const m=cards.filter(n=>n.text.startsWith("**"+r.name+"**\n")); if(m.length!==1) e.push(r.name+" has "+m.length+" cards"); else { cardOf.set(r.name,m[0]); if(!m[0].text.includes("("+r.url+")")) e.push(r.name+" card lacks GitHub link"); } }
for(const r of reg) if(!gh.some(g=>g.name===gn(r.url))) e.push("registry repo "+r.name+" not in repos-github.json");
if(cards.length!==gh.length) e.push("cards "+cards.length+" != repos "+gh.length);
// edges == parent chain
const want=new Set(gh.filter(r=>r.name!==TOP).map(r=>(up.get(r.name)||TOP)+">"+r.name));
const byId=new Map([...cardOf].map(([k,v])=>[v.id,k])), got=c.edges.map(x=>byId.get(x.fromNode)+">"+byId.get(x.toNode));
if(got.length!==want.size||new Set(got).size!==got.length) e.push("edge count "+got.length+" != "+want.size);
for(const w of want) if(!got.includes(w)) e.push("missing edge "+w);
for(const g of got) if(!want.has(g)) e.push("unexpected edge "+g);
// no overlapping cards; each card inside its hub group
for(let i=0;i<cards.length;i++) for(let j=i+1;j<cards.length;j++){ const a=cards[i],b=cards[j];
  if(a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height) e.push("cards overlap "+byId.get(a.id)+" / "+byId.get(b.id)); }
const groups=c.nodes.filter(n=>n.type==="group");
for(const g of groups) for(const o of c.nodes) if(o!==g&&o.type==="text"&&o.x<g.x+g.width&&g.x<o.x+o.width&&o.y<g.y+g.height&&g.y<o.y+o.height&&!(o.x>=g.x&&o.y>=g.y&&o.x+o.width<=g.x+g.width&&o.y+o.height<=g.y+g.height)) e.push("card straddles group "+g.label);
// HTML
const h=fs.readFileSync(root+"/repos-tree.html","utf8");
for(const r of gh) if(!h.includes("\""+r.name+"\"")) e.push("html lacks "+r.name);
const urls=h.match(/(https?:)?\/\/[^\s"\x27<>)\\]+/g)||[];
for(const u of urls) if(!/^https:\/\/github\.com\/diegonmarcos\//.test(u)) e.push("external url in html: "+u);
if(/<script[^>]+src=|<link[^>]+href=|@import/i.test(h)) e.push("html loads an external resource");
if(!/prefers-color-scheme:\s*dark/.test(h)) e.push("html lacks dark scheme");
if(e.length){ console.error(e.slice(0,30).join("\n")); process.exit(1); }' "$ROOT" && ok "canvas schema, every repo once, edges match parents, html offline" || bad "canvas/html content"

# mutation: a dropped repo must be caught
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
cp "$ROOT"/repos-tree.canvas "$ROOT"/repos-tree.html "$ROOT"/repos.json "$ROOT"/repos-github.json "$T/"
node -e 'const f=process.argv[1]+"/repos-tree.canvas",c=JSON.parse(require("fs").readFileSync(f));const i=c.nodes.findIndex(n=>n.type==="text");c.nodes.splice(i,1);require("fs").writeFileSync(f,JSON.stringify(c))' "$T"
[ "$(node -e 'const c=JSON.parse(require("fs").readFileSync(process.argv[1]+"/repos-tree.canvas"));const gh=require(process.argv[1]+"/repos-github.json").repos;console.log(c.nodes.filter(n=>n.type==="text").length!==gh.length?"caught":"missed")' "$T")" = caught ] && ok "mutation (dropped card) is detectable" || bad "mutation not detectable"
exit $fail
