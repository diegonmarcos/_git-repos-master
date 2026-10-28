#!/usr/bin/env node
// Renders the "All repos" tables in README.md from repos-github.json (between the markers),
// and the intro repo count from repos.json.
const fs = require('fs');
const d = JSON.parse(fs.readFileSync(__dirname + '/repos-github.json', 'utf8'));
const pub = d.repos.filter(r => r.visibility === 'public').length;
const head = ['| Developer | Field | Project | Family | Repo | Visibility |', '|---|---|---|---|---|---|'];
const row = r => `| ${d.developer_icons[r.developer]} ${r.developer} | ${r.field} | ${r.project} | ${r.family} | [${r.name}](${r.url})${r.role ? ` _(${r.role})_` : ''} | ${d.vis_icons[r.visibility]} ${r.visibility} |`;
const live = d.repos.filter(r => r.developer !== 'Z-archived'), arch = d.repos.filter(r => r.developer === 'Z-archived');
const lines = [
  `## All repos (${d.repos.length} — ${pub} 🌐 public, ${d.repos.length - pub} 🔒 private)`, '',
  'Generated from [`repos-github.json`](repos-github.json) by `node gen-repos-list.js`.', '',
  ...head, ...live.map(row), '', '---', '', `### ${d.developer_icons['Z-archived']} Z-archived (${arch.length})`, '',
  '| Repo | Visibility |', '|---|---|',
  ...arch.map(r => `| [${r.name}](${r.url}) | ${d.vis_icons[r.visibility]} ${r.visibility} |`),
];
const B = '<!-- repos-list:begin -->', E = '<!-- repos-list:end -->';
const p = __dirname + '/README.md';
let md = fs.readFileSync(p, 'utf8');
const block = `${B}\n${lines.join('\n')}\n${E}`;
md = md.includes(B) ? md.replace(new RegExp(`${B}[\\s\\S]*${E}`), block) : md.trimEnd() + '\n\n' + block + '\n';
const reg = JSON.parse(fs.readFileSync(__dirname + '/repos.json', 'utf8')).repos;
const n = Array.isArray(reg) ? reg.length : Object.keys(reg).length;
md = md.replace(/<!-- repos-count:begin -->[\s\S]*?<!-- repos-count:end -->/,
  `<!-- repos-count:begin -->\`repos.json\` registers ${n} of them, grouped (the GitHub snapshot in the table below holds ${d.repos.length})<!-- repos-count:end -->`);
fs.writeFileSync(p, md);
