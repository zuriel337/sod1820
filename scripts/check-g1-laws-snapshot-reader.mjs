#!/usr/bin/env node
// Second half of the end-to-end reader test (tests/sql/g1_laws_snapshot_reader_v1.sql): the snapshots that the ONE reader
// (scripts/sql/g1_laws_snapshot.sql) printed from a throwaway database are (1) compared line by line with the expected record and
// (2) fed to the REAL G1 rules. Every step has an expected outcome; a refusal must be for its reason. Any difference exits 1.
// Usage: node scripts/check-g1-laws-snapshot-reader.mjs <psql output file>      (G1_READER_FLIP=<step> inverts one expectation)
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseLawsSnapshot, validateLawsSnapshot, compareLawsSnapshots } from './lib/g1LawsSnapshotRules.mjs';

const out = readFileSync(process.argv[2], 'utf8').split('\n');
const snaps = {}; let cur = null;
for (const l of out) {
  const m = /^@@SNAP (\S+)$/.exec(l);
  if (m) { cur = snaps[m[1]] = []; continue; }
  if (/^@@END$/.test(l)) { cur = null; continue; }
  if (cur && l) cur.push(l);
}
const md5 = (t) => createHash('md5').update(t).digest('hex').slice(0, 12);
const REF = 'work_log:11111111-2222-4333-8444-555555555555'; const RR = 'retired_routing_v1:' + REF;
const L = { child: 'L|child_law|2|root_law|fam_child|' + md5('child text 2'),
  names: 'L|names_law|1|root_law|fam_names|' + md5('this law still names gone_owned_law and gone_ownerless_law in its text'),
  other: 'L|other_root_law|1|other_root_law|fam_other|' + md5('other root text'), root: 'L|root_law|1|root_law|fam_root|' + md5('root text'),
  revived: 'L|gone_unnamed_routed_law|2|root_law|fam_gone|' + md5('g5 revived') };
// the exact record the reader must produce at each step (what the system "uses" as the successor)
const EXPECTED = {
  'S1-base': [L.child, L.names, L.other, L.root, 'R|gone_dep_law|1|other_root_law|', 'R|gone_owned_law|1|root_law|', 'R|gone_ownerless_law|2|-|'],
  'S2-known-gap-routed': [L.child, L.names, L.other, L.root, 'R|gone_dep_law|1|other_root_law|', 'R|gone_owned_law|1|root_law|', 'R|gone_ownerless_law|2|root_law|' + RR],
  'S3-unnamed-family-routed': [L.child, L.names, L.other, L.root, 'R|gone_dep_law|1|other_root_law|', 'R|gone_owned_law|1|root_law|', 'R|gone_ownerless_law|2|root_law|' + RR, 'R|gone_unnamed_routed_law|1|other_root_law|' + RR],
  'S4-later-mapping-wins': [L.child, L.names, L.other, L.root, 'R|gone_dep_law|1|other_root_law|', 'R|gone_owned_law|1|other_root_law|' + RR, 'R|gone_ownerless_law|2|root_law|' + RR, 'R|gone_unnamed_routed_law|1|other_root_law|' + RR],
  'S5-silent-rewrite-with-the-guard-bypassed': [L.child, L.names, L.other, L.root, 'R|gone_dep_law|1|root_law|', 'R|gone_owned_law|1|other_root_law|' + RR, 'R|gone_ownerless_law|2|root_law|' + RR, 'R|gone_unnamed_routed_law|1|other_root_law|' + RR],
  'S7-successor-retired-later': [L.child, L.names, L.root, 'R|gone_dep_law|1|other_root_law|', 'R|gone_owned_law|1|other_root_law|' + RR, 'R|gone_ownerless_law|2|root_law|' + RR, 'R|gone_unnamed_routed_law|1|other_root_law|' + RR, 'R|other_root_law|1|other_root_law|'],
  'S8-rerouted-to-an-active-successor': [L.child, L.names, L.root, 'R|gone_dep_law|1|root_law|' + RR, 'R|gone_owned_law|1|root_law|' + RR, 'R|gone_ownerless_law|2|root_law|' + RR, 'R|gone_unnamed_routed_law|1|root_law|' + RR, 'R|other_root_law|1|root_law|' + RR],
  'S9-family-revived': [L.child, L.revived, L.names, L.root, 'R|gone_dep_law|1|root_law|' + RR, 'R|gone_owned_law|1|root_law|' + RR, 'R|gone_ownerless_law|2|root_law|' + RR, 'R|other_root_law|1|root_law|' + RR],
};
const ctx = { index: '| a | `root_law` |\n| b | `other_root_law` |', fileExists: () => false, codexSlugs: new Set(), retiredWithoutSuccessor: ['gone_ownerless_law'] };
const P = (name) => parseLawsSnapshot((snaps[name] || []).join('\n'));
const g1 = (prev, next, opts = {}) => [...(prev ? compareLawsSnapshots(P(prev), P(next), opts) : []), ...validateLawsSnapshot(P(next), ctx)];
// G1 on each transition: [step, previous snapshot, next snapshot, ALLOW | REFUSE, reason (regex), options]
const STEPS = [
  ['G-S1 the base record is valid (the one known gap is named)', null, 'S1-base', 'ALLOW'],
  ['G-S2 a known gap routed through retired_routing_v1', 'S1-base', 'S2-known-gap-routed', 'ALLOW'],
  ['G-S3 an unnamed retired family listed once it carries a record', 'S2-known-gap-routed', 'S3-unnamed-family-routed', 'ALLOW'],
  ['G-S4 a later mapping replaces the owner recorded at retirement', 'S3-unnamed-family-routed', 'S4-later-mapping-wins', 'ALLOW'],
  ['G-S5 a silent rewrite of the retired owner (guard bypassed)', 'S4-later-mapping-wins', 'S5-silent-rewrite-with-the-guard-bypassed', 'REFUSE', /gone_dep_law: recorded successor changed \(other_root_law -> root_law\) without a retired_routing_v1 record/],
  ['G-S7 the successor retired later', 'S4-later-mapping-wins', 'S7-successor-retired-later', 'REFUSE', /gone_owned_law: recorded successor other_root_law is itself retired/],
  ['G-S7b a retired self-owned root is not its own successor', 'S4-later-mapping-wins', 'S7-successor-retired-later', 'REFUSE', /other_root_law: recorded successor other_root_law is itself retired/],
  ['G-S8 new approved routings to an active successor', 'S7-successor-retired-later', 'S8-rerouted-to-an-active-successor', 'ALLOW'],
  ['G-S9 a revived family without a recorded approval', 'S8-rerouted-to-an-active-successor', 'S9-family-revived', 'REFUSE', /gone_unnamed_routed_law: a retired law was activated again without a recorded approval/],
  ['G-S9b the same revival with a recorded approval; the old record is not read', 'S8-rerouted-to-an-active-successor', 'S9-family-revived', 'ALLOW', null, { approvals: [{ rule_id: 'gone_unnamed_routed_law', ref: REF }] }],
];
const flip = process.env.G1_READER_FLIP || ''; let bad = 0; let n = 0;
const report = (ok, text) => { n++; console.log((ok ? 'ok ' : 'MISMATCH ') + text); if (!ok) bad = 1; };
for (const [name, lines] of Object.entries(EXPECTED)) {
  const got = snaps[name] || []; const same = got.length === lines.length && got.every((l, i) => l === lines[i]);
  report(same, 'READER ' + name + ' (' + got.length + ' lines)' + (same ? '' : '\n   expected: ' + lines.join('\n             ') + '\n   got:      ' + got.join('\n             ')));
}
for (const [name, prev, next, want, reason, opts] of STEPS) {
  const v = g1(prev, next, opts); let expect = want; if (name.split(' ')[0] === flip) expect = want === 'ALLOW' ? 'REFUSE' : 'ALLOW';
  const ok = expect === 'ALLOW' ? v.length === 0 : (v.length > 0 && (!reason || reason.test(v.join('\n'))));
  report(ok, name + ' => ' + (v.length ? 'REFUSED' : 'ALLOWED') + (v.length ? ' (' + v.join(' ; ').slice(0, 200) + ')' : ''));
}
const EXPECTED_CHECKS = Object.keys(EXPECTED).length + STEPS.length;
if (n !== EXPECTED_CHECKS || Object.keys(snaps).length !== Object.keys(EXPECTED).length) { console.log('MISMATCH: ' + n + ' checks over ' + Object.keys(snaps).length + ' snapshots'); bad = 1; }
console.log(bad ? 'RESULT: UNEXPECTED OUTCOME(S)' : 'RESULT: the reader and G1 behaved as expected in all ' + n + ' checks');
process.exit(bad);
