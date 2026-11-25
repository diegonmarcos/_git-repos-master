#!/usr/bin/env node
// Expands permissions-fleet.json (the declared fleet operator permissions) into
// permissions.allow of settings.project.json. Existing allow entries are kept;
// generated entries are added once (deduplicated, stable order). Run after
// editing permissions-fleet.json, then regenerate the mirrors with the dotfiles
// engine. `--check` exits 1 when settings.project.json is missing any expanded rule.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const declPath = join(here, 'permissions-fleet.json');
const settingsPath = join(here, 'settings.project.json');

export function expand(decl) {
  const rules = [];
  for (const [cmd, subs] of Object.entries(decl.commands || {})) {
    if (!subs.length) { rules.push(`Bash(${cmd} *)`); continue; }
    for (const sub of subs) {
      rules.push(`Bash(${cmd} ${sub})`);
      rules.push(`Bash(${cmd} ${sub} *)`);
    }
  }
  for (const t of decl.tools || []) rules.push(t);
  // Declared matrix (owner contract 2026-11-25): every template expanded over every VM and repo.
  const m = decl.matrix;
  if (m) {
    const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : m[k] ?? `{${k}}`));
    for (const vm of m.vms || []) for (const t of m.vm_templates || []) rules.push(`Bash(${fill(t, { vm })})`);
    for (const repo of m.repos || []) for (const t of m.repo_templates || []) rules.push(`Bash(${fill(t, { repo })})`);
    // Stop list: every action that was stopped, 3 forms each, each bare and with a trailing wildcard.
    for (const a of (m.stopped && m.stopped.actions) || []) {
      const over = a.scope === 'vm' ? (m.vms || []).map((vm) => ({ vm })) : a.scope === 'repo' ? (m.repos || []).map((repo) => ({ repo })) : [{}];
      for (const vars of over) for (const f of a.forms) { const c = fill(f, vars); rules.push(`Bash(${c})`); rules.push(`Bash(${c} *)`); }
    }
  }
  return [...new Set(rules)];
}

const decl = JSON.parse(readFileSync(declPath, 'utf8'));
const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
const allow = settings.permissions.allow;
const wanted = expand(decl);
const missing = wanted.filter((r) => !allow.includes(r));

if (process.argv.includes('--check')) {
  if (missing.length) { console.error(`missing ${missing.length} declared rules, e.g. ${missing[0]}`); process.exit(1); }
  console.log(`ok: all ${wanted.length} declared rules present`);
  process.exit(0);
}
settings.permissions.allow = [...allow, ...missing];
writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
console.log(`added ${missing.length} rules (${wanted.length} declared, ${settings.permissions.allow.length} total allow)`);
