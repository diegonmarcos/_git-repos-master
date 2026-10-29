#!/usr/bin/env node
// repo-folders-tree: every registry repo's folder structure, to a configurable depth (default 3).
// All outputs live in 1_repo-folders-tree/ (#1291); root symlinks keep ./repo-folders-tree.* working.
//   repo-folders-tree.json  SOURCE OF TRUTH: root -> numbered groups -> hubs -> repos -> folders/files (depth <= max_depth)
//   repo-folders-tree.md    rendered from 9_others/templates/repo-folders-tree.md.tpl
//   repo-folders-tree.html  rendered with the shared Dolphin template 9_others/templates/repos-tree.html
// Hierarchy (groups/hubs/repos) comes from gen-repos-tree.js's tree (0_repos-tree/repos-tree.json shape).
// Folder data comes from the GitHub tree API on remote HEAD (`gh api .../git/trees/HEAD?recursive=1`, no clones);
// when that fails or is truncated, a local single clone under $LOCAL_CLONES (default /home/user) by registry name
// or an old name (renamed_from) is read with `git ls-tree`; else the repo is marked "unreadable".
// PRIVATE repos: name + URL + "private" only, never a folder/file listing (contents stay private).
//   node gen-repo-folders-tree.js --fetch [--depth N]  refresh the JSON from GitHub, then render md/html
//   node gen-repo-folders-tree.js --reshape            re-skeleton the JSON from the registry, keeping each repo's
//                                                      fetched listing (no network), then render md/html
//   node gen-repo-folders-tree.js --fetch-missing      --reshape, then fetch only the public repos still unreadable
//   node gen-repo-folders-tree.js                      render md/html from the committed JSON
//   node gen-repo-folders-tree.js --check              exit 1 if md/html differ from the JSON, or the JSON
//                                                      drifts from the registry (repo set, hubs, visibility)
const fs = require('fs'), path = require('path'), cp = require('child_process');
const HERE = __dirname, OWNER = 'diegonmarcos', MAX_DEPTH = 3;
const { model, buildTree, TOP } = require('./gen-repos-tree.js');
const DIR = '1_repo-folders-tree', JSON_F = `${DIR}/repo-folders-tree.json`, MD_F = `${DIR}/repo-folders-tree.md`, HTML_F = `${DIR}/repo-folders-tree.html`;
const ROOT_LINKS = ['repo-folders-tree.json', 'repo-folders-tree.md', 'repo-folders-tree.html'];
// Dependency and build-output directories: never listed (dist/ is kept: in these repos it is committed code).
const EXCLUDE = new Set(['.git', 'node_modules', 'target', 'build', 'out', '.next', '.nuxt', '__pycache__', '.gradle',
  '.cache', '.venv', 'venv', '.deps', '.cargo-home', '.terraform', '.pytest_cache', '.mypy_cache', 'coverage', '.parcel-cache']);

function skeleton(m) { // root -> groups -> hubs -> repos, same shape as 0_repos-tree/repos-tree.json
  const reg = JSON.parse(fs.readFileSync(path.join(HERE, 'repos.json'), 'utf8')).repos;
  const old = new Map(reg.map(r => [r.url.replace(/^.*[/:]/, '').replace(/\.git$/, ''), [r.name, ...(r.renamed_from || [])]]));
  const node = o => o.kind === 'group' ? { name: o.name, kind: 'group', path: o.path, children: o.children.map(node) }
    : { name: o.name, kind: o.kind, visibility: o.visibility, url: `https://github.com/${OWNER}/${o.name}`, aliases: old.get(o.name) || [o.name],
      ...(o.children ? { children: o.children.map(node) } : {}) };
  return node(buildTree(m).tree);
}
const repos = t => [...(t.kind === 'group' ? [] : [t]), ...(t.children || []).flatMap(repos)];

function fromEntries(list, depth) { // list: [{path,type,size?,target?}] -> nested children, depth-limited
  const root = { children: [] }, dirs = new Map([['', root]]);
  list = list.filter(e => { const s = e.path.split('/'); return s.length <= depth && !s.some(x => EXCLUDE.has(x)); })
    .sort((a, b) => a.path.localeCompare(b.path));
  for (const e of list) {
    const i = e.path.lastIndexOf('/'), par = dirs.get(e.path.slice(0, i < 0 ? 0 : i)); if (!par) continue;
    const o = { name: e.path.slice(i + 1), type: e.type };
    if (e.size !== undefined) o.size = e.size; if (e.target) o.target = e.target;
    if (e.type === 'dir') { o.children = []; dirs.set(e.path, o); }
    par.children.push(o);
  }
  const sort = c => { c.sort((a, b) => ((b.type === 'dir') - (a.type === 'dir')) || a.name.localeCompare(b.name)); c.forEach(x => x.children && sort(x.children)); };
  sort(root.children); return root.children;
}
const typeOf = (mode, t) => t === 'tree' ? 'dir' : t === 'commit' ? 'submodule' : mode === '120000' ? 'symlink' : 'file';

function viaApi(name, depth) {
  const sh = a => cp.execFileSync('gh', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 });
  const t = JSON.parse(sh(['api', `repos/${OWNER}/${name}/git/trees/HEAD?recursive=1`]));
  if (t.truncated) throw new Error('truncated');
  const list = t.tree.map(e => ({ path: e.path, type: typeOf(e.mode, e.type), size: e.type === 'blob' ? e.size : undefined, sha: e.sha }));
  for (const e of list) if (e.type === 'symlink' && e.path.split('/').length <= depth) // target = blob content
    try { e.target = Buffer.from(JSON.parse(sh(['api', `repos/${OWNER}/${name}/git/blobs/${e.sha}`])).content, 'base64').toString('utf8'); } catch { }
  return { source: 'github-api', head: t.sha, entries: fromEntries(list, depth) };
}
function viaLocal(aliases, depth) {
  const base = process.env.LOCAL_CLONES || '/home/user';
  for (const a of aliases) {
    const d = path.join(base, a); if (!fs.existsSync(path.join(d, '.git'))) continue;
    const g = (...x) => cp.execFileSync('git', ['-C', d, ...x], { encoding: 'utf8', maxBuffer: 1 << 28 });
    const list = g('ls-tree', '-r', '-t', '-l', '-z', 'HEAD').split('\0').filter(Boolean).map(l => {
      const [meta, p] = l.split('\t'), [mode, t, sha, size] = meta.split(/\s+/), type = typeOf(mode, t);
      return { path: p, type, size: t === 'blob' ? +size : undefined, target: type === 'symlink' ? g('cat-file', 'blob', sha) : undefined };
    });
    return { source: 'local-clone', head: g('rev-parse', 'HEAD').trim(), entries: fromEntries(list, depth) };
  }
  return null;
}
function fetchAll(depth) {
  const tree = skeleton(model());
  for (const r of repos(tree)) {
    if (r.visibility !== 'public') { r.status = 'private'; continue; }
    let got = null; try { got = viaApi(r.name, depth); } catch { got = viaLocal(r.aliases, depth); }
    if (!got) { r.status = 'unreadable'; continue; }
    Object.assign(r, { status: 'ok' }, got); process.stderr.write(`${r.name}: ${got.source}\n`);
  }
  for (const r of repos(tree)) delete r.aliases;
  return wrap(tree, depth);
}
function wrap(tree, depth) {
  return { _doc: 'GENERATED by gen-repo-folders-tree.js --fetch (GitHub tree API on remote HEAD). Source of truth for repo-folders-tree.md/.html. DO NOT EDIT.',
    _schema: 'repo-folders-tree/v1', owner: OWNER, max_depth: depth, excluded: [...EXCLUDE].sort(), tree };
}

// ---- render -----------------------------------------------------------------------------------
const human = b => b === undefined ? '' : b < 1024 ? b + ' B' : b < 1 << 20 ? (b / 1024).toFixed(1) + ' KiB' : (b / 1048576).toFixed(1) + ' MiB';
function mdTree(j) {
  const L = [], ent = (e, d) => { L.push(`${'  '.repeat(d)}- ${e.type === 'dir' ? '📁 ' : e.type === 'submodule' ? '📦 ' : e.type === 'symlink' ? '🔗 ' : ''}\`${e.name}\`${e.type === 'symlink' && e.target ? ' → `' + e.target + '`' : ''}${e.type === 'submodule' ? ' (submodule)' : ''}${e.size !== undefined ? ' · ' + human(e.size) : ''}`); (e.children || []).forEach(c => ent(c, d + 1)); };
  const walk = (n, d) => {
    const pad = '  '.repeat(d);
    if (n.kind === 'group') L.push(`${pad}- 📁 **${n.name}/** (group)`);
    else if (n.kind === 'hub') { L.push(`${pad}- **${n.name}/** (hub${n.status === 'private' ? ', 🔒 private' : ''})`); }
    else L.push(`${pad}- **[${n.name}](https://github.com/${OWNER}/${n.name})** · ${n.status === 'ok' ? '🌐 public' : n.status === 'private' ? '🔒 private' : '⚠️ unreadable'}`);
    if (n.status === 'ok' && n.kind === 'repo') (n.entries || []).forEach(e => ent(e, d + 1));
    (n.children || []).forEach(c => walk(c, d + 1));
  };
  walk(j.tree, 0); return L.join('\n');
}
function counts(j) { const r = repos(j.tree), c = s => r.filter(x => x.status === s).length;
  return { repos: r.length, ok: c('ok'), private: c('private'), unreadable: c('unreadable') }; }
function md(j) {
  const t = fs.readFileSync(path.join(HERE, '9_others/templates/repo-folders-tree.md.tpl'), 'utf8'), c = counts(j);
  const v = { DEPTH: j.max_depth, REPOS: c.repos, OK: c.ok, PRIVATE: c.private, UNREADABLE: c.unreadable, EXCLUDED: j.excluded.map(x => '`' + x + '`').join(', '), TREE: mdTree(j) };
  return t.replace(/\{\{(\w+)\}\}/g, (_, k) => String(v[k]));
}
function html(j) {
  const tpl = fs.readFileSync(path.join(HERE, '9_others/templates/repos-tree.html'), 'utf8'), N = [], VIS = { public: '🌐', private: '🔒' };
  const add = (o) => { N.push(o); return o.id; };
  const ent = (e, par, repo, p) => {
    const id = par + '/' + e.name, isDir = e.type === 'dir';
    add({ id, name: id, label: e.name, parent: par, hub: isDir, url: `https://github.com/${OWNER}/${repo}/${isDir ? 'tree' : 'blob'}/HEAD/${p}${e.name}`,
      project: e.type === 'symlink' && e.target ? 'symlink → ' + e.target : e.type, family: human(e.size), field: '', developer: repo, visibility: 'public', vis_icon: VIS.public });
    (e.children || []).forEach(c => ent(c, id, repo, p + e.name + '/'));
  };
  const walk = (n, par) => {
    if (n.kind === 'group') { const gid = 'group:' + n.path;
      add({ id: gid, name: gid, label: n.name, parent: par, hub: true, url: '', project: 'group', family: '', field: '', developer: '', visibility: 'public', vis_icon: '' });
      (n.children || []).forEach(c => walk(c, gid)); return; }
    const id = n.name, isRepo = n.kind === 'repo';
    add({ id, name: id, parent: par, hub: n.kind === 'hub' || (isRepo && n.status === 'ok'), url: `https://github.com/${OWNER}/${n.name}`,
      project: n.kind === 'hub' ? 'hub' : n.status === 'ok' ? 'repo' : 'repo (' + n.status + ')', family: '', field: '', developer: '', visibility: n.visibility, vis_icon: VIS[n.visibility] });
    if (isRepo && n.status === 'ok') (n.entries || []).forEach(e => ent(e, id, n.name, ''));
    (n.children || []).forEach(c => walk(c, id));
  };
  walk(j.tree, null);
  const data = { top: j.tree.name, noun: 'item', cols: [['name', 'Name'], ['project', 'Type'], ['family', 'Size'], ['visibility', 'Visibility'], ['developer', 'Repo']], nodes: N };
  return tpl.replace('/*__GEN__*/', 'gen-repo-folders-tree.js from repo-folders-tree.json.').replace('<title>Repos - Dolphin</title>', '<title>Repo folders - Dolphin</title>')
    .replace('/*__DATA__*/null', () => JSON.stringify(data).replace(/</g, '\\u003c'));
}
function registryDrift(j) { // the JSON must cover exactly the registry's hubs/repos with the same parents and visibility
  const want = skeleton(model()), e = [], key = n => n.kind === 'group' ? 'group:' + n.path : n.name,
    flat = t => { const m = new Map(); const w = (n, p) => { m.set(key(n), { p, k: n.kind, v: n.visibility }); (n.children || []).forEach(c => w(c, key(n))); }; w(t, null); return m; };
  const a = flat(want), b = flat(j.tree);
  for (const [k, x] of a) { const y = b.get(k); if (!y) e.push(`${k}: missing`); else if (x.p !== y.p || x.k !== y.k || x.v !== y.v) e.push(`${k}: parent/kind/visibility changed`); }
  for (const k of b.keys()) if (!a.has(k)) e.push(`${k}: not in registry`);
  return e;
}
function reshape(j) { // new skeleton from the registry, each repo keeps its fetched data (status/source/head/entries)
  const keep = new Map(repos(j.tree).map(r => [r.name, r])), t = skeleton(model());
  for (const r of repos(t)) { const o = keep.get(r.name); delete r.aliases;
    if (r.visibility !== 'public') { r.status = 'private'; continue; }
    if (o && o.status === 'ok') Object.assign(r, { status: 'ok', source: o.source, head: o.head, entries: o.entries });
    else r.status = o && o.status && o.status !== 'private' ? o.status : 'unreadable'; }
  return wrap(t, j.max_depth);
}
function fetchMissing(j) { // reshape, then fetch only the public repos that have no listing yet
  const t = reshape(j);
  for (const r of repos(t.tree)) { if (r.status !== 'unreadable') continue;
    let got = null; try { got = viaApi(r.name, t.max_depth); } catch { got = viaLocal([r.name], t.max_depth); }
    if (got) { Object.assign(r, { status: 'ok' }, got); process.stderr.write(`${r.name}: ${got.source}\n`); } }
  return t;
}
module.exports = { md, html, counts, repos, registryDrift, EXCLUDE, MAX_DEPTH, JSON_F, MD_F, HTML_F, ROOT_LINKS };

if (require.main === module) {
  const a = process.argv.slice(2), di = a.indexOf('--depth'), depth = di >= 0 ? parseInt(a[di + 1], 10) : MAX_DEPTH;
  if (!(depth >= 1)) { console.error('--depth N (N >= 1)'); process.exit(2); }
  const jp = path.join(HERE, JSON_F);
  fs.mkdirSync(path.dirname(jp), { recursive: true });
  if (a.includes('--fetch')) fs.writeFileSync(jp, JSON.stringify(fetchAll(depth), null, 1) + '\n');
  if (a.includes('--fetch-missing')) fs.writeFileSync(jp, JSON.stringify(fetchMissing(JSON.parse(fs.readFileSync(jp, 'utf8'))), null, 1) + '\n');
  else if (a.includes('--reshape')) fs.writeFileSync(jp, JSON.stringify(reshape(JSON.parse(fs.readFileSync(jp, 'utf8'))), null, 1) + '\n');
  const j = JSON.parse(fs.readFileSync(jp, 'utf8')), out = { [MD_F]: md(j), [HTML_F]: html(j) };
  if (a.includes('--check')) {
    let bad = 0;
    for (const [f, t] of Object.entries(out)) { const p = path.join(HERE, f); if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== t) { console.error(`${f}: out of date, run node gen-repo-folders-tree.js`); bad = 1; } }
    for (const x of registryDrift(j)) { console.error(`${JSON_F}: ${x} (run node gen-repo-folders-tree.js --fetch or --reshape)`); bad = 1; }
    for (const f of ROOT_LINKS) { let cur = null; try { cur = fs.readlinkSync(path.join(HERE, f)); } catch { } if (cur !== `${DIR}/${f}`) { console.error(`${f}: must be a root symlink -> ${DIR}/${f}`); bad = 1; } }
    process.exit(bad);
  }
  for (const [f, t] of Object.entries(out)) fs.writeFileSync(path.join(HERE, f), t);
  for (const f of ROOT_LINKS) { const p = path.join(HERE, f), t = `${DIR}/${f}`; let cur = null; try { cur = fs.readlinkSync(p); } catch { }
    if (cur !== t) { try { fs.unlinkSync(p); } catch { } fs.symlinkSync(t, p); } }
}
