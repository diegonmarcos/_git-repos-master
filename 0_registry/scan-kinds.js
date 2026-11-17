#!/usr/bin/env node
// scan-kinds.js - re-runnable scan that classifies every registry repo and caches its GitHub metadata, OFFLINE-READABLE:
//   A0_repos-tree/src/kinds.json    per repo { html, lfs, kind, html_by, lfs_by }   (input of render-repos-tree.js)
//   A0_repos-tree/src/gh-meta.json  per repo the `gh api repos/{o}/{r}` fields the Table view shows (description, language,
//                                   topics, visibility, stars, forks, pushed_at, updated_at, size)
// Rules (the renders never call the network; only this script does, needs `gh`):
//   lfs   root .gitattributes of the repo has `filter=lfs`, or the registry marks it `lfs: true`, or it is the LFS hub
//   html  the repo is mounted in the _front-html___ hub (html-repos.json base + repos), or it is the html hub itself
//   kind  html | lfs | code (a repo that is both counts as html in `kind`; both flags stay true)
// A repo the token cannot read keeps its previous cache entry (or {error}); the registry flag `lfs` and its visibility still apply.
//   node 0_registry/scan-kinds.js            rescan everything     node 0_registry/scan-kinds.js --check  exit 1 when kinds.json is not what the cache says
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const M = require('./registry-model.js');
const ROOT = path.resolve(__dirname, '..'), SRC = path.join(ROOT, 'A0_repos-tree/src');
const KINDS = path.join(SRC, 'kinds.json'), META = path.join(SRC, 'gh-meta.json');
const HUB_KIND = { '_front-html___': 'html', '_git-lfs____': 'lfs' };
const readJ = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
const gh = a => { try { return JSON.parse(cp.execFileSync('gh', ['api', ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 60000 })); } catch (e) { return null; } };
const pub = u => { try { return JSON.parse(cp.execFileSync('curl', ['-fsS', u], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 60000 })); } catch (e) { return null; } }; // anonymous fallback for public repos
const raw = (o, r, f) => { const j = gh([`repos/${o}/${r}/contents/${f}`]); return j && j.content ? Buffer.from(j.content, 'base64').toString('utf8') : null; };

const src = M.load(), x = M.expand(src), owner = src.owner;
const prev = readJ(KINDS, { repos: {} }), pm = readJ(META, { repos: {} });
const kinds = {}, meta = {}, FM = ['description', 'language', 'topics', 'visibility', 'stargazers_count', 'forks_count', 'pushed_at', 'updated_at', 'size', 'archived', 'html_url'];

if (process.argv.includes('--check')) { // the committed kinds.json must cover every registry repo with consistent kind
  const bad = [];
  for (const r of x.repos) { const k = prev.repos[r.github]; if (!k) { bad.push(`${r.github}: not in kinds.json (run node 0_registry/scan-kinds.js)`); continue; }
    if (k.kind !== (k.html ? 'html' : k.lfs ? 'lfs' : 'code')) bad.push(`${r.github}: kind ${k.kind} contradicts html=${k.html} lfs=${k.lfs}`); }
  bad.forEach(b => console.error(b)); process.exit(bad.length ? 1 : 0);
}

// front-html membership: the hub's own declaration (public repo)
const fh = (() => { const t = raw(owner, '_front-html___', 'html-repos.json'); if (t) return JSON.parse(t);
  try { return JSON.parse(cp.execFileSync('curl', ['-fsS', `https://raw.githubusercontent.com/${owner}/_front-html___/main/html-repos.json`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })); } catch (e) { return null; } })();
const htmlSet = fh ? new Set([...(fh.base || []).map(b => b.repo), ...(fh.repos || [])]) : null;
if (!htmlSet) console.error('scan-kinds: html-repos.json of _front-html___ unreachable; keeping the previous html flags');

let ok = 0, miss = 0;
for (const r of x.repos) {
  const n = r.github, old = prev.repos[n] || {};
  const m = gh([`repos/${owner}/${n}`]) || (r.private ? null : pub(`https://api.github.com/repos/${owner}/${n}`));
  if (m) { meta[n] = Object.fromEntries(FM.map(k => [k, m[k] ?? null])); ok++; }
  else { meta[n] = pm.repos[n] && !pm.repos[n].error ? pm.repos[n] : { error: 'unreadable with the scan token', visibility: r.visibility }; miss++; }
  const ga = m ? raw(owner, n, '.gitattributes') : null;
  const lfsScan = ga === null ? null : /filter=lfs/.test(ga);
  const lfsBy = [], htmlBy = [];
  if (lfsScan) lfsBy.push('.gitattributes filter=lfs'); else if (lfsScan === null && old.lfs_by && old.lfs_by.includes('.gitattributes filter=lfs')) lfsBy.push('.gitattributes filter=lfs');
  if (r.lfs) lfsBy.push('registry lfs:true');
  if (HUB_KIND[n] === 'lfs') lfsBy.push('LFS hub');
  if (htmlSet ? htmlSet.has(n) : (old.html_by || []).includes('_front-html___ member')) htmlBy.push('_front-html___ member');
  if (HUB_KIND[n] === 'html') htmlBy.push('html hub');
  const html = htmlBy.length > 0, lfs = lfsBy.length > 0;
  kinds[n] = { kind: html ? 'html' : lfs ? 'lfs' : 'code', html, lfs, ...(htmlBy.length ? { html_by: htmlBy } : {}), ...(lfsBy.length ? { lfs_by: lfsBy } : {}) };
}
const doc = k => `GENERATED by 0_registry/scan-kinds.js (re-runnable; needs gh). ${k} Do not hand-edit.`;
const out = { _doc: doc('Per-repo classification: html = mounted in _front-html___, lfs = root .gitattributes filter=lfs or registry lfs:true, else code.'), scanned: new Date().toISOString().slice(0, 10), repos: Object.fromEntries(Object.entries(kinds).sort(([a], [b]) => a.localeCompare(b))) };
const mo = { _doc: doc('GitHub API metadata cache for the Table view (gh api repos/{owner}/{repo}); the renders read this file, never the network.'), scanned: out.scanned, repos: Object.fromEntries(Object.entries(meta).sort(([a], [b]) => a.localeCompare(b))) };
fs.mkdirSync(SRC, { recursive: true });
fs.writeFileSync(KINDS, JSON.stringify(out, null, 1) + '\n'); fs.writeFileSync(META, JSON.stringify(mo, null, 1) + '\n');
const c = k => Object.values(kinds).filter(v => v.kind === k).length;
console.log(`scan-kinds: ${x.repos.length} repos, meta ok ${ok}, unreadable ${miss}; html ${c('html')} lfs ${c('lfs')} code ${c('code')}`);
