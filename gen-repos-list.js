#!/usr/bin/env node
// Renders the "All repos" tables in README.md from repos-github.json (between the markers),
// and the intro repo count from repos.json.
const fs = require('fs');
const d = JSON.parse(fs.readFileSync(__dirname + '/repos-github.json', 'utf8'));
const pub = d.repos.filter(r => r.visibility === 'public').length;
const head = ['| Developer | Field | Project | Family | Repo | Visibility |', '|---|---|---|---|---|---|'];
const row = r => `| ${d.developer_icons[r.developer]} ${r.developer} | ${r.field} | ${r.project}${r.subcategory ? ` / ${r.subcategory}` : ''} | ${r.family} | [${r.name}](${r.url})${r.role ? ` _(${r.role})_` : ''} | ${d.vis_icons[r.visibility]} ${r.visibility} |`;
const live = d.repos.filter(r => r.developer !== 'Z-archived'), arch = d.repos.filter(r => r.developer === 'Z-archived');
const lines = [
  `## All repos (${d.repos.length} — ${pub} 🌐 public, ${d.repos.length - pub} 🔒 private)`, '',
  'Generated from [`repos-github.json`](repos-github.json) by `node gen-repos-list.js`.', '',
  ...head, ...live.map(row), '', '---', '', `### ${d.developer_icons['Z-archived']} Z-archived (${arch.length})`, '',
  '| Repo | Visibility |', '|---|---|',
  ...arch.map(r => `| [${r.name}](${r.url}) | ${d.vis_icons[r.visibility]} ${r.visibility} |`),
];
// Projects table: one row per (developer, field, project); hub rows (project "—") and Z-archived are not projects.
const groups = new Map();
for (const r of live.filter(r => r.project && r.project !== '—')) {
  const k = [r.developer, r.field, r.project].join('\u0000');
  if (!groups.has(k)) groups.set(k, { developer: r.developer, field: r.field, project: r.project, school: r.school, subs: [], fams: [], repos: [] });
  const g = groups.get(k);
  for (const f of String(r.family).split(',').map(x => x.trim()).filter(Boolean)) if (!g.fams.includes(f)) g.fams.push(f);
  if (r.subcategory && !g.subs.includes(r.subcategory)) g.subs.push(r.subcategory);
  g.repos.push(r);
}
const plines = [
  `## Projects (${groups.size})`, '',
  'Generated from [`repos-github.json`](repos-github.json) by `node gen-repos-list.js`. A field or school (CG, 42) is context, not a project; Sub-categories group the repos of a project (Cloud-Me: Pub, Pvt; Fin-CM: Corporate, Capital Markets; 42: its curriculum branches).', '',
  '| Project | Field | Sub-categories | Developer | Family | Repos | Count |', '|---|---|---|---|---|---|---|',
  ...[...groups.values()].map(g => `| ${g.project} | ${g.field} | ${g.subs.join(', ') || '—'} | ${d.developer_icons[g.developer]} ${g.developer}${g.school ? ` (school ${g.school})` : ''} | ${g.fams.join(', ')} | ${g.repos.map(r => `[${r.name}](${r.url})`).join(', ')} | ${g.repos.length} |`),
];
const PB = '<!-- projects-list:begin -->', PE = '<!-- projects-list:end -->';
const B = '<!-- repos-list:begin -->', E = '<!-- repos-list:end -->';
const p = __dirname + '/README.md';
let md = fs.readFileSync(p, 'utf8');
const pblock = `${PB}\n${plines.join('\n')}\n${PE}`;
if (md.includes(PB)) md = md.replace(new RegExp(`${PB}[\\s\\S]*${PE}`), pblock);
else md = md.replace(B, `${pblock}\n\n${B}`);
const block = `${B}\n${lines.join('\n')}\n${E}`;
md = md.includes(B) ? md.replace(new RegExp(`${B}[\\s\\S]*${E}`), block) : md.trimEnd() + '\n\n' + block + '\n';
const reg = JSON.parse(fs.readFileSync(__dirname + '/repos.json', 'utf8')).repos;
const n = Array.isArray(reg) ? reg.length : Object.keys(reg).length;
md = md.replace(/<!-- repos-count:begin -->[\s\S]*?<!-- repos-count:end -->/,
  `<!-- repos-count:begin -->\`repos.json\` registers ${n} of them, grouped (the GitHub snapshot in the table below holds ${d.repos.length})<!-- repos-count:end -->`);
fs.writeFileSync(p, md);
