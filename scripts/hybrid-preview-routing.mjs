import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const HYBRID_ROUTE_POLICY_PATH = fileURLToPath(
  new URL("../config/hybrid-preview-routes.json", import.meta.url),
);

const WILDCARD = "__SOD_WILDCARD__";

function sourcePattern(source) {
  if (typeof source !== "string" || !source.startsWith("/")) {
    throw new Error(`Invalid hybrid route source: ${source}`);
  }
  const escaped = source
    .replaceAll("(.*)", WILDCARD)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replaceAll(WILDCARD, "(.*)");
  return new RegExp(`^${escaped}$`);
}

export function normalizeHybridPath(value) {
  const parsed = new URL(String(value || "/"), "http://hybrid.local");
  let pathname = parsed.pathname || "/";
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    // Keep the encoded path. A malformed escape must not broaden route matching.
  }
  if (pathname.length > 1) pathname = pathname.replace(/\/+$/, "");
  return pathname || "/";
}

export function validateHybridRoutePolicy(policy) {
  if (!policy || policy.schemaVersion !== 1) throw new Error("Unsupported hybrid route policy");
  if (policy.status !== "acceptance-only-not-production-approved") {
    throw new Error("Hybrid route policy must remain acceptance-only");
  }
  if (policy.defaultRuntime !== "legacy") throw new Error("Hybrid fallback must be Legacy");
  if (policy.documents?.legacy !== "legacy.html" || policy.documents?.candidate2029 !== "2029.html") {
    throw new Error("Hybrid runtime documents are not the approved isolated pair");
  }
  for (const key of ["legacySha", "candidateSha"]) {
    if (!/^[a-f0-9]{40}$/.test(policy.sources?.[key] || "")) throw new Error(`Invalid ${key}`);
  }
  const next = policy.candidate2029Routes || [];
  const legacy = policy.explicitLegacyRoutes || [];
  if (!Array.isArray(next) || !Array.isArray(legacy)) throw new Error("Hybrid route lists must be arrays");
  if (new Set(next).size !== next.length || new Set(legacy).size !== legacy.length) {
    throw new Error("Hybrid route lists must not contain duplicates");
  }
  const nextPatterns = next.map(sourcePattern);
  for (const route of legacy) {
    const path = normalizeHybridPath(route);
    if (nextPatterns.some((pattern) => pattern.test(path))) {
      throw new Error(`Explicit Legacy route is also assigned to 2029: ${route}`);
    }
  }
  return policy;
}

export async function loadHybridRoutePolicy(path = HYBRID_ROUTE_POLICY_PATH) {
  return validateHybridRoutePolicy(JSON.parse(await readFile(path, "utf8")));
}

export function createHybridRouteResolver(policy) {
  validateHybridRoutePolicy(policy);
  const routes2029 = policy.candidate2029Routes.map((source) => ({ source, pattern: sourcePattern(source) }));
  return (value) => {
    const pathname = normalizeHybridPath(value);
    const matched = routes2029.find(({ pattern }) => pattern.test(pathname));
    if (matched) return { pathname, runtime: "2029", document: policy.documents.candidate2029, source: matched.source };
    return { pathname, runtime: "legacy", document: policy.documents.legacy, source: null };
  };
}
