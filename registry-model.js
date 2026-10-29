// registry-model.js - reads THE ONE SOURCE repos.v3.json (#1295) and expands it. No dependencies: node only.
//
//   load([file])       parsed source
//   validate(src)      [] or a list of problems: JSON Schema (repos.v3.schema.json, checked by the small validator below)
//                      plus the rules a schema cannot say: positional codes, unique names, farm prefixes, hub placement
//   expand(src)        { nodes, repos, byName, root }: every non-repo node with its path, and every repo (root first,
//                      then tree order) with the DERIVED fields: farm, up (hub or parent_hub), developer, area/project/
//                      subcategory/family names and codes, github name, https url, ssh url, private
//
// Derivation rules (never stored in the source):
//   farm       nearest `farm` up the tree (a hub's own node counts)
//   up         member: hub of the nearest node above it that has one (its own family/project/... first);
//              hub: hub of the nearest node strictly above the node it is the hub of; none -> _git-repos-master;
//              a repo with no hub anywhere up (area 7 Others) has none
//   developer  nearest `developer` up the tree
'use strict';
const fs = require('fs'), path = require('path');
const HERE = __dirname, SRC = path.join(HERE, 'repos.v3.json'), SCHEMA = path.join(HERE, 'repos.v3.schema.json');
const TOP = '_git-repos-master';

const load = (f = SRC) => JSON.parse(fs.readFileSync(f, 'utf8'));

// ---- small JSON Schema validator: the keywords repos.v3.schema.json uses, nothing more -------------------------
function schemaErrors(schema, data) {
  const errs = [], root = schema;
  const resolve = ref => ref.replace(/^#\//, '').split('/').reduce((o, k) => o[k], root);
  const type = v => v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v;
  const KNOWN = new Set(['$schema', '$id', '$ref', '$defs', 'title', 'description', 'type', 'required', 'properties', 'additionalProperties',
    'patternProperties', 'items', 'enum', 'const', 'pattern', 'minLength', 'minItems', 'uniqueItems', 'oneOf', 'allOf', 'if', 'then']);
  function v(s, d, p) {
    if (s === true) return true; if (s === false) { errs.push(`${p}: not allowed`); return false; }
    for (const k of Object.keys(s)) if (!KNOWN.has(k)) throw new Error(`schema keyword ${k} not supported by registry-model.js`);
    const n0 = errs.length;
    if (s.$ref) v(resolve(s.$ref), d, p);
    if (s.type) { const t = type(d), ok = [].concat(s.type).some(x => x === t || (x === 'number' && t === 'integer')); if (!ok) { errs.push(`${p}: type ${t}, expected ${s.type}`); return false; } }
    if (s.enum && !s.enum.some(x => JSON.stringify(x) === JSON.stringify(d))) errs.push(`${p}: ${JSON.stringify(d)} not in ${JSON.stringify(s.enum)}`);
    if ('const' in s && JSON.stringify(s.const) !== JSON.stringify(d)) errs.push(`${p}: must be ${JSON.stringify(s.const)}`);
    if (typeof d === 'string') {
      if (s.pattern && !new RegExp(s.pattern, 'u').test(d)) errs.push(`${p}: ${JSON.stringify(d)} does not match ${s.pattern}`);
      if (s.minLength !== undefined && [...d].length < s.minLength) errs.push(`${p}: shorter than ${s.minLength}`);
    }
    if (Array.isArray(d)) {
      if (s.minItems !== undefined && d.length < s.minItems) errs.push(`${p}: fewer than ${s.minItems} items`);
      if (s.uniqueItems && new Set(d.map(x => JSON.stringify(x))).size !== d.length) errs.push(`${p}: items not unique`);
      if (s.items) d.forEach((x, i) => v(s.items, x, `${p}[${i}]`));
    }
    if (type(d) === 'object') {
      for (const k of s.required || []) if (!(k in d)) errs.push(`${p}: missing ${k}`);
      for (const [k, x] of Object.entries(d)) {
        if (s.properties && k in s.properties) { v(s.properties[k], x, `${p}.${k}`); continue; }
        const pp = Object.entries(s.patternProperties || {}).find(([re]) => new RegExp(re, 'u').test(k));
        if (pp) { v(pp[1], x, `${p}.${k}`); continue; }
        if (s.additionalProperties !== undefined && s.additionalProperties !== true) v(s.additionalProperties, x, `${p}.${k}`);
      }
    }
    if (s.allOf) s.allOf.forEach(x => v(x, d, p));
    if (s.oneOf) { const ok = s.oneOf.filter(x => { const e = errs.length; v(x, d, p); const pass = errs.length === e; errs.length = e; return pass; }).length;
      if (ok !== 1) errs.push(`${p}: matches ${ok} of oneOf (needs exactly 1)`); }
    if (s.if) { const e = errs.length; v(s.if, d, p); const pass = errs.length === e; errs.length = e; if (pass && s.then) v(s.then, d, p); }
    return errs.length === n0;
  }
  v(schema, data, '$');
  return errs;
}

// ---- expansion ------------------------------------------------------------------------------------------------------
function expand(src) {
  const nodes = [], repos = [], owner = src.owner;
  const R = src.root;
  const rootRec = finish({ ...R, github: R.name, up: null, farm: '', path: [], area: R.area, project: R.project, subcategory: '', family: R.family,
    area_code: '0', project_code: '0', family_code: '0', hub_of: null }, owner);
  repos.push(rootRec);
  function walk(n, anc) {
    const chain = [...anc, n];
    nodes.push({ ...n, path: anc.map(a => a.code) , ancestors: anc });
    const at = k => { for (let i = chain.length - 1; i >= 0; i--) if (chain[i][k] !== undefined) return chain[i][k]; return undefined; };
    const hubAbove = upto => { for (let i = upto; i >= 0; i--) if (chain[i].hub) return chain[i].hub.name; return null; };
    const area = chain[0], project = chain.find(x => x.kind === 'project'), sub = chain.find(x => x.kind === 'subcategory'), fam = chain.find(x => x.kind === 'family');
    const ctx = (extra) => ({ developer: at('developer'), farm: at('farm') || '', area: area.name, area_code: area.code,
      project: project ? project.name : '', project_code: project ? project.code : '', subcategory: sub ? sub.name : (project && project.branch) || '',
      family: fam ? fam.name : '', family_code: fam ? fam.code : '', ...extra });
    if (n.hub) {
      const up = hubAbove(chain.length - 2) || TOP;
      repos.push(finish({ ...n.hub, ...ctx({ up, hub_of: n.code, path: chain.map(c => c.code), family: n.kind === 'family' ? n.name : 'Hub', family_code: n.kind === 'family' ? n.code : '' }) }, owner));
    }
    for (const c of n.children || []) {
      if (c.kind === 'repo') {
        const up = hubAbove(chain.length - 1);
        repos.push(finish({ ...c, ...ctx({ up: up || null, hub_of: null, path: chain.map(x => x.code) }) }, owner));
      } else walk(c, chain);
    }
  }
  for (const a of src.tree) walk(a, []);
  const byName = new Map(repos.map(r => [r.name, r]));
  return { nodes, repos, byName, root: rootRec };
}
function finish(r, owner) {
  r.github = r.github || r.name;
  r.url = `https://github.com/${owner}/${r.github}`;
  r.ssh_url = `git@github.com:${owner}/${r.github}.git`;
  r.private = r.visibility === 'private';
  return r;
}

// ---- rules a schema cannot express --------------------------------------------------------------------------------
const CHILD = { area: ['project'], project: ['subcategory', 'family'], subcategory: ['family'], family: ['repo'] };
function validate(src) {
  const e = [];
  let schema; try { schema = JSON.parse(fs.readFileSync(SCHEMA, 'utf8')); } catch (x) { return [`repos.v3.schema.json: ${x.message}`]; }
  for (const x of schemaErrors(schema, src)) e.push('schema ' + x);
  if (e.length) return e;
  const names = new Map(), farmTops = new Map();
  const seeName = (n, where) => { if (names.has(n)) e.push(`duplicate repo name ${n} (${names.get(n)} and ${where})`); names.set(n, where); };
  seeName(src.root.name, '0');
  function walk(n, code, parentKind, farmAbove) {
    if (n.code !== code) e.push(`${n.name}: code ${n.code}, its position says ${code}`);
    if (parentKind && !(CHILD[parentKind] || []).includes(n.kind)) e.push(`${n.code} ${n.name}: a ${n.kind} cannot sit under a ${parentKind}`);
    if (!parentKind && n.kind !== 'area') e.push(`${n.code} ${n.name}: top level nodes are areas`);
    if (n.hub) { if (n.hub.code !== code + '.0') e.push(`${n.hub.name}: hub code ${n.hub.code}, expected ${code}.0`); seeName(n.hub.name, n.hub.code);
      if (!/-___$/.test(n.hub.name)) e.push(`${n.hub.name}: a hub repo is named <name>-___`);
      if (n.hub.visibility !== 'public') e.push(`${n.hub.name}: hub must be public (owner rule)`); }
    if (n.farm) {
      const seg = n.farm.split('/');
      if (seg.length === 1 || !farmAbove) { // a top farm folder: <code>.<Name> of this node
        if (seg.length !== 1) e.push(`${n.code} ${n.name}: farm ${n.farm} nests under no farm above it`);
        else if (!n.farm.startsWith(code + '.')) e.push(`${n.code} ${n.name}: top farm folder ${n.farm} must start with its code ${code}.`);
        if (farmTops.has(seg[0])) e.push(`farm folder ${seg[0]} declared twice`); farmTops.set(seg[0], n);
      } else if (!(n.farm.startsWith(farmAbove + '/') && seg.length === farmAbove.split('/').length + 1)) e.push(`${n.code} ${n.name}: farm ${n.farm} is not one folder below ${farmAbove}`);
    }
    const f = n.farm || farmAbove;
    (n.children || []).forEach((c, i) => {
      const cc = code + '.' + (i + 1);
      if (c.kind === 'repo') { if (c.code !== cc) e.push(`${c.name}: code ${c.code}, its position says ${cc}`); seeName(c.name, cc);
        if (n.kind !== 'family') e.push(`${c.name}: repos sit in a family, not a ${n.kind}`);
        if (!f) e.push(`${c.name}: no farm up the tree`); }
      else walk(c, cc, n.kind, f);
    });
    if (n.kind === 'family' && !(n.children || []).length) e.push(`${n.code} family ${n.name} is empty`);
  }
  src.tree.forEach((a, i) => walk(a, String(i + 1), undefined, ''));
  // the archive rule and the hubless rule, on the expanded records
  const x = expand(src);
  for (const r of x.repos) {
    if (r.name.startsWith('z-archived_') && r.area !== 'Archived') e.push(`${r.name}: z-archived_* repos sit in area Archived`);
    if (r.github !== r.name && x.byName.has(r.github)) e.push(`${r.name}: github name ${r.github} is also a registry name`);
  }
  const ren = new Set((src.registry.renames || []).map(r => r.from));
  for (const r of x.repos) if (ren.has(r.name)) e.push(`${r.name} is the OLD name in renames[]; use the new name`);
  return e;
}

// farms{}: the top farm folders in tree order, with what each holds (rendered into repos.json and repos-tree.json)
function farms(x) {
  const o = {};
  for (const n of x.nodes) if (n.farm && !n.farm.includes('/')) o[n.farm] = `${n.label} (${n.code}): ${n.hub ? `hub ${n.hub.name} and its members` : 'no hub'}. ${n.description}`.trim();
  return o;
}

module.exports = { load, validate, expand, farms, schemaErrors, SRC, SCHEMA, TOP };
