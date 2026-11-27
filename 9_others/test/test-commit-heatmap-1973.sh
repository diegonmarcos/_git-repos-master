#!/usr/bin/env bash
# Tester (#1973): README.html commit activity is the REAL per-day history, drawn as a 7-row x 52/53-week heatmap.
#  A fixture repo (merges, a deploy commit, many days) must be counted exactly like git does; a shallow clone of it must be refused (an error, not numbers);
#  every dist README.html heatmap must be self-consistent (cells sum = "last 52 weeks"), carry no shallow/mock note and no error block;
#  commit-days.json of a repo with a FULL local history (CI checkout, fetch-depth 0) must equal git's own day histogram. Each check is proven red by a mutation.
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
fail=0; ok() { echo "PASS  $*"; }; bad() { echo "FAIL  $*"; fail=1; }
CHK="$T/chk.js"; cat > "$CHK" <<'JS'
const fs = require('fs'), path = require('path'), cp = require('child_process');
const [mode, a, b] = process.argv.slice(2), P = [];
const git = (d, ...x) => cp.execFileSync('git', ['-C', d, ...x], { encoding: 'utf8' });
if (mode === 'fixture') { // a = module path, b = work dir
  const CD = require(a), d = path.join(b, 'fx'); fs.mkdirSync(d);
  const env = t => ({ ...process.env, GIT_AUTHOR_NAME: 'x', GIT_AUTHOR_EMAIL: 'x@x', GIT_COMMITTER_NAME: 'x', GIT_COMMITTER_EMAIL: 'x@x', GIT_AUTHOR_DATE: t, GIT_COMMITTER_DATE: t });
  const run = (t, ...x) => cp.execFileSync('git', ['-C', d, ...x], { env: env(t), stdio: 'pipe' });
  run('2026-01-01T10:00:00Z', 'init', '-q', '-b', 'main'); let n = 0;
  const mk = (t, m, f = 'f') => { fs.writeFileSync(path.join(d, f), String(++n)); run(t, 'add', f); run(t, 'commit', '-q', '-m', m); };
  for (let i = 0; i < 40; i++) { const day = new Date(Date.UTC(2026, 0, 1) + i * 5 * 86400e3 / 2).toISOString().slice(0, 10); for (let k = 0; k <= i % 4; k++) mk(`${day}T0${k + 1}:00:00Z`, `c${n}`); }
  run('2026-04-10T10:00:00Z', 'checkout', '-q', '-b', 'side'); mk('2026-04-10T11:00:00Z', 'side work', 'g'); run('2026-04-11T10:00:00Z', 'checkout', '-q', 'main'); mk('2026-04-11T11:00:00Z', 'main work');
  run('2026-04-12T10:00:00Z', 'merge', '-q', '--no-ff', '-m', 'merge side', 'side');
  mk('2026-04-12T12:00:00Z', 'README.html + README.canvas: generated from x');
  const all = +git(d, 'rev-list', '--count', 'HEAD'), got = CD.fromGit(d), sum = Object.values(got.days).reduce((x, y) => x + y, 0);
  if (sum !== all - 1) P.push(`fixture: counted ${sum}, git rev-list --count says ${all} (one deploy commit is excluded)`);
  const want = {}; for (const l of git(d, 'log', '--format=%aI%x09%s', 'HEAD').split('\n').filter(Boolean)) { const [t, s] = l.split('\t'); if (/^README\.html \+ README\.canvas/.test(s)) continue; const k = new Date(t).toISOString().slice(0, 10); want[k] = (want[k] || 0) + 1; }
  if (JSON.stringify(Object.entries(got.days).sort()) !== JSON.stringify(Object.entries(want).sort())) P.push('fixture: per-day histogram differs from git log');
  const s = CD.summarize(got.days), wn = +git(d, 'rev-list', '--count', '--no-merges', 'HEAD') + 1; // window total must equal the days of the last 364 days
  const inWin = Object.entries(want).filter(([k]) => k >= s.win.from).reduce((x, [, y]) => x + y, 0); if (s.win.total !== inWin) P.push(`fixture: window total ${s.win.total} != ${inWin}`);
  const sh = path.join(b, 'sh'); cp.execFileSync('git', ['clone', '-q', '--depth', '1', 'file://' + d, sh], { stdio: 'pipe' });
  let refused = false; try { const r = CD.fromGit(sh); P.push('fixture: a depth-1 clone was counted instead of refused: ' + Object.keys(r.days).length + ' days'); } catch (e) { refused = /shallow/.test(e.message); }
  if (!refused && !P.some(x => /depth-1/.test(x))) P.push('fixture: shallow clone refused without a shallow error');
  const svg = CD.heatmap(s, 'x'); const cells = (svg.match(/<rect [^>]*data-d=/g) || []).length;
  if ((svg.match(/>(Sun|Mon|Tue|Wed|Thu|Fri|Sat)</g) || []).length !== 7) P.push('heatmap: not 7 labelled weekday rows');
  if (cells < 364 || cells > 364) P.push(`heatmap: ${cells} day squares, want 364 (52 weeks)`);
} else if (mode === 'dist') { // a = dist dir
  let n = 0;
  for (const dn of fs.readdirSync(a).sort()) { const f = path.join(a, dn, 'README.html'); if (!fs.existsSync(f)) continue; n++;
    const h = fs.readFileSync(f, 'utf8'), i = h.indexOf('data-section="commits"'), sec = h.slice(i, h.indexOf('</section>', i));
    if (/shallow clone|mock|sample data/i.test(sec)) P.push(`${dn}: commits section mentions shallow/mock data`);
    if (/class="err"/.test(sec)) { P.push(`${dn}: commits section is an error: ${sec.replace(/<[^>]+>/g, ' ').trim().slice(0, 100)}`); continue; }
    const rows = (sec.match(/<text [^>]*>(Sun|Mon|Tue|Wed|Thu|Fri|Sat)</g) || []).length, cells = [...sec.matchAll(/data-n="(\d+)"/g)].map(m => +m[1]), tot = +((/last 52 weeks <b>(\d+)</.exec(sec) || [])[1]);
    if (rows !== 7) P.push(`${dn}: ${rows} weekday labels`);
    if (cells.length !== 364) P.push(`${dn}: ${cells.length} day squares`);
    if (cells.reduce((x, y) => x + y, 0) !== tot) P.push(`${dn}: squares sum ${cells.reduce((x, y) => x + y, 0)} != last 52 weeks ${tot}`);
    if (!/in history <b>\d+/.test(sec) || !/busiest day/.test(sec) || !/first <b>/.test(sec) || !/latest <b>/.test(sec)) P.push(`${dn}: totals missing`);
    if (!/>less</.test(sec) || !/>more</.test(sec)) P.push(`${dn}: legend missing`); }
  if (n < (+process.env.MIN || 1)) P.push(`only ${n} pages`);
} else if (mode === 'data') { // a = commit-days.json, b = repo clone dir (full history only)
  const j = JSON.parse(fs.readFileSync(a, 'utf8')), name = process.env.REPO, e = j.repos[name];
  for (const [k, v] of Object.entries(j.repos)) if (v.error || !v.days) P.push(`${k}: no data (${v.error})`);
  if (git(b, 'rev-parse', '--is-shallow-repository').trim() === 'true') { console.log('SKIP data cross-check: clone is shallow'); }
  else { const cut = new Date(Date.parse(j.fetched) - 2 * 86400e3).toISOString().slice(0, 10), want = {};
    for (const l of git(b, 'log', '--format=%aI%x09%s', 'HEAD').split('\n').filter(Boolean)) { const [t, s] = l.split('\t'); if (/^README\.html \+ README\.canvas/.test(s)) continue; const k = new Date(t).toISOString().slice(0, 10); if (k <= cut) want[k] = (want[k] || 0) + 1; }
    const have = Object.fromEntries(Object.entries(e.days).filter(([k]) => k <= cut)); let bad = 0;
    for (const k of new Set([...Object.keys(want), ...Object.keys(have)])) if ((want[k] || 0) !== (have[k] || 0)) bad++;
    if (bad) P.push(`${name}: ${bad} days differ between commit-days.json and the full git history`); else console.log(`cross-check ${name}: ${Object.keys(want).length} days equal to git`); }
}
if (P.length) { console.log(P.slice(0, 10).join('\n')); process.exit(1); }
JS
MOD="$ROOT/0_registry/commit-days.js"; DIST="$ROOT/A2_repo-readmes/dist"; JSON="$ROOT/A2_repo-readmes/src/commit-days.json"
rm -rf "$T/w1"; mkdir "$T/w1"; node "$CHK" fixture "$MOD" "$T/w1" >"$T/o" 2>&1 && ok "fixture repo (merge, deploy commit, shallow clone): counts equal git, shallow refused, 7x52 grid" || bad "$(grep -v "^ *at " "$T/o" | head -6 | tr '\n' ' ')"
MIN=40 node "$CHK" dist "$DIST" >"$T/o" 2>&1 && ok "every dist README.html heatmap is self-consistent, no shallow/mock note, no error block" || bad "$(head -4 "$T/o" | tr '\n' ' ')"
REPO=_git-repos-master node "$CHK" data "$JSON" "$ROOT" >"$T/o" 2>&1 && ok "commit-days.json complete$(grep -q SKIP "$T/o" && echo ' (git cross-check skipped: shallow checkout)' || echo ', equal to full git history of _git-repos-master')" || bad "$(head -4 "$T/o" | tr '\n' ' ')"
cleanmut() { rm -rf "$T/w2"; mkdir "$T/w2"; }
# mutations
cleanmut; sed "s/=== 'true') throw/=== 'never') throw/" "$MOD" > "$T/m1.js"; node "$CHK" fixture "$T/m1.js" "$T/w2" >/dev/null 2>&1 && bad "mutation (shallow refusal removed) missed" || ok "mutation (shallow refusal removed) is caught"
cleanmut; sed "s/if (DEPLOY.test(r.s || '')) continue; //;s/const d = String(r.t).slice(0, 10); days\[d\] = (days\[d\] || 0) + 1;/const d = String(r.t).slice(0, 10); days[d] = 1;/" "$MOD" > "$T/m2.js"; node "$CHK" fixture "$T/m2.js" "$T/w2" >/dev/null 2>&1 && bad "mutation (one commit per day) missed" || ok "mutation (one commit per day, deploy filter dropped) is caught"
cleanmut; sed "s/const WD = .*//;s/'Sat'\]/'Sat', 'X']/" "$MOD" > "$T/m3.js"; sed "s/for (let r = 0; r < 7; r++) { const t/for (let r = 0; r < 6; r++) { const t/" "$MOD" > "$T/m3.js"; node "$CHK" fixture "$T/m3.js" "$T/w2" >/dev/null 2>&1 && bad "mutation (6 rows) missed" || ok "mutation (6 rows instead of 7) is caught"
rm -rf "$T/d"; mkdir -p "$T/d"; cp -r "$DIST/_git-repos-master" "$DIST/cloudy-u-android" "$T/d/"; sed -i 's/data-n="\([0-9]*\)"/data-n="\1" /;0,/data-n="0"/s//data-n="9"/' "$T/d/cloudy-u-android/README.html"
node "$CHK" dist "$T/d" >/dev/null 2>&1 && bad "mutation (invented day count in a README) missed" || ok "mutation (invented day count in a README) is caught"
rm -rf "$T/d"; mkdir -p "$T/d"; cp -r "$DIST/_git-repos-master" "$T/d/"; sed -i 's/GitHub REST history of every commit/shallow clone: only the fetched history is counted/' "$T/d/_git-repos-master/README.html"
node "$CHK" dist "$T/d" >/dev/null 2>&1 && bad "mutation (shallow note) missed" || ok "mutation (shallow note) is caught"
if ! grep -q SKIP "$T/o" 2>/dev/null; then :; fi
if [ "$(git -C "$ROOT" rev-parse --is-shallow-repository)" = false ]; then
  node -e "const j=require('$JSON');const e=j.repos._git-repos-master;" 2>/dev/null; node -e "
const fs=require('fs');const j=JSON.parse(fs.readFileSync('$JSON','utf8'));const e=j.repos['_git-repos-master'];const k=Object.keys(e.days).sort()[0];e.days[k]+=7;fs.writeFileSync('$T/mock.json',JSON.stringify(j))"
  REPO=_git-repos-master node "$CHK" data "$T/mock.json" "$ROOT" >/dev/null 2>&1 && bad "mutation (mocked day in commit-days.json) missed" || ok "mutation (mocked day in commit-days.json) is caught"
else echo "SKIP  mock-data mutation needs a full checkout (runs in CI with fetch-depth 0)"; fi
[ $fail = 0 ] && echo "test-commit-heatmap-1973: all passed" || echo "test-commit-heatmap-1973: FAILED"; exit $fail
