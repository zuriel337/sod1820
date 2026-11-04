// Lazily loads the heavy Raziel request builder only after an explicit submit.
// The factory is dependency-injected so cache and retry semantics stay testable without React.

export function createRazielRequestBuilderLoader(importer) {
  if (typeof importer !== "function") {
    throw new TypeError("razielSessionRequestLoader2029: importer function is required");
  }

  let cachedAttempt = null;

  return function loadRazielSessionRequestBuilder() {
    if (cachedAttempt) return cachedAttempt;

    const attempt = Promise.resolve()
      .then(() => importer())
      .then((module) => {
        const builder = module?.buildRazielSessionRequest;
        if (typeof builder !== "function") {
          throw new TypeError("razielSessionRequestLoader2029: buildRazielSessionRequest export is required");
        }
        if (
          typeof module.prepareRazielSessionSubmission !== "function"
          || typeof module.normalizeRazielResponse !== "function"
          || typeof module.createRazielProvenance !== "function"
          || typeof module.createRazielTurnSucceededAction !== "function"
        ) {
          throw new TypeError("razielSessionRequestLoader2029: submit adapter exports are required");
        }
        builder.prepareSubmission = module.prepareRazielSessionSubmission;
        builder.normalizeResponse = module.normalizeRazielResponse;
        builder.createProvenance = module.createRazielProvenance;
        builder.createSucceededAction = module.createRazielTurnSucceededAction;
        builder.createNavigationSucceededAction = module.createRazielNavigationTurnSucceededAction;
        return builder;
      })
      .catch((error) => {
        // A transient chunk failure or malformed response must not poison the session forever.
        if (cachedAttempt === attempt) cachedAttempt = null;
        throw error;
      });

    cachedAttempt = attempt;
    return attempt;
  };
}

export const loadRazielSessionRequestBuilder2029 = createRazielRequestBuilderLoader(
  () => import("./razielSessionRequest2029.js"),
);
