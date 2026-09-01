import fs from "node:fs";
import assert from "node:assert/strict";

const adapter = fs.readFileSync(new URL("../src/lib/research/numberAnchorFinding.js", import.meta.url), "utf8");

assert.match(adapter, /kind: "number-anchor"/);
assert.match(adapter, /adapter: "number-anchors-legacy-v1"/);
assert.match(adapter, /sourceIdentity: \{ table: "number_anchors", value \}/);
assert.match(adapter, /entityRef: `number:\$\{value\}`/);
assert.match(adapter, /semanticBoundary: "curated-context-not-verified-fact"/);

// Projection must not promote legacy anchor text into truth/governance/publication axes.
assert.doesNotMatch(adapter, /stage:\s*["']/);
assert.doesNotMatch(adapter, /status:\s*["']/);
assert.doesNotMatch(adapter, /verification_state:\s*["']/);
assert.doesNotMatch(adapter, /access:\s*\{/);
assert.doesNotMatch(adapter, /engine:\s*["']gematria["']/);
assert.doesNotMatch(adapter, /facts:\s*\[[^\]]+\]/s);

// Read-only adapter: no Supabase client, no DB writes, no local calculation.
assert.doesNotMatch(adapter, /supabase|\.from\(|\.rpc\(|insert\(|update\(|upsert\(|delete\(/);

console.log("Number Anchor Universal Finding guard passed");
