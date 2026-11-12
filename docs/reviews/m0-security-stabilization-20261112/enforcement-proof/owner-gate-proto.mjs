// PROTOTYPE (scratch only, not in the repo): the proposed extension of scripts/test-g1-agent-routing-smoke.mjs.
// Three checks, each with a frozen baseline for what exists today, so only NEW violations fail:
//   R1 new structure: a new contract/law/master/registry/final markdown file must be routed (named in the Owner Index) or carry
//      an OWNER-ROUTING header with a verdict; EXTEND_EXISTING / SUPERSEDE_EXISTING must name an ACTIVE owner.
//   R2 retired owner: an Owner Index row may not route to a rule family that is retired (no active version), unless the same row
//      marks it as history.
//   R3 change to an existing registered contract (PR diff vs base): the change must carry a change record (a dated version /
//      addendum line in the file) or touch the Owner Index row that names the file.
// Usage: node owner-gate-proto.mjs <repoRoot> <rulesSnapshot.json> [baseRef] [baseline.json] [--write-baseline]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, basename } from 'node:path';

const [root, snapPath, baseRef, baselinePath, mode] = process.argv.slice(2);
const git = (...a) => execFileSync('git', ['-C', root, ...a], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] });
const snap = JSON.parse(readFileSync(snapPath, 'utf8'));
const active = new Set(snap.active), retired = new Set(snap.retired_only);
const index = readFileSync(resolve(root, 'SOD1820_MASTER_OWNER_INDEX.md'), 'utf8');
const HIST = /(היסטור|לא פעיל|אינם פעילים|אינו פעיל|פרש|retired|inactive|historical|history|provenance|superseded|INACTIVE|Legacy)/i;
const STRUCT = /(CONTRACT|_LAW|LAW_|MASTER|REGISTRY|FINAL)[^/]*\.md$/i;
const EXEMPT_DIR = /^(docs\/reviews\/|docs\/archive\/|audits\/|planning\/|docs\/planning\/|research-notes\/|docs\/research-notes\/|research-library\/|drafts\/|docs\/audit-evidence\/|node_modules\/)/;
// The routing spine itself (CLAUDE.md §5, §6) is not a contract that needs routing.
const SPINE = new Set(['SOD1820_MASTER_OWNER_INDEX.md', 'SOD1820_MASTER_ROADMAP.md', 'SOD1820_MASTER_STATE.md']);
const VERDICT = /OWNER-ROUTING:\s*(EXTEND_EXISTING|SUPERSEDE_EXISTING|GENUINELY_NEW_DOMAIN|HISTORICAL)\b\s*([`'"]?([A-Za-z0-9_.\-\/]+)[`'"]?)?/;
const violations = [];

// R1
const tracked = git('ls-files').split('\n').filter(Boolean).filter((f) => f.endsWith('.md') && STRUCT.test(basename(f)) && !EXEMPT_DIR.test(f));
for (const f of tracked) {
  if (SPINE.has(f) || index.includes(basename(f)) || index.includes(f)) continue;
  const head = readFileSync(resolve(root, f), 'utf8').split('\n').slice(0, 15).join('\n');
  const m = VERDICT.exec(head);
  if (!m) { violations.push({ rule: 'R1', file: f, why: 'unrouted contract-like file (not in Owner Index, no OWNER-ROUTING header)' }); continue; }
  if (['EXTEND_EXISTING', 'SUPERSEDE_EXISTING'].includes(m[1])) {
    const owner = m[3] || '';
    const ok = active.has(owner) || (owner.endsWith('.md') && index.includes(basename(owner)));
    if (!ok) violations.push({ rule: 'R1', file: f, why: `${m[1]} names an owner that is not active / not routed: ${owner || '(none)'}` });
  }
}
// R2
for (const line of index.split('\n').filter((l) => l.startsWith('| ') && !/^\|\s*-/.test(l))) {
  const cells = line.split('|').map((c) => c.trim());
  const ownerCell = cells[2] || '';
  for (const [, id] of ownerCell.matchAll(/`([a-z0-9_]+)`/g)) {
    if (retired.has(id) && !active.has(id) && !HIST.test(line)) violations.push({ rule: 'R2', file: 'SOD1820_MASTER_OWNER_INDEX.md', why: `row routes to retired owner ${id}: ${line.slice(0, 120)}` });
  }
}
// R3
if (baseRef) {
  const changed = git('diff', '--name-only', `${baseRef}...HEAD`).split('\n').filter(Boolean);
  const indexChanged = changed.includes('SOD1820_MASTER_OWNER_INDEX.md');
  const indexDiff = indexChanged ? git('diff', `${baseRef}...HEAD`, '--', 'SOD1820_MASTER_OWNER_INDEX.md') : '';
  for (const f of changed) {
    if (!f.endsWith('.md') || !STRUCT.test(basename(f)) || EXEMPT_DIR.test(f)) continue;
    let existedAtBase = true; try { git('cat-file', '-e', `${baseRef}:${f}`); } catch { existedAtBase = false; }
    if (!existedAtBase || !index.includes(basename(f))) continue;   // new files are R1's job; unregistered files are not contracts of record
    const added = git('diff', '-U0', `${baseRef}...HEAD`, '--', f).split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).join('\n');
    const record = /(\d{1,2}\.\d{1,2}\.20\d\d|20\d\d-\d\d-\d\d)/.test(added) && /(v\d+|גרסה|version|addendum|תוספת|עדכון|update|amend)/i.test(added);
    const indexTouchesFile = indexDiff.split('\n').some((l) => /^[+-][^+-]/.test(l) && l.includes(basename(f)));
    if (!record && !indexTouchesFile) violations.push({ rule: 'R3', file: f, why: 'registered contract changed without a dated change record or an Owner Index update' });
  }
}
const key = (v) => `${v.rule}|${v.file}|${v.why}`;
if (mode === '--write-baseline') { writeFileSync(baselinePath, JSON.stringify(violations.map(key).sort(), null, 1)); console.log(`baseline written: ${violations.length}`); process.exit(0); }
const base = baselinePath && existsSync(baselinePath) ? new Set(JSON.parse(readFileSync(baselinePath, 'utf8'))) : new Set();
const fresh = violations.filter((v) => !base.has(key(v)));
for (const v of fresh) console.log(`FAIL ${v.rule} ${v.file}: ${v.why}`);
console.log(fresh.length ? `RESULT: REFUSED (${fresh.length} new violation(s); ${violations.length - fresh.length} frozen in the baseline)` : `RESULT: ALLOWED (0 new; ${violations.length} frozen in the baseline)`);
process.exit(fresh.length ? 1 : 0);
