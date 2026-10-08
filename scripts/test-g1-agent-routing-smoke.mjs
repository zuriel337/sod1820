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
  assert.match(adapter, /Read only that owner plus the \*\*smallest direct dependency set\*\*/);
  assert.match(adapter, /DRIFT/);
  assert.match(design, /V1 remains historical\/Legacy provenance/);
  assert.match(adapter, /without relying on prior conversation memory/);
});

// Deliberately not marked PASS here: a real fresh GPT/CLAUDE session must independently
// read the live DB owner + relevant work_log, claim exclusive WRITE if applicable,
// declare PRIMARY/BUILDER/REVIEWER/ACCEPTANCE, and provide AFTER provenance.
