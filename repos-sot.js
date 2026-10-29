#!/usr/bin/env node
// repos-sot.js - the ONE guard for the repo list (#1073, #1295).
// THE ONE MASTER SOURCE is projects-repos.json (schema projects-repos.schema.json; #1301): hierarchy, repos AND each
// repo's folder tree. repos.json, repos-github.json, README.md, 0_repos-tree/*, 1_repo-folders-tree/* are rendered
// from it by the one generator gen-registry.js and must never be edited.
//
//   node repos-sot.js check                         the master is valid (schema + rules), every rendered file (repos.json,
//                                                   repos-github.json, README.md, 0_repos-tree/*, 1_repo-folders-tree/*,
//                                                   root symlinks) equals a fresh render BYTE-FOR-BYTE, the
//                                                   rendered registry is consistent and the committed symlink farm matches it
//   node repos-sot.js check <repos.json>            only the registry/farm/link checks, on that cloud-repos/v1 file
//   node repos-sot.js check-hubs [--remote]         hub/parent_hub hierarchy is sound; --remote reads each repo's
//                                                   .gitmodules via `gh api` and requires 0_hub/<hub>
//   node repos-sot.js check-subset <file> [--fix]   a project master's repos.json (cloud, ffront)
//                                                   is a consistent SUBSET of this registry;
//                                                   --fix rewrites url/private/status from it
//   node repos-sot.js check-hub-subsets [dir]       every hub clone (sibling of this repo, or in [dir]) with a repos.json:
//                                                   a consistent subset (check-subset) that lists every member the source
//                                                   gives that hub (extra cross-links allowed)
//   node repos-sot.js copy-of <file>                <file> is a byte copy of this registry
//   node repos-sot.js sync-hub-scripts [dir]        render 9_others/templates/hub-clone.sh into every hub's clone.sh
//   node repos-sot.js check-hub-scripts [dir]       fail when a hub's clone.sh differs from the rendered template
//                                                   (hubs = registry entries with parent_hub, siblings of this repo, or in [dir])
//   node repos-sot.js sync-readmes [dir] [--migrate] write each clone's _dotfiles/readme/ kit (readme-render.cjs,
//                                                   template.md.tpl, node.json, render-readme.sh) and render README.md
//                                                   (#1303); [dir] = a clone or a folder of clones (default: siblings),
//                                                   matched to the registry by origin URL. --migrate turns a hand-written
//                                                   README.md into _dotfiles/readme/readme.json when that file is missing.
//                                                   Template variant from node.json variant: hub | repo | archived
//                                                   (z-archived_*) | profile (role "profile"). Also writes the ONE shared
//                                                   CI guard .github/workflows/readme-check.yml (render-readme.sh --check)
//   node repos-sot.js check-readmes [dir]           fail when a kit file, readme-check.yml or README.md differs from a fresh render
//
// Exit 0 = ok, 1 = drift (every difference printed). No dependencies: node only.
'use strict';
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const SOT = path.join(HERE, 'repos.json');
const STATUSES = new Set(['pending_creation']);

const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const errs = [];
const bad = m => errs.push(m);
const done = (label) => {
  if (errs.length) { console.error(`${label}: ${errs.length} problem(s)`); errs.forEach(e => console.error('  - ' + e)); process.exit(1); }
  console.log(`${label}: ok`);
};

function checkRegistry(reg) {
  if (reg._schema !== 'cloud-repos/v1') bad(`_schema is ${reg._schema}, expected cloud-repos/v1`);
  const seen = new Set();
  const renamedFrom = new Set((reg.renames || []).map(r => r.from));
  for (const r of reg.repos) {
    if (seen.has(r.name)) bad(`duplicate repo ${r.name}`);
    seen.add(r.name);
    if (!r.url) bad(`${r.name}: no url`);
    if (r.status && !STATUSES.has(r.status)) bad(`${r.name}: unknown status ${r.status}`);
    if (renamedFrom.has(r.name)) bad(`${r.name} is the OLD name in renames[]; the entry must use the new name`);
    for (const o of r.renamed_from || []) if (seen.has(o) && o !== r.name) bad(`${r.name}.renamed_from ${o} is also a live entry`);
    for (const p of r.parts || []) if (!p.name || !p.path) bad(`${r.name}: part without name/path`);
  }
  for (const rn of reg.renames || []) {
    if (!rn.from || !rn.to) bad('renames[] entry without from/to');
    if (rn.kind === 'repo' && !reg.repos.some(r => (r.renamed_from || []).includes(rn.from)))
      bad(`renames[] ${rn.from}->${rn.to} is kind repo but no entry has renamed_from ${rn.from}`);
  }
  const gh = u => u.replace(/^.*[/:]/, '').replace(/\.git$/, '');
  const registered = new Set(reg.repos.map(r => gh(r.url)));
  for (const u of reg.unregistered_ok || []) if (registered.has(u.name)) bad(`unregistered_ok ${u.name} is registered`);
  // Owner rule: a hub (name ends in -___) is ALWAYS public.
  for (const r of reg.repos) if (/-___$/.test(r.name) && r.private !== false) bad(`${r.name}: hub must be public (owner rule "Hub always public"), private is ${r.private}`);
  // Owner rule: 42 is a school, not a project; every d_lecole repo carries school "42".
  for (const r of reg.repos) if ((r.group === 'd_lecole') !== (r.school === '42')) bad(`${r.name}: school must be "42" exactly on d_lecole repos (is ${JSON.stringify(r.school)})`);
  for (const f of reg.fleet_files || []) if (!f.requires) bad(`fleet_files ${f.from}: no requires`);
}

// #1291 link folder: `farm` (numbered hub folders); `group` is a legacy family key and places nothing.
// #1295 top farm folders are <code>.<Name> after their node in projects-repos.json (1.1.Cloudy, 2.CG, 8.Archived, ...)
const TOP_FARM = /^\d+(\.\d+)*\.[A-Za-z][A-Za-z0-9-]*$/, ARCHIVED = /^\d+(\.\d+)*\.Archived$/, OTHERS = /^\d+(\.\d+)*\.Others$/;
const linkRel = r => `${r.farm ? r.farm + '/' : ''}${r.name}`;
const linkTarget = r => '../'.repeat(r.farm ? r.farm.split('/').length + 1 : 1) + (r.path || r.name);
function checkFarms(reg) {
  const by = new Map(reg.repos.map(r => [r.name, r])), tops = Object.keys(reg.farms || {});
  if (!tops.length) bad('no farms{} declared');
  for (const t of tops) if (!TOP_FARM.test(t)) bad(`farms ${t}: not <code>.<Name>`);
  for (const r of reg.repos) {
    if (!r.farm) { bad(`${r.name}: no farm`); continue; }
    const seg = r.farm.split('/');
    if (!tops.includes(seg[0])) bad(`${r.name}: farm ${r.farm} top folder not in farms{}`);
    if (seg.some(x => !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(x))) bad(`${r.name}: farm ${r.farm} has a bad segment`);
    const up = r.parent_hub || r.hub;
    if (r.name.startsWith('z-archived_') && !ARCHIVED.test(seg[0])) bad(`${r.name}: z-archived_* must be in the Archived farm folder`);
    if (OTHERS.test(seg[0]) && up) bad(`${r.name}: Others repos have no hub (has ${up})`);
    if (!up || up === TOP) { if (seg.length !== 1) bad(`${r.name}: top-level farm must be one folder, is ${r.farm}`); continue; }
    const h = by.get(up); if (!h || !h.farm) continue;
    const ok = r.farm === h.farm || (r.farm.startsWith(h.farm + '/') && seg.length === h.farm.split('/').length + 1);
    if (!ok) bad(`${r.name}: farm ${r.farm} is not ${h.farm} or one folder below it (hub ${up})`);
  }
}

function checkLinks(reg) {
  // A live entry has its committed link; a pending entry has none; no link is unregistered.
  const want = new Map();
  for (const r of reg.repos) want.set(linkRel(r), r);
  for (const [rel, r] of want) {
    const p = path.join(HERE, rel);
    let isLink = false;
    try { isLink = fs.lstatSync(p).isSymbolicLink(); } catch (_) { /* absent */ }
    if (r.status === 'pending_creation') { if (isLink) bad(`${rel}: pending_creation entry has a committed link`); continue; }
    if (!isLink) { bad(`${rel}: registered but no committed link (run ./clone.sh --relink)`); continue; }
    const target = fs.readlinkSync(p), expect = linkTarget(r);
    if (target !== expect) bad(`${rel}: link is ${target}, expected ${expect}`);
  }
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
    const p = path.join(d, e.name);
    return e.isSymbolicLink() ? [path.relative(HERE, p).split(path.sep).join('/')] : e.isDirectory() ? walk(p) : [];
  });
  for (const t of Object.keys(reg.farms || {})) {
    const d = path.join(HERE, t);
    if (fs.existsSync(d)) for (const rel of walk(d)) if (!want.has(rel)) bad(`${rel}: link not in the registry`);
  }
  for (const g of Object.keys(reg.groups || {})) if (fs.existsSync(path.join(HERE, g))) bad(`${g}/: legacy group folder still present (links live under farms since #1291)`);
}

function checkSubset(file, fix) {
  const n0 = errs.length;
  const reg = read(SOT), sub = read(file);
  const by = new Map(reg.repos.map(r => [r.name, r]));
  const old = new Set((reg.renames || []).map(r => r.from));
  let changed = false;
  for (const r of sub.repos || []) {
    const s = by.get(r.name);
    if (old.has(r.name)) bad(`${r.name}: old name of a rename (see renames[]) in ${file}`);
    if (!s) {
      const now = reg.repos.find(x => (x.renamed_from || []).includes(r.name));
      if (now) {
        bad(`${r.name}: renamed to ${now.name} in the registry (renamed_from)`);
        if (fix) { r.name = now.name; r.url = now.url; changed = true; }
      } else bad(`${r.name}: not in the registry`);
      continue;
    }
    for (const k of ['url', 'private', ...('farm' in r ? ['farm'] : [])]) {
      if (JSON.stringify(r[k]) !== JSON.stringify(s[k])) {
        bad(`${r.name}.${k}: ${JSON.stringify(r[k])} but registry says ${JSON.stringify(s[k])}`);
        if (fix) { r[k] = s[k]; changed = true; }
      }
    }
    if ((r.status || '') !== (s.status || '')) {
      bad(`${r.name}.status: ${JSON.stringify(r.status)} but registry says ${JSON.stringify(s.status)}`);
      if (fix) { if (s.status) r.status = s.status; else delete r.status; changed = true; }
    }
  }
  if (fix && changed) { fs.writeFileSync(file, JSON.stringify(sub, null, 2) + '\n'); console.log(`fixed ${file}`); errs.length = n0; }
}

// ---- hub hierarchy (#3ff19f58): `hub` on members, `parent_hub` on hubs, submodule 0_hub/<hub> ----
const TOP = '_git-repos-master';
const ghName = u => u.replace(/^.*[/:]/, '').replace(/\.git$/, '');
function hubPlan(reg) {
  // returns Map repoName -> {up: hubName|null, skip: reason|null}; reports registry-level problems
  const by = new Map(reg.repos.map(r => [r.name, r]));
  const plan = new Map();
  const isPrivate = n => n === TOP ? false : !!(by.get(n) || {}).private;
  for (const r of reg.repos) {
    const up = r.parent_hub || r.hub || null;
    if (!up && OTHERS.test((r.farm || '').split('/')[0])) continue; // #1291 hubless by rule
    if (r.parent_hub && r.hub) bad(`${r.name}: both hub and parent_hub`);
    if (!up) { bad(`${r.name}: no hub/parent_hub`); continue; }
    if (up !== TOP && !by.has(up)) bad(`${r.name}: hub ${up} is not a registry entry`);
    if (r.hub && !(by.get(r.hub) || {}).parent_hub) bad(`${r.name}: hub ${r.hub} is not a hub (no parent_hub)`);
    const skip = (isPrivate(up) && !r.private) ? `public repo, private hub ${up}` : null;
    plan.set(r.name, { up, skip });
  }
  for (const [n] of plan) { // cycles
    const seen = new Set([n]); let c = (by.get(n) || {}).parent_hub;
    while (c && c !== TOP) { if (seen.has(c)) { bad(`${n}: hub cycle via ${c}`); break; } seen.add(c); c = (by.get(c) || {}).parent_hub; }
  }
  return plan;
}
function checkHubs(reg, remote) {
  const plan = hubPlan(reg);
  const by = new Map(reg.repos.map(r => [r.name, r]));
  const skipped = [];
  for (const [n, p] of plan) if (p.skip) skipped.push(`${n}: ${p.skip}`);
  if (skipped.length) console.log('hub submodule skipped (rule: public never gets a private hub):\n  ' + skipped.join('\n  '));
  if (!remote) return;
  const cp = require('child_process');
  for (const [n, p] of plan) {
    const repo = ghName(by.get(n).url);
    let txt = '';
    try {
      txt = cp.execFileSync('gh', ['api', `repos/diegonmarcos/${repo}/contents/.gitmodules`, '--jq', '.content'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      txt = Buffer.from(txt.trim(), 'base64').toString('utf8');
    } catch (_) { /* no .gitmodules */ }
    const want = `0_hub/${p.up}`;
    const has = txt.includes(`path = ${want}`) && txt.includes(`https://github.com/diegonmarcos/${p.up}.git`);
    if (p.skip) { if (txt.includes('path = 0_hub/')) bad(`${n}: has a hub submodule but ${p.skip}`); }
    else if (!has) bad(`${n}: .gitmodules lacks submodule ${want}`);
    const others = [...txt.matchAll(/path = 0_hub\/(\S+)/g)].map(m => m[1]).filter(h => h !== p.up);
    if (others.length) bad(`${n}: unexpected hub submodule(s) ${others.join(', ')}`);
  }
}

// ---- hub clone.sh: rendered from ONE template; hubs are registry entries with parent_hub ----
const HUB_BASE = { 'lecole-42-___': 'cloud-shared-store/git' }; // default store dir is "git" (under $HOME)
function hubScripts(dir) {
  const reg = read(SOT), tpl = fs.readFileSync(path.join(HERE, '9_others/templates/hub-clone.sh'), 'utf8');
  const root = dir || path.join(HERE, '..');
  return reg.repos.filter(r => r.parent_hub && !r.name.startsWith('z-archived_')).map(r => ({
    file: path.join(root, r.name, 'clone.sh'),
    text: tpl.replace(/@@BASE_DIR@@/g, HUB_BASE[r.name] || 'git').replace(/@@HUB@@/g, r.name),
  })).filter(h => fs.existsSync(path.dirname(h.file)));
}

// ---- README kits (#1303): every repo's README.md = shared template + its registry node + its readme.json ----
function readmeClones(dirArg) {
  const cp = require('child_process'), M = require('./registry-model.js'), x = M.expand(M.load());
  const alias = new Map();
  for (const r of x.repos) { alias.set(r.github.toLowerCase(), r.name); for (const o of r.renamed_from || []) if (!alias.has(o.toLowerCase())) alias.set(o.toLowerCase(), r.name); }
  const root = path.resolve(dirArg || path.join(HERE, '..'));
  const dirs = fs.existsSync(path.join(root, '.git')) ? [root]
    : fs.readdirSync(root).map(d => path.join(root, d)).filter(d => fs.existsSync(path.join(d, '.git')));
  const out = [];
  for (const d of dirs) {
    let url = ''; try { url = cp.execFileSync('git', ['-C', d, 'remote', 'get-url', 'origin'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch (_) { continue; }
    const m = url.match(/github\.com[:/]diegonmarcos\/([^/]+?)(\.git)?\/?$/); if (!m) continue;
    const name = alias.get(m[1].toLowerCase());
    if (!name || name === TOP) continue;
    out.push({ dir: d, name });
  }
  return { x, out };
}
function readmeKits(dirArg, write, migrate) {
  const RR = require('./readme-render.js'), { x, out } = readmeClones(dirArg);
  const T = f => fs.readFileSync(path.join(HERE, '9_others/templates/readme', f), 'utf8');
  for (const { dir, name } of out) {
    const node = RR.nodeData(x, name), kit = path.join(dir, RR.KIT);
    const files = {
      'readme-render.cjs': fs.readFileSync(path.join(HERE, 'readme-render.js'), 'utf8'),
      'template.md.tpl': T(`${node.variant}.md.tpl`),
      'node.json': JSON.stringify(node, null, 2) + '\n',
      'render-readme.sh': T('render-readme.sh'),
    };
    const rj = path.join(kit, 'readme.json');
    if (!fs.existsSync(rj)) {
      if (!write || !migrate) { bad(`${name} (${dir}): no ${RR.KIT}/readme.json (run sync-readmes --migrate once)`); continue; }
      const old = fs.existsSync(path.join(dir, 'README.md')) ? fs.readFileSync(path.join(dir, 'README.md'), 'utf8') : '';
      const { readme, dropped } = RR.migrate(old, node.kind);
      fs.mkdirSync(kit, { recursive: true });
      fs.writeFileSync(rj, JSON.stringify(readme, null, 2) + '\n');
      console.log(`migrated ${name}: ${(readme.sections || []).length} section(s)${dropped.length ? ', template owns ' + dropped.join(', ') : ''}`);
    }
    for (const [f, text] of Object.entries(files)) {
      const p = path.join(kit, f), cur = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
      if (cur === text) continue;
      if (write) { fs.mkdirSync(kit, { recursive: true }); fs.writeFileSync(p, text); if (f.endsWith('.sh')) fs.chmodSync(p, 0o755); console.log(`wrote ${p}`); }
      else bad(`${p} differs from the render (run node repos-sot.js sync-readmes)`);
    }
    if (write) fs.chmodSync(path.join(kit, 'render-readme.sh'), 0o755);
    { // the ONE shared CI drift guard, emitted by this same command into every kit repo
      const wf = path.join(dir, '.github/workflows/readme-check.yml'), text = T('readme-check.yml');
      const cur = fs.existsSync(wf) ? fs.readFileSync(wf, 'utf8') : null;
      if (cur !== text) {
        if (write) { fs.mkdirSync(path.dirname(wf), { recursive: true }); fs.writeFileSync(wf, text); console.log(`wrote ${wf}`); }
        else bad(`${wf} differs from 9_others/templates/readme/readme-check.yml (run node repos-sot.js sync-readmes)`);
      }
    }
    const stale = path.join(kit, 'readme-render.js'); // vendored as .cjs so "type": "module" repos run it too
    if (fs.existsSync(stale)) { if (write) { fs.unlinkSync(stale); console.log(`removed ${stale}`); } else bad(`${stale} is stale (vendored as readme-render.cjs)`); }
    const want = RR.render(node, JSON.parse(fs.readFileSync(rj, 'utf8')), files['template.md.tpl']), rp = path.join(dir, 'README.md');
    const have = fs.existsSync(rp) ? fs.readFileSync(rp, 'utf8') : null;
    if (have === want) continue;
    if (write) { fs.writeFileSync(rp, want); console.log(`wrote ${rp}`); }
    else bad(`${rp} differs from the render (edit ${RR.KIT}/readme.json, then render)`);
  }
  return out.length;
}

const [cmd, arg, flag] = process.argv.slice(2);
if (cmd === 'check') {
  const reg = read(arg || SOT);
  checkRegistry(reg); checkFarms(reg); checkLinks(reg);
  if (!arg) // #1295/#1301 THE ONE MASTER SOURCE: valid against its schema, and EVERY rendered file (repos.json,
    // repos-github.json, README.md, 0_repos-tree/*, 1_repo-folders-tree/*) equals a fresh render byte-for-byte
    require('./gen-registry.js').problems().forEach(bad);
  done('repos.json');
} else if (cmd === 'check-hubs') {
  const reg = read(SOT); checkHubs(reg, arg === '--remote'); done('hubs' + (arg === '--remote' ? ' (remote .gitmodules)' : ''));
} else if (cmd === 'check-subset' && arg) {
  checkSubset(arg, flag === '--fix'); done(`subset ${arg}`);
} else if (cmd === 'check-hub-subsets') {
  const x = require('./registry-model.js').expand(require('./registry-model.js').load());
  const fix = arg === '--fix' || flag === '--fix', root = arg && arg !== '--fix' ? arg : path.join(HERE, '..');
  let n = 0;
  for (const h of x.repos.filter(r => r.kind === 'hub' && r.name !== TOP)) {
    const f = path.join(root, h.name, 'repos.json'); if (!fs.existsSync(f)) continue; n++;
    checkSubset(f, fix);
    const have = new Set((read(f).repos || []).map(r => r.name));
    for (const m of x.repos.filter(r => r.up === h.name)) if (!have.has(m.name) && m.status !== 'pending_creation') bad(`${h.name}/repos.json lacks member ${m.name}`);
  }
  done(`hub subsets (${n} hub clones)`);
} else if (cmd === 'copy-of' && arg) {
  if (!fs.readFileSync(arg).equals(fs.readFileSync(SOT))) bad(`${arg} differs from _git-repos-master/repos.json (run ./clone.sh --sync)`);
  done(`copy ${arg}`);
} else if (cmd === 'sync-hub-scripts' || cmd === 'check-hub-scripts') {
  const hs = hubScripts(arg);
  for (const h of hs) {
    const cur = fs.existsSync(h.file) ? fs.readFileSync(h.file, 'utf8') : null;
    if (cur === h.text) continue;
    if (cmd === 'sync-hub-scripts') { fs.writeFileSync(h.file, h.text, { mode: 0o755 }); fs.chmodSync(h.file, 0o755); console.log(`wrote ${h.file}`); }
    else bad(`${h.file} differs from the rendered 9_others/templates/hub-clone.sh (run node repos-sot.js sync-hub-scripts)`);
  }
  done(`${cmd} (${hs.length} hubs)`);
} else if (cmd === 'sync-readmes' || cmd === 'check-readmes') {
  const opts = process.argv.slice(3), migrate = opts.includes('--migrate'), dirArg = opts.find(o => !o.startsWith('--'));
  const n = readmeKits(dirArg, cmd === 'sync-readmes', migrate);
  done(`${cmd} (${n} repos)`);
} else {
  console.error('usage: repos-sot.js check [file] | check-hubs [--remote] | check-subset <file> [--fix] | check-hub-subsets [dir] [--fix] | copy-of <file> | sync-hub-scripts [dir] | check-hub-scripts [dir] | sync-readmes [dir] [--migrate] | check-readmes [dir]');
  process.exit(2);
}
