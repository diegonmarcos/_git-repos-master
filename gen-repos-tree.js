#!/usr/bin/env node
// Renders the repo tree (top hub _git-repos-master -> hubs via parent_hub/hub -> repos) from the registry:
//   repos-tree.canvas  Obsidian JSON Canvas 1.0
//   repos-tree.html    self-contained Dolphin/Breeze-style browser (template: 9_others/templates/repos-tree.html)
//   repos-tree.md      nested list + mermaid tree, Dataview-friendly frontmatter
//   repos-tree.json    the tree as nested JSON
//   repos-tree.xml     the same tree as XML
//   repos-tree/        Obsidian graph notes: one folder per hub (nested by parent_hub), <hub>/<hub>.md index
//                      notes and <repo>.md notes with frontmatter, tags and wikilinks. Wholly generated.
// Private repos carry no URL in md/json/xml/notes (names only).
// Data: repos.json (hierarchy) + repos-github.json (project/family/visibility/developer). No hard-coded lists.
//   node gen-repos-tree.js          write both files
//   node gen-repos-tree.js --check  exit 1 when the committed files differ from the registry
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const HERE = __dirname, TOP = '_git-repos-master';
const ghName = u => u.replace(/^.*[/:]/, '').replace(/\.git$/, '');

function model() {
  const reg = JSON.parse(fs.readFileSync(path.join(HERE, 'repos.json'), 'utf8')).repos;
  const gh = JSON.parse(fs.readFileSync(path.join(HERE, 'repos-github.json'), 'utf8'));
  const up = new Map(reg.map(r => [ghName(r.url), r.parent_hub || r.hub || null]));
  const nodes = gh.repos.map(r => ({
    name: r.name, url: r.url, project: r.project, family: r.family, field: r.field, developer: r.developer,
    subcategory: r.subcategory || '', visibility: r.visibility, vis_icon: gh.vis_icons[r.visibility], role: r.role || '',
    parent: r.name === TOP ? null : (up.get(r.name) || TOP),
  }));
  const kids = new Map();
  for (const n of nodes) if (n.parent) (kids.get(n.parent) || kids.set(n.parent, []).get(n.parent)).push(n);
  for (const n of nodes) n.hub = n.name === TOP || kids.has(n.name) || /-___$/.test(n.name);
  const cmp = (a, b) => (b.hub - a.hub) || a.name.localeCompare(b.name);
  for (const l of kids.values()) l.sort(cmp);
  return { nodes, kids, icons: gh.developer_icons };
}

const id = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 16);

function canvas({ nodes, kids }) {
  const W = 300, H = 120, G = 20, P = 20, T = 40, COLS = 3;
  const by = new Map(nodes.map(n => [n.name, n]));
  const out = { nodes: [], edges: [] }, pos = new Map();
  const fields = [...new Set(nodes.map(n => n.field))].sort();
  const gcol = n => String(2 + (fields.indexOf(n.field) % 5)); // 2..6; 1 (red) is private
  const card = (n, x, y) => {
    pos.set(n.name, { x, y });
    const txt = `**${n.name}**\n${n.project} · ${n.family}\n${n.vis_icon} ${n.visibility} · ${n.developer}\n[GitHub](${n.url})`;
    out.nodes.push({ id: id('c:' + n.name), type: 'text', text: txt, x, y, width: W, height: H, color: n.hub ? '6' : n.visibility === 'public' ? '4' : '1' });
  };
  // Lays out hub h with its top-left at (x,y); returns {w,h} of its group.
  function place(h, x, y) {
    const ch = kids.get(h.name) || [], leaves = ch.filter(c => !(kids.has(c.name))), subs = ch.filter(c => kids.has(c.name));
    const gi = out.nodes.length; out.nodes.push(null); // group first so it renders below its cards
    card(h, x + P, y + T);
    const cols = Math.min(COLS, leaves.length) || 1, rows = Math.ceil(leaves.length / COLS);
    leaves.forEach((c, i) => card(c, x + P + (i % COLS) * (W + G), y + T + H + G + Math.floor(i / COLS) * (H + G)));
    const leftW = Math.max(W, cols * W + (cols - 1) * G), leftH = H + (rows ? G + rows * H + (rows - 1) * G : 0);
    let sx = x + P + leftW + G, sy = y + T, subW = 0;
    for (const s of subs) { const b = place(s, sx, sy); sy += b.h + G; subW = Math.max(subW, b.w); }
    const w = P + leftW + (subs.length ? G + subW : 0) + P, hh = T - 10 + Math.max(leftH, subs.length ? sy - G - (y + T) : 0) + P + 10;
    out.nodes[gi] = { id: id('g:' + h.name), type: 'group', label: h.name, x, y, width: w, height: hh, color: gcol(h) };
    return { w, h: hh };
  }
  place(by.get(TOP), 0, 0);
  for (const n of nodes) if (n.parent) {
    const a = pos.get(n.parent), b = pos.get(n.name), right = b.x >= a.x + W;
    out.edges.push({ id: id('e:' + n.parent + '>' + n.name), fromNode: id('c:' + n.parent), fromSide: right ? 'right' : 'bottom', toNode: id('c:' + n.name), toSide: right ? 'left' : 'top', color: n.visibility === 'public' ? '4' : '1' });
  }
  return JSON.stringify(out, null, 2) + '\n';
}

function html(m) {
  const tpl = fs.readFileSync(path.join(HERE, '9_others/templates/repos-tree.html'), 'utf8');
  const data = { top: TOP, icons: m.icons, nodes: m.nodes.map(({ name, url, project, family, field, developer, visibility, vis_icon, parent, hub }) => ({ name, url, project, family, field, developer, visibility, vis_icon, parent, hub })) };
  return tpl.replace('/*__DATA__*/null', () => JSON.stringify(data).replace(/</g, '\\u003c'));
}

// ---- tree formats -------------------------------------------------------------------------------
const pubUrl = n => n.visibility === 'public' ? n.url : '';
const tag = s => String(s || '').trim().replace(/[^A-Za-z0-9_\-/]+/g, '-').replace(/^-+|-+$/g, '');
const fams = n => String(n.family || '').split(',').map(x => x.trim()).filter(Boolean);
const hasProject = n => n.project && n.project !== '—';
function treeObj(m, n) {
  const o = { name: n.name, kind: n.hub ? 'hub' : 'repo', project: hasProject(n) ? n.project : '', field: n.field || '', family: n.family || '',
    subcategory: n.subcategory, visibility: n.visibility, developer: n.developer, url: pubUrl(n) };
  if (n.hub) o.children = (m.kids.get(n.name) || []).map(c => treeObj(m, c));
  return o;
}
function asJson(m) { const by = new Map(m.nodes.map(n => [n.name, n]));
  return JSON.stringify({ _doc: 'GENERATED by gen-repos-tree.js from repos.json + repos-github.json. DO NOT EDIT.', _schema: 'repos-tree/v1', count: m.nodes.length, tree: treeObj(m, by.get(TOP)) }, null, 2) + '\n'; }
const xe = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function asXml(m) { const by = new Map(m.nodes.map(n => [n.name, n]));
  const out = ['<?xml version="1.0" encoding="UTF-8"?>', '<!-- GENERATED by gen-repos-tree.js from repos.json + repos-github.json. DO NOT EDIT. -->', `<repos-tree schema="repos-tree/v1" count="${m.nodes.length}">`];
  const walk = (o, d) => { const pad = '  '.repeat(d), el = o.kind;
    const at = ['name', 'project', 'field', 'family', 'subcategory', 'visibility', 'developer', 'url'].filter(k => o[k]).map(k => ` ${k}="${xe(o[k])}"`).join('');
    if (o.children && o.children.length) { out.push(`${pad}<${el}${at}>`); o.children.forEach(c => walk(c, d + 1)); out.push(`${pad}</${el}>`); }
    else out.push(`${pad}<${el}${at}/>`); };
  walk(treeObj(m, by.get(TOP)), 1); out.push('</repos-tree>'); return out.join('\n') + '\n'; }
function asMd(m) { const by = new Map(m.nodes.map(n => [n.name, n])), hubs = m.nodes.filter(n => n.hub);
  const L = ['---', 'title: Repos tree', 'generated_by: gen-repos-tree.js', `repos: ${m.nodes.length}`, `hubs: ${hubs.length}`,
    `public: ${m.nodes.filter(n => n.visibility === 'public').length}`, `private: ${m.nodes.filter(n => n.visibility !== 'public').length}`,
    'tags: [hub, repos-tree]', '---', '', '<!-- GENERATED by gen-repos-tree.js from repos.json + repos-github.json. DO NOT EDIT. -->', '',
    '# Repos tree', '', 'Graph notes: [[_git-repos-master]] (folder `repos-tree/`). Canvas: `repos-tree.canvas`. Also `repos-tree.json`, `repos-tree.xml`, `repos-tree.html`.', '', '## Tree', ''];
  const walk = (n, d) => { L.push(`${'  '.repeat(d)}- ${n.hub ? '**' : ''}[[${n.name}]]${n.hub ? '**' : ''} · ${n.vis_icon} ${n.visibility}${hasProject(n) ? ' · ' + n.project : ''}`); (m.kids.get(n.name) || []).forEach(c => walk(c, d + 1)); };
  walk(by.get(TOP), 0);
  const mid = s => 'n_' + s.replace(/[^A-Za-z0-9]/g, '_');
  L.push('', '## Mermaid', '', '```mermaid', 'graph LR');
  for (const n of m.nodes) L.push(`  ${mid(n.name)}["${n.name}"]`);
  for (const n of m.nodes) if (n.parent) L.push(`  ${mid(n.parent)} --> ${mid(n.name)}`);
  L.push('```', '', '## Dataview', '', '```dataview', 'TABLE hub, project, area, family, visibility, developer', 'FROM "repos-tree" AND #repo', 'SORT hub ASC, file.name ASC', '```', '');
  return L.join('\n'); }
function hubPath(m, n) { const by = new Map(m.nodes.map(x => [x.name, x])), p = [];
  for (let h = n.hub ? n : by.get(n.parent); h; h = h.parent ? by.get(h.parent) : null) p.unshift(h.name); return p.join('/'); }
function notes(m) { const out = {}, q = s => JSON.stringify(String(s ?? ''));
  for (const n of m.nodes) {
    const kids = m.kids.get(n.name) || [], hub = n.hub ? n.parent : n.parent;
    const tags = [n.hub ? 'hub' : 'repo', n.field && 'area/' + tag(n.field), hasProject(n) && 'project/' + tag(n.project), ...fams(n).map(f => 'family/' + tag(f)), 'visibility/' + n.visibility, n.subcategory && 'subcategory/' + tag(n.subcategory)].filter(Boolean);
    const fm = ['---', `name: ${q(n.name)}`, `kind: ${n.hub ? 'hub' : 'repo'}`, `hub: ${q(hub || '')}`, `parent_hub: ${q(n.parent || '')}`, `project: ${q(hasProject(n) ? n.project : '')}`,
      `area: ${q(n.field)}`, `family: ${q(n.family)}`, `subcategory: ${q(n.subcategory)}`, `visibility: ${n.visibility}`, `developer: ${q(n.developer)}`];
    if (pubUrl(n)) fm.push(`url: ${q(n.url)}`);
    fm.push('tags:', ...tags.map(t => `  - ${t}`), '---');
    const b = ['', '<!-- GENERATED by gen-repos-tree.js. DO NOT EDIT. -->', '', `# ${n.name}`, '', tags.map(t => '#' + t).join(' '), ''];
    if (n.parent) b.push(`${n.hub ? 'Parent hub' : 'Hub'}: [[${n.parent}]]`, '');
    if (pubUrl(n)) b.push(`GitHub: ${n.url}`, '');
    if (kids.length) b.push('## Children', '', ...kids.map(c => `- [[${c.name}]]${c.hub ? ' (hub)' : ''}`), '');
    const rel = hasProject(n) ? m.nodes.filter(x => x !== n && x.project === n.project).map(x => x.name).sort() : [];
    if (rel.length) b.push(`Related (${n.project}): ${rel.map(r => `[[${r}]]`).join(', ')}`, '');
    out[`repos-tree/${hubPath(m, n)}/${n.name}.md`] = fm.join('\n') + '\n' + b.join('\n');
  }
  return out; }

function render() { const m = model(); return { 'repos-tree.canvas': canvas(m), 'repos-tree.html': html(m), 'repos-tree.md': asMd(m), 'repos-tree.json': asJson(m), 'repos-tree.xml': asXml(m), ...notes(m) }; }
module.exports = { render, model, TOP };

if (require.main === module) {
  const files = render(), check = process.argv[2] === '--check';
  let drift = 0;
  for (const [f, text] of Object.entries(files)) {
    const p = path.join(HERE, f);
    if (check) { if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== text) { console.error(`${f}: out of date, run node gen-repos-tree.js`); drift = 1; } }
    else { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); }
  }
  // repos-tree/ is wholly generated: any file not rendered is stale.
  const walk = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];
  for (const p of walk(path.join(HERE, 'repos-tree'))) { const rel = path.relative(HERE, p).split(path.sep).join('/');
    if (!(rel in files)) { if (check) { console.error(`${rel}: stale generated note, run node gen-repos-tree.js`); drift = 1; } else fs.unlinkSync(p); } }
  process.exit(drift);
}
