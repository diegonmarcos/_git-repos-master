#!/usr/bin/env node
// Renders the repo tree (top hub _git-repos-master -> hubs via parent_hub/hub -> repos) from the registry:
//   repos-tree.canvas  Obsidian JSON Canvas 1.0
//   repos-tree.html    self-contained Dolphin/Breeze-style browser (template: 9_others/templates/repos-tree.html)
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
    visibility: r.visibility, vis_icon: gh.vis_icons[r.visibility], role: r.role || '',
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

function render() { const m = model(); return { 'repos-tree.canvas': canvas(m), 'repos-tree.html': html(m) }; }
module.exports = { render, model, TOP };

if (require.main === module) {
  const files = render(), check = process.argv[2] === '--check';
  let drift = 0;
  for (const [f, text] of Object.entries(files)) {
    const p = path.join(HERE, f);
    if (check) { if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== text) { console.error(`${f}: out of date, run node gen-repos-tree.js`); drift = 1; } }
    else fs.writeFileSync(p, text);
  }
  process.exit(drift);
}
