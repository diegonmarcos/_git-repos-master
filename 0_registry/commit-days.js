'use strict';
// commit-days.js (#1973): real commits per UTC day (author date) of a repo, and the GitHub-style 7 x 52-week heatmap drawn from them.
// Sources, in order: the GitHub REST history cached by fetch-commit-days.js (full history, merges included) or a NON-shallow clone (git log, merges
// included). A shallow clone is refused: its counts are only the fetched slice, so it is an error, never a number. No mock, no partial data.
// Deploy-only commits ("README.html + README.canvas: generated ...") are not counted (a deploy must not change the page it deploys).
const cp = require('child_process');
const DEPLOY = /^README\.html \+ README\.canvas/;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const DAY = 86400e3, iso = ms => new Date(ms).toISOString().slice(0, 10), ms = d => Date.parse(d + 'T00:00:00Z');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// temperature scale, cold -> hot; level 0 = no commit
const TEMP = ['#1b2230', '#3b6fb6', '#3fb5c9', '#f2d24b', '#f29b38', '#e5483a', '#9d1b2f'];

function fromRecords(lines) { // [{t: ISO date, s: subject}] -> {days: {'YYYY-MM-DD': n}}
  const days = {}; for (const r of lines) { if (DEPLOY.test(r.s || '')) continue; const d = String(r.t).slice(0, 10); days[d] = (days[d] || 0) + 1; }
  return { days };
}
function fromGit(dir, sub) { // full local history; throws when the clone is shallow or unreadable
  const g = a => cp.execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', maxBuffer: 256e6, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, GIT_NO_LAZY_FETCH: '1', GIT_TERMINAL_PROMPT: '0' } });
  if (g(['rev-parse', '--is-shallow-repository']).trim() === 'true') throw new Error('shallow clone: only the fetched history would be counted');
  const out = g(['log', '--format=%aI%x09%s', 'HEAD', ...(sub ? ['--', sub] : [])]).split('\n').filter(Boolean).map(l => { const i = l.indexOf('\t'); return { t: new Date(l.slice(0, i)).toISOString(), s: l.slice(i + 1) }; });
  return fromRecords(out);
}
function summarize(days) { // {total, first, last, win:{from,to,total}, busiest:{day,n}, busiestWeek, activeDays}
  const ks = Object.keys(days).sort(); if (!ks.length) return { total: 0, days, win: { total: 0 } };
  const last = ks[ks.length - 1], from = iso(ms(last) - 363 * DAY);
  let total = 0, wt = 0, b = { day: ks[0], n: 0 }, ad = 0; const wk = {};
  for (const k of ks) { const n = days[k]; total += n; if (k >= from) { wt += n; ad++; } if (n > b.n) b = { day: k, n };
    const w = iso(ms(k) - new Date(ms(k)).getUTCDay() * DAY); wk[w] = (wk[w] || 0) + n; }
  const bw = Object.entries(wk).sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1))[0];
  return { total, first: ks[0], last, days, win: { from, to: last, total: wt }, busiest: b, busiestWeek: { week: bw[0], n: bw[1] }, activeDays: ad };
}
function levels(max) { // upper bounds of levels 1..6 on a log scale up to the busiest day of the window
  const b = []; for (let i = 1; i <= 6; i++) { const v = Math.max(1, Math.round(Math.pow(max, i / 6))); if (!b.length || v > b[b.length - 1]) b.push(v); } return b;
}
function heatmap(s, note) { // inline SVG (no script, no external reference) + stats + legend; s from summarize()
  if (!s || !s.total) return `<p class="err">commit activity: the source returned no commits${note ? ' (' + esc(note) + ')' : ''}.</p>`;
  const CELL = 11, STEP = 13, LX = 30, TY = 16, from = ms(s.win.from), to = ms(s.win.to);
  const start = from - new Date(from).getUTCDay() * DAY, ncol = Math.floor((to - start) / DAY / 7) + 1, W = LX + ncol * STEP, H = TY + 7 * STEP + 30;
  let max = 1; for (let t = from; t <= to; t += DAY) max = Math.max(max, s.days[iso(t)] || 0);
  const bounds = levels(max), lv = n => !n ? 0 : bounds.findIndex(u => n <= u) + 1;
  let cells = '', months = '', lastM = -1;
  for (let c = 0; c < ncol; c++) {
    const colStart = start + c * 7 * DAY, m = new Date(colStart).getUTCMonth();
    if (m !== lastM) { months += `<text x="${LX + c * STEP}" y="10" class="v">${MON[m]}</text>`; lastM = m; }
    for (let r = 0; r < 7; r++) { const t = colStart + r * DAY; if (t < from || t > to) continue; const d = iso(t), n = s.days[d] || 0;
      cells += `<rect x="${LX + c * STEP}" y="${TY + r * STEP}" width="${CELL}" height="${CELL}" rx="2" class="h${lv(n)}" data-d="${d}" data-n="${n}"><title>${d} ${WD[r]}: ${n} commit${n === 1 ? '' : 's'}</title></rect>`; }
  }
  const rows = WD.map((w, r) => `<text x="0" y="${TY + r * STEP + 9}" class="v">${w}</text>`).join('');
  const ly = TY + 7 * STEP + 18, items = [['0', 0], ...bounds.map((hi, i) => { const lo = i ? bounds[i - 1] + 1 : 1; return [lo === hi ? String(lo) : lo + '-' + hi, i + 1]; })], X0 = W - 50 - items.length * 62;
  const legend = `<text x="${LX}" y="${ly + 9}" class="v">commits per day (max ${max})</text><text x="${X0 - 4}" y="${ly + 9}" class="v" text-anchor="end">less</text>`
    + items.map(([t, l], i) => `<rect x="${X0 + i * 62}" y="${ly}" width="${CELL}" height="${CELL}" rx="2" class="h${l}"/><text x="${X0 + i * 62 + 14}" y="${ly + 9}" class="v">${t}</text>`).join('') + `<text x="${W}" y="${ly + 9}" class="v" text-anchor="end">more</text>`;
  const svg = `<svg class="g hm" role="img" aria-label="commit activity" viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMinYMin meet" xmlns="http://www.w3.org/2000/svg">${months}${rows}${cells}${legend}</svg>`;
  return svg + `<div class="stats"><span>last 52 weeks <b>${s.win.total}</b> commits</span><span>in history <b>${s.total}</b></span><span>first <b>${s.first}</b></span><span>latest <b>${s.last}</b></span>`
    + `<span>busiest day <b>${s.busiest.day}</b> (${s.busiest.n})</span><span>busiest week <b>${s.busiestWeek.week}</b> (${s.busiestWeek.n})</span><span>active days <b>${s.activeDays}</b></span></div>`
    + `<p class="note">commits per UTC day (author date), 52 weeks ending at the latest commit, ${ncol} week columns Sun to Sat; ${note ? esc(note) : 'full history'}; merges included, README deploy commits excluded.</p>`;
}
module.exports = { fromRecords, fromGit, summarize, heatmap, levels, TEMP, DEPLOY };
