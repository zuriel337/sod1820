// G3_SYSTEM_UPGRADE_RADAR_V2 — contract guard.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const mig = read("supabase/migrations/20260919000500_g3_system_upgrade_radar_v2.sql");
const lock = JSON.parse(read("package-lock.json"));
const pkg = JSON.parse(read("package.json"));
const nvm = read(".nvmrc").trim();
const reEscape = s => s.replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");

// 1. EXTEND_EXISTING only; one complete function body.
assert.match(mig, /create or replace function public\.detect_suggestions\(\)/i);
assert.equal((mig.match(/create or replace function public\.detect_suggestions\(\)/gi) || []).length, 1);
assert.equal((mig.match(/end; \$function\$/g) || []).length, 1);
assert.ok(!/create table(?! _st)/i.test(mig), "no new persistent store/table");
assert.ok(!/cron\.schedule\s*\(/i.test(mig), "no new cron");
assert.ok(!/create or replace function public\.(?!detect_suggestions)/i.test(mig), "no second detector RPC");

// 2. Outbound sources are fixed, authoritative, and unauthenticated.
assert.match(mig, /https:\/\/raw\.githubusercontent\.com\/zuriel337\/sod1820\/main\/package-lock\.json/);
assert.match(mig, /https:\/\/raw\.githubusercontent\.com\/zuriel337\/sod1820\/main\/\.nvmrc/);
assert.match(mig, /https:\/\/registry\.npmjs\.org\//);
assert.match(mig, /https:\/\/nodejs\.org\/dist\/index\.json/);
const noComments = mig.replace(/--.*$/gm, "");
const hosts = [...noComments.matchAll(/https:\/\/([^/'"]+)/g)].map(m => m[1]);
assert.deepEqual([...new Set(hosts)].sort(), [
  "nodejs.org",
  "raw.githubusercontent.com",
  "registry.npmjs.org",
]);
assert.ok(!/vault\.decrypted_secrets|decrypted_secret/i.test(mig), "radar metadata fetch must use no secret");
assert.match(mig, /CURLOPT_TIMEOUT_MS',\s*'3000'/);
assert.match(mig, /http_reset_curlopt\(\)/);

// 3. Current package versions are dynamic from origin/main package-lock, not frozen in SQL.
assert.match(mig, /v_current := v_lock #>> array\['packages', 'node_modules\/' \|\| v_pkg\.pkg_name, 'version'\]/);
const monitored = [
  "react",
  "react-dom",
  "react-router-dom",
  "vite",
  "@vitejs/plugin-react",
  "@supabase/supabase-js",
  "@vercel/edge",
  "@vercel/og",
  "@hebcal/core",
];
for (const name of monitored) {
  assert.match(mig, new RegExp("\\('" + reEscape(name) + "'\\)"));
  const resolved = lock.packages?.["node_modules/" + name]?.version;
  assert.ok(resolved, name + " must exist in the current lockfile");
  assert.ok(
    !new RegExp("\\('" + reEscape(name) + "',\\s*'" + reEscape(resolved) + "'\\)").test(mig),
    name + " current version must not be hardcoded into the radar"
  );
}
for (const removed of ["three", "@react-three/fiber", "@react-three/drei"]) {
  assert.ok(!new RegExp("\\('" + reEscape(removed) + "'\\)").test(mig), removed + " must not stay in the radar");
  assert.equal(pkg.dependencies?.[removed], undefined);
}

// 4. Stable-only semver classification; latest <= current creates no suggestion.
assert.match(mig, /v_current is null or v_current = '' or v_current ~ '-'/);
assert.match(mig, /v_latest is null or v_latest = '' or v_latest ~ '-'/);
assert.match(mig, /v_delta := 'major'; v_dep_conf := 55/);
assert.match(mig, /v_delta := 'minor'; v_dep_conf := 75/);
assert.match(mig, /v_delta := 'patch'; v_dep_conf := 90/);
assert.match(mig, /if v_delta is not null then/i);
assert.ok(!/else\s*\n\s*v_delta := '/i.test(mig));

// 5. Node current version is dynamic from origin/main .nvmrc and stays within its pinned LTS major.
assert.match(nvm, /^\d+\.\d+\.\d+$/);
assert.match(pkg.engines.node, /24/);
assert.match(mig, /v_node_current := regexp_replace\(btrim\(v_resp\.content/);
assert.match(mig, /v_node_maj := split_part\(v_node_current, '\.', 1\)::int/);
assert.match(mig, /'\^v' \|\| v_node_maj::text/);
assert.match(mig, /jsonb_typeof\(entry -> 'lts'\) = 'string'/);
assert.match(mig, /v_node_lat_maj = v_node_maj and v_node_lat_min > v_node_min/);
assert.match(mig, /'lts_major', v_node_maj/);
assert.match(mig, /dependency_upgrade:node:/);

// 6. Existing suggestion primitive + version-specific dedupe are reused.
assert.match(mig, /perform suggest_add\(/i);
assert.match(mig, /dependency_upgrade:' \|\| v_pkg\.pkg_name \|\| ':' \|\| v_latest/);
assert.match(mig, /'dependency_upgrade:node:' \|\| v_node_latest/);
assert.match(mig, /'current_source', 'raw\.githubusercontent\.com\/zuriel337\/sod1820\/main\/package-lock\.json'/);
assert.match(mig, /'latest_source', 'registry\.npmjs\.org'/);

// 7. Fail closed; V2 still only suggests and cannot mutate the repo/release state.
assert.match(mig, /exception when others then\s*\n\s*continue;/i);
assert.ok(!/npm (i|install)|yarn add|pnpm add/i.test(noComments));
assert.ok(!/git (commit|push|checkout)/i.test(noComments));
assert.ok(!/status\s*=\s*'accepted'/i.test(noComments));

console.log("dependency-upgrade-radar-v2-contract: PASS");
