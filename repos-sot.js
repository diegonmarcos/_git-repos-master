#!/usr/bin/env node
// repos-sot.js - the ONE guard for the repo list (#1073).
//
//   node repos-sot.js check [repos.json]            registry is consistent and the committed
//                                                   symlink farm matches it
//   node repos-sot.js check-hubs [--remote]         hub/parent_hub hierarchy is sound; --remote reads each repo's
//                                                   .gitmodules via `gh api` and requires 0_hub/<hub>
//   node repos-sot.js check-subset <file> [--fix]   a project master's repos.json (cloud, ffront)
//                                                   is a consistent SUBSET of this registry;
//                                                   --fix rewrites url/private/status from it
//   node repos-sot.js copy-of <file>                <file> is a byte copy of this registry
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

function checkLinks(reg) {
  // A live entry has its committed link; a pending entry has none; no link is unregistered.
  const want = new Map();
  for (const r of reg.repos) want.set(`${r.group ? r.group + '/' : ''}${r.name}`, r);
  for (const [rel, r] of want) {
    const p = path.join(HERE, rel);
    let isLink = false;
    try { isLink = fs.lstatSync(p).isSymbolicLink(); } catch (_) { /* absent */ }
    if (r.status === 'pending_creation') { if (isLink) bad(`${rel}: pending_creation entry has a committed link`); continue; }
    if (!isLink) { bad(`${rel}: registered but no committed link (run ./clone.sh --relink)`); continue; }
    const target = fs.readlinkSync(p);
    const expect = (r.group ? '../../' : '../') + (r.path || r.name);
    if (target !== expect) bad(`${rel}: link is ${target}, expected ${expect}`);
  }
  for (const g of Object.keys(reg.groups || {})) {
    const d = path.join(HERE, g);
    if (!fs.existsSync(d)) continue;
    for (const e of fs.readdirSync(d)) {
      if (!want.has(`${g}/${e}`) && fs.lstatSync(path.join(d, e)).isSymbolicLink()) bad(`${g}/${e}: link not in the registry`);
    }
  }
}

function checkSubset(file, fix) {
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
    for (const k of ['url', 'private']) {
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
  if (fix && changed) { fs.writeFileSync(file, JSON.stringify(sub, null, 2) + '\n'); console.log(`fixed ${file}`); errs.length = 0; }
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
    if (r.name.startsWith('z-archived_')) continue;
    const up = r.parent_hub || r.hub || null;
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

const [cmd, arg, flag] = process.argv.slice(2);
if (cmd === 'check') {
  const reg = read(arg || SOT);
  checkRegistry(reg); checkLinks(reg);
  if (!arg) { // also guard the GitHub snapshot used for the README
    const gp = path.join(HERE, 'repos-github.json');
    if (fs.existsSync(gp)) for (const r of read(gp).repos) if (['CG', '42'].includes(r.project)) bad(`repos-github.json ${r.name}: ${r.project} is a field/school, not a project`); else if (/-___$/.test(r.name) && r.visibility !== 'public') bad(`repos-github.json ${r.name}: hub must be public, visibility is ${r.visibility}`);
  }
  done('repos.json');
} else if (cmd === 'check-hubs') {
  const reg = read(SOT); checkHubs(reg, arg === '--remote'); done('hubs' + (arg === '--remote' ? ' (remote .gitmodules)' : ''));
} else if (cmd === 'check-subset' && arg) {
  checkSubset(arg, flag === '--fix'); done(`subset ${arg}`);
} else if (cmd === 'copy-of' && arg) {
  if (!fs.readFileSync(arg).equals(fs.readFileSync(SOT))) bad(`${arg} differs from _git-repos-master/repos.json (run ./clone.sh --sync)`);
  done(`copy ${arg}`);
} else {
  console.error('usage: repos-sot.js check [file] | check-hubs [--remote] | check-subset <file> [--fix] | copy-of <file>');
  process.exit(2);
}
