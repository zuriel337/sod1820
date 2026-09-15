import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chooseProviderRoute, providerForModel } from '../src/lib/aiProviderRouter.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const costSource = readFileSync(join(ROOT, 'src/lib/cost.js'), 'utf8');

test('provider resolver recognizes Claude, Gemini and GPT families', () => {
  assert.equal(providerForModel('claude-sonnet-5'), 'anthropic');
  assert.equal(providerForModel('gemini-2.5-flash'), 'google');
  assert.equal(providerForModel('gpt-6-astra'), 'openai');
  assert.equal(providerForModel('future-model'), 'unknown');
});

test('free sufficient candidate wins before paid candidates', () => {
  const r = chooseProviderRoute({
    intelligence: 'L2_FAST',
    candidates: [
      { provider: 'google', model: 'gemini-2.5-flash', available: true, maxIntelligence: 'L3_DEEP', freeQuota: true },
      { provider: 'openai', model: 'gpt-fast', available: true, maxIntelligence: 'L3_DEEP', estimatedCostUsd: 0.002 },
      { provider: 'anthropic', model: 'claude-haiku-4-5', available: true, maxIntelligence: 'L3_DEEP', estimatedCostUsd: 0.005 },
    ],
  });
  assert.equal(r.state, 'ROUTED');
  assert.equal(r.primary.provider, 'google');
});

test('unavailable or insufficient provider is skipped', () => {
  const r = chooseProviderRoute({
    intelligence: 'L3_DEEP',
    candidates: [
      { provider: 'google', model: 'gemini-free', available: false, maxIntelligence: 'L4_TOOL_RESEARCH', freeQuota: true },
      { provider: 'openai', model: 'gpt-deep', available: true, maxIntelligence: 'L4_TOOL_RESEARCH', estimatedCostUsd: 0.01 },
      { provider: 'anthropic', model: 'claude-fast', available: true, maxIntelligence: 'L2_FAST', estimatedCostUsd: 0.001 },
    ],
  });
  assert.equal(r.primary.provider, 'openai');
});

test('challenger comes from a different provider when requested', () => {
  const r = chooseProviderRoute({
    intelligence: 'L2_FAST',
    needsChallenge: true,
    candidates: [
      { provider: 'google', model: 'gemini-x', available: true, maxIntelligence: 'L3_DEEP', estimatedCostUsd: 0 },
      { provider: 'google', model: 'gemini-y', available: true, maxIntelligence: 'L3_DEEP', estimatedCostUsd: 0.001 },
      { provider: 'openai', model: 'gpt-x', available: true, maxIntelligence: 'L3_DEEP', estimatedCostUsd: 0.002 },
    ],
  });
  assert.equal(r.primary.provider, 'google');
  assert.equal(r.challenger.provider, 'openai');
});

test('client cost helper is fail-closed for unknown pricing', () => {
  assert.match(costSource, /const p = MODEL_PRICES\[model\];/);
  assert.match(costSource, /if \(!p\)/);
  assert.match(costSource, /usd:\s*null/);
  assert.match(costSource, /ils:\s*null/);
  assert.match(costSource, /pricing:\s*"unknown"/);
  assert.doesNotMatch(costSource, /MODEL_PRICES\[model\]\s*\|\|\s*MODEL_PRICES\["claude-sonnet-5"\]/);
});

test('unknown cost is used only after known-cost sufficient candidates', () => {
  const r = chooseProviderRoute({
    intelligence: 'L1_MICRO',
    candidates: [
      { model: 'future-model', available: true, maxIntelligence: 'L5_SPECIALIST' },
      { provider: 'anthropic', model: 'claude-known', available: true, maxIntelligence: 'L2_FAST', estimatedCostUsd: 0.01 },
    ],
  });
  assert.equal(r.primary.provider, 'anthropic');
  assert.equal(r.fallbacks[0].provider, 'unknown');
});
