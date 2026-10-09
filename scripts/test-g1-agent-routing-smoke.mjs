#!/usr/bin/env node
// G1 STATIC agent-entry routing smoke. Not a live fresh-agent replay.
// The live inter_agent_coordination_law owner and work_log decide real assignments.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

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
  pointsTo('task routing / owner creation / one-writer / handoff / fresh-agent entry / future event-driven dispatch', 'inter_agent_coordination_law');
  assert.match(adapter, /ONE SCOPE — ONE ACTIVE WRITER/);
  assert.match(adapter, /Do not merge\/deploy\/push/);
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

test('synchronization preserves current main Codex/Claude adapters and active Design V2', () => {
  for (const [path, blob] of Object.entries(baseline.main_immutable_blobs)) {
    const bytes = readFileSync(resolve(root, path));
    const actual = createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex');
    assert.equal(actual, blob, 'immutable main artifact: ' + path);
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

test('real GPT/Claude acceptance stays pending until live apply and released pointers', () => {
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
