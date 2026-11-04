import { deploymentAuthorized } from "./authorization.js";
import { requestOrigin } from "./api/public-document.js";

// Reuse reviewed public response projections; never forward a caller's saved
// Legacy account, Authorization, cookies or a POST to these public adapters.
export function publicReadingReadOnlyApi(handler, { authorized = deploymentAuthorized } = {}) {
  return async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (!authorized()) return res.status(503).json({ state: "unavailable" });
    if (!requestOrigin(req)) return res.status(421).json({ state: "unavailable" });
    if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ state: "unavailable" }); }
    const headers = { ...req.headers };
    for (const name of Object.keys(headers)) if (["authorization", "cookie"].includes(name.toLowerCase())) delete headers[name];
    return handler({ ...req, headers }, res);
  };
}
