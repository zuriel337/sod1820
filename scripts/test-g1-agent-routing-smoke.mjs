#!/usr/bin/env node
// G1 STATIC agent-entry routing smoke. Not a live fresh-agent replay.
// The live inter_agent_coordination_law owner and work_log decide real assignments.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const index = readFileSync(resolve(root, 'SOD1820_MASTER_OWNER_INDEX.md'), 'utf8');
const adapter = readFileSync(resolve(root, 'CLAUDE.md'), 'utf8');
const design = readFileSync(resolve(root, 'SOD1820_DESIGN_CONTRACT_V2.md'), 'utf8');
const legacyDesign = readFileSync(resolve(root, 'SOD1820_DESIGN_CONTRACT_V1.md'), 'utf8');

function ownerRow(label) {
  const found = index.split('\n').filter(line => line.startsWith('| ' + label + ' |'));
  assert.equal(found.length, 1, 'expected exactly one owner row: ' + label);
  return found[0];
}

function pointsTo(label, value) {
  assert.ok(ownerRow(label).includes(value), label + ' must route through ' + value);
}

test('WORLD ui_experience_work: current Reality + Experience + V2 visual owner', () => {
  pointsTo('One Reality Graph / One Tree / relations', 'reality_graph_law');
  pointsTo('Experience lifecycle / projection / zero legacy-UI inheritance', 'experience_governance_foundation_v1_law');
  pointsTo('visual language / typography / public naming', 'SOD1820_DESIGN_CONTRACT_V2.md');
  assert.doesNotMatch(ownerRow('visual language / typography / public naming'), /\x60SOD1820_DESIGN_CONTRACT_V1\.md\x60/);
});

test('post_visual: existing publication owner + V2; legacy adapter remains on demand', () => {
  pointsTo('publishing conventions / Post identity', 'project_codex.publishing_conventions');
  pointsTo('visual language / typography / public naming', 'SOD1820_DESIGN_CONTRACT_V2.md');
  pointsTo('legacy WordPress/gallery maintenance adapter', 'legacy_content_protocol');
  assert.match(ownerRow('legacy WordPress/gallery maintenance adapter'), /on demand/i);
});

test('gematria_research: exact engine / method registry, not model arithmetic', () => {
  pointsTo('deterministic Gematria execution/verification routing', 'project_codex.gematria_engine');
  pointsTo('Method identity / registry / aliases / conditional equivalence', 'canonical_methods_registry_law');
  assert.match(index, /Never use general-model arithmetic as canonical SOD1820 engine truth/);
});

test('release_gate: Foundation + canonical release owner + coordination', () => {
  pointsTo('Foundation gate sequence / bottom-up closure / maintenance acceptance / compaction', 'foundation_closure_protocol_law');
  pointsTo('Release authorization', 'deploy_on_request');
  const coordinationRows = index.split('\n').filter(line => line.startsWith('| task routing / owner creation / one-writer / handoff / fresh-agent entry /'));
  assert.equal(coordinationRows.length, 1, 'one current coordination owner row');
  assert.match(coordinationRows[0], /`inter_agent_coordination_law` \*\*v18 ACTIVE/);
  assert.match(adapter, /ONE SCOPE — ONE ACTIVE WRITER/);
  assert.match(adapter, /Do not merge\/deploy\/push/);
  assert.match(adapter, /passive work_log records with to_actor=ZURIEL/);
  assert.match(adapter, /אין לשלוח הודעות ל-GPT/);
  assert.match(adapter, /אין להמתין ל-ACK מ-GPT/);
});

test('fresh adapter: L1 default, minimal owner reads, history is fail-closed', () => {
  assert.match(index, /Default read budget: \*\*L1\*\*/);
  assert.match(adapter, /Do \*\*not\*\* automatically read all rules/);
  assert.match(adapter, /Load only that owner plus the \*\*smallest direct dependency set\*\*/);
  assert.match(adapter, /DRIFT/);
  assert.match(design, /V1 remains historical\/Legacy provenance/);
  assert.match(legacyDesign, /2029 STATUS: SUPERSEDED by/);
  assert.match(legacyDesign, /V1 is retained for Legacy compatibility and historical\/provenance use only/);
  assert.match(adapter, /without relying on prior conversation memory/);
  assert.match(index, /nodes\.type='rule' AND nodes\.is_active=true/);
  assert.match(index, /rules_active.*without filtering \x60is_active\x60/);
});

// Deliberately not marked PASS here: a real fresh GPT/CLAUDE session must independently
// read the live DB owner + relevant work_log, claim exclusive WRITE if applicable,
// declare PRIMARY/BUILDER/REVIEWER/ACCEPTANCE, and provide AFTER provenance.

import { createHash } from 'node:crypto';
import { parseLawsSnapshot, validateLawsSnapshot, compareLawsSnapshots, migrationTableViolations, ownerResolves, tablesCreated } from './lib/g1LawsSnapshotRules.mjs';

test('captured main Codex/Claude/Design blobs remain exact historical evidence; current adapters retain safety gates', () => {
  // Oct9 hashes seal the Oct9 source, not every later authorized adapter update.
  // Replay their exact captured commit; never rewrite the historical fixture.
  assert.match(baseline.main_sha, /^[0-9a-f]{40}$/);
  for (const [path, blob] of Object.entries(baseline.main_immutable_blobs)) {
    const bytes = execFileSync('git', ['show', `${baseline.main_sha}:${path}`], { cwd: root });
    const actual = createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex');
    assert.equal(actual, blob, 'immutable captured main artifact: ' + path);
  }
  const codex = readFileSync(resolve(root, 'AGENTS.md'), 'utf8');
  for (const current of [codex, adapter]) {
    assert.match(current, /dpl_46k9WvaD5QBUo969obYzJ7pKkNyq/);
    assert.match(current, /2029 Production cutover/);
    assert.match(current, /ONE (?:FILE \/ SCOPE|SCOPE) — ONE ACTIVE WRITER/);
    assert.match(current, /אין להמתין ל-ACK מ-GPT/);
  }
});

const packetDir = resolve(root, 'audits/g1-agent-entry');
const jsonFile = name => JSON.parse(readFileSync(resolve(packetDir, name), 'utf8'));
const packet = jsonFile('G1_ROUTING_RULE_SUCCESSORS_20261009.json');
const baseline = jsonFile('G1_ROUTING_LIVE_BASELINE_20261009.json');
const entryCases = jsonFile('G1_ROUTING_ENTRY_CASES_20261009.json');
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Test-only lookup over a captured scoped live read. This is not an agent/router.
function oneActiveRule(ruleId, rows = baseline.rules) {
  const matches = rows.filter(row => row.rule_id === ruleId && row.is_active === true);
  assert.equal(matches.length, 1, 'DRIFT: exactly one active owner required: ' + ruleId);
  assert.ok(Number.isInteger(matches[0].rule_version));
  return matches[0];
}

test('two successor candidates preserve all unrelated rule fields and lineage', () => {
  assert.equal(packet.status, 'PREPARED_NOT_APPLIED');
  assert.equal(packet.authorization, 'BRANCH_PREPARATION_ONLY');
  assert.equal(packet.canonical_project, 'linswmnnkjxvweumprav');
  assert.deepEqual(packet.amendments.map(x => x.rule_id).sort(),
    ['experience_governance_foundation_v1_law', 'live_state_resolution_law']);
  for (const change of packet.amendments) {
    const { before, candidate } = change;
    assert.equal(digest(before), change.source_row_sha256);
    assert.equal(digest(candidate), change.candidate_row_sha256);
    assert.equal(before.description.split(change.before_clause).length, 2);
    assert.equal(candidate.description, before.description.replace(change.before_clause, change.after_clause));
    assert.equal(candidate.rule_id, before.rule_id);
    assert.equal(candidate.rule_version, before.rule_version + 1);
    assert.equal(candidate.supersedes_version, before.rule_version);
    assert.equal(candidate.is_active, false, 'prepared candidate is never live');
    assert.equal(oneActiveRule(change.rule_id).id, before.id);
    assert.equal(oneActiveRule(change.rule_id).rule_version, change.source_version);
    assert.ok(!Object.hasOwn(candidate, 'id') && !Object.hasOwn(candidate, 'created_at'));
    for (const key of Object.keys(before)) {
      if (['id', 'created_at', 'description', 'label', 'rule_version', 'supersedes_version', 'is_active', 'metadata'].includes(key)) continue;
      assert.deepEqual(candidate[key], before[key], 'preserve ' + key);
    }
    const { g1_routing_amendment, ...originalMetadata } = candidate.metadata;
    assert.deepEqual(originalMetadata, before.metadata);
    assert.equal(g1_routing_amendment.source_node_id, before.id);
    assert.equal(g1_routing_amendment.human_gate_approval, null);
  }
});

test('Live State amendment touches only final entry clause; schema/live/DRIFT remain intact', () => {
  const amendment = packet.amendments.find(x => x.rule_id === 'live_state_resolution_law');
  assert.ok(amendment.before.description.endsWith(amendment.before_clause));
  assert.ok(amendment.candidate.description.endsWith(amendment.after_clause));
  assert.equal(amendment.candidate.description.slice(0, -amendment.after_clause.length),
    amendment.before.description.slice(0, -amendment.before_clause.length));
  assert.equal(amendment.candidate.label, amendment.before.label);
  for (const text of ['LIVE-FIRST', 'OWNER-FIRST', 'inter_agent_coordination_law', 'work_log_current', 'DB WRITE', 'DRIFT']) {
    assert.ok(amendment.after_clause.includes(text));
  }
  assert.match(amendment.after_clause, /אין חובת קריאה גורפת/);
  assert.match(amendment.after_clause, /אימות סכמה חיה/);
  assert.match(amendment.after_clause, /ההיסטורי אינו מופעל מחדש/);
});

test('Experience amendment changes only 2029 Design dependency, preserves Brand history', () => {
  const amendment = packet.amendments.find(x => x.rule_id === 'experience_governance_foundation_v1_law');
  assert.equal(amendment.before_clause, 'Dependencies: SOD1820_DESIGN_CONTRACT_V1.md,');
  assert.match(amendment.after_clause, /SOD1820_DESIGN_CONTRACT_V2\.md/);
  assert.match(amendment.after_clause, /V1 remains historical\/Legacy provenance/);
  assert.match(amendment.after_clause, /all Brand Core protections remain in force/);
  assert.equal(amendment.candidate.label, amendment.before.label.replace('v8', 'v9'));
  assert.deepEqual(amendment.candidate.depends_on, amendment.before.depends_on);
  assert.equal(baseline.historical_onboarding.is_active, false);
  assert.equal(baseline.protected_brand_owners.length, 2);
  for (const owner of baseline.protected_brand_owners) {
    assert.equal(oneActiveRule(owner.rule_id).rule_version, owner.rule_version);
    assert.ok(owner.description.includes('SOD1820_DESIGN_CONTRACT_V1.md'));
    assert.ok(!packet.amendments.some(x => x.rule_id === owner.rule_id));
  }
});

for (const task of entryCases.cases) {
  test(task.id + ': owner, captured active versions, direct dependencies and permissions', () => {
    pointsTo(task.index_responsibility, task.primary_owner);
    for (const ruleId of task.required_rules) {
      const row = oneActiveRule(ruleId);
      assert.equal(row.rule_version, task.baseline_versions[ruleId], 'stale case version: ' + ruleId);
    }
    for (const dependencyOwner of task.direct_dependencies_of) {
      const owner = oneActiveRule(dependencyOwner);
      assert.deepEqual(task.declared_direct_dependencies[dependencyOwner], owner.depends_on || []);
      for (const dependency of owner.depends_on || []) {
        if (dependency.endsWith('.md')) {
          assert.equal(dependency, 'SOD1820_DESIGN_CONTRACT_V1.md', 'protected Brand provenance exception');
          continue;
        }
        oneActiveRule(dependency);
      }
    }
    if (task.primary_owner.startsWith('project_codex.')) {
      const slug = task.primary_owner.slice('project_codex.'.length);
      const codex = baseline.codex.filter(x => x.slug === slug);
      assert.equal(codex.length, 1);
      assert.ok(codex[0].updated_at);
      assert.ok(!Object.hasOwn(codex[0], 'rule_version'), 'never invent codex law versions');
    }
    assert.ok(task.required_permissions.read);
    assert.ok(task.required_permissions.db_write && task.required_permissions.publish);
    assert.ok(task.conditional_reads.length > 0);
    assert.ok(!task.required_artifacts.includes('all nodes rules'));
    assert.equal(entryCases.grant_scope.live_rule_write, false);
    assert.equal(entryCases.grant_scope.publication, false);
    assert.equal(entryCases.grant_scope.merge, false);
    assert.equal(entryCases.grant_scope.production_deploy, false);
  });
}

test('canonical Gematria route uses registered public method; stale codex v5 cannot override live v6', () => {
  const task = entryCases.cases.find(x => x.id === 'gematria_research');
  assert.equal(oneActiveRule('canonical_methods_registry_law').rule_version, 6);
  assert.equal(oneActiveRule('gematria_engine_law').rule_version, 2);
  const method = baseline.gematria_probe.method;
  assert.equal(method.method_key, 'רגיל');
  assert.equal(method.version, 1);
  assert.equal(method.active, true);
  assert.equal(method.in_engine, true);
  assert.equal(method.deterministic, true);
  assert.equal(method.function, 'fn_ragil');
  assert.equal(method.required_entitlement, 'public');
  assert.equal(baseline.gematria_probe.profile_signature, 'fn_method_profile(text,text)');
  assert.ok(task.required_permissions.execute);
  assert.ok(!task.required_rules.includes('experience_governance_foundation_v1_law'));
  assert.ok(!task.required_artifacts.includes('SOD1820_DESIGN_CONTRACT_V2.md'));
  assert.equal(baseline.known_drift[0].live_owner_version, 6);
});

test('adversarial owner snapshots fail closed for inactive, duplicate and stale versions', () => {
  const ruleId = 'experience_governance_foundation_v1_law';
  const owner = oneActiveRule(ruleId);
  const withoutOwner = baseline.rules.filter(x => x.rule_id !== ruleId);
  assert.throws(() => oneActiveRule(ruleId, [...withoutOwner, { ...owner, is_active: false }]), /exactly one active/);
  assert.throws(() => oneActiveRule(ruleId, [...baseline.rules, { ...owner, rule_version: 9 }]), /exactly one active/);
  const live = packet.amendments.find(x => x.rule_id === ruleId);
  assert.throws(() => assert.equal(owner.rule_version, live.proposed_version));
  assert.throws(() => assert.equal(oneActiveRule('canonical_methods_registry_law').rule_version, 5));
  assert.throws(() => oneActiveRule('agent_onboarding_law'));
});

test('historical preparation snapshot never claims real GPT/Claude acceptance', () => {
  assert.equal(entryCases.fresh_sessions.length, 8);
  assert.equal(new Set(entryCases.fresh_sessions.map(x => x.actor + ':' + x.case_id)).size, 8);
  for (const replay of entryCases.fresh_sessions) {
    assert.equal(replay.status, 'NOT_RUN_WAITING_AUTHORIZED_LIVE_APPLY');
    assert.equal(replay.session_id, null);
    assert.equal(replay.read_trace, null);
    assert.equal(replay.after_work_log_id, null);
  }
  assert.equal(entryCases.post_apply_preconditions.live_rule_versions.live_state_resolution_law, 3);
  assert.equal(entryCases.post_apply_preconditions.live_rule_versions.experience_governance_foundation_v1_law, 9);
  assert.match(entryCases.evidence_requirements.join(' '), /Static fixture results are not fresh-agent acceptance/);
});

const applied = jsonFile('G1_ROUTING_APPLIED_EVIDENCE_20261009.json');

test('applied evidence matches approved successor bodies, lineage and explicit approval', () => {
  assert.equal(applied.canonical_project, packet.canonical_project);
  assert.equal(applied.successors.length, 2);
  for (const amendment of packet.amendments) {
    const live = applied.successors.find(row => row.rule_id === amendment.rule_id);
    assert.ok(live && live.is_active);
    assert.equal(live.rule_version, amendment.proposed_version);
    assert.equal(applied.active_versions[live.rule_id], live.rule_version);
    assert.equal(live.supersedes_version, amendment.source_version);
    assert.notEqual(live.id, amendment.source_node_id);
    for (const key of Object.keys(amendment.candidate)) {
      if (['metadata', 'is_active'].includes(key)) continue;
      assert.deepEqual(live[key], amendment.candidate[key], 'approved field: ' + key);
    }
    const { g1_routing_amendment, ...originalMetadata } = live.metadata;
    assert.deepEqual(originalMetadata, amendment.before.metadata);
    assert.equal(g1_routing_amendment.status, 'APPLIED');
    assert.equal(g1_routing_amendment.human_gate_approval, applied.approval_work_log_id);
    assert.equal(g1_routing_amendment.approved_sha, applied.approved_packet_sha);
  }
  const currentVersion = Number(ownerRow('Experience lifecycle / projection / zero legacy-UI inheritance').match(/\*\*v(\d+) ACTIVE/)?.[1]);
  assert.ok(Number.isInteger(currentVersion) && currentVersion >= applied.active_versions.experience_governance_foundation_v1_law,
    'current owner cannot regress below the accepted historical successor');
});

test('post-apply case expectations resolve actual successors without granting writes or closure', () => {
  for (const task of entryCases.cases) {
    for (const ruleId of task.required_rules) {
      const expected = applied.active_versions[ruleId] ?? task.baseline_versions[ruleId];
      const actual = applied.successors.find(row => row.rule_id === ruleId) ?? oneActiveRule(ruleId);
      assert.equal(actual.rule_version, expected);
    }
  }
  assert.equal(applied.fresh_sessions.length, 8);
  assert.equal(applied.g1_closed, false);
  for (const replay of applied.fresh_sessions) {
    assert.equal(replay.status, 'NOT_RUN_WAITING_CODE_POINTER_RELEASE');
    assert.equal(replay.session_id, null);
    assert.equal(replay.read_trace, null);
    assert.equal(replay.after_work_log_id, null);
  }
});

// ── Dated active-laws snapshot and enforcement fixtures (focused alignment, ZURIEL 12.11.2026) ───────────────────
// Real data: audits/g1-agent-entry/G1_LAWS_ACTIVE_SNAPSHOT_20261112.txt (read-only dated copy, no service key) and
// audits/g1-agent-entry/G1_MIGRATION_TABLES_BASELINE_20261112.txt. The historical 9.10.2026 baseline above is untouched.
// Scope, stated honestly: CI sees only what passes through Git. A direct database write (service_role / postgres) is not seen here;
// see the alignment README section 6 for what the database trigger does and does not enforce.
const lawsText = readFileSync(resolve(root, 'audits/g1-agent-entry/G1_LAWS_ACTIVE_SNAPSHOT_20261112.txt'), 'utf8');
const lawsSnapshot = parseLawsSnapshot(lawsText);
const fileExists = path => existsSync(resolve(root, path));
const ENFORCE_CTX = { index, fileExists, retiredWithoutSuccessor: ['agent_onboarding_law', 'corpus_admission_lifecycle_law', 'meshulash_kadmi_law'] };
const clone = x => JSON.parse(JSON.stringify(x));
const ownerOk = owner => ownerResolves(owner, new Set(lawsSnapshot.active.map(l => l.rule_id)), fileExists);

test('dated laws snapshot (real data): 87 active laws pass every ownership rule; 44 retired laws keep a recorded successor except the three known gaps', () => {
  assert.equal(lawsSnapshot.active.length, 87);
  assert.equal(lawsSnapshot.retired.length, 44);
  assert.deepEqual(validateLawsSnapshot(lawsSnapshot, ENFORCE_CTX), []);
});

test('ENFORCEMENT 1 · reference to a retired owner: refused', () => {
  const retiredId = lawsSnapshot.retired.find(r => r.owner !== '-').rule_id;
  const a = clone(lawsSnapshot); a.active.find(l => l.rule_id === 'big_number').owner = retiredId;
  assert.match(validateLawsSnapshot(a, ENFORCE_CTX).join('\n'), /big_number: owner .* is a retired law/);
  const b = clone(lawsSnapshot); b.active.find(l => l.rule_id === 'big_number').owner = 'no_such_owner_law';
  assert.match(validateLawsSnapshot(b, ENFORCE_CTX).join('\n'), /big_number: owner no_such_owner_law does not resolve/);
  const c = clone(lawsSnapshot); c.active.find(l => l.rule_id === 'big_number').owner = 'docs/no-such-file.md';
  assert.match(validateLawsSnapshot(c, ENFORCE_CTX).join('\n'), /does not resolve/);
  const d = clone(lawsSnapshot); d.retired.push({ rule_id: 'brand_new_retired_law', version: 1, owner: '-' });
  assert.match(validateLawsSnapshot(d, ENFORCE_CTX).join('\n'), /brand_new_retired_law: retired without a recorded successor/);
  const e = clone(lawsSnapshot); e.retired.find(r => r.rule_id === 'ai_quota_law').owner = 'unified_graph_law';
  assert.match(validateLawsSnapshot(e, ENFORCE_CTX).join('\n'), /ai_quota_law: recorded successor unified_graph_law is itself retired/);
  const f = clone(lawsSnapshot); f.active.find(l => l.rule_id === 'deploy_on_request').rule_id = 'deploy_on_request_renamed';
  f.active.find(l => l.rule_id === 'deploy_on_request_renamed').owner = 'deploy_on_request_renamed';
  assert.match(validateLawsSnapshot(f, ENFORCE_CTX).join('\n'), /deploy_on_request_renamed: owner law missing from the Owner Index/);
});

test('ENFORCEMENT 1 · proper extension: allowed', () => {
  const a = clone(lawsSnapshot);
  a.active.push({ rule_id: 'new_child_of_intake_law', version: 1, owner: 'research_intake_foundation_contract_law', family: 'research_intake', md5: '0123456789ab' });
  a.active.push({ rule_id: 'new_child_of_codex_pointer', version: 1, owner: 'project_codex.gematria_engine', family: 'gematria', md5: '0123456789ac' });
  a.active.push({ rule_id: 'new_child_with_file_owner', version: 1, owner: 'SOD1820_DESIGN_CONTRACT_V2.md', family: 'brand_design', md5: '0123456789ad' });
  assert.deepEqual(validateLawsSnapshot(a, ENFORCE_CTX), [], 'children of an active owner, a codex pointer or an existing file are valid extensions');
  const b = clone(lawsSnapshot); b.retired.push({ rule_id: 'newly_retired_law', version: 2, owner: 'reality_graph_law' });
  assert.deepEqual(validateLawsSnapshot(b, ENFORCE_CTX), [], 'a retired law with a recorded active successor is valid');
  const c = clone(lawsSnapshot); c.active.push({ rule_id: 'new_owner_law_in_index', version: 1, owner: 'new_owner_law_in_index', family: 'x', md5: '0123456789ae' });
  assert.deepEqual(validateLawsSnapshot(c, { ...ENFORCE_CTX, index: index + '\n| new topic | `new_owner_law_in_index` |' }), [], 'a new self-owning law is valid once the Owner Index routes it');
});

test('ENFORCEMENT 2 · change of an existing contract: in-place edit, silent removal and backwards version refused; a new version allowed', () => {
  const next = clone(lawsSnapshot);
  assert.deepEqual(compareLawsSnapshots(lawsSnapshot, next), [], 'identical snapshots: nothing changed');
  const inPlace = clone(lawsSnapshot); inPlace.active.find(l => l.rule_id === 'platform_tiers_law').md5 = 'ffffffffffff';
  assert.match(compareLawsSnapshots(lawsSnapshot, inPlace).join('\n'), /platform_tiers_law: text changed in place at v5/);
  const removed = clone(lawsSnapshot); removed.active = removed.active.filter(l => l.rule_id !== 'number_page_law');
  assert.match(compareLawsSnapshots(lawsSnapshot, removed).join('\n'), /number_page_law: removed from the active tree without a retirement record/);
  const back = clone(lawsSnapshot); back.active.find(l => l.rule_id === 'platform_tiers_law').version = 4;
  assert.match(compareLawsSnapshots(lawsSnapshot, back).join('\n'), /platform_tiers_law: version went backwards/);
  const emptyBump = clone(lawsSnapshot); emptyBump.active.find(l => l.rule_id === 'platform_tiers_law').version = 6;
  assert.match(compareLawsSnapshots(lawsSnapshot, emptyBump).join('\n'), /version bumped without any text change/);
  const bump = clone(lawsSnapshot); const t = bump.active.find(l => l.rule_id === 'platform_tiers_law'); t.version = 6; t.md5 = 'abcdefabcdef';
  assert.deepEqual(compareLawsSnapshots(lawsSnapshot, bump), [], 'a new version with changed text is the proper way to change a contract');
  const retire = clone(lawsSnapshot); retire.active = retire.active.filter(l => l.rule_id !== 'number_page_law'); retire.retired.push({ rule_id: 'number_page_law', version: 1, owner: 'platform_tiers_law' });
  assert.deepEqual(compareLawsSnapshots(lawsSnapshot, retire), [], 'retirement with a retirement record is allowed (the approval gate is outside CI)');
});

test('ENFORCEMENT 3a · a new law needs a recorded approval; with one it is allowed', () => {
  const next = clone(lawsSnapshot);
  next.active.push({ rule_id: 'brand_new_law', version: 1, owner: 'reality_graph_law', family: 'reality_graph', md5: '0123456789af' });
  assert.match(compareLawsSnapshots(lawsSnapshot, next).join('\n'), /brand_new_law: new law without a recorded approval/);
  assert.deepEqual(compareLawsSnapshots(lawsSnapshot, next, { approvedNewLaws: ['brand_new_law'] }), []);
});

test('ENFORCEMENT 3b · a new table in a migration: real migrations create nothing outside the dated baseline', () => {
  const baseline = new Set(readFileSync(resolve(root, 'audits/g1-agent-entry/G1_MIGRATION_TABLES_BASELINE_20261112.txt'), 'utf8').split('\n').filter(l => l && !l.startsWith('#')));
  assert.ok(baseline.size >= 41);
  const dir = resolve(root, 'supabase/migrations');
  const files = readdirSync(dir).filter(f => f.endsWith('.sql')).map(f => ({ path: 'supabase/migrations/' + f, text: readFileSync(resolve(dir, f), 'utf8') }));
  assert.deepEqual(migrationTableViolations(files, baseline, { ownerOk }), []);
});

test('ENFORCEMENT 3b · new table fixtures: refused without a justification, allowed with a valid one', () => {
  const baseline = new Set(['public.account_link_events']);
  const ctx = { ownerOk };
  const sql = 'create table if not exists public.brand_new_store (id uuid primary key);';
  assert.deepEqual(tablesCreated(sql), new Set(['public.brand_new_store']));
  assert.match(migrationTableViolations([{ path: 'm1.sql', text: sql }], baseline, ctx).join('\n'), /m1\.sql: new table public\.brand_new_store has no "-- OWNER-CHECK:" justification/);
  assert.match(migrationTableViolations([{ path: 'm2.sql', text: '-- OWNER-CHECK: EXTEND_EXISTING no_such_owner_law\n' + sql }], baseline, ctx).join('\n'), /does not resolve to an active owner/);
  assert.match(migrationTableViolations([{ path: 'm3.sql', text: '-- OWNER-CHECK: NEW SOME_CLASS research_intake_foundation_contract_law APPROVAL:x\n' + sql }], baseline, ctx).join('\n'), /needs an Intake classification/);
  assert.match(migrationTableViolations([{ path: 'm4.sql', text: '-- OWNER-CHECK: NEW SOURCE_INGRESS_PROVENANCE research_intake_foundation_contract_law\n' + sql }], baseline, ctx).join('\n'), /needs APPROVAL:<reference>/);
  assert.deepEqual(migrationTableViolations([{ path: 'ok1.sql', text: '-- OWNER-CHECK: EXTEND_EXISTING research_intake_foundation_contract_law\n' + sql }], baseline, ctx), [], 'extending an existing owner is allowed');
  assert.deepEqual(migrationTableViolations([{ path: 'ok2.sql', text: '-- OWNER-CHECK: NEW SOURCE_INGRESS_PROVENANCE research_intake_foundation_contract_law APPROVAL:ZURIEL-12.11\n' + sql }], baseline, ctx), [], 'a justified, approved new structure is allowed');
  assert.deepEqual(migrationTableViolations([{ path: 'ok3.sql', text: 'create table public.account_link_events (id int);' }], baseline, ctx), [], 'a table already in the baseline needs nothing');
  assert.deepEqual(tablesCreated('create table private.hidden_x (a int); CREATE TABLE IF NOT EXISTS "public"."Quoted_Y" (a int);'), new Set(['private.hidden_x', 'public.quoted_y']));
});
