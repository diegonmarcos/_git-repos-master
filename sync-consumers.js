#!/usr/bin/env node
// sync-consumers.js - refresh every consumer copy declared in projects-repos.json (#1305).
// THE ONE PLACE: registry.consumers[].copies lists each file a consumer repo holds that is rendered here
// (byte copies, their sha256 pins, and consumer-side derive commands such as cloudy-u-android's
// libs/repos/sync.sh --refresh-outline). This script applies them to every consumer clone found NEXT TO this
// repo (directory = registry name, GitHub name or a former name). It never commits or pushes: the consumer's
// commit stays an explicit, per-path step.
//
//   node sync-consumers.js           write the copies + pins, run the derive steps (gen-registry.js calls this)
//   node sync-consumers.js --check   exit 1 when a present clone holds a stale copy, pin or derived file
//
// A consumer without a clone, or whose derive step cannot run here, prints `consumer not refreshed: ...` and is
// skipped: never a failure of the render.
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { spawnSync } = require('child_process');
const M = require('./registry-model.js');
const HERE = __dirname;

const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);

/** Clone dir of a consumer: a sibling of this repo named by registry name, GitHub name or a former name. */
function findClone(repo, x) {
  const r = x.repos.find(e => e.name === repo);
  const names = [...new Set([repo, r && r.github, ...((r && r.renamed_from) || [])].filter(Boolean))];
  const base = path.resolve(HERE, process.env.CONSUMERS_BASE || '..');
  for (const n of names) {
    const d = path.join(base, n);
    if (fs.existsSync(path.join(d, '.git'))) return d;
  }
  return null;
}

/** Replace the pinned sha256 at `pin.path` in the consumer's JSON file, keeping its formatting. */
function pinText(file, pin, sha) {
  const text = fs.readFileSync(file, 'utf8'), old = get(JSON.parse(text), pin.path);
  if (!/^[0-9a-f]{64}$/.test(String(old))) throw new Error(`${pin.file}: ${pin.path} is not a sha256`);
  if (old === sha) return text;
  const n = text.split(`"${old}"`).length - 1;
  if (n !== 1) throw new Error(`${pin.file}: pinned sha256 appears ${n} times, cannot rewrite it safely`);
  return text.replace(`"${old}"`, `"${sha}"`);
}

const argv = (a, clone) => a.map(s => (s.startsWith('@') ? path.join(HERE, s.slice(1)) : s));
function run(cmd, clone) {
  const [bin, ...args] = argv(cmd, clone);
  const r = spawnSync(bin, args, { cwd: clone, encoding: 'utf8' });
  return { ok: r.status === 0, out: `${r.stdout || ''}${r.stderr || ''}${r.error ? r.error.message : ''}`.trim() };
}

function syncOne(c, x, check) {
  const clone = findClone(c.repo, x), problems = [], notes = [];
  if (!clone) return { notes: [`consumer not refreshed: ${c.repo} (no clone next to _git-repos-master; its copies refresh when it is cloned there or via its own sync)`], problems };
  const rel = f => path.relative(HERE, f);
  for (const step of c.copies) {
    if (step.from) {
      const body = fs.readFileSync(path.join(HERE, step.from));
      for (const t of step.to) {
        const fp = path.join(clone, t), same = fs.existsSync(fp) && fs.readFileSync(fp).equals(body);
        if (same) continue;
        if (check) problems.push(`${c.repo}: ${t} differs from ${step.from}`);
        else { fs.mkdirSync(path.dirname(fp), { recursive: true }); fs.writeFileSync(fp, body); notes.push(`  ${c.repo}: wrote ${t}`); }
      }
      if (step.pin) {
        const fp = path.join(clone, step.pin.file), cur = fs.readFileSync(fp, 'utf8'), want = pinText(fp, step.pin, sha256(body));
        if (cur === want) continue;
        if (check) problems.push(`${c.repo}: ${step.pin.file} ${step.pin.path} does not pin ${step.from}`);
        else { fs.writeFileSync(fp, want); notes.push(`  ${c.repo}: re-pinned ${step.pin.file} ${step.pin.path}`); }
      }
    } else if (step.run) {
      const r = run(check ? step.check : step.run, clone);
      if (r.ok) { if (!check) notes.push(`  ${c.repo}: ran ${step.run.join(' ')}`); continue; }
      const msg = `${c.repo}: ${(check ? step.check : step.run).join(' ')} failed${r.out ? ': ' + r.out.split('\n').slice(-3).join(' | ') : ''}`;
      if (check) problems.push(msg); else notes.push(`consumer not refreshed: ${msg} (writes ${step.writes.join(', ')})`);
    }
  }
  if (!check) notes.push(`  ${c.repo}: consumer copies current in ${rel(clone)}`);
  return { notes, problems };
}

function syncAll(check = false) {
  const src = M.load(), x = M.expand(src), out = { notes: [], problems: [] };
  for (const c of src.registry.consumers || []) {
    if (!c.copies || !c.copies.length) continue;
    try { const r = syncOne(c, x, check); out.notes.push(...r.notes); out.problems.push(...r.problems); }
    catch (e) { (check ? out.problems : out.notes).push(`consumer not refreshed: ${c.repo}: ${e.message}`); }
  }
  return out;
}
module.exports = { syncAll, findClone };

if (require.main === module) {
  const check = process.argv[2] === '--check', r = syncAll(check);
  r.notes.forEach(n => console.log(n));
  r.problems.forEach(p => console.error(p));
  process.exit(check && r.problems.length ? 1 : 0);
}
