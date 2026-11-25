#!/usr/bin/env node
// render-repo-readmes.js - A2_repo-readmes (#1933): README.html + README.canvas for every non-archived repo of the registry.
//   node 0_registry/render-repo-readmes.js           write A2_repo-readmes/dist/<repo>/README.{html,canvas} (build.sh runs this)
//   node 0_registry/render-repo-readmes.js --list    print "<github-name><TAB><clone dir>" of every deployable repo (clone exists, not held)
// Inputs: THE ONE MASTER 0_registry/projects-repos.json, the GitHub cache A0_repos-tree/src/{gh-meta,kinds}.json, the templates in
// A2_repo-readmes/src, and per repo the committed HEAD of its local clone under $BASE (git ls-tree + README.md + LICENSE; read-only).
// No clone: registry data only and a "no local clone at render time" note. Deterministic: no clock, no HEAD sha, no file sizes of the
// outputs themselves (README.html/README.canvas are always listed in the root tree, so a deployed copy changes nothing).
// PRIVACY: master is public. Pages of private repos (built from their clone: README, file tree) are rendered only with --private into OUT
// (outside master) and deployed only to that private repo; dist/ holds public repos only, and a public page shows a private sibling by registry name and role only.
// Env: BASE (clone root, default: parent of this repo), OUT (dist dir, default A2_repo-readmes/dist).
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_process');
const M = require('./registry-model.js'), MD = require('./md-lite.js');
const ROOT = path.resolve(__dirname, '..'), DIR = 'A2_repo-readmes', TOP = '_git-repos-master';
const BASE = process.env.BASE || path.resolve(ROOT, '..'), OUT = process.env.OUT || path.join(ROOT, DIR, 'dist');
const HELD = new Set(['diegonmarcos', 'diegonmarcos.github.io']); // profile + Pages site: never deployed
const esc = MD.esc, id = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 16);
const readJ = f => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); } catch (e) { return {}; } };
const SELF = new Set(['README.html', 'README.canvas']);

// ---- clone access (read-only, committed HEAD) -----------------------------------------------------------------------
const aliases = new Map(); // mirror-repos.txt: <github-name> [<clone dir name>]
try { for (const l of fs.readFileSync(path.join(ROOT, '0_claude-sot/mirror-repos.txt'), 'utf8').split('\n')) { const [n, a] = l.trim().split(/\s+/); if (n && !n.startsWith('#') && a) aliases.set(n, a); } } catch (e) { /* none */ }
function cloneDir(r) {
  if (HELD.has(r.github)) return null;
  const c = [aliases.get(r.github), r.name === TOP ? 'git-repos-master' : null, r.github, r.name].filter(Boolean);
  for (const n of c) { const d = path.join(BASE, n); if (fs.existsSync(path.join(d, '.git'))) return d; }
  return null;
}
const git = (d, a, max = 64e6, env = {}) => cp.execFileSync('git', ['-C', d, ...a], { encoding: 'utf8', maxBuffer: max, timeout: 30000, stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, GIT_TERMINAL_PROMPT: '0', ...env } });
function rootTree(d) { try {
  const o = git(d, ['ls-tree', '-z', 'HEAD']).split('\0').filter(Boolean).map(l => { const m = /^(\d+) (\w+) \w+\t(.*)$/s.exec(l); return m && { type: m[2], name: m[3] }; }).filter(Boolean);
  for (const n of SELF) if (!o.some(e => e.name === n)) o.push({ type: 'blob', name: n });
  return o.sort((a, b) => ((b.type !== 'blob') - (a.type !== 'blob')) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
} catch (e) { return null; } }
const show = (d, f) => { try { return git(d, ['show', 'HEAD:' + f]); } catch (e) { return null; } };
const LANG = { js: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript', ts: 'TypeScript', tsx: 'TypeScript', jsx: 'JavaScript', sh: 'Shell', bash: 'Shell', py: 'Python', rs: 'Rust', go: 'Go', kt: 'Kotlin', kts: 'Kotlin', java: 'Java',
  html: 'HTML', css: 'CSS', scss: 'SCSS', nix: 'Nix', c: 'C', h: 'C', cpp: 'C++', hpp: 'C++', lua: 'Lua', rb: 'Ruby', php: 'PHP', sql: 'SQL', vue: 'Vue', svelte: 'Svelte', dockerfile: 'Dockerfile', gradle: 'Gradle', zig: 'Zig', swift: 'Swift', glsl: 'GLSL', wgsl: 'WGSL', cs: 'C#', mk: 'Makefile', tf: 'HCL', ex: 'Elixir', pl: 'Perl' };
const COL = { JavaScript: '#f1e05a', TypeScript: '#3178c6', Shell: '#89e051', Python: '#3572a5', Rust: '#dea584', Go: '#00add8', Kotlin: '#a97bff', Java: '#b07219', HTML: '#e34c26', CSS: '#563d7c', Nix: '#7e7eff', C: '#888', 'C++': '#f34b7d', Lua: '#000080', Dockerfile: '#384d54', Makefile: '#427819', SQL: '#e38c00', Vue: '#41b883', 'C#': '#178600' };
function langs(d, fallback) { // {name, pct}[] from the committed tree by file size; the primary GitHub language when the tree is unreadable
  try { const t = {}; let tot = 0;
    for (const l of git(d, ['ls-tree', '-r', '-l', '-z', 'HEAD'], 256e6, { GIT_NO_LAZY_FETCH: '1' }).split('\0').filter(Boolean)) {
      const m = /^\d+ blob \w+\s+(\d+|-)\t(.*)$/s.exec(l); if (!m || m[1] === '-' || SELF.has(m[2]) || m[2].startsWith(DIR + '/dist/')) continue;
      const b = path.basename(m[2]), e = b.toLowerCase() === 'dockerfile' ? 'dockerfile' : (b.includes('.') ? b.split('.').pop().toLowerCase() : ''), k = LANG[e]; if (!k) continue;
      t[k] = (t[k] || 0) + (+m[1]); tot += +m[1]; }
    if (tot) return Object.entries(t).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([name, v]) => ({ name, pct: v * 100 / tot })); } catch (e) { /* fall through */ }
  return fallback ? [{ name: fallback, pct: 100 }] : [];
}
const kb = n => n == null ? '—' : n >= 1024 ? (n / 1024).toFixed(1) + ' MB' : n + ' KB';

// ---- model ------------------------------------------------------------------------------------------------------------
const src = M.load(), x = M.expand(src), GMF = readJ('A0_repos-tree/src/gh-meta.json'), GM = GMF.repos || {}, KI = readJ('A0_repos-tree/src/kinds.json').repos || {};
const byCode = new Map(x.nodes.map(n => [n.code, n])), byGh = new Map(x.repos.map(r => [r.github, r]));
const OWNER = src.owner, GH = n => `https://github.com/${OWNER}/${n}`;
const live = x.repos.filter(r => !/^z-archived/.test(r.github));
const isHub = r => r.kind === 'hub' || /-___$/.test(r.github);
const lastOf = r => (r.path || []).slice(-1)[0] || null;
const scopeOf = r => (r.path || [])[1] || (r.path || [])[0] || null; // project (or area for area-level hubs, null for the root)
const inScope = (sc, r) => !sc || (r.path || []).includes(sc);
const pagesOf = r => { for (const c of [...(r.path || [])].reverse()) { const n = byCode.get(c); if (n && (n.landing || n.webapp)) return n.landing || n.webapp; } return ''; };
const domainPage = r => 'https://diegonmarcos.github.io/' + ((KI[r.github] || {}).html ? r.github + '/' : '');
const roleOf = r => isHub(r) ? 'hub' : (r.role || (KI[r.github] || {}).kind || 'repo');
const descOf = r => (GM[r.github] || {}).description || r.description || '';

// ---- canvas ------------------------------------------------------------------------------------------------------------
function canvas(me) {
  const sc = scopeOf(me), W = 300, H = 130, G = 20, P = 20, T = 40, COLS = 3, nodes = [], edges = [], pos = new Map();
  const scoped = live.filter(r => inScope(sc, r) && (sc || r.name !== TOP || true));
  const kidsN = c => x.nodes.filter(n => lastOf(n) === c || (c === null && !(n.path || []).length));
  const reposIn = c => scoped.filter(r => (c === null ? !(r.path || []).length : lastOf(r) === c)).sort((a, b) => (isHub(b) - isHub(a)) || (a.github < b.github ? -1 : 1));
  const card = (r, px, py) => { const g = GM[r.github] || {}, mine = r.github === me.github;
    const t = `**${r.github}**${mine ? '  ◀ THIS REPO' : ''}\n${roleOf(r)} · ${r.visibility === 'public' ? '🌐' : '🔒'} ${r.visibility} · ${r.code}\n${(r.visibility === 'private' && r.github !== me.github ? '' : descOf(r)).replace(/\s+/g, ' ').slice(0, 110)}\n[GitHub](${r.url})`;
    pos.set(r.github, { x: px, y: py });
    nodes.push({ id: id(`rc:${me.github}:c:${r.github}`), type: 'text', text: t, x: px, y: py, width: W, height: H, color: mine ? '3' : isHub(r) ? '6' : r.visibility === 'public' ? '4' : '1' }); };
  function place(code, px, py) { // group for node `code` (null = whole registry): its repo cards in a grid, then child groups in shelves of 2
    const n = code ? byCode.get(code) : null, gi = nodes.length; nodes.push(null);
    const rs = reposIn(code), cols = Math.min(COLS, rs.length) || 1, rows = Math.ceil(rs.length / COLS);
    rs.forEach((r, i) => card(r, px + P + (i % COLS) * (W + G), py + T + Math.floor(i / COLS) * (H + G)));
    let cy = py + T + (rows ? rows * (H + G) : 0), right = px + P + (rs.length ? cols * W + (cols - 1) * G : 0), rowX = px + P, rowH = 0, cnt = 0;
    for (const k of kidsN(code).filter(k => inScope(sc, { path: [...k.path, k.code] }))) {
      if (cnt === 2) { cy += rowH + G; rowX = px + P; rowH = 0; cnt = 0; }
      const b = place(k.code, rowX, cy); rowX += b.w + G; rowH = Math.max(rowH, b.h); cnt++; right = Math.max(right, rowX - G); }
    const w = Math.max(right - px + P, 340), h = cy + rowH - py + (rowH ? P : 0) + (cnt === 0 && !rowH ? 0 : 0) + (rowH ? 0 : P);
    nodes[gi] = { id: id(`rc:${me.github}:g:${code}`), type: 'group', label: n ? `${n.code} ${n.name}` : TOP, x: px, y: py, width: w, height: h, color: n && n.kind === 'family' ? '2' : '5' };
    return { w, h };
  }
  const top = sc ? byCode.get(sc) : null;
  const sz = place(sc || null, 0, 0);
  if (sc && top) { /* group of the scope node already carries the project label */ }
  const lx = sz.w + 80, mp = pos.get(me.github);
  const links = [['GitHub', me.url], ...(pagesOf(me) ? [['Pages', pagesOf(me)]] : []), ['Domain page', domainPage(me)], ['README.html (raw)', `https://raw.githubusercontent.com/${OWNER}/${me.github}/main/README.html`]];
  links.forEach(([k, u], i) => { const lid = id(`rc:${me.github}:l:${k}`);
    nodes.push({ id: lid, type: 'link', url: u, x: lx, y: (mp ? mp.y : 0) + i * (60 + G), width: 320, height: 60, color: '5' });
    edges.push({ id: id(`rc:${me.github}:le:${k}`), fromNode: id(`rc:${me.github}:c:${me.github}`), fromSide: 'right', toNode: lid, toSide: 'left', toEnd: 'arrow', label: k }); });
  nodes.push({ id: id(`rc:${me.github}:legend`), type: 'text', x: lx, y: (mp ? mp.y : 0) - 150, width: 320, height: 120, color: '5',
    text: `**${me.github}** README.canvas\nrepos under ${top ? top.code + ' ' + top.name : 'the whole registry'}\nyellow = this repo, purple = hub, green = public, red = private\ngenerated by _git-repos-master build.sh` });
  const here = new Set(scoped.map(r => r.github));
  for (const r of scoped) { const p = r.up && byGh.get(r.up) || (r.up && byGh.get(r.up)); if (!p || !here.has(p.github) || p.github === r.github) continue;
    const a = pos.get(p.github), b = pos.get(r.github), right = b.x >= a.x + W;
    edges.push({ id: id(`rc:${me.github}:e:${p.github}>${r.github}`), fromNode: id(`rc:${me.github}:c:${p.github}`), fromSide: right ? 'right' : b.y >= a.y ? 'bottom' : 'top', toNode: id(`rc:${me.github}:c:${r.github}`), toSide: right ? 'left' : b.y >= a.y ? 'top' : 'bottom',
      color: r.github === me.github || p.github === me.github ? '3' : r.visibility === 'public' ? '4' : '1' }); }
  return JSON.stringify({ nodes, edges }, null, 2) + '\n';
}

// ---- html ------------------------------------------------------------------------------------------------------------
const A = (u, t, c) => `<a href="${esc(u)}"${c ? ` class="${c}"` : ''}>${esc(t)}</a>`;
function html(me, tpl, style) {
  const g = GM[me.github] || {}, k = KI[me.github] || {}, dir = cloneDir(me), tree = dir ? rootTree(dir) : null, sc = scopeOf(me);
  const chain = (me.path || []).map(c => byCode.get(c)).filter(Boolean);
  const crumbs = [A(`https://github.com/${OWNER}`, OWNER), ...chain.map(n => n.hub ? A(GH(n.hub.name), `${n.icon ? n.icon + ' ' : ''}${n.code} ${n.name}`) : esc(`${n.icon ? n.icon + ' ' : ''}${n.code} ${n.name}`)), `<b>${esc(me.github)}</b>`].join('<i>/</i>');
  const topics = (g.topics || []).map(t => `<span class="chip">${esc(t)}</span>`).join('') || '<span class="dim">no topics</span>';
  const ls = dir ? langs(dir, g.language) : (g.language ? [{ name: g.language, pct: 100 }] : []);
  const fb = ['#58a6ff', '#d2a8ff', '#ffa657', '#7ee787', '#ff7b72', '#79c0ff'], lc = (n, i) => COL[n] || fb[i % fb.length];
  const langbar = ls.map((l, i) => `<i style="width:${l.pct.toFixed(2)}%;background:${lc(l.name, i)}" title="${esc(l.name)} ${l.pct.toFixed(1)}%"></i>`).join('');
  const langl = ls.map((l, i) => `<span><s style="background:${lc(l.name, i)}"></s>${esc(l.name)} ${l.pct.toFixed(1)}%</span>`).join('') || '<span>no language detected</span>';
  const stats = [`branch <b>main</b>`, `stars <b>${g.stargazers_count ?? '—'}</b>`, `forks <b>${g.forks_count ?? '—'}</b>`, `size <b>${kb(g.size)}</b>`, `pushed <b>${esc((g.pushed_at || '—').slice(0, 10))}</b>`, `code <b>${esc(me.code)}</b>`, `kind <b>${esc(k.kind || 'code')}</b>`].map(s => `<span>${s}</span>`).join('');
  const files = tree ? `<table class="ft">${tree.map(e => `<tr><td class="k">${e.type === 'blob' ? '·' : e.type === 'commit' ? '⇢' : '▸'}</td><td class="${e.type === 'blob' ? 'f' : 'd'}">${A(`${GH(me.github)}/${e.type === 'blob' ? 'blob' : 'tree'}/main/${e.name}`, e.name + (e.type === 'blob' ? '' : '/'))}</td><td class="r">${e.type === 'commit' ? 'submodule' : ''}</td></tr>`).join('')}</table>`
    : '<div class="in"><span class="dim">no local clone at render time: root file tree unavailable.</span></div>';
  const readme = dir && show(dir, 'README.md');
  const lic = dir ? ((show(dir, 'LICENSE') || show(dir, 'LICENSE.md') || '').split('\n').find(l => l.trim()) || '').trim() : '';
  const hubU = me.up && byGh.get(me.up), pg = pagesOf(me);
  const meta = [['visibility', me.visibility], ['default branch', 'main'], ['licence', lic || (dir ? 'none found at root' : '—')], ['size', kb(g.size)], ['last push', (g.pushed_at || '—').slice(0, 19).replace('T', ' ') + (g.pushed_at ? ' UTC' : '')],
    ['stars / forks', `${g.stargazers_count ?? '—'} / ${g.forks_count ?? '—'}`], ['area', me.area], ['project', me.project || '—'], ['family', [me.family, me.subfamily].filter(Boolean).join(' / ') || '—'], ['developer', me.developer || '—'], ['farm folder', me.farm || '—'], ['role', roleOf(me)],
    ['Pages', pg ? A(pg, pg) : '<span class="dim">none declared</span>'], ['domain page', A(domainPage(me), domainPage(me))]].map(([a, b]) => `<dt>${a}</dt><dd>${/^<a /.test(String(b)) ? b : esc(b)}</dd>`).join('');
  const li = (u, t, extra = '') => `<li>${A(u, t)}${extra ? ` <span class="dim">${esc(extra)}</span>` : ''}</li>`;
  const ups = []; for (let p = hubU, n = 0; p && n < 8; p = p.up && byGh.get(p.up), n++) ups.push(li(p.url, p.github, `${isHub(p) ? 'hub' : roleOf(p)} · ${p.code}`));
  const decl = chain.flatMap(n => [n.landing, n.webapp].filter(Boolean)).filter((u, i, a) => a.indexOf(u) === i).map(u => li(u, u, 'declared page'));
  const parents = [...ups, ...decl, li(GH(TOP), TOP, 'registry root')].join('');
  const sibs = live.filter(r => r.up === me.up && r.github !== me.github).sort((a, b) => a.github < b.github ? -1 : 1);
  const sib = sibs.map(r => li(r.url, r.github, `${roleOf(r)} · ${r.visibility}`)).join('') || '<li class="dim">none</li>';
  // ASCII project tree of the scope, this repo bold
  const pt = []; const walk = (code, pre) => { const kids = [...x.nodes.filter(n => lastOf(n) === code && inScope(sc, { path: [...n.path, n.code] })).map(n => ({ n })), ...live.filter(r => lastOf(r) === code && inScope(sc, r)).sort((a, b) => (isHub(b) - isHub(a)) || (a.github < b.github ? -1 : 1)).map(r => ({ r }))];
    kids.forEach((e, i) => { const last = i === kids.length - 1, br = pre + (last ? '└─ ' : '├─ ');
      if (e.n) { pt.push(`${esc(br)}${esc(e.n.code)} ${esc(e.n.name)}/`); walk(e.n.code, pre + (last ? '   ' : '│  ')); }
      else pt.push(esc(br) + (e.r.github === me.github ? `<b>${esc(e.r.github)}</b> ◀` : A(e.r.url, e.r.github)) + (isHub(e.r) ? ' (hub)' : '')); }); };
  const sn = sc ? byCode.get(sc) : null; pt.push(esc(sn ? `${sn.code} ${sn.name}/` : TOP + '/')); walk(sc || null, '');
  const links = [li(me.url, 'GitHub: ' + me.github), li(`https://raw.githubusercontent.com/${OWNER}/${me.github}/main/README.canvas`, 'README.canvas (raw)', 'JSON Canvas 1.0'), li(`https://raw.githubusercontent.com/${OWNER}/${me.github}/main/README.html`, 'README.html (raw)'),
    pg ? li(pg, 'Pages', 'declared') : '', li(domainPage(me), 'domain page')].join('');
  const v = { title: `${me.github} - ${OWNER}`, style, crumbs, owner: esc(OWNER), name: esc(me.github), visibility: me.visibility, hubbadge: isHub(me) ? '<span class="badge hub">hub</span>' : '',
    description: esc(descOf(me) || '(no description)'), topics, stats, langbar, langs: langl, branch: 'main', files, readme: readme ? MD.render(readme, { blob: `${GH(me.github)}/blob/main/` }) : `<p class="dim">${dir ? 'no README.md at the root.' : 'no local clone at render time: README.md not rendered.'}</p>`,
    meta, clonenote: dir ? '' : '<p class="note">no local clone at render time: file tree, README, licence and language bar come from the registry and the cached GitHub metadata only.</p>',
    parents, ptree: pt.join('\n'), nsib: sibs.length, siblings: sib, links,
    foot: esc(`generated by build.sh (A2_repo-readmes) from _git-repos-master: registry ${src._schema}, GitHub metadata cache ${GMF.scanned || '?'}. Do not edit; edit the sources in _git-repos-master.`) };
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, n) => { if (!(n in v)) throw new Error(`README.html.tmpl: unknown placeholder {{${n}}}`); return String(v[n]); });
}

function renderAll(vis) { // vis: 'public' (default, goes to the public master dist) | 'private' (only ever written outside master, see deploy-readmes.sh)
  vis = vis || 'public';
  const tpl = fs.readFileSync(path.join(ROOT, DIR, 'src/README.html.tmpl'), 'utf8'), style = fs.readFileSync(path.join(ROOT, DIR, 'src/style.css'), 'utf8').trim(), out = {};
  for (const r of live) { if ((r.visibility === 'private') !== (vis === 'private')) continue; out[`${r.github}/README.html`] = html(r, tpl, style); out[`${r.github}/README.canvas`] = canvas(r); }
  return out;
}
module.exports = { renderAll, cloneDir, live, HELD };

if (require.main === module) {
  if (process.argv[2] === '--list') { for (const r of live) { const d = cloneDir(r); if (d) console.log(`${r.github}\t${d}`); } process.exit(0); }
  const priv = process.argv[2] === '--private'; // private repos: rendered only into OUT (a scratch dir outside master), never into the tracked dist
  if (priv && !process.env.OUT) { console.error('--private needs OUT=<dir outside the repo>'); process.exit(2); }
  const out = renderAll(priv ? 'private' : 'public'); let n = 0;
  for (const [f, t] of Object.entries(out)) { const fp = path.join(OUT, f); if (fs.existsSync(fp) && fs.readFileSync(fp, 'utf8') === t) continue; fs.mkdirSync(path.dirname(fp), { recursive: true }); fs.writeFileSync(fp, t); n++; }
  const keep = new Set(Object.keys(out));
  if (fs.existsSync(OUT)) for (const d of fs.readdirSync(OUT)) for (const f of fs.existsSync(path.join(OUT, d)) && fs.statSync(path.join(OUT, d)).isDirectory() ? fs.readdirSync(path.join(OUT, d)) : []) if (!keep.has(`${d}/${f}`)) fs.unlinkSync(path.join(OUT, d, f));
  if (fs.existsSync(OUT)) for (const d of fs.readdirSync(OUT)) { const p = path.join(OUT, d); if (fs.statSync(p).isDirectory() && !fs.readdirSync(p).length) fs.rmdirSync(p); }
  console.log(`render-repo-readmes.js${priv ? ' --private' : ''}: ${Object.keys(out).length / 2} repos, ${Object.keys(out).length} files, ${n} rewritten`);
}
