// G3_SYSTEM_UPGRADE_RADAR_V1 — guard test.
//
// EXTEND_EXISTING system_suggestions_law v2 / system-watchman: this migration adds a third
// detector ("dependency_upgrade_radar") inside the existing public.detect_suggestions(), which
// the existing weekly system-watchman cron job already calls via public.system_watchman_run().
// No new table/store/registry/cron job/Edge Function may be introduced. Locks in: the stable-vs
// pre-release filter, per-package dedupe key, bounded/allowlisted registry access with a
// fail-closed per-package guard, the major/minor/patch classification (and the "no suggestion
// when current is already latest" case), and that the only write side effect is the existing
// suggest_add() primitive — no repo edit, install, deploy, or auto-acceptance.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const mig = read("supabase/migrations/20260918223500_g3_system_upgrade_radar_v1.sql");

// ── 1. Same function, EXTEND_EXISTING — no new table/store/registry/cron/Edge Function. ────────
assert.match(mig, /create or replace function public\.detect_suggestions\(\)/i);
assert.match(mig, /security definer/i);
assert.ok(!/create table(?! _st)/i.test(mig), "no new persistent table/store/registry may be created");
assert.ok(!/cron\.schedule\s*\(/i.test(mig), "this slice must never create/enable a new cron job");
assert.ok(!/create or replace function public\.(?!detect_suggestions)/i.test(mig),
  "this slice must extend detect_suggestions() only — no new/other RPC");
assert.ok(!/deploy_edge_function|supabase functions deploy/i.test(mig), "no Edge Function deploy from this slice");

// ── 2. Registry access is allowlisted to exactly one host, unauthenticated, bounded timeout. ───
assert.match(mig, /https:\/\/registry\.npmjs\.org\//,
  "must fetch from the official npm registry");
assert.ok(!/https?:\/\/(?!registry\.npmjs\.org)[a-z0-9.-]+\.[a-z]{2,}/i.test(
  mig.replace(/--.*$/gm, "") // strip SQL comments, which may mention other hosts descriptively
), "no host other than registry.npmjs.org may be fetched");
assert.match(mig, /array\[\]::extensions\.http_header\[\]/,
  "registry GET must send no headers — a secret must never be attached to this request");
assert.match(mig, /http_set_curlopt\('CURLOPT_TIMEOUT_MS',\s*'3000'\)/,
  "each registry request must be bounded by an explicit timeout");
assert.match(mig, /http_reset_curlopt\(\)/, "the curl timeout override must be reset after the loop");
assert.ok(!/vault\.decrypted_secrets|decrypted_secret/i.test(mig),
  "no secret may ever be read for an unauthenticated public-registry GET");

// ── 3. Fail-closed per package: one registry error/timeout must never abort the whole pass. ────
assert.match(mig, /exception when others then\s*\n\s*continue;/i,
  "each package must be wrapped so one failure never blocks the others or the rest of the watchman pass");
assert.match(mig, /if v_resp\.status <> 200 or v_resp\.content is null then\s*\n\s*continue;/i,
  "a non-200/empty registry response must be skipped, never guessed at");

// ── 4. Stable-vs-prerelease filter: any hyphenated version is rejected, never surfaced. ─────────
assert.match(mig, /v_latest is null or v_latest = '' or v_latest ~ '-'/,
  "any hyphenated (pre-release) latest version must be rejected before classification");

// ── 5. major/minor/patch classification, and no suggestion when current is already latest. ─────
assert.match(mig, /if v_lat_maj > v_cur_maj then\s*\n\s*v_delta := 'major'; v_dep_conf := 55;/i);
assert.match(mig, /elsif v_lat_maj = v_cur_maj and v_lat_min > v_cur_min then\s*\n\s*v_delta := 'minor'; v_dep_conf := 75;/i);
assert.match(mig, /elsif v_lat_maj = v_cur_maj and v_lat_min = v_cur_min and v_lat_pat > v_cur_pat then\s*\n\s*v_delta := 'patch'; v_dep_conf := 90;/i);
assert.ok(!/else\s*\n\s*v_delta := '/i.test(mig),
  "there must be no unconditional else branch assigning v_delta — equal/behind-latest must stay null (no suggestion)");
assert.match(mig, /if v_delta is not null then/i,
  "suggest_add must only be reached when an actual upgrade delta was classified");

// ── 6. Dedupe reuses the existing system_suggestions primitive exactly — per package + version. ─
assert.match(mig, /'dependency_upgrade:' \|\| v_pkg\.pkg_name \|\| ':' \|\| v_latest/,
  "dedupe key must be scoped per package and per latest version, via the existing suggest_add() dedupe_key");
assert.match(mig, /perform suggest_add\(\s*\n\s*'performance', 'dependency_upgrade_radar',/,
  "must reuse the existing suggest_add() primitive under category 'performance' (already mapped in SystemSuggestionsTab.jsx)");

// ── 7. Allowlist reverified against package.json pins as of this migration — no invented facts. ─
const pkgJson = JSON.parse(read("package.json"));
const allDeps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
const expected = {
  "react": "18.3.1",
  "react-dom": "18.3.1",
  "react-router-dom": "7.17.0",
  "vite": "5.4.2",
  "@vitejs/plugin-react": "4.3.1",
  "three": "0.169.0",
  "@react-three/fiber": "8.18.0",
  "@react-three/drei": "9.122.0",
  "@supabase/supabase-js": "2.108.0",
};
for (const [pkg, pinned] of Object.entries(expected)) {
  assert.match(mig, new RegExp(`\\('${pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}',\\s*'${pinned.replace(/\./g, "\\.")}'\\)`),
    `allowlist must pin ${pkg} at ${pinned}`);
  assert.ok(allDeps[pkg], `${pkg} must actually exist in package.json`);
  assert.ok(
    allDeps[pkg].replace(/^[\^~]/, "") === pinned,
    `allowlist pin for ${pkg} (${pinned}) must match the live package.json range (${allDeps[pkg]})`
  );
}
// Node engine is intentionally out of scope for V1 (package.json has no engines.node to compare
// against) — this must stay a documented gap, not a fabricated comparison.
assert.ok(!pkgJson.engines || !pkgJson.engines.node,
  "test fixture assumption: package.json still has no engines.node pin; re-scope this detector if that changes");
assert.match(mig, /Node engine:[^\n]*no "engines\.node" pin/i,
  "the migration must document why Node engine is out of scope rather than silently omitting it");

// ── 8. No self-mutation: no repo/package edit, no install, no deploy, no auto-acceptance. ───────
assert.ok(!/npm (i|install)|yarn add|pnpm add/i.test(mig), "must never install/upgrade a package itself");
assert.ok(!/status\s*=\s*'accepted'/i.test(mig), "must never auto-accept a suggestion on ZURIEL's behalf");
assert.ok(!/git (commit|push|checkout)/i.test(mig), "must never perform a repo mutation from SQL");

console.log("dependency-upgrade-radar-contract: PASS");
