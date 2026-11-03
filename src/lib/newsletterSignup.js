// Transport adapter for the existing newsletter-signup Edge Function. No new
// subscriber store, delivery service, identity creation or retry automation.
// Purpose contracts. "site-openings" is the historical opening-only consent and is kept
// only so a stale caller fails closed; the public product is one: "site-updates" (עדכוני האתר).
const CONTRACTS = { "site-openings": "opening-parts-v1", "site-updates": "site-updates-v1" };
const SOURCES = { "site-openings": "2029-opening-parts", "site-updates": "2029-site-updates" };
async function probePurposeContract({ endpoint, request = globalThis.fetch, signal, contract }) {
  const capability = await request(endpoint, { method: "OPTIONS", cache: "no-store", signal });
  const advertised = String(capability.headers.get("x-newsletter-purpose-contract") || "").split(",").map(value => value.trim());
  if (!capability.ok || !advertised.includes(contract)) throw new Error("newsletter-purpose-unavailable");
  return true;
}
export const probeOpeningUpdatesSignup = (options = {}) => probePurposeContract({ ...options, contract: CONTRACTS["site-openings"] });
export const probeSiteUpdatesSignup = (options = {}) => probePurposeContract({ ...options, contract: CONTRACTS["site-updates"] });

export async function submitNewsletterSignup({ email, consent, acquisition = null, purpose = "general" }, {
  endpoint, request = globalThis.fetch, signal,
} = {}) {
  const address = String(email || "").trim().toLowerCase();
  if (consent !== true) throw new Error("newsletter-consent-required");
  if (address.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw new Error("newsletter-email-invalid");
  if (!["general", "site-openings", "site-updates"].includes(purpose)) throw new Error("newsletter-purpose-invalid");
  // Capability check precedes any write: an older server ignores purpose fields
  // and would otherwise subscribe this reader to the general list.
  const scoped = purpose !== "general";
  if (scoped) await probePurposeContract({ endpoint, request, signal, contract: CONTRACTS[purpose] });
  const response = await request(`${endpoint}?format=json`, {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, signal,
    body: JSON.stringify(scoped ? { email: address, purpose, consent: true, source: SOURCES[purpose] } : { email: address, source: "2029-public-updates", ...(acquisition ? { acquisition } : {}) }),
  });
  const result = await response.json();
  if (scoped && result?.status === "verification-required") throw new Error("newsletter-verification-required");
  if (scoped && (result?.purpose !== purpose || result?.contract !== CONTRACTS[purpose])) throw new Error("newsletter-purpose-unavailable");
  if (!response.ok || result?.ok !== true || !["new", "exists"].includes(result?.status)) throw new Error("newsletter-request-failed");
  return { status: result.status };
}
