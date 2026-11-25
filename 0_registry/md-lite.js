// md-lite.js - tiny Markdown -> HTML renderer (node built-ins only) for A2_repo-readmes. Everything is HTML-escaped (raw HTML in the
// source is shown as text); images are never emitted (no network at view time): they become a link to the file on GitHub.
// render(md, { blob: 'https://github.com/<owner>/<repo>/blob/main/' }) -> html string
'use strict';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = s => String(s).toLowerCase().replace(/<[^>]*>/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-').slice(0, 30);

function url(u, o) {
  u = u.trim();
  if (/^(https?:|mailto:)/i.test(u) || u.startsWith('#')) return u;
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return '#'; // javascript:, data:, ...
  return (o.blob || '') + u.replace(/^\.?\//, '');
}
function inline(s, o) {
  const codes = [];
  s = s.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, __, c) => { codes.push('<code>' + esc(c.trim()) + '</code>'); return '\u0000' + (codes.length - 1) + '\u0000'; });
  s = esc(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (_, a, u) => `<a class="img" href="${esc(url(u.replace(/&amp;/g, '&'), o))}">[img: ${a || u}]</a>`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (_, t, u) => `<a href="${esc(url(u.replace(/&amp;/g, '&'), o))}">${t}</a>`);
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+[^\s<).,;:])/g, (_, p, u) => `${p}<a href="${u}">${u}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, (_, a) => `<strong>${a}</strong>`);
  s = s.replace(/(^|[^*\w])\*([^*\s][^*]*)\*(?!\*)/g, '$1<em>$2</em>').replace(/~~([^~]+)~~/g, '<del>$1</del>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[+i]);
}
const cells = l => l.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map(c => c.replace(/\\\|/g, '|').trim());
const isRow = l => /^\s*\|.*\|\s*$/.test(l) || (l.includes('|') && /^\s*\S.*\|.*\S/.test(l));
const isSep = l => /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(l) && l.includes('-');
const LI = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

function render(md, o = {}) {
  const L = String(md).replace(/\r\n?/g, '\n').replace(/^---\n[\s\S]*?\n---\n/, '').split('\n'), out = [];
  let i = 0;
  const startsBlock = l => /^\s*(```|~~~|#{1,6}\s|>|---+\s*$|\*\*\*+\s*$)/.test(l) || LI.test(l);
  while (i < L.length) {
    const l = L[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = /^\s*(```+|~~~+)\s*([\w+-]*)/.exec(l))) { const f = m[1][0], buf = []; i++;
      while (i < L.length && !L[i].trim().startsWith(f.repeat(3))) buf.push(L[i++]); i++;
      out.push(`<pre><code${m[2] ? ` class="lang-${esc(m[2])}"` : ''}>${esc(buf.join('\n'))}</code></pre>`); continue; }
    if (/^\s*<!--/.test(l)) { while (i < L.length && !/-->/.test(L[i])) i++; i++; continue; }
    if ((m = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(l))) { out.push(`<h${m[1].length} id="${esc(slug(m[2]))}">${inline(m[2], o)}</h${m[1].length}>`); i++; continue; }
    if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(l)) { out.push('<hr>'); i++; continue; }
    if (/^\s*>/.test(l)) { const buf = []; while (i < L.length && /^\s*>/.test(L[i])) buf.push(L[i++].replace(/^\s*> ?/, '')); out.push(`<blockquote>${render(buf.join('\n'), o)}</blockquote>`); continue; }
    if (isRow(l) && i + 1 < L.length && isSep(L[i + 1])) {
      const head = cells(l), al = cells(L[i + 1]).map(c => /^:-+:$/.test(c) ? 'center' : /-:$/.test(c) ? 'right' : ''); i += 2;
      const rows = []; while (i < L.length && L[i].trim() && isRow(L[i])) rows.push(cells(L[i++]));
      const td = (t, c, k) => `<${t}${al[k] ? ` style="text-align:${al[k]}"` : ''}>${inline(c || '', o)}</${t}>`;
      out.push(`<div class="tw"><table><thead><tr>${head.map((c, k) => td('th', c, k)).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${head.map((_, k) => td('td', r[k], k)).join('')}</tr>`).join('')}</tbody></table></div>`); continue; }
    if (LI.test(l)) { // nested lists by indent
      const items = []; while (i < L.length && (LI.test(L[i]) || (L[i].trim() && /^\s{2,}\S/.test(L[i]) && items.length))) {
        if ((m = LI.exec(L[i]))) items.push({ ind: m[1].replace(/\t/g, '    ').length, ord: /\d/.test(m[2]), t: m[3] }); else items[items.length - 1].t += ' ' + L[i].trim(); i++; }
      let p = 0; const build = base => { let h = '', tag = null;
        while (p < items.length && items[p].ind >= base) { const it = items[p]; if (it.ind > base && tag === null) { break; }
          if (it.ind > base) { h = h.replace(/<\/li>$/, '') + build(it.ind) + '</li>'; continue; }
          tag = tag || (it.ord ? 'ol' : 'ul'); p++; const t = it.t.replace(/^\[( |x|X)\]\s/, (_, c) => c === ' ' ? '☐ ' : '☑ ');
          h += `<li>${inline(t, o)}</li>`; }
        return `<${tag || 'ul'}>${h}</${tag || 'ul'}>`; };
      let html = ''; while (p < items.length) { const b = items[p].ind; html += build(b); } out.push(html); continue; }
    const buf = [l]; i++; while (i < L.length && L[i].trim() && !startsBlock(L[i]) && !(isRow(L[i]) && i + 1 < L.length && isSep(L[i + 1]))) buf.push(L[i++]);
    out.push(`<p>${inline(buf.map(x => x.trim()).join(' '), o)}</p>`);
  }
  return out.join('\n');
}
module.exports = { render, esc, inline };
