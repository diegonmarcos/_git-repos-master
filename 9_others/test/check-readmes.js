// check-readmes.js <dist dir> [--private-names a,b] : prints one problem per line, exit 1 when any (used by test-repo-readmes.sh, which mutates inputs to prove each check bites)
'use strict';
const fs = require('fs'), path = require('path');
const dist = process.argv[2], priv = new Set(((process.argv[3] === '--private-names' && process.argv[4]) || '').split(',').filter(Boolean));
const P = [], SIDES = ['top', 'right', 'bottom', 'left'], COLORS = /^([1-6]|#[0-9a-fA-F]{6})$/;
const isInt = v => Number.isInteger(v);
function canvasProblems(name, txt) {
  const p = [], w = m => p.push(`${name}/README.canvas: ${m}`); let c;
  try { c = JSON.parse(txt); } catch (e) { return [`${name}/README.canvas: not JSON`]; }
  if (!Array.isArray(c.nodes) || !Array.isArray(c.edges)) return [`${name}/README.canvas: nodes[] and edges[] required`];
  const ids = new Set();
  for (const n of c.nodes) {
    if (!n || typeof n.id !== 'string' || !n.id) { w('node without id'); continue; }
    if (ids.has(n.id)) w(`duplicate node id ${n.id}`); ids.add(n.id);
    if (!['text', 'file', 'link', 'group'].includes(n.type)) w(`node ${n.id}: bad type ${n.type}`);
    for (const k of ['x', 'y', 'width', 'height']) if (!isInt(n[k])) w(`node ${n.id}: ${k} must be an integer`);
    if (n.type === 'text' && typeof n.text !== 'string') w(`node ${n.id}: text node needs text`);
    if (n.type === 'file' && typeof n.file !== 'string') w(`node ${n.id}: file node needs file`);
    if (n.type === 'link' && typeof n.url !== 'string') w(`node ${n.id}: link node needs url`);
    if (n.type === 'group' && n.label !== undefined && typeof n.label !== 'string') w(`node ${n.id}: group label must be a string`);
    if (n.color !== undefined && !COLORS.test(n.color)) w(`node ${n.id}: bad color ${n.color}`);
  }
  const eids = new Set();
  for (const e of c.edges) {
    if (!e || typeof e.id !== 'string') { w('edge without id'); continue; }
    if (eids.has(e.id)) w(`duplicate edge id ${e.id}`); eids.add(e.id);
    if (!ids.has(e.fromNode)) w(`edge ${e.id}: fromNode ${e.fromNode} is not a node`);
    if (!ids.has(e.toNode)) w(`edge ${e.id}: toNode ${e.toNode} is not a node`);
    for (const k of ['fromSide', 'toSide']) if (e[k] !== undefined && !SIDES.includes(e[k])) w(`edge ${e.id}: bad ${k}`);
    if (e.toEnd !== undefined && !['none', 'arrow'].includes(e.toEnd)) w(`edge ${e.id}: bad toEnd`);
  }
  const t = c.nodes.filter(n => n.type !== 'group'); // cards must not overlap
  for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) { const a = t[i], b = t[j]; if (a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height) w(`nodes ${a.id} and ${b.id} overlap`); }
  if (!c.nodes.some(n => n.type === 'link' && /^https:\/\/github\.com\//.test(n.url))) w('no GitHub link node');
  if (!c.nodes.some(n => n.type === 'text' && n.color === '3')) w('this repo is not highlighted');
  return p;
}
function htmlProblems(name, h) {
  const p = [], w = m => p.push(`${name}/README.html: ${m}`);
  if (!/^<!DOCTYPE html>/i.test(h)) w('no doctype first');
  if (/<script\b/i.test(h)) w('contains <script>');
  if (/<link\b[^>]*rel=["']?stylesheet/i.test(h)) w('external stylesheet');
  if (/<(img|iframe|video|audio|source|embed|object)\b/i.test(h)) w('embeds a fetchable resource');
  if (/@import|url\(\s*["']?https?:/i.test(h)) w('CSS fetches a resource');
  if (!/<style>/.test(h)) w('no inline <style>');
  return p;
}
const dirs = fs.readdirSync(dist).filter(d => fs.statSync(path.join(dist, d)).isDirectory()).sort();
for (const d of dirs) {
  for (const f of ['README.html', 'README.canvas']) if (!fs.existsSync(path.join(dist, d, f))) P.push(`${d}/${f}: missing`);
  if (fs.existsSync(path.join(dist, d, 'README.canvas'))) P.push(...canvasProblems(d, fs.readFileSync(path.join(dist, d, 'README.canvas'), 'utf8')));
  if (fs.existsSync(path.join(dist, d, 'README.html'))) P.push(...htmlProblems(d, fs.readFileSync(path.join(dist, d, 'README.html'), 'utf8')));
  if (priv.has(d)) P.push(`${d}: a private repo's page is in a public dist`);
}
P.forEach(x => console.log(x)); process.exit(P.length ? 1 : 0);
