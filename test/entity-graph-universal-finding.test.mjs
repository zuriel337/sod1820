import fs from "node:fs";
import assert from "node:assert/strict";

const src = fs.readFileSync(new URL("../src/lib/research/entityGraphFinding.js", import.meta.url), "utf8");

assert.match(src, /kind: "graph-entity"/);
assert.match(src, /kind: "graph-relation"/);
assert.match(src, /entityRef: nodeRef\(id\)/);
assert.match(src, /relationRef: edgeRef\(id\)/);
assert.match(src, /fromNodeId/);
assert.match(src, /toNodeId/);
assert.match(src, /relationFamily/);
assert.match(src, /verification: \{ verification_state: null \}/);
assert.match(src, /stage: null/);
assert.match(src, /status: null/);
assert.doesNotMatch(src, /verification_state:\s*["']match["']/);
assert.doesNotMatch(src, /status:\s*["']canonical["']/);
assert.doesNotMatch(src, /stage:\s*["']finding["']/);
assert.doesNotMatch(src, /\.from\("nodes"\)[\s\S]*\.(insert|update|upsert|delete)\(/);
assert.doesNotMatch(src, /\.from\("edges"\)[\s\S]*\.(insert|update|upsert|delete)\(/);
assert.match(src, /\.or\(`from_node\.eq\.\$\{id\},to_node\.eq\.\$\{id\}`\)/);

console.log("entity-graph Universal Finding guard passed");
