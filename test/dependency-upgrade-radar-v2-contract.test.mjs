// G3_SYSTEM_UPGRADE_RADAR_V2 — contract guard.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const mig = read("supabase/migrations/20260919000500_g3_system_upgrade_radar_v2.sql");
const lock = JSON.parse(read("package-lock.json"));
const pkg = JSON.parse(read("package.json"));
const nvm = read(".nvmrc").trim();
const reEscape = s => s.replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");

// 1. EXTEND_EXISTING only.
assert.match(mig, /create or replace function public\.detect_suggestions\(\)/i);
assert.ok(!/create table(?! _st)/i.test(mig), "no new persistent store/table");
assert.ok(!/cron\.schedule\s*\(/i.test(mig), "no new cron");
assert.ok(!/create or replace function public\.(?!detect_suggestions)/i.test(mig), "no second detector RPC");

// 1b. Migration body must contain exactly one complete function definition (no duplicated tail).
assert.equal((mig.match(/create or replace function public\.detect_suggestions\(\)/gi) || []).length, 1);
assert.equal((mig.match(/end; \$function\$/g) || []).length, 1);

// 2. Only authoritative allowlisted outbound sources.
assert.match(mig, /https:\/\/registry\.npmjs\.org\//);
assert.match(mig, /https:\/\/nodejs\.org\/dist\/index\.json/);
const noComments = mig.replace(/--.*$/gm, "");
const urls = [...noComments.matchAll(/https:\/\/([^/'"]+)/g)].map(m => m[1]);
assert.deepEqual([...new Set(urls)].sort(), ["nodejs.org", "registry.npmjs.org"]);
assert.ok(!/vault\.decrypted_secrets|decrypted_secret/i.test(mig), "public metadata fetch must use no secret");
assert.match(mig, /CURLOPT_TIMEOUT_MS',\s*'3000'/);
assert.match(mig, /http_reset_curlopt\(\)/);

// 3. NPM baseline equals exact lock-resolved versions.
const expected = {
  "react": "19.3.0",
  "react-dom": "19.3.0",
  "react-router-dom": "7.18.4",
  "vite": "8.3.0",
  "@vitejs/plugin-react": "6.1.1",
  "@supabase/supabase-js": "2.116.0",
  "@vercel/edge": "1.3.3",
  "@vercel/og": "0.11.1",
  "@hebcal/core": "6.9.2",
};
for (const [name, version] of Object.entries(expected)) {
  assert.match(mig, new RegExp("\\('" + reEscape(name) + "',\\s*'" + reEscape(version) + "'\\)"));
  assert.equal(lock.packages?.["node_modules/" + name]?.version, version, name + " radar baseline must equal package-lock");
}
for (const removed of ["three", "@react-three/fiber", "@react-three/drei"]) {
  assert.ok(!new RegExp("\\('" + reEscape(removed) + "',").test(mig), removed + " must not stay in the runtime radar");
  assert.equal(pkg.dependencies?.[removed], undefined);
}

// 4. Stable-only semver classification and no false suggestion when current >= latest.
assert.match(mig, /v_latest is null or v_latest = '' or v_latest ~ '-'/);
assert.match(mig, /v_delta := 'major'; v_dep_conf := 55/);
assert.match(mig, /v_delta := 'minor'; v_dep_conf := 75/);
assert.match(mig, /v_delta := 'patch'; v_dep_conf := 90/);
assert.match(mig, /if v_delta is not null then/i);
assert.ok(!/else\s*\n\s*v_delta := '/i.test(mig));

// 5. Node baseline is real runtime pin and radar stays inside Node 24 LTS.
assert.equal(nvm, "24.21.0");
assert.match(pkg.engines.node, /24/);
assert.match(mig, /v_node_current text := '24\.21\.0'/);
assert.match(mig, /\^v24\[\.\]\[0-9\]\+\[\.\]\[0-9\]\+\$/);
assert.match(mig, /jsonb_typeof\(entry -> 'lts'\) = 'string'/);
assert.match(mig, /'lts_major', 24/);
assert.ok(!/v_node_lat_maj > v_node_maj/.test(mig), "Node major upgrades must remain a Foundation decision");
assert.match(mig, /dependency_upgrade:node:/);

// 6. Reuse existing suggestion primitive and dedupe.
assert.match(mig, /perform suggest_add\(/i);
assert.match(mig, /dependency_upgrade:' \|\| v_pkg\.pkg_name \|\| ':' \|\| v_latest/);
assert.match(mig, /'dependency_upgrade:node:' \|\| v_node_latest/);

// 7. Fail closed per source; never self-mutate.
assert.match(mig, /exception when others then\s*\n\s*continue;/i);
assert.ok(!/npm (i|install)|yarn add|pnpm add/i.test(mig));
assert.ok(!/git (commit|push|checkout)/i.test(mig));
assert.ok(!/status\s*=\s*'accepted'/i.test(mig));

console.log("dependency-upgrade-radar-v2-contract: PASS");
