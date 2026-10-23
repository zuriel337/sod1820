import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BOUNDARY_PATH = join(ROOT, "audits/claude_shadow_research_v1/experiment_boundary.json");
const boundary = JSON.parse(readFileSync(BOUNDARY_PATH, "utf8"));
const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".json"]);

function filesBelow(path) {
  if (!existsSync(path)) return [];
  const out = [];
  for (const name of readdirSync(path)) {
    const child = join(path, name);
    if (statSync(child).isDirectory()) out.push(...filesBelow(child));
    else if (SOURCE_EXTENSIONS.has(extname(child))) out.push(child);
  }
  return out;
}

test("shadow laboratory remains disabled, removable and absent from product runtime", () => {
  assert.equal(boundary.status, "disabled_by_default");
  assert.equal(boundary.runtime_enabled, false);
  assert.equal(boundary.canonical, false);
  assert.equal(boundary.published, false);
  for (const key of ["runtime_entrypoints", "deployment_resources", "database_resources_created", "scheduled_jobs", "feature_flags"]) {
    assert.deepEqual(boundary[key], [], key);
  }
  for (const path of boundary.owned_paths) assert.ok(existsSync(join(ROOT, path)), `owned path exists: ${path}`);

  const runtimeFiles = boundary.runtime_roots.flatMap((path) => filesBelow(join(ROOT, path)));
  assert.ok(runtimeFiles.length > 0, "runtime roots were scanned");
  for (const file of runtimeFiles) {
    const source = readFileSync(file, "utf8");
    for (const token of boundary.forbidden_runtime_tokens) {
      assert.equal(source.includes(token), false, `${relative(ROOT, file)} must not reference ${token}`);
    }
  }

  const deploymentSurfaces = [
    "package.json",
    "vercel.json",
    "supabase/config.toml",
  ].filter((path) => existsSync(join(ROOT, path)));
  for (const path of deploymentSurfaces) {
    const source = readFileSync(join(ROOT, path), "utf8");
    for (const token of boundary.forbidden_runtime_tokens) {
      assert.equal(source.includes(token), false, `${path} must not activate ${token}`);
    }
  }
});
