import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadHybridRoutePolicy } from "./hybrid-preview-routing.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
export const HYBRID_ROUTE_INVENTORY_PATH = resolve(
  root,
  "docs/perf-evidence-20261018/hybrid-preview/route-inventory.json",
);

const compare = (left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right));
const normalizeDeclaration = (route) => route
  .replace(/\/:([^/]+)/g, "/(.*)")
  .replace(/\/\*$/, "/(.*)");

function declaredRoutes(source) {
  return [...source.matchAll(/<Route\s+path="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((route) => route !== "*")
    .map(normalizeDeclaration);
}

export async function createHybridRouteInventory() {
  const [policy, legacySource, candidateSource] = await Promise.all([
    loadHybridRoutePolicy(),
    readFile(resolve(root, "src/App.jsx"), "utf8"),
    readFile(resolve(root, "src/App2029.jsx"), "utf8"),
  ]);
  const legacy = new Set(declaredRoutes(legacySource));
  const candidate2029 = new Set(declaredRoutes(candidateSource));
  const assigned2029 = new Set(policy.candidate2029Routes);
  const explicitLegacy = new Set(policy.explicitLegacyRoutes);

  const missingCandidateImplementations = [...assigned2029].filter((route) => !candidate2029.has(route));
  const missingLegacyImplementations = [...explicitLegacy].filter((route) => !legacy.has(route));
  const unassignedCandidateDeclarations = [...candidate2029].filter((route) => (
    route !== "/2029/(.*)" && !assigned2029.has(route) && !explicitLegacy.has(route)
  ));
  if (missingCandidateImplementations.length || missingLegacyImplementations.length || unassignedCandidateDeclarations.length) {
    throw new Error(JSON.stringify({ missingCandidateImplementations, missingLegacyImplementations, unassignedCandidateDeclarations }));
  }

  const all = [...new Set([...legacy, ...candidate2029])].sort(compare);
  const routes = all.map((route) => ({
    route,
    declaredInLegacy: legacy.has(route),
    declaredIn2029: candidate2029.has(route),
    acceptanceRuntime: explicitLegacy.has(route) ? "legacy-explicit"
      : assigned2029.has(route) ? "2029-candidate"
        : "legacy-default",
  }));
  const count = (runtime) => routes.filter((route) => route.acceptanceRuntime === runtime).length;
  return {
    schemaVersion: 1,
    status: policy.status,
    sources: policy.sources,
    note: "Static JSX route declarations only. Dynamic aliases and product acceptance still require browser/SEO review.",
    summary: {
      legacyDeclarations: legacy.size,
      candidate2029Declarations: candidate2029.size,
      unionRoutePatterns: routes.length,
      candidate2029Assignments: count("2029-candidate"),
      explicitLegacyAssignments: count("legacy-explicit"),
      legacyDefaultAssignments: count("legacy-default"),
    },
    routes,
  };
}

const invoked = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invoked) {
  const inventory = await createHybridRouteInventory();
  const bytes = `${JSON.stringify(inventory, null, 2)}\n`;
  if (process.argv.includes("--check")) {
    if (await readFile(HYBRID_ROUTE_INVENTORY_PATH, "utf8") !== bytes) {
      throw new Error("Committed Hybrid route inventory is stale");
    }
  } else {
    await writeFile(HYBRID_ROUTE_INVENTORY_PATH, bytes);
  }
  console.log(JSON.stringify(inventory.summary));
}
