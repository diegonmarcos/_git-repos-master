#!/usr/bin/env node
// fetch-commit-days.js (#1973): the full commit history of every repo of the registry from the GitHub REST API (never a shallow clone),
// reduced to commits per UTC day (author date): A2_repo-readmes/src/commit-days.json (public repos; master is public) and, for private repos,
// the file named by $COMMIT_DAYS_PRIV (outside master; deploy-readmes.sh passes a scratch dir). Needs an authenticated `gh`. Any repo that fails
// is recorded as {error} and rendered as an explicit error, never as a number. Folder targets use commits?path=.
//   node 0_registry/fetch-commit-days.js            public repos -> src/commit-days.json
//   COMMIT_DAYS_PRIV=/x/y.json node ... --private   private repos -> that file
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const R = require('./render-repo-readmes.js'), CD = require('./commit-days.js');
const ROOT = path.resolve(__dirname, '..'), priv = process.argv[2] === '--private';
const OUTF = priv ? process.env.COMMIT_DAYS_PRIV : path.join(ROOT, 'A2_repo-readmes/src/commit-days.json');
if (!OUTF) { console.error('--private needs COMMIT_DAYS_PRIV=<file outside the repo>'); process.exit(2); }
const OWNER = R.owner;
const targets = [];
for (const r of R.live) { if ((r.visibility === 'private') !== priv) continue; targets.push({ key: r.github, repo: r.github }); }
for (const t of R.folderTargets()) { const r = R.live.find(o => o.github === t.repo); if (r && (r.visibility === 'private') === priv) targets.push({ key: `${t.repo}~${t.path}`, repo: t.repo, sub: t.path }); }
const gh = (args) => new Promise((res, rej) => cp.execFile('gh', args, { encoding: 'utf8', maxBuffer: 512e6, env: { ...process.env, GH_PAGER: '' } }, (e, o, se) => e ? rej(new Error((se || e.message).split('\n')[0].slice(0, 200))) : res(o)));
async function one(t) {
  const url = `repos/${OWNER}/${t.repo}/commits?per_page=100${t.sub ? '&path=' + encodeURIComponent(t.sub) : ''}`;
  for (let a = 1; ; a++) { try {
    const o = await gh(['api', '--paginate', url, '--jq', '.[] | [.commit.author.date, (.commit.message | split("\n")[0])] | @tsv']);
    const recs = o.split('\n').filter(Boolean).map(l => { const i = l.indexOf('\t'); return { t: l.slice(0, i), s: l.slice(i + 1) }; });
    const { days } = CD.fromRecords(recs.map(r => ({ t: new Date(r.t).toISOString(), s: r.s })));
    return { source: 'github-rest', fetched_commits: recs.length, days };
  } catch (e) { if (a >= 3) return { error: e.message }; await new Promise(r => setTimeout(r, 3000 * a)); } }
}
(async () => {
  const out = {}, q = [...targets]; let bad = 0;
  await Promise.all(Array.from({ length: 4 }, async () => { for (let t; (t = q.shift());) { out[t.key] = await one(t); if (out[t.key].error) { bad++; console.error(`FAIL ${t.key}: ${out[t.key].error}`); } } }));
  const sorted = Object.fromEntries(Object.keys(out).sort().map(k => [k, out[k]]));
  fs.mkdirSync(path.dirname(OUTF), { recursive: true });
  fs.writeFileSync(OUTF, JSON.stringify({ _schema: 'commit-days/1', source: 'GitHub REST /repos/{owner}/{repo}/commits (full history, author date, UTC day; merges included; README deploy commits excluded)', fetched: new Date().toISOString().slice(0, 19) + 'Z', repos: sorted }) + '\n');
  console.log(`fetch-commit-days${priv ? ' --private' : ''}: ${targets.length} targets, ${bad} failed -> ${OUTF}`);
  process.exit(bad ? 1 : 0);
})();
