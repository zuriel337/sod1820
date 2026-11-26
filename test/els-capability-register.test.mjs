// The 85-capability register is data; this test keeps it true. It is the static layer of capability monitoring:
// a capability whose owner code disappears, a button wired to nothing, a register that drifts from the audit document,
// a "live" claim without proof, and an engine entry point with no sender all fail here. Runtime signals (telemetry,
// the app-health family of PR 1528) are named per capability in `detected_by`; this file adds no collector or store.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { renderRegisterMarkdown } from '../scripts/render-els-capability-register-md.mjs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const exists = path => existsSync(new URL(path, root));
const VOCAB = ['LIVE', 'PARTIAL', 'PARKED', 'SUPERSEDED', 'NEVER', 'UNKNOWN', 'UNREACHABLE'];
const DETECT = ['REGISTER_GUARD', 'TELEMETRY_UI_ACTION', 'TELEMETRY_OPERATION', 'APP_HEALTH_1528_PENDING'];
const HOST_FILES = ['src/components/TzofenEmbed.jsx', 'src/pages/Els2029Page.jsx'];

export function validateRegister(reg, io) {
  const errors = [];
  const caps = reg.capabilities || [];
  const audit = io.read('docs/els-capability-audit.md');
  const sec4 = audit.split('## 4. The register')[1].split('## 5. Verified gaps')[0];
  const auditIds = [...sec4.matchAll(/^\| ([A-G]\d\d) \|/gm)].map(m => m[1]);
  const ids = caps.map(c => c.id);
  if (new Set(ids).size !== ids.length) errors.push('duplicate capability id');
  if (ids.length !== 85) errors.push(`register has ${ids.length} capabilities, expected 85`);
  const missing = auditIds.filter(id => !ids.includes(id)), extra = ids.filter(id => !auditIds.includes(id));
  if (missing.length || extra.length) errors.push(`ids differ from audit section 4: missing ${missing} extra ${extra}`);

  // Legacy dependency column (ZURIEL 26.11.2026): every capability states its dependency on the pre-2029 engine UI, and the removal gate follows the class.
  const LEGACY = { NONE: 'n/a', ENGINE_COMPUTE: 'keep', ENGINE_ONLY_LIVE: 'after-parity', ENGINE_UNREACHABLE: 'decide', VISUAL_LEGACY: 'migrate-first' };
  for (const c of caps) {
    const l = c.legacy_dependency;
    if (!l || !(l.class in LEGACY)) { errors.push(`${c.id}: legacy_dependency.class missing or unknown`); continue; }
    if (l.removal !== LEGACY[l.class]) errors.push(`${c.id}: ${l.class} must carry removal "${LEGACY[l.class]}"`);
    if (!Array.isArray(l.surface) || typeof l.detail !== 'string' || l.detail.length < 20) errors.push(`${c.id}: legacy_dependency needs surface[] and a detail`);
    // A capability that only the engine's own Classic UI serves can never be listed as safely removable.
    const own = c.owner || [];
    if (['LIVE', 'PARTIAL'].includes(c.disposition) && own.length && own.every(o => o.file.includes('tools/els/')) && l.class === 'ENGINE_COMPUTE') errors.push(`${c.id}: engine-only live capability cannot be ENGINE_COMPUTE`);
  }
  const sliceIds = new Set((reg.legacy_removal_plan?.slices || []).map(sl => sl.id));
  if (sliceIds.size < 8) errors.push('legacy_removal_plan.slices missing');
  for (const c of caps) if (['ENGINE_ONLY_LIVE', 'VISUAL_LEGACY'].includes(c.legacy_dependency?.class) && !sliceIds.has(c.legacy_dependency.plan?.slice)) errors.push(`${c.id}: ${c.legacy_dependency.class} must name a plan slice`);
  const summary = {}; for (const c of caps) if (c.legacy_dependency) summary[c.legacy_dependency.class] = (summary[c.legacy_dependency.class] || 0) + 1;
  if (JSON.stringify(Object.entries(summary).sort()) !== JSON.stringify(Object.entries(reg.legacy_dependency_summary || {}).sort())) errors.push('legacy_dependency_summary does not match the rows');
  if (!Array.isArray(reg.legacy_dependency_findings) || reg.legacy_dependency_findings.length < 10) errors.push('legacy_dependency_findings missing');

  // The counts in the audit document (section 13.2) and in the register may not drift apart.
  const counts = {};
  for (const c of caps) counts[c.disposition] = (counts[c.disposition] || 0) + 1;
  const line = audit.split('### 13.2')[1]?.split('\n').find(l => /LIVE\/ABSORBED \d+/.test(l)) || '';
  const docCounts = { LIVE: +/LIVE\/ABSORBED (\d+)/.exec(line)?.[1], PARTIAL: +/PARTIAL (\d+)/.exec(line)?.[1], PARKED: +/PARKED (\d+)/.exec(line)?.[1],
    SUPERSEDED: +/SUPERSEDED (\d+)/.exec(line)?.[1], NEVER: +/NEVER (\d+)/.exec(line)?.[1], UNKNOWN: +/UNKNOWN (\d+)/.exec(line)?.[1], UNREACHABLE: +/UNREACHABLE (\d+)/.exec(line)?.[1] };
  for (const key of VOCAB) if ((counts[key] || 0) !== docCounts[key]) errors.push(`audit 13.2 says ${key}=${docCounts[key]}, register has ${counts[key] || 0}`);
  if (JSON.stringify(reg.summary) !== JSON.stringify(Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a < b ? -1 : 1)))) errors.push('summary does not match the rows');

  const engine = io.read('tools/els/els-code.template.html'), built = io.read('public/tzofen.html');
  const hostText = [...io.list('src/components/experience2029').filter(f => /\/Els[^/]*\.jsx$/.test(f)), ...HOST_FILES].map(f => io.read(f)).join('\n');
  for (const c of caps) {
    const tag = c.id;
    if (!VOCAB.includes(c.disposition)) errors.push(`${tag}: unknown disposition ${c.disposition}`);
    if (!c.contracts?.length) errors.push(`${tag}: no binding contract`);
    if (!c.detected_by?.includes('REGISTER_GUARD') || c.detected_by.some(d => !DETECT.includes(d))) errors.push(`${tag}: detected_by invalid`);
    for (const o of c.owner || []) {
      if (!io.exists(o.file)) errors.push(`${tag}: owner file missing ${o.file}`);
      else if (!io.read(o.file).includes(o.symbol)) errors.push(`${tag}: ${o.symbol} no longer in ${o.file} (capability disappeared?)`);
      if (o.file === 'tools/els/els-code.template.html' && !built.includes(o.symbol)) errors.push(`${tag}: ${o.symbol} missing from public/tzofen.html (build out of sync)`);
    }
    if (['LIVE', 'PARTIAL', 'UNREACHABLE'].includes(c.disposition) && !(c.owner || []).length) errors.push(`${tag}: ${c.disposition} needs an owner`);
    if (!['LIVE'].includes(c.disposition) && !c.note) errors.push(`${tag}: ${c.disposition} needs a note that says why`);
    for (const t of c.tests || []) if (!io.exists(t)) errors.push(`${tag}: test file missing ${t}`);
    if (c.proof?.fixture_test && !(c.tests || []).length) errors.push(`${tag}: fixture_test claimed without a test file`);
    if ((c.proof?.live_desktop || c.proof?.live_mobile) && !c.live_evidence) errors.push(`${tag}: live proof claimed without live_evidence`);
    if (c.host_message) {
      const [type, arg] = c.host_message.split(':');
      if (!engine.includes(`d.type==="${type}"`)) errors.push(`${tag}: the engine does not handle host message ${type}`);
      if (!hostText.includes(type)) errors.push(`${tag}: no host code sends ${type}`);
      if (arg && !engine.includes(`"${arg}"`)) errors.push(`${tag}: the engine has no "${arg}" for ${type}`);
      if (arg && type === 'native-control' && !hostText.includes(arg)) errors.push(`${tag}: no host code sends action ${arg}`);
    }
  }
  // Engine entry points the host never sends must be declared, never silent.
  const entries = [...engine.matchAll(/d\.lens==="([a-z0-9-]+)"/g)].map(m => ['lens', m[1]]).concat([...engine.matchAll(/d\.action==="([a-z0-9-]+)"/g)].map(m => ['action', m[1]]));
  const declared = new Set((reg.engine_only || []).map(e => `${e.kind}:${e.name}`));
  for (const [kind, name] of entries) {
    const sent = hostText.includes(name);
    if (!sent && !declared.has(`${kind}:${name}`)) errors.push(`engine ${kind} "${name}" has no host sender and is not declared in engine_only`);
    if (sent && declared.has(`${kind}:${name}`)) errors.push(`engine_only lists ${kind} "${name}" but the host now sends it; remove the entry`);
  }
  for (const e of reg.engine_only || []) if (!e.reason) errors.push(`engine_only ${e.name} has no reason`);
  if (caps.some(c => c.detected_by.includes('TELEMETRY_UI_ACTION')) && !io.exists('src/lib/research/elsTelemetryRuntime2029.js')) errors.push('TELEMETRY_UI_ACTION is named but the existing emitter is gone');
  return errors;
}

import { readdirSync } from 'node:fs';
const io = {
  read, exists,
  list: dir => readdirSync(new URL(dir + '/', root)).map(name => `${dir}/${name}`),
};
const reg = JSON.parse(read('docs/els-capability-register.json'));

test('the 85-capability register is complete, matches the audit document and its owners still exist', () => {
  assert.deepEqual(validateRegister(reg, io), []);
});

test('the guard really detects a vanished capability, a dead button, a false live claim and a silent engine entry point', () => {
  const clone = () => JSON.parse(JSON.stringify(reg));
  let r = clone(); r.capabilities.find(c => c.id === 'A03').owner[0].symbol = 'noSuchFunctionAnywhere';
  assert.ok(validateRegister(r, io).some(e => /A03: noSuchFunctionAnywhere no longer/.test(e)));
  r = clone(); r.capabilities.find(c => c.id === 'A03').host_message = 'native-control:no-such-action';
  assert.ok(validateRegister(r, io).some(e => /A03: the engine has no "no-such-action"/.test(e)));
  r = clone(); r.capabilities.find(c => c.id === 'G01').proof.live_mobile = true;
  assert.ok(validateRegister(r, io).some(e => /G01: live proof claimed without live_evidence/.test(e)));
  r = clone(); r.engine_only = [];
  assert.ok(validateRegister(r, io).some(e => /cross-third-axis" has no host sender/.test(e)));
  r = clone(); r.capabilities.pop();
  assert.ok(validateRegister(r, io).some(e => /expected 85|missing/.test(e)));
  r = clone(); r.capabilities.find(c => c.id === 'B07').disposition = 'LIVE'; r.capabilities.find(c => c.id === 'B07').note = '';
  assert.ok(validateRegister(r, io).some(e => /audit 13.2 says/.test(e)));
});

test('the readable register is generated from the JSON and never stale', () => {
  assert.equal(read('docs/els-capability-register.md'), renderRegisterMarkdown(reg),
    'docs/els-capability-register.md is stale: run node scripts/render-els-capability-register-md.mjs');
});
