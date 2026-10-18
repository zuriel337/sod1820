import {
  fetchNumberAnchorProfile,
  fetchNumberOpeningIdentity,
} from "./numberSystemMethods.js";

const CACHE_LIMIT = 32;

function bounded(cache, key, entry) {
  cache.delete(key);
  cache.set(key, entry);
  while (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
  return entry;
}

function request(cache, key, loader) {
  const existing = cache.get(key);
  if (existing) return existing.promise;

  const entry = {};
  entry.promise = Promise.resolve().then(loader).then(
    (value) => {
      entry.value = value;
      return value;
    },
    (error) => {
      if (cache.get(key) === entry) cache.delete(key);
      throw error;
    },
  );
  bounded(cache, key, entry);
  return entry.promise;
}

function rootValue(value) {
  const root = typeof value === "number"
    ? value
    : typeof value === "string" && /^(?:0|[1-9]\d*)$/.test(value)
      ? Number(value)
      : null;
  if (!Number.isSafeInteger(root) || root < 0) {
    const error = new Error("NUMBER_OPENING_ROOT_INVALID");
    error.code = "NUMBER_OPENING_ROOT_INVALID";
    throw error;
  }
  return root;
}

function accessKey(value) {
  const key = String(value || "").trim();
  if (!key) {
    const error = new Error("NUMBER_OPENING_ACCESS_CONTEXT_REQUIRED");
    error.code = "NUMBER_OPENING_ACCESS_CONTEXT_REQUIRED";
    throw error;
  }
  return key;
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value ?? null;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
}

/**
 * Cache partition for RLS-sensitive Number reads. A sign-in creates a new last_sign_in_at value;
 * role/tier/profile revisions and JWT app metadata also participate, so protected projections are
 * never reused across viewers or a changed access context.
 */
export function numberProjectionAccessContext({ loading = false, user = null, profile = null, isAdmin = false, isMember = false } = {}) {
  if (loading) return null;
  return JSON.stringify(stableValue({
    principal: user?.id || "anonymous",
    signedInAt: user?.last_sign_in_at || null,
    userUpdatedAt: user?.updated_at || null,
    appMetadata: user?.app_metadata || null,
    profileRevision: profile?.updated_at || null,
    profileRole: profile?.role || null,
    profileTier: profile?.tier || null,
    isAdmin: Boolean(isAdmin),
    isMember: Boolean(isMember),
  }));
}

export function createLatestNumberRequestGate() {
  let revision = 0;
  let active = false;
  return {
    begin() {
      active = true;
      revision += 1;
      return revision;
    },
    isCurrent(token) {
      return active && token === revision;
    },
    cancel(token) {
      if (token !== revision) return;
      active = false;
      revision += 1;
    },
  };
}

export function summarizeNumberOpening(data) {
  const families = Array.isArray(data?.gematria?.families) ? data.gematria.families : [];
  const opening = data?.numberOpening || null;
  if (!opening) return null;
  const returnedCount = families.reduce((sum, family) => sum + (Array.isArray(family?.phrases) ? family.phrases.length : 0), 0);
  const sampleTotal = families.reduce((sum, family) => sum + Math.max(0, Number(family?.openingSample?.totalCount) || 0), 0);
  return Object.freeze({
    familyCount: Math.max(0, Number(opening.familyCount) || families.length),
    returnedCount,
    totalCount: Math.max(sampleTotal, Math.max(0, Number(opening.distinctMethodPhraseCount) || 0)),
    samplesComplete: data?.gematria?.completeness?.samples === true,
    lookupDepthComplete: opening?.depth?.complete === true,
    depthDeferred: opening?.depth?.deferred === true,
    // Compact rows are never a complete Entity Hub projection, even when the lookup population is empty.
    fullProjectionComplete: false,
  });
}

export function createNumberOpeningOrchestrator({
  fetchIdentity = fetchNumberOpeningIdentity,
  fetchAnchor = fetchNumberAnchorProfile,
  loadOpeningModule = () => import("./numberOpeningProjection2029.js"),
  loadDepthModule = () => import("./entityHubProjection.js"),
} = {}) {
  const openingRequests = new Map();
  const depthRequests = new Map();
  const stageRequests = new Map();

  const projectionKey = (kind, root, context) => `${kind}:${accessKey(context)}:${rootValue(root)}`;

  function loadOpening(rootInput, { accessContext } = {}) {
    const root = rootValue(rootInput);
    const key = projectionKey("opening", root, accessContext);
    return request(openingRequests, key, async () => {
      const openingIdentity = await fetchIdentity(root);
      if (!openingIdentity) return { status: "empty", root, data: null };

      // The dynamic module is deliberately resolved only after identity admission. Once available,
      // compact and anchor reads begin in the same microtask turn and neither waits for the other.
      let openingModule;
      try {
        openingModule = await loadOpeningModule();
      } catch (cause) {
        const error = new Error("NUMBER_OPENING_MODULE_UNAVAILABLE");
        error.code = "NUMBER_OPENING_MODULE_UNAVAILABLE";
        error.cause = cause;
        throw error;
      }
      if (
        typeof openingModule?.fetchNumberOpeningProjection !== "function"
        || typeof openingModule?.projectNumberOpeningCore !== "function"
      ) {
        const error = new Error("NUMBER_OPENING_MODULE_UNAVAILABLE");
        error.code = "NUMBER_OPENING_MODULE_UNAVAILABLE";
        throw error;
      }
      const compact = Promise.resolve().then(() => (
        openingModule.fetchNumberOpeningProjection(openingIdentity.value)
      ));
      const anchor = Promise.resolve().then(() => fetchAnchor(openingIdentity.value));
      const [opening, anchorProfile] = await Promise.all([compact, anchor]);
      const data = openingModule.projectNumberOpeningCore(opening, {
        identity: openingIdentity.identity,
        anchorProfile,
      });
      return { status: "ready", root, data, openingIdentity, opening, anchorProfile };
    });
  }

  function loadDepth(rootInput, { accessContext } = {}) {
    const root = rootValue(rootInput);
    const key = projectionKey("depth", root, accessContext);
    return request(depthRequests, key, async () => {
      let depthModule;
      try {
        depthModule = await loadDepthModule();
      } catch (cause) {
        const error = new Error("NUMBER_DEPTH_MODULE_UNAVAILABLE");
        error.code = "NUMBER_DEPTH_MODULE_UNAVAILABLE";
        error.cause = cause;
        throw error;
      }
      if (typeof depthModule?.fetchEntityHubProjection !== "function") {
        const error = new Error("NUMBER_DEPTH_MODULE_UNAVAILABLE");
        error.code = "NUMBER_DEPTH_MODULE_UNAVAILABLE";
        throw error;
      }
      const data = await depthModule.fetchEntityHubProjection({
        type: "number",
        key: String(root),
        relationLimit: 140,
        researchLimit: 80,
        topicLimit: 24,
        numberLookupLimit: 500,
      });
      if (!data) {
        const error = new Error("NUMBER_DEPTH_IDENTITY_UNAVAILABLE");
        error.code = "NUMBER_DEPTH_IDENTITY_UNAVAILABLE";
        throw error;
      }
      return data;
    });
  }

  function loadStage(rootInput, { accessContext } = {}) {
    const root = rootValue(rootInput);
    const key = projectionKey("stage", root, accessContext);
    return request(stageRequests, key, async () => {
      const depthModule = await loadDepthModule();
      if (typeof depthModule?.fetchEntityHubProjection !== "function") {
        const error = new Error("NUMBER_STAGE_MODULE_UNAVAILABLE");
        error.code = "NUMBER_STAGE_MODULE_UNAVAILABLE";
        throw error;
      }
      return depthModule.fetchEntityHubProjection({
        type: "number",
        key: String(root),
        relationLimit: 36,
        researchLimit: 16,
        topicLimit: 8,
        numberResearchLenses: ["number_lookup", "neighbors"],
        numberLookupLimit: 80,
        includeMedia: false,
      });
    });
  }

  return Object.freeze({ loadOpening, loadDepth, loadStage });
}

export const numberOpeningOrchestrator2029 = createNumberOpeningOrchestrator();

export async function fetchTopicSourceContextOnDemand(options) {
  const module = await import("./entityHubProjection.js");
  return module.fetchTopicSourceContext(options);
}
