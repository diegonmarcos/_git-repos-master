#!/usr/bin/env node
// gen-registry.js - THE ONE GENERATOR (#1295, #1301): renders EVERY file that lists repos or folders from THE ONE
// MASTER SOURCE projects-repos.json (schema projects-repos.schema.json). Never edit a rendered file.
//   0_registry/repos.json         cloud-repos/v1 compat (clone.sh, cloud-drive + libs:repos byte copies, hub subsets)
//   0_registry/repos-github.json per-repo GitHub view (field/project/subcategory/family + codes) and the `areas` outline:
//                      the data contract of the linktree's scripts/areas-gen.mjs
//   README.md          (repo root) 100% rendered: 9_others/templates/README.md.tpl + blocks computed here
//   0_repos-tree/*     json, canvas, html, md, xml, Obsidian graph notes        (render-repos-tree.js)
//   0_repo-folders-tree/*  json (excerpt of the master's `tree` fields), md, html  (render-folders-tree.js)
//   consumer copies    registry.consumers[].copies, written into sibling consumer clones by sync-consumers.js
//                      (e.g. cloudy-u-android repos.sot.json + pin, repos-github.sot.json, repos.outline.json and
//                      Cloud Me's ac_cloud-me/data/repos copy); a consumer with no clone prints a note, never fails
//
//   node 0_registry/gen-registry.js           validate the master, write every rendered file, drop stale graph notes,
//                                  then refresh the consumer copies (node sync-consumers.js; --no-consumers skips it)
//   node 0_registry/gen-registry.js --check   exit 1 when the master is invalid, any rendered file differs from a fresh render
//                                  (byte-for-byte) or a stale note exists; repos-sot.js check runs it
// Layout: the SoT, the generated registry files and every script live in 0_registry/; ROOT (this folder's parent) holds
// README.md, the farm folders and the 0_*-tree folders. Nothing but README.md is generated into the root.
// Folder data: `node 0_registry/refresh-folders-tree.js` fetches it INTO projects-repos.json, then runs this generator.
'use strict';
const fs = require('fs'), path = require('path');
const M = require('./registry-model.js');
const ROOT = path.resolve(__dirname, '..');
const RT = require('./render-repos-tree.js'), FT = require('./render-folders-tree.js');
const DASH = '—';

function v1(src, x) {
  const reg = src.registry, out = {};
  const farms = M.farms(x);
  for (const [k, v] of Object.entries(reg)) {
    if (k === 'groups') out.farms = farms;
    out[k] = v;
    if (k === '_doc') out._schema = 'cloud-repos/v1';
  }
  out.repos = x.repos.filter(r => r.name !== M.TOP).map(r => {
    const e = { name: r.name, farm: r.farm };
    if (r.group) e.group = r.group;
    if (r.kind === 'hub') e.parent_hub = r.up; else if (r.up) e.hub = r.up;
    e.url = r.ssh_url; e.private = r.private;
    for (const k of ['lfs', 'school', 'status', 'parts', 'renamed_from', 'doc']) if (r[k] !== undefined) e[k] = r[k];
    return e;
  });
  return JSON.stringify(out, null, 2) + '\n';
}

function outline(n, x) { // a non-repo node as linktree/README data
  const under = x.repos.filter(r => (r.path || []).includes(n.code)).length;
  const o = { code: n.code, kind: n.kind, name: n.name, label: n.label };
  if (n.icon) o.icon = n.icon; if (n.banner) o.banner = n.banner;
  if (n.show_in) o.show_in = n.show_in;
  if (n.landing) o.landing = n.landing; if (n.webapp) o.webapp = n.webapp; // declared URLs (Linktree Areas home cards)
  o.developer = devOf(n); o.description = n.description; o.hub = n.hub ? n.hub.name : null; o.farm = farmOf(n) || null;
  if (n.branch) o.branch = n.branch;
  o.repos_count = under;
  if (n.kind === 'family') { const subs = n.children.filter(c => c.kind === 'family'), rs = n.children.filter(c => c.kind === 'repo');
    if (subs.length) o.children = subs.map(c => outline(c, x)); // sub-families nest under their family
    if (rs.length) o.repos = rs.map(r => r.github || r.name);
    if (n.content) { o.content = n.content; o.apps = n.apps; } }
  else o.children = n.children.map(c => outline(c, x));
  return o;
}
let CHAIN = new Map();
const devOf = n => { for (const a of [...(CHAIN.get(n.code) || []), n].reverse()) if (a.developer) return a.developer; return null; };
const farmOf = n => { for (const a of [...(CHAIN.get(n.code) || []), n].reverse()) if (a.farm) return a.farm; return ''; };

function githubView(src, x) {
  const repos = x.repos.map(r => {
    const e = { family: r.family || DASH, name: r.github, url: r.url, role: r.kind === 'hub' && r.name !== M.TOP ? 'hub' : (r.role || ''), visibility: r.visibility,
      project: r.project || DASH, field: r.area, developer: r.developer };
    if (r.subcategory) e.subcategory = r.subcategory;
    Object.assign(e, { code: r.code, area_code: r.area_code, project_code: r.project_code || null, family_code: r.family_code || null, ...(r.subfamily ? { subfamily: r.subfamily, subfamily_code: r.subfamily_code } : {}), registry_name: r.name, hub: r.up, farm: r.farm || null, description: r.description });
    if (r.apps) e.apps = r.apps;
    return e;
  });
  return JSON.stringify({
    _doc: 'GENERATED by gen-registry.js from projects-repos.json (#1295, #1301). DO NOT EDIT. Data contract (linktree scripts/areas-gen.mjs and the README): repos[] keeps the v1 keys family, name (GitHub name), url, role, visibility, project ("—" for area-level hubs), field (= area name), developer, subcategory (optional; 42 curriculum branch or Cloud-Me Pub/Pvt) and adds code, area_code, project_code, family_code, subfamily and subfamily_code (only on repos inside a sub-family; family is then the top family), registry_name, hub, farm, description, apps (optional). areas[] is the hierarchy outline (area -> project -> subcategory -> family -> sub-family; a family lists its direct repos in repos[] and its sub-families in children[]) with codes, labels, icons, banners, hub, farm, developer and repo names: a reader can take icons and banners from here instead of hardcoding them.',
    vis_icons: src.icons.visibility,
    repos,
    field_order: [src.root.area, ...src.tree.map(a => a.name)],
    developer_icons: src.icons.developer,
    areas: src.tree.map(a => outline(a, x)),
  }, null, 2) + '\n';
}

// ---- README ---------------------------------------------------------------------------------------------------------
const cell = s => String(s ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
function readme(src, x) {
  const tpl = fs.readFileSync(path.join(ROOT, src.readme.template), 'utf8'), VIS = src.icons.visibility, DEV = src.icons.developer;
  const pub = x.repos.filter(r => r.visibility === 'public').length, kinds = k => x.nodes.filter(n => n.kind === k).length;
  const countUnder = n => x.repos.filter(r => (r.path || []).includes(n.code)).length;
  // outline: every non-repo node
  const ot = ['| Code | Kind | Node | Hub | Farm folder | Developer | Repos | Description |', '|---|---|---|---|---|---|---|---|'];
  for (const n of x.nodes) ot.push(`| \`${n.code}\` | ${n.kind} | ${n.icon ? n.icon + ' ' : ''}**${cell(n.label)}**${n.branch ? ` (${cell(n.branch)})` : ''} | ${n.hub ? `[${n.hub.name}](https://github.com/${src.owner}/${n.hub.name}) \`${n.hub.code}\`` : DASH} | ${farmOf(n) ? '`' + farmOf(n) + '/`' : DASH} | ${DEV[devOf(n)] || ''} ${devOf(n)} | ${countUnder(n)} | ${cell(n.description)} |`);
  // farm table + tree
  const tops = x.nodes.filter(n => n.farm && !n.farm.includes('/'));
  const ft = ['| Folder | Code | Node | Hubs | Repos | What |', '|---|---|---|---|---|---|'];
  for (const n of tops) { const rs = x.repos.filter(r => r.farm === n.farm || r.farm.startsWith(n.farm + '/'));
    ft.push(`| [\`${n.farm}/\`](${n.farm}/) | \`${n.code}\` | ${cell(n.label)} | ${rs.filter(r => r.kind === 'hub').length} | ${rs.filter(r => r.kind !== 'hub').length} | ${cell(n.description)} |`); }
  const trie = { dirs: new Map(), links: [] };
  for (const r of x.repos) { if (r.name === M.TOP) continue; let t = trie;
    for (const d of r.farm.split('/')) { if (!t.dirs.has(d)) t.dirs.set(d, { dirs: new Map(), links: [] }); t = t.dirs.get(d); }
    t.links.push(r); }
  const tree = [`${M.TOP}/`], order = new Map(tops.map((n, i) => [n.farm, i]));
  const walk = (t, d) => { const pad = '  '.repeat(d);
    for (const [n, c] of [...t.dirs].sort((a, b) => d === 1 ? order.get(a[0]) - order.get(b[0]) : a[0].localeCompare(b[0]))) { tree.push(`${pad}${n}/`); walk(c, d + 1); }
    for (const r of t.links.sort((a, b) => (b.kind === 'hub') - (a.kind === 'hub') || a.name.localeCompare(b.name)))
      tree.push(`${pad}${r.name}${r.kind === 'hub' ? '  (hub)' : ''}${r.private ? '  (private)' : ''}`); };
  walk(trie, 1);
  // all repos
  const rt = ['| Code | Repo | Area | Project | Sub-category | Family | Hub | Visibility | Developer | Description |', '|---|---|---|---|---|---|---|---|---|---|'];
  for (const r of x.repos) rt.push(`| \`${r.code}\` | [${r.github}](${r.url})${r.kind === 'hub' ? ' _(hub)_' : ''}${r.github !== r.name ? ` (registry \`${r.name}\`)` : ''} | ${cell(r.area)} | ${cell(r.project) || DASH} | ${cell(r.subcategory) || DASH} | ${cell(r.family) || DASH}${r.apps ? ` (apps: ${r.apps.map(a => a.name).join(', ')})` : ''} | ${r.up || DASH} | ${VIS[r.visibility]} ${r.visibility} | ${DEV[r.developer] || ''} ${r.developer} | ${cell(r.description) || DASH} |`);
  const ctx = {
    root_label: src.root.label, root_description: src.root.description, total: x.repos.length, public: pub, private: x.repos.length - pub,
    icon_public: VIS.public, icon_private: VIS.private, areas_n: kinds('area'), projects_n: kinds('project'), families_n: kinds('family'),
    hubs_n: x.repos.filter(r => r.kind === 'hub').length, outline_table: ot.join('\n'), farm_table: ft.join('\n'), farm_tree: tree.join('\n'),
    farm_first: tops[0].farm, farm_last: tops[tops.length - 1].farm, farm_example: (tops.find(n => /42/.test(n.farm)) || tops[0]).farm,
    base_dir: src.registry.base_dir_default, repos_table: rt.join('\n'),
  };
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => { if (!(k in ctx)) throw new Error(`README template: unknown placeholder {{${k}}}`); return String(ctx[k]); });
}

function render(file) {
  const src = M.load(file), errs = M.validate(src);
  if (errs.length) { const e = new Error('0_registry/projects-repos.json invalid:\n  - ' + errs.join('\n  - ')); e.problems = errs; throw e; }
  const x = M.expand(src);
  CHAIN = new Map(x.nodes.map(n => [n.code, n.ancestors]));
  return { '0_registry/repos.json': v1(src, x), '0_registry/repos-github.json': githubView(src, x), 'README.md': readme(src, x), ...RT.render(src), ...FT.render(src) };
}

// rendered folders that hold ONLY rendered files (anything else in them is stale)
const NOTES = `${RT.DIR}/repos-tree`;
const walk = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];
const rel = p => path.relative(ROOT, p).split(path.sep).join('/');
// every difference between the working tree and a fresh render of the master; [] = clean
function problems() {
  let out; try { out = render(); } catch (e) { return (e.problems || [e.message]).map(x => 'projects-repos.json: ' + x); }
  const p = [];
  for (const [f, t] of Object.entries(out)) { const fp = path.join(ROOT, f);
    if (!fs.existsSync(fp) || fs.readFileSync(fp, 'utf8') !== t) p.push(`${f} differs from a fresh render of projects-repos.json (never edit it; edit the master and run node 0_registry/gen-registry.js)`); }
  for (const fp of walk(path.join(ROOT, NOTES))) if (!(rel(fp) in out)) p.push(`${rel(fp)}: stale rendered note (run node 0_registry/gen-registry.js)`);
  return p;
}
module.exports = { render, problems };

if (require.main === module) {
  if (process.argv[2] === '--check') { const p = problems(); p.forEach(x => console.error(x)); process.exit(p.length ? 1 : 0); }
  let out; try { out = render(); } catch (e) { console.error(e.message); process.exit(1); }
  let n = 0;
  for (const [f, t] of Object.entries(out)) { const fp = path.join(ROOT, f);
    if (fs.existsSync(fp) && fs.readFileSync(fp, 'utf8') === t) continue;
    fs.mkdirSync(path.dirname(fp), { recursive: true }); fs.writeFileSync(fp, t); n++; if (!f.startsWith(NOTES + '/')) console.log(`wrote ${f}`); }
  for (const fp of walk(path.join(ROOT, NOTES))) if (!(rel(fp) in out)) { fs.unlinkSync(fp); console.log(`removed stale ${rel(fp)}`); }
  const prune = d => { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) if (e.isDirectory()) prune(path.join(d, e.name));
    if (!fs.readdirSync(d).length) fs.rmdirSync(d); };
  prune(path.join(ROOT, NOTES));
  console.log(`gen-registry.js: ${Object.keys(out).length} rendered files from projects-repos.json, ${n} rewritten`);
  if (!process.argv.includes('--no-consumers')) require('./sync-consumers.js').syncAll().notes.forEach(x => console.log(x));
}
