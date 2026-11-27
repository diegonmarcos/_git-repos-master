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
let SUB = ''; // folder target being rendered ('' = the whole repo): the git reads below are scoped to it and every link gets its prefix
const FSELF = () => SUB ? new Set(['README.html', 'README.canvas', 'README.md']) : SELF;
const pre = () => SUB ? SUB + '/' : '';

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
  const o = git(d, ['ls-tree', '-z', SUB ? 'HEAD:' + SUB : 'HEAD']).split('\0').filter(Boolean).map(l => { const m = /^(\d+) (\w+) \w+\t(.*)$/s.exec(l); return m && { type: m[2], name: m[3] }; }).filter(Boolean);
  for (const n of FSELF()) if (!o.some(e => e.name === n)) o.push({ type: 'blob', name: n });
  return o.sort((a, b) => ((b.type !== 'blob') - (a.type !== 'blob')) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
} catch (e) { return null; } }
const show = (d, f) => { try { return git(d, ['show', 'HEAD:' + pre() + f]); } catch (e) { return null; } };
const LANG = { js: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript', ts: 'TypeScript', tsx: 'TypeScript', jsx: 'JavaScript', sh: 'Shell', bash: 'Shell', py: 'Python', rs: 'Rust', go: 'Go', kt: 'Kotlin', kts: 'Kotlin', java: 'Java',
  html: 'HTML', css: 'CSS', scss: 'SCSS', nix: 'Nix', c: 'C', h: 'C', cpp: 'C++', hpp: 'C++', lua: 'Lua', rb: 'Ruby', php: 'PHP', sql: 'SQL', vue: 'Vue', svelte: 'Svelte', dockerfile: 'Dockerfile', gradle: 'Gradle', zig: 'Zig', swift: 'Swift', glsl: 'GLSL', wgsl: 'WGSL', cs: 'C#', mk: 'Makefile', tf: 'HCL', ex: 'Elixir', pl: 'Perl' };
const COL = { JavaScript: '#f1e05a', TypeScript: '#3178c6', Shell: '#89e051', Python: '#3572a5', Rust: '#dea584', Go: '#00add8', Kotlin: '#a97bff', Java: '#b07219', HTML: '#e34c26', CSS: '#563d7c', Nix: '#7e7eff', C: '#888', 'C++': '#f34b7d', Lua: '#000080', Dockerfile: '#384d54', Makefile: '#427819', SQL: '#e38c00', Vue: '#41b883', 'C#': '#178600' };
function langs(d, fallback) { // {name, pct}[] from the committed tree by file size; the primary GitHub language when the tree is unreadable
  try { const t = {}; let tot = 0;
    for (const l of git(d, ['ls-tree', '-r', '-l', '-z', 'HEAD', ...(SUB ? ['--', SUB + '/'] : [])], 256e6, { GIT_NO_LAZY_FETCH: '1' }).split('\0').filter(Boolean)) {
      const m = /^\d+ blob \w+\s+(\d+|-)\t(.*)$/s.exec(l); if (m && SUB) { if (!m[2].startsWith(SUB + '/')) continue; m[2] = m[2].slice(SUB.length + 1); }
      if (!m || m[1] === '-' || FSELF().has(m[2]) || m[2].startsWith(DIR + '/dist/')) continue;
      const b = path.basename(m[2]), e = b.toLowerCase() === 'dockerfile' ? 'dockerfile' : (b.includes('.') ? b.split('.').pop().toLowerCase() : ''), k = LANG[e]; if (!k) continue;
      t[k] = (t[k] || 0) + (+m[1]); tot += +m[1]; }
    if (tot) return Object.entries(t).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([name, v]) => ({ name, pct: v * 100 / tot })); } catch (e) { /* fall through */ }
  return fallback ? [{ name: fallback, pct: 100 }] : [];
}
const kb = n => n == null ? '—' : n >= 1024 ? (n / 1024).toFixed(1) + ' MB' : n + ' KB';

// ---- #1961 sections from the clone (committed HEAD; read-only, deterministic) ------------------------------------------------
const NOLAZY = { GIT_NO_LAZY_FETCH: '1' };
const enc = p => (pre() + p).split('/').map(encodeURIComponent).join('/');
function allTree(d) { // every path of HEAD (trees + blobs + submodules), the README pair always at the root, nothing of master's dist
  try { const o = git(d, ['ls-tree', '-r', '-t', '-z', 'HEAD', ...(SUB ? ['--', SUB + '/'] : [])], 256e6, NOLAZY).split('\0').filter(Boolean).map(l => { const m = /^(\d+) (\w+) \w+\t(.*)$/s.exec(l); return m && (!SUB ? { type: m[2], path: m[3] } : m[3].startsWith(SUB + '/') ? { type: m[2], path: m[3].slice(SUB.length + 1) } : null); })
      .filter(e => e && !FSELF().has(e.path) && !e.path.startsWith(DIR + '/dist/'));
    for (const n of FSELF()) o.push({ type: 'blob', path: n });
    return o.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  } catch (e) { return null; } }
function treeOf(entries) { // nested {dirs: Map, files: [], n}
  const root = { name: '', path: '', dirs: new Map(), files: [], subs: [] };
  const dirOf = p => { let n = root; if (!p) return n; let acc = ''; for (const seg of p.split('/')) { acc = acc ? acc + '/' + seg : seg; if (!n.dirs.has(seg)) n.dirs.set(seg, { name: seg, path: acc, dirs: new Map(), files: [], subs: [] }); n = n.dirs.get(seg); } return n; };
  for (const e of entries) { const i = e.path.lastIndexOf('/'), parent = i < 0 ? '' : e.path.slice(0, i), name = e.path.slice(i + 1);
    if (e.type === 'tree') dirOf(e.path); else if (e.type === 'commit') dirOf(parent).subs.push(name); else dirOf(parent).files.push(name); }
  const count = n => { n.total = n.files.length + n.subs.length; for (const k of n.dirs.values()) n.total += 1 + count(k); return n.total; }; count(root);
  return root; }
const sortedDirs = n => [...n.dirs.values()].sort((a, b) => a.name < b.name ? -1 : 1);
function asciiTree(root, me, maxDepth = 3, cap = 500) { // depth-capped ASCII tree, folders first, each folder deeper than maxDepth summarised
  const out = [esc(me.github + '/' + pre())]; let shown = 0, cut = 0;
  const walk = (n, pre, depth) => { const kids = [...sortedDirs(n).map(k => ({ k })), ...n.subs.map(f => ({ s: f })), ...n.files.sort().map(f => ({ f }))];
    kids.forEach((e, i) => { if (shown >= cap) { cut++; return; } const last = i === kids.length - 1, br = pre + (last ? '└─ ' : '├─ '); shown++;
      if (e.k) { out.push(esc(br) + A(`${GH(me.github)}/tree/main/${enc(e.k.path)}`, e.k.name + '/') + (depth >= maxDepth && e.k.total ? `<span class="dim"> (${e.k.total} entries)</span>` : ''));
        if (depth < maxDepth) walk(e.k, pre + (last ? '   ' : '│  '), depth + 1); }
      else if (e.s) out.push(esc(br + e.s) + '<span class="dim"> ⇢ submodule</span>');
      else out.push(esc(br + e.f)); }); };
  walk(root, '', 1);
  if (cut) out.push(`<span class="dim">… ${cut} more entries not drawn (cap ${cap}): see the file explorer below or GitHub</span>`);
  return out.join('\n'); }
function explorer(root, me, cap = 1500) { // nested <details>: works with JavaScript off (Cloud Me's WebView), folders open on tap
  let shown = 0, cut = 0;
  const dir = (n, open) => { const fs_ = n.files.slice().sort(), body = [];
    for (const k of sortedDirs(n)) { if (shown >= cap) { cut += 1 + k.total; continue; } shown++; body.push(dir(k, false)); }
    for (const sname of n.subs) { if (shown >= cap) { cut++; continue; } shown++; body.push(`<li class="fs">⇢ ${esc(sname)} <span class="dim">submodule</span></li>`); }
    for (const f of fs_) { if (shown >= cap) { cut++; continue; } shown++; const p = n.path ? n.path + '/' + f : f; body.push(`<li class="ff">${A(`${GH(me.github)}/blob/main/${enc(p)}`, f)}</li>`); }
    const label = n.path ? esc(n.name + '/') : esc(me.github + '/' + pre());
    return `<li class="fd"><details${open ? ' open' : ''}><summary>${label} <span class="dim">${n.dirs.size} folders · ${n.files.length} files${n.total ? ' · ' + n.total + ' entries below' : ''}</span></summary><ul>${body.join('')}</ul></details></li>`; };
  const h = `<ul class="fx">${dir(root, true)}</ul>`;
  return h + (cut ? `<p class="note">… ${cut} more entries beyond the cap of ${cap}: ${A(`${GH(me.github)}`, 'browse them on GitHub')}</p>` : ''); }
function workflows(d, entries) { // .github/workflows/*.yml: name, triggers, jobs (from the committed file)
  return entries.filter(e => e.type === 'blob' && /^\.github\/workflows\/[^/]+\.ya?ml$/.test(e.path)).map(e => {
    const t = show(d, e.path) || '', nm = (/^name:\s*["']?(.+?)["']?\s*$/m.exec(t) || [])[1] || '';
    let on = []; const inl = /^on:\s*\[?([^\n\]#]+)\]?\s*$/m.exec(t);
    if (inl && inl[1].trim()) on = inl[1].split(',').map(x => x.trim()).filter(Boolean);
    else { const b = /^(?:on|"on"|'on'):\s*\n((?:[ \t]+.*\n?|\s*\n)*)/m.exec(t); if (b) { const ind = (/^([ \t]+)\S/m.exec(b[1]) || [, '  '])[1]; on = [...b[1].matchAll(new RegExp('^' + ind + '([A-Za-z_]+):', 'gm'))].map(m => m[1]); } }
    const jb = /^jobs:\s*\n((?:[ \t]+.*\n?|\s*\n)*)/m.exec(t), jobs = jb ? [...jb[1].matchAll(/^  ([A-Za-z0-9_-]+):/gm)].map(m => m[1]) : [];
    return { file: e.path, name: nm, on, jobs }; }); }
const HOOKCFG = new Set(['lefthook.yml', 'lefthook.yaml', '.pre-commit-config.yaml', '.pre-commit-hooks.yaml', '.huskyrc', '.husky.json']);
function hooks(d, entries) { // hook scripts (.githooks, .husky, any hooks/ folder), hook managers' configs, and Claude Code hook events of .claude/settings.json
  const files = entries.filter(e => e.type === 'blob' && !/(^|\/)(node_modules|dist)\//.test(e.path) && (/(^|\/)(\.githooks|\.husky|hooks)\//.test(e.path) || HOOKCFG.has(e.path.split('/').pop())));
  const groups = new Map(); for (const f of files) { const i = f.path.lastIndexOf('/'), g = i < 0 ? '.' : f.path.slice(0, i); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(f.path.slice(i + 1)); }
  let events = []; try { const j = JSON.parse(show(d, '.claude/settings.json') || '{}'); events = Object.entries(j.hooks || {}).map(([ev, arr]) => ({ ev, n: (arr || []).reduce((a, m) => a + ((m && m.hooks) || []).length, 0), match: (arr || []).map(m => m && m.matcher).filter(Boolean) })); } catch (e) { /* none */ }
  return { n: files.length, groups: [...groups.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1), events }; }
function activity(d) { // commits per week over the 52 weeks ending at the newest commit (deploy-only README commits and merges excluded, so a deploy changes nothing)
  let ts = null;
  try { ts = git(d, ['log', '--no-merges', '--format=%ct', 'HEAD', '--', SUB || '.', `:(exclude)${pre()}README.html`, `:(exclude)${pre()}README.canvas`, ...(SUB ? [`:(exclude)${pre()}README.md`] : []), `:(exclude)${DIR}/dist`], 64e6, NOLAZY).split('\n').filter(Boolean).map(Number); } catch (e) {
    try { ts = git(d, ['log', '--no-merges', '--format=%ct%x09%s', 'HEAD', ...(SUB ? ['--', SUB] : [])], 64e6, NOLAZY).split('\n').filter(l => l && !/\tREADME\.html \+ README\.canvas/.test(l)).map(l => +l.split('\t')[0]); } catch (e2) { return null; } }
  let shallow = false; try { shallow = git(d, ['rev-parse', '--is-shallow-repository']).trim() === 'true'; } catch (e) { /* no */ }
  if (!ts.length) return { total: 0, bins: Array(52).fill(0), shallow };
  const last = Math.max(...ts), first = Math.min(...ts), W = 604800, bins = Array(52).fill(0);
  for (const t of ts) { const i = Math.floor((last - t) / W); if (i < 52) bins[51 - i]++; }
  return { total: ts.length, first, last, bins, shallow }; }
const day = t => new Date(t * 1000).toISOString().slice(0, 10);
function langSvg(ls, lc) { // inline SVG: a stacked bar plus one row per language (bar proportional to its share)
  if (!ls.length) return '<p class="dim">no language detected</p>';
  const W = 640, rows = ls.slice(0, 12), H = 26 + rows.length * 18; let x = 0;
  const stack = ls.map((l, i) => { const w = W * l.pct / 100, r = `<rect x="${x.toFixed(2)}" y="2" width="${Math.max(w, 0.5).toFixed(2)}" height="12" fill="${lc(l.name, i)}"><title>${esc(l.name)} ${l.pct.toFixed(1)}%</title></rect>`; x += w; return r; }).join('');
  const lines = rows.map((l, i) => { const y = 26 + i * 18; return `<rect x="0" y="${y}" width="10" height="10" rx="2" fill="${lc(l.name, i)}"/><text x="16" y="${y + 9}">${esc(l.name)}</text><rect x="150" y="${y + 1}" width="${(400 * l.pct / 100).toFixed(2)}" height="8" fill="${lc(l.name, i)}" opacity=".85"/><text x="${(156 + 400 * l.pct / 100).toFixed(2)}" y="${y + 9}" class="v">${l.pct.toFixed(1)}%</text>`; }).join('');
  return `<svg class="g" role="img" aria-label="languages" viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMinYMin meet" xmlns="http://www.w3.org/2000/svg">${stack}${lines}${ls.length > rows.length ? `<text x="0" y="${H - 2}" class="v">+${ls.length - rows.length} more</text>` : ''}</svg>`; }
function commitSvg(a) {
  if (!a) return '<p class="dim">no local clone at render time: commit activity unavailable.</p>';
  const max = Math.max(1, ...a.bins), W = 52 * 12, H = 96, top = 8, ch = 64;
  const bars = a.bins.map((n, i) => { const h = n ? Math.max(2, ch * n / max) : 0, ws = a.last ? day(a.last - (51 - i) * 604800) : ''; return `<rect x="${i * 12 + 1}" y="${(top + ch - h).toFixed(2)}" width="10" height="${h.toFixed(2)}" rx="1" class="${n ? 'b' : 'z'}"><title>week ending ${ws}: ${n} commits</title></rect><rect x="${i * 12 + 1}" y="${top + ch}" width="10" height="2" class="ax"/>`; }).join('');
  const lbl = a.last ? `<text x="0" y="${H - 6}" class="v">${day(a.last - 51 * 604800)}</text><text x="${W}" y="${H - 6}" class="v" text-anchor="end">${day(a.last)}</text><text x="${W / 2}" y="${H - 6}" class="v" text-anchor="middle">max ${max}/week</text>` : '';
  const sum = a.bins.reduce((x, y) => x + y, 0);
  return `<svg class="g" role="img" aria-label="commit activity" viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMinYMin meet" xmlns="http://www.w3.org/2000/svg">${bars}${lbl}</svg>`
    + `<div class="stats"><span>last 52 weeks <b>${sum}</b> commits</span><span>in history <b>${a.total}</b></span>${a.first ? `<span>first <b>${day(a.first)}</b></span><span>latest <b>${day(a.last)}</b></span>` : ''}</div>`
    + `<p class="note">from git log of the committed HEAD at render time (merges and README-only deploy commits excluded)${a.shallow ? '; shallow clone: only the fetched history is counted' : ''}.</p>`; }

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
const descOf = r => r.fdesc || (GM[r.github] || {}).description || r.description || '';

const tg = me => me.github + (SUB ? '~' + SUB : '');
// ---- canvas ------------------------------------------------------------------------------------------------------------
function canvas(me) {
  const sc = scopeOf(me), W = 300, H = 130, G = 20, P = 20, T = 40, COLS = 3, nodes = [], edges = [], pos = new Map();
  const scoped = live.filter(r => inScope(sc, r) && (sc || r.name !== TOP || true));
  const kidsN = c => x.nodes.filter(n => lastOf(n) === c || (c === null && !(n.path || []).length));
  const reposIn = c => scoped.filter(r => (c === null ? !(r.path || []).length : lastOf(r) === c)).sort((a, b) => (isHub(b) - isHub(a)) || (a.github < b.github ? -1 : 1));
  const card = (r, px, py) => { const g = GM[r.github] || {}, mine = r.github === me.github;
    const t = `**${r.github}**${mine ? '  ◀ THIS REPO' : ''}\n${roleOf(r)} · ${r.visibility === 'public' ? '🌐' : '🔒'} ${r.visibility} · ${r.code}\n${(r.visibility === 'private' && r.github !== me.github ? '' : descOf(r)).replace(/\s+/g, ' ').slice(0, 110)}\n[GitHub](${r.url})`;
    pos.set(r.github, { x: px, y: py });
    nodes.push({ id: id(`rc:${tg(me)}:c:${r.github}`), type: 'text', text: t, x: px, y: py, width: W, height: H, color: mine ? '3' : isHub(r) ? '6' : r.visibility === 'public' ? '4' : '1' }); };
  function place(code, px, py) { // group for node `code` (null = whole registry): its repo cards in a grid, then child groups in shelves of 2
    const n = code ? byCode.get(code) : null, gi = nodes.length; nodes.push(null);
    const rs = reposIn(code), cols = Math.min(COLS, rs.length) || 1, rows = Math.ceil(rs.length / COLS);
    rs.forEach((r, i) => card(r, px + P + (i % COLS) * (W + G), py + T + Math.floor(i / COLS) * (H + G)));
    let cy = py + T + (rows ? rows * (H + G) : 0), right = px + P + (rs.length ? cols * W + (cols - 1) * G : 0), rowX = px + P, rowH = 0, cnt = 0;
    for (const k of kidsN(code).filter(k => inScope(sc, { path: [...k.path, k.code] }))) {
      if (cnt === 2) { cy += rowH + G; rowX = px + P; rowH = 0; cnt = 0; }
      const b = place(k.code, rowX, cy); rowX += b.w + G; rowH = Math.max(rowH, b.h); cnt++; right = Math.max(right, rowX - G); }
    const w = Math.max(right - px + P, 340), h = cy + rowH - py + (rowH ? P : 0) + (cnt === 0 && !rowH ? 0 : 0) + (rowH ? 0 : P);
    nodes[gi] = { id: id(`rc:${tg(me)}:g:${code}`), type: 'group', label: n ? `${n.code} ${n.name}` : TOP, x: px, y: py, width: w, height: h, color: n && n.kind === 'family' ? '2' : '5' };
    return { w, h };
  }
  const top = sc ? byCode.get(sc) : null;
  const sz = place(sc || null, 0, 0);
  if (sc && top) { /* group of the scope node already carries the project label */ }
  const lx = sz.w + 80, mp = pos.get(me.github);
  const links = [['GitHub', me.url], ...(pagesOf(me) ? [['Pages', pagesOf(me)]] : []), ['Domain page', domainPage(me)], ['README.html (raw)', `https://raw.githubusercontent.com/${OWNER}/${me.github}/main/${pre()}README.html`]];
  links.forEach(([k, u], i) => { const lid = id(`rc:${tg(me)}:l:${k}`);
    nodes.push({ id: lid, type: 'link', url: u, x: lx, y: (mp ? mp.y : 0) + i * (60 + G), width: 320, height: 60, color: '5' });
    edges.push({ id: id(`rc:${tg(me)}:le:${k}`), fromNode: id(`rc:${tg(me)}:c:${me.github}`), fromSide: 'right', toNode: lid, toSide: 'left', toEnd: 'arrow', label: k }); });
  nodes.push({ id: id(`rc:${tg(me)}:legend`), type: 'text', x: lx, y: (mp ? mp.y : 0) - 150, width: 320, height: 120, color: '5',
    text: `**${me.github}${SUB ? '/' + SUB : ''}** README.canvas\nrepos under ${top ? top.code + ' ' + top.name : 'the whole registry'}\nyellow = this repo, purple = hub, green = public, red = private\ngenerated by _git-repos-master build.sh` });
  const here = new Set(scoped.map(r => r.github));
  for (const r of scoped) { const p = r.up && byGh.get(r.up) || (r.up && byGh.get(r.up)); if (!p || !here.has(p.github) || p.github === r.github) continue;
    const a = pos.get(p.github), b = pos.get(r.github), right = b.x >= a.x + W;
    edges.push({ id: id(`rc:${tg(me)}:e:${p.github}>${r.github}`), fromNode: id(`rc:${tg(me)}:c:${p.github}`), fromSide: right ? 'right' : b.y >= a.y ? 'bottom' : 'top', toNode: id(`rc:${tg(me)}:c:${r.github}`), toSide: right ? 'left' : b.y >= a.y ? 'top' : 'bottom',
      color: r.github === me.github || p.github === me.github ? '3' : r.visibility === 'public' ? '4' : '1' }); }
  return JSON.stringify({ nodes, edges }, null, 2) + '\n';
}

// ---- html ------------------------------------------------------------------------------------------------------------
const A = (u, t, c) => `<a href="${esc(u)}"${c ? ` class="${c}"` : ''}>${esc(t)}</a>`;
function html(me, tpl, style) {
  const g = GM[me.github] || {}, k = KI[me.github] || {}, dir = cloneDir(me), tree = dir ? rootTree(dir) : null, sc = scopeOf(me);
  const chain = (me.path || []).map(c => byCode.get(c)).filter(Boolean);
  const crumbs = [A(`https://github.com/${OWNER}`, OWNER), ...chain.map(n => n.hub ? A(GH(n.hub.name), `${n.icon ? n.icon + ' ' : ''}${n.code} ${n.name}`) : esc(`${n.icon ? n.icon + ' ' : ''}${n.code} ${n.name}`)), `<b>${esc(me.github)}</b>`, ...(SUB ? SUB.split('/').map(t => `<b>${esc(t)}</b>`) : [])].join('<i>/</i>');
  const topics = (g.topics || []).map(t => `<span class="chip">${esc(t)}</span>`).join('') || '<span class="dim">no topics</span>';
  const ls = dir ? langs(dir, g.language) : (g.language ? [{ name: g.language, pct: 100 }] : []);
  const fb = ['#58a6ff', '#d2a8ff', '#ffa657', '#7ee787', '#ff7b72', '#79c0ff'], lc = (n, i) => COL[n] || fb[i % fb.length];
  const langbar = ls.map((l, i) => `<i style="width:${l.pct.toFixed(2)}%;background:${lc(l.name, i)}" title="${esc(l.name)} ${l.pct.toFixed(1)}%"></i>`).join('');
  const langl = ls.map((l, i) => `<span><s style="background:${lc(l.name, i)}"></s>${esc(l.name)} ${l.pct.toFixed(1)}%</span>`).join('') || '<span>no language detected</span>';
  const stats = [`branch <b>main</b>`, `stars <b>${g.stargazers_count ?? '—'}</b>`, `forks <b>${g.forks_count ?? '—'}</b>`, `size <b>${kb(g.size)}</b>`, `pushed <b>${esc((g.pushed_at || '—').slice(0, 10))}</b>`, `code <b>${esc(me.code)}</b>`, `kind <b>${esc(k.kind || 'code')}</b>`].map(s => `<span>${s}</span>`).join('');
  const files = tree ? `<table class="ft">${tree.map(e => `<tr><td class="k">${e.type === 'blob' ? '·' : e.type === 'commit' ? '⇢' : '▸'}</td><td class="${e.type === 'blob' ? 'f' : 'd'}">${A(`${GH(me.github)}/${e.type === 'blob' ? 'blob' : 'tree'}/main/${SUB ? enc(e.name) : e.name}`, e.name + (e.type === 'blob' ? '' : '/'))}</td><td class="r">${e.type === 'commit' ? 'submodule' : ''}</td></tr>`).join('')}</table>`
    : '<div class="in"><span class="dim">no local clone at render time: root file tree unavailable.</span></div>';
  const readme = dir && (SUB ? show(dir, 'index.md') : show(dir, 'README.md')); // a folder's own README.md is this generated file: its text source is the folder's index.md
  const furl = SUB ? `${GH(me.github)}/tree/main/${enc('').slice(0, -1)}` : me.url, rawb = `https://raw.githubusercontent.com/${OWNER}/${me.github}/main/${pre()}`, nm = me.github + (SUB ? '/' + SUB : '');
  const showR = (d, f) => { const o = SUB; SUB = ''; try { return show(d, f); } finally { SUB = o; } };
  const lic = dir ? ((showR(dir, 'LICENSE') || showR(dir, 'LICENSE.md') || '').split('\n').find(l => l.trim()) || '').trim() : '';
  const hubU = me.up && byGh.get(me.up), pg = pagesOf(me);
  const meta = [...(SUB ? [['folder', SUB], ['in repo', me.github]] : []), ['visibility', me.visibility], ['default branch', 'main'], ['licence', lic || (dir ? 'none found at root' : '—')], ['size', kb(g.size)], ['last push', (g.pushed_at || '—').slice(0, 19).replace('T', ' ') + (g.pushed_at ? ' UTC' : '')],
    ['stars / forks', `${g.stargazers_count ?? '—'} / ${g.forks_count ?? '—'}`], ['area', me.area], ['project', me.project || '—'], ['family', [me.family, me.subfamily].filter(Boolean).join(' / ') || '—'], ['developer', me.developer || '—'], ['farm folder', me.farm || '—'], ['role', roleOf(me)],
    ['Pages', pg ? A(pg, pg) : '<span class="dim">none declared</span>'], ['domain page', A(domainPage(me), domainPage(me))]].map(([a, b]) => `<dt>${a}</dt><dd>${/^<a /.test(String(b)) ? b : esc(b)}</dd>`).join('');
  const li = (u, t, extra = '') => `<li>${A(u, t)}${extra ? ` <span class="dim">${esc(extra)}</span>` : ''}</li>`;
  const ups = []; for (let p = hubU, n = 0; p && n < 8; p = p.up && byGh.get(p.up), n++) ups.push(li(p.url, p.github, `${isHub(p) ? 'hub' : roleOf(p)} · ${p.code}`));
  const decl = chain.flatMap(n => [n.landing, n.webapp].filter(Boolean)).filter((u, i, a) => a.indexOf(u) === i).map(u => li(u, u, 'declared page'));
  const parents = [...(SUB ? [li(me.url, me.github, 'repo holding this folder')] : []), ...ups, ...decl, li(GH(TOP), TOP, 'registry root')].join('');
  const sibs = live.filter(r => r.up === me.up && r.github !== me.github).sort((a, b) => a.github < b.github ? -1 : 1);
  const fsib = SUB ? folderTargets().filter(t => t.repo === me.github && t.path !== SUB).map(t => li(`${GH(t.repo)}/tree/main/${t.path.split('/').map(encodeURIComponent).join('/')}`, `${t.repo}/${t.path}`, 'sibling folder')) : [];
  const sib = [...fsib, ...sibs.map(r => li(r.url, r.github, `${roleOf(r)} · ${r.visibility}`))].join('') || '<li class="dim">none</li>';
  // ASCII project tree of the scope, this repo bold
  const pt = []; const walk = (code, pre) => { const kids = [...x.nodes.filter(n => lastOf(n) === code && inScope(sc, { path: [...n.path, n.code] })).map(n => ({ n })), ...live.filter(r => lastOf(r) === code && inScope(sc, r)).sort((a, b) => (isHub(b) - isHub(a)) || (a.github < b.github ? -1 : 1)).map(r => ({ r }))];
    kids.forEach((e, i) => { const last = i === kids.length - 1, br = pre + (last ? '└─ ' : '├─ ');
      if (e.n) { pt.push(`${esc(br)}${esc(e.n.code)} ${esc(e.n.name)}/`); walk(e.n.code, pre + (last ? '   ' : '│  ')); }
      else pt.push(esc(br) + (e.r.github === me.github ? `<b>${esc(e.r.github)}</b> ◀` : A(e.r.url, e.r.github)) + (isHub(e.r) ? ' (hub)' : '')); }); };
  const sn = sc ? byCode.get(sc) : null; pt.push(esc(sn ? `${sn.code} ${sn.name}/` : TOP + '/')); walk(sc || null, '');
  const links = [li(furl, 'GitHub: ' + nm), li(rawb + 'README.canvas', 'README.canvas (raw)', 'JSON Canvas 1.0'), li(rawb + 'README.html', 'README.html (raw)'), ...(SUB ? [li(rawb + 'README.md', 'README.md (raw)')] : []),
    pg ? li(pg, 'Pages', 'declared') : '', li(domainPage(me), 'domain page')].join('');
  // #1961 sections: URLs, languages + commits graphics, workflows, hooks, full tree, file explorer
  const all = dir ? allTree(dir) : null, troot = all ? treeOf(all) : null, act = dir ? activity(dir) : null;
  const wfs = all ? workflows(dir, all) : null, hk = all ? hooks(dir, all) : null, NC = w => `<p class="dim">no local clone at render time: ${w} unavailable.</p>`;
  const urls = [li(furl, SUB ? 'GitHub folder' : 'GitHub repo'), ...(SUB ? [li(me.url, 'GitHub repo', 'holds this folder')] : []), li(`${me.url}.git`, `${me.url}.git`, 'clone (https)'), `<li><code>git@github.com:${esc(OWNER)}/${esc(me.github)}.git</code> <span class="dim">clone (ssh)</span></li>`,
    li(`https://api.github.com/repos/${OWNER}/${me.github}`, 'GitHub REST', 'api'), li(rawb, 'raw (main)'),
    pg ? li(pg, pg, 'Pages (declared)') : '<li class="dim">Pages: none declared</li>', li(domainPage(me), domainPage(me), 'domain page')].join('');
  const workflowsH = !wfs ? NC('workflows') : !wfs.length ? `<p class="dim">no .github/workflows in this ${SUB ? 'folder' : 'repo'}.</p>`
    : `<table class="ft">${wfs.map(w => `<tr><td class="f">${A(`${GH(me.github)}/blob/main/${enc(w.file)}`, w.file.split('/').pop())}</td><td>${esc(w.name || '—')}</td><td class="r">${esc(w.on.join(', ') || '—')}</td><td class="r">${esc(w.jobs.length + ' job' + (w.jobs.length === 1 ? '' : 's'))}</td></tr>`).join('')}</table>`;
  const hooksH = !hk ? NC('hooks') : (!hk.n && !hk.events.length) ? `<p class="dim">no git hooks, hook manager config or Claude Code hooks in this ${SUB ? 'folder' : 'repo'}.</p>`
    : (hk.events.length ? `<p><b>.claude/settings.json</b> events: ${hk.events.map(e => `<span class="chip">${esc(e.ev)} ×${e.n}${e.match.length ? ' (' + esc(e.match.join(' | ').slice(0, 60)) + ')' : ''}</span>`).join(' ')}</p>` : '')
      + hk.groups.map(([g, fs_]) => `<details><summary>${A(`${GH(me.github)}/tree/main/${enc(g)}`, g + '/')} <span class="dim">${fs_.length} files</span></summary><ul class="l">${fs_.slice(0, 80).map(f => `<li>${A(`${GH(me.github)}/blob/main/${enc(g === '.' ? f : g + '/' + f)}`, f)}</li>`).join('')}${fs_.length > 80 ? `<li class="dim">… ${fs_.length - 80} more</li>` : ''}</ul></details>`).join('');
  const v = { title: `${nm} - ${OWNER}`, style, crumbs,
    urls, langsvg: langSvg(ls, lc), commitsvg: commitSvg(act), nwf: wfs ? wfs.length : '—', workflows: workflowsH, nhooks: hk ? hk.n + hk.events.length : '—', hooks: hooksH,
    tree: troot ? asciiTree(troot, me) : esc('no local clone at render time: tree unavailable.'), explorer: troot ? explorer(troot, me) : NC('file explorer'), owner: esc(OWNER), name: esc(nm), visibility: me.visibility, hubbadge: isHub(me) ? '<span class="badge hub">hub</span>' : '',
    description: esc(descOf(me) || '(no description)'), topics, stats, langbar, langs: langl, branch: 'main', files, readme: readme ? MD.render(readme, { blob: `${GH(me.github)}/blob/main/${pre()}` }) : `<p class="dim">${dir ? 'no README.md at the root.' : 'no local clone at render time: README.md not rendered.'}</p>`,
    meta, clonenote: dir ? '' : '<p class="note">no local clone at render time: file tree, README, licence and language bar come from the registry and the cached GitHub metadata only.</p>',
    parents, ptree: pt.join('\n'), nsib: sibs.length + fsib.length, siblings: sib, links,
    foot: esc(`generated by build.sh (A2_repo-readmes) from _git-repos-master: registry ${src._schema}, GitHub metadata cache ${GMF.scanned || '?'}. Do not edit; edit the sources in _git-repos-master.`) };
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, n) => { if (!(n in v)) throw new Error(`README.html.tmpl: unknown placeholder {{${n}}}`); return String(v[n]); });
}

// folder targets: A2_repo-readmes/src/folder-targets.json (declared data: {targets:[{repo, path, title, description}]}); the same 13 sections, scoped to the folder
function folderTargets() { try { return JSON.parse(fs.readFileSync(path.join(ROOT, DIR, 'src/folder-targets.json'), 'utf8')).targets || []; } catch (e) { return []; } }
const folderKey = t => `${t.repo}~${t.path.replace(/\//g, '+')}`; // dist dir name of a target (one level deep, like a repo)
function markdown(me, t) { // README.md of a folder: the same sections as text, from the same git reads
  const d = cloneDir(me), g = GM[me.github] || {}, all = d ? allTree(d) : null, troot = all ? treeOf(all) : null, ls = d ? langs(d, g.language) : [], act = d ? activity(d) : null;
  const wfs = all ? workflows(d, all) : [], hk = all ? hooks(d, all) : { n: 0, groups: [], events: [] }, base = `${GH(me.github)}/tree/main/${enc('').slice(0, -1)}`, raw = `https://raw.githubusercontent.com/${OWNER}/${me.github}/main/${pre()}`;
  const top = rootTree(d) || [], L = [`# ${me.github} / ${SUB}`, '', t.title ? `**${t.title}**` : '', '', descOf(me) || '', '',
    '## Metadata', '', `- repo: [${me.github}](${me.url}) (${me.visibility})`, `- folder: \`${SUB}\``, `- default branch: main`, `- last push of the repo: ${(g.pushed_at || '—').slice(0, 10)}`, `- project: ${me.project || '—'}, area ${me.area}`, '',
    '## URLs', '', `- ${base}`, `- ${raw}`, `- ${me.url}`, '',
    '## Languages', '', ...(ls.length ? ls.slice(0, 12).map(l => `- ${l.name} ${l.pct.toFixed(1)}%`) : ['- none detected']), '',
    '## Commit activity', '', act ? `last 52 weeks ${act.bins.reduce((a, b) => a + b, 0)} commits, ${act.total} in history${act.first ? `, first ${day(act.first)}, latest ${day(act.last)}` : ''}${act.shallow ? ' (shallow clone)' : ''}` : 'unavailable (no local clone at render time)', '',
    `## Workflows (${wfs.length})`, '', ...(wfs.length ? wfs.map(w => `- ${w.file}: ${w.name || '—'} (${w.on.join(', ') || '—'})`) : ['none in this folder.']), '',
    `## Hooks (${hk.n + hk.events.length})`, '', ...(hk.n + hk.events.length ? [...hk.events.map(e => `- ${e.ev} x${e.n}`), ...hk.groups.map(([g2, f]) => `- ${g2}/: ${f.length} files`)] : ['none in this folder.']), '',
    '## Tree of files and folders', '', '```', ...(troot ? asciiTree(troot, me).split('\n').map(l => l.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')) : ['(unavailable)']), '```', '',
    '## File explorer', '', ...(troot ? [...sortedDirs(troot).map(k => `- [${k.name}/](${GH(me.github)}/tree/main/${enc(k.path)}) (${k.total} entries)`), ...troot.files.sort().map(f => `- [${f}](${GH(me.github)}/blob/main/${enc(f)})`)] : ['(unavailable)']), '',
    '## Repo siblings', '', ...folderTargets().filter(o => o.repo === me.github && o.path !== SUB).map(o => `- [${o.repo}/${o.path}](${GH(o.repo)}/tree/main/${o.path.split('/').map(encodeURIComponent).join('/')}) (sibling folder)`), ...live.filter(r => r.up === me.up && r.github !== me.github).sort((a, b) => a.github < b.github ? -1 : 1).map(r => `- [${r.github}](${r.url}) ${roleOf(r)} · ${r.visibility}`), '',
    '## Repo parents', '', `- [${me.github}](${me.url}) (repo holding this folder)`, ...(() => { const o = []; for (let p = me.up && byGh.get(me.up), n = 0; p && n < 8; p = p.up && byGh.get(p.up), n++) o.push(`- [${p.github}](${p.url}) ${isHub(p) ? 'hub' : roleOf(p)} · ${p.code}`); return o; })(), `- [${TOP}](${GH(TOP)}) (registry root)`, '',
    '## Links', '', `- [README.html](${raw}README.html)`, `- [README.canvas](${raw}README.canvas)`, `- [README.md](${raw}README.md)`, '', `<sub>generated by _git-repos-master A2_repo-readmes (folder-targets.json); do not edit.</sub>`, ''];
  return L.join('\n').replace(/\n{3,}/g, '\n\n'); }
function renderAll(vis) { // vis: 'public' (default, goes to the public master dist) | 'private' (only ever written outside master, see deploy-readmes.sh)
  vis = vis || 'public';
  const tpl = fs.readFileSync(process.env.README_TPL || path.join(ROOT, DIR, 'src/README.html.tmpl'), 'utf8'), style = fs.readFileSync(path.join(ROOT, DIR, 'src/style.css'), 'utf8').trim(), out = {};
  for (const r of live) { if ((r.visibility === 'private') !== (vis === 'private')) continue; out[`${r.github}/README.html`] = html(r, tpl, style); out[`${r.github}/README.canvas`] = canvas(r); }
  for (const t of folderTargets()) { const r = live.find(o => o.github === t.repo); if (!r || (r.visibility === 'private') !== (vis === 'private')) continue;
    SUB = t.path; try { const me = { ...r, fdesc: t.description || '' }, k = folderKey(t); out[`${k}/README.html`] = html(me, tpl, style); out[`${k}/README.canvas`] = canvas(me); out[`${k}/README.md`] = markdown(me, t); } finally { SUB = ''; } }
  return out;
}
module.exports = { renderAll, cloneDir, live, HELD };

if (require.main === module) {
  if (process.argv[2] === '--list') { for (const r of live) { const d = cloneDir(r); if (d) console.log(`${r.github}\t${d}`); }
    for (const t of folderTargets()) { const r = live.find(o => o.github === t.repo), d = r && cloneDir(r); if (d) console.log(`${folderKey(t)}\t${d}\t${t.path}`); } process.exit(0); }
  const priv = process.argv[2] === '--private'; // private repos: rendered only into OUT (a scratch dir outside master), never into the tracked dist
  if (priv && !process.env.OUT) { console.error('--private needs OUT=<dir outside the repo>'); process.exit(2); }
  const out = renderAll(priv ? 'private' : 'public'); let n = 0;
  for (const [f, t] of Object.entries(out)) { const fp = path.join(OUT, f); if (fs.existsSync(fp) && fs.readFileSync(fp, 'utf8') === t) continue; fs.mkdirSync(path.dirname(fp), { recursive: true }); fs.writeFileSync(fp, t); n++; }
  const keep = new Set(Object.keys(out));
  if (fs.existsSync(OUT)) for (const d of fs.readdirSync(OUT)) for (const f of fs.existsSync(path.join(OUT, d)) && fs.statSync(path.join(OUT, d)).isDirectory() ? fs.readdirSync(path.join(OUT, d)) : []) if (!keep.has(`${d}/${f}`)) fs.unlinkSync(path.join(OUT, d, f));
  if (fs.existsSync(OUT)) for (const d of fs.readdirSync(OUT)) { const p = path.join(OUT, d); if (fs.statSync(p).isDirectory() && !fs.readdirSync(p).length) fs.rmdirSync(p); }
  console.log(`render-repo-readmes.js${priv ? ' --private' : ''}: ${Object.keys(out).filter(k => k.endsWith('/README.html')).length} pages, ${Object.keys(out).length} files, ${n} rewritten`);
}
