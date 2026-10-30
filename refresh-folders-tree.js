#!/usr/bin/env node
// refresh-folders-tree.js - re-fetches repo folder trees INTO the master projects-repos.json (#1291, #1301).
// It writes only the `tree` fields of public repo nodes (root, hubs, repos) and nothing else, then runs gen-registry.js
// so 0_repo-folders-tree/* (and every other render) follow. There is no separate folder JSON to edit.
// Data: the GitHub tree API on remote HEAD (`gh api .../git/trees/HEAD?recursive=1`, no clones); when that fails or
// is truncated, a local single clone under $LOCAL_CLONES (default /home/user) found by GitHub name, registry name or an
// old name (renamed_from) is read with `git ls-tree`; else the repo keeps no tree and renders as "unreadable".
// PRIVATE repos: never fetched, never stored (contents stay private). Depth and excluded names: `folders` in the master.
//   node refresh-folders-tree.js                 refresh every public repo
//   node refresh-folders-tree.js --missing       only the public repos that have no tree yet
//   node refresh-folders-tree.js <name>...       only these repos (GitHub or registry names)
//   --depth N                                    also set folders.max_depth to N first
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const M = require('./registry-model.js');
const OWNER = 'diegonmarcos';

function fromEntries(list, depth, EXCLUDE) { // list: [{path,type,size?,target?}] -> nested children, depth-limited
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

function viaApi(name, depth, EX) {
  const sh = a => cp.execFileSync('gh', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 });
  const t = JSON.parse(sh(['api', `repos/${OWNER}/${name}/git/trees/HEAD?recursive=1`]));
  if (t.truncated) throw new Error('truncated');
  const list = t.tree.map(e => ({ path: e.path, type: typeOf(e.mode, e.type), size: e.type === 'blob' ? e.size : undefined, sha: e.sha }));
  for (const e of list) if (e.type === 'symlink' && e.path.split('/').length <= depth) // target = blob content
    try { e.target = Buffer.from(JSON.parse(sh(['api', `repos/${OWNER}/${name}/git/blobs/${e.sha}`])).content, 'base64').toString('utf8'); } catch { }
  return { source: 'github-api', head: t.sha, entries: fromEntries(list, depth, EX) };
}
function viaLocal(aliases, depth, EX) {
  const base = process.env.LOCAL_CLONES || '/home/user';
  for (const a of aliases) {
    const d = path.join(base, a); if (!fs.existsSync(path.join(d, '.git'))) continue;
    const g = (...x) => cp.execFileSync('git', ['-C', d, ...x], { encoding: 'utf8', maxBuffer: 1 << 28 });
    const list = g('ls-tree', '-r', '-t', '-l', '-z', 'HEAD').split('\0').filter(Boolean).map(l => {
      const [meta, p] = l.split('\t'), [mode, t, sha, size] = meta.split(/\s+/), type = typeOf(mode, t);
      return { path: p, type, size: t === 'blob' ? +size : undefined, target: type === 'symlink' ? g('cat-file', 'blob', sha) : undefined };
    });
    return { source: 'local-clone', head: g('rev-parse', 'HEAD').trim(), entries: fromEntries(list, depth, EX) };
  }
  return null;
}

// the repo nodes of the master (root, every hub, every repo), as live references into src
function repoNodes(src) {
  const out = [src.root];
  const walk = n => { if (n.hub) out.push(n.hub); for (const c of n.children || []) c.kind === 'repo' ? out.push(c) : walk(c); };
  src.tree.forEach(walk);
  return out;
}

if (require.main === module) {
  const a = process.argv.slice(2), di = a.indexOf('--depth');
  const src = M.load();
  if (di >= 0) { const d = parseInt(a[di + 1], 10); if (!(d >= 1)) { console.error('--depth N (N >= 1)'); process.exit(2); } src.folders.max_depth = d; a.splice(di, 2); }
  const missing = a.includes('--missing'), names = new Set(a.filter(x => !x.startsWith('--')));
  const depth = src.folders.max_depth, EX = new Set(src.folders.excluded);
  let n = 0;
  for (const r of repoNodes(src)) {
    const gh = r.github || r.name;
    if (names.size && !names.has(gh) && !names.has(r.name)) continue;
    if (r.visibility !== 'public') { delete r.tree; continue; }
    if (missing && r.tree) continue;
    let got = null; try { got = viaApi(gh, depth, EX); } catch { got = viaLocal([...new Set([gh, r.name, ...(r.renamed_from || [])])], depth, EX); }
    if (!got) { process.stderr.write(`${gh}: unreadable (kept ${r.tree ? 'the previous tree' : 'no tree'})\n`); continue; }
    r.tree = got; n++; process.stderr.write(`${gh}: ${got.source}\n`);
  }
  fs.writeFileSync(M.SRC, M.serialize(src));
  console.log(`refresh-folders-tree.js: ${n} tree(s) written into projects-repos.json`);
  cp.execFileSync('node', [path.join(__dirname, 'gen-registry.js')], { stdio: 'inherit' });
}
module.exports = { fromEntries, repoNodes };
