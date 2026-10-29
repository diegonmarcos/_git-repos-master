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

# md / json / xml / graph notes
# Policy: every repo, private included, carries its GitHub URL (existence/name/URL may be public; contents may not).
node -e '
const fs=require("fs"),path=require("path"),root=process.argv[1],e=[],TOP="_git-repos-master";
const gh=require(root+"/repos-github.json").repos, reg=require(root+"/repos.json").repos;
const gn=u=>u.replace(/^.*[/:]/,"").replace(/\.git$/,""), up=new Map(reg.map(r=>[gn(r.url),r.parent_hub||r.hub||null]));
const par=n=>n===TOP?null:(up.get(n)||TOP), priv=new Set(gh.filter(r=>r.visibility!=="public").map(r=>r.name));
// json
const j=JSON.parse(fs.readFileSync(root+"/repos-tree.json","utf8")); if(j._schema!=="repos-tree/v1") e.push("json schema");
const seen=new Map(); const walk=(o,p)=>{ if(seen.has(o.name)) e.push("json dup "+o.name); seen.set(o.name,p);
  if(!["hub","repo"].includes(o.kind)) e.push("json kind "+o.name); if(!o.url) e.push("json url missing "+o.name);
  (o.children||[]).forEach(c=>walk(c,o.name)); }; walk(j.tree,null);
for(const r of gh){ if(!seen.has(r.name)) e.push("json lacks "+r.name); else if(seen.get(r.name)!==par(r.name)) e.push("json parent "+r.name); }
if(seen.size!==gh.length||j.count!==gh.length) e.push("json count");
// xml
const x=fs.readFileSync(root+"/repos-tree.xml","utf8"); if(!/^<\?xml /.test(x)) e.push("xml prolog");
const st=[], xs=new Map();
for(const m of x.matchAll(/<(\/?)(hub|repo|repos-tree)([^>]*?)(\/?)>/g)){ if(m[1]){ if((st.pop()||{}).t!==m[2]) e.push("xml nesting"); continue; }
  const nm=(m[3].match(/ name="([^"]*)"/)||[])[1];
  if(nm){ const h=st.filter(s=>s.t==="hub"); xs.set(nm,h.length?h[h.length-1].n:null); if(!/ url="https:\/\/github\.com\//.test(m[3])) e.push("xml url missing "+nm); }
  if(!m[4]) st.push({t:m[2],n:nm}); }
if(st.length) e.push("xml unclosed");
for(const r of gh) if(xs.get(r.name)!==par(r.name)) e.push("xml parent "+r.name+" "+xs.get(r.name));
// md
const md=fs.readFileSync(root+"/repos-tree.md","utf8"); if(!/^---\n[\s\S]*?\nrepos: \d+\n[\s\S]*?\n---\n/.test(md)) e.push("md frontmatter");
if(!md.includes("```mermaid")) e.push("md mermaid"); for(const r of gh) if(!md.includes("[["+r.name+"]]")) e.push("md lacks "+r.name);
// notes
const all=[]; const w=d=>fs.readdirSync(d,{withFileTypes:true}).forEach(f=>f.isDirectory()?w(path.join(d,f.name)):all.push(path.join(d,f.name))); w(root+"/repos-tree");
const names=all.map(f=>path.basename(f,".md")); if(new Set(names).size!==names.length) e.push("note names not unique");
for(const r of gh){ const f=all.find(a=>path.basename(a,".md")===r.name); if(!f){ e.push("no note "+r.name); continue; }
  const t=fs.readFileSync(f,"utf8"), fm=(t.match(/^---\n([\s\S]*?)\n---\n/)||[])[1]; if(!fm){ e.push("note fm "+r.name); continue; }
  for(const k of ["name","kind","hub","parent_hub","project","area","family","subcategory","visibility","developer","tags"]) if(!new RegExp("^"+k+":","m").test(fm)) e.push("note "+r.name+" lacks "+k);
  if(!fm.includes("url: \""+r.url+"\"")) e.push("note lacks url "+r.name);
  if(!/^  - visibility\//m.test(fm)||!/^  - (hub|repo)$/m.test(fm)) e.push("note tags "+r.name);
  const p=par(r.name); if(p&&!t.includes("[["+p+"]]")) e.push("note "+r.name+" lacks link to "+p);
  for(const c of gh.filter(c=>par(c.name)===r.name)) if(!t.includes("[["+c.name+"]]")) e.push("hub "+r.name+" lacks child "+c.name);
  const segs=path.relative(root+"/repos-tree",f).split(path.sep).slice(0,-1), chain=[]; for(let h=(r.name===TOP||/-___$/.test(r.name)||gh.some(c=>par(c.name)===r.name))?r.name:p;h;h=par(h)) chain.unshift(h);
  if(segs.join("/")!==chain.join("/")) e.push("note path "+r.name+" "+segs.join("/")+" != "+chain.join("/")); }
if(all.length!==gh.length) e.push("notes "+all.length+" != repos "+gh.length);
if(e.length){ console.error(e.slice(0,30).join("\n")); process.exit(1); }' "$ROOT" && ok "md/json/xml/notes: every repo once, parents, links, tags, urls (private too)" || bad "md/json/xml/notes content"

# mutations: a hand-edited note and a stray note must be caught by --check
cp -r "$ROOT/gen-repos-tree.js" "$ROOT/repos-tree" "$ROOT/repos-tree.md" "$ROOT/repos-tree.json" "$ROOT/repos-tree.xml" "$ROOT/9_others" "$T/" 2>/dev/null
f=$(find "$T/repos-tree" -name '*.md' | head -1); echo x >> "$f"
node "$T/gen-repos-tree.js" --check >/dev/null 2>&1 && bad "mutation (edited note) missed" || ok "mutation (edited note) is caught"
git -C "$ROOT" show HEAD:repos-tree.canvas >/dev/null 2>&1; node "$T/gen-repos-tree.js" >/dev/null; touch "$T/repos-tree/stray.md"
node "$T/gen-repos-tree.js" --check >/dev/null 2>&1 && bad "mutation (stray note) missed" || ok "mutation (stray note) is caught"
echo '{}' > "$T/repos-tree.json"; node "$T/gen-repos-tree.js" --check >/dev/null 2>&1 && bad "mutation (json) missed" || ok "mutation (json) is caught"
exit $fail
