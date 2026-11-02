// Transport adapter for the existing newsletter-signup Edge Function. No new
// subscriber store, delivery service, identity creation or retry automation.
export async function probeOpeningUpdatesSignup({ endpoint, request = globalThis.fetch, signal } = {}) {
  const capability = await request(endpoint, { method: "OPTIONS", cache: "no-store", signal });
  if (!capability.ok || capability.headers.get("x-newsletter-purpose-contract") !== "opening-parts-v1") throw new Error("newsletter-purpose-unavailable");
  return true;
}

export async function submitNewsletterSignup({ email, consent, acquisition = null, purpose = "general" }, {
  endpoint, request = globalThis.fetch, signal,
} = {}) {
  const address = String(email || "").trim().toLowerCase();
  if (consent !== true) throw new Error("newsletter-consent-required");
  if (address.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw new Error("newsletter-email-invalid");
  if (!["general", "site-openings"].includes(purpose)) throw new Error("newsletter-purpose-invalid");
  // Capability check precedes any write: an older server ignores purpose fields
  // and would otherwise subscribe this reader to the general list.
  if (purpose === "site-openings") {
    await probeOpeningUpdatesSignup({ endpoint, request, signal });
  }
  const response = await request(`${endpoint}?format=json`, {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, signal,
    body: JSON.stringify(purpose === "site-openings" ? { email: address, purpose, consent: true, source: "2029-opening-parts" } : { email: address, source: "2029-public-updates", ...(acquisition ? { acquisition } : {}) }),
  });
  const result = await response.json();
  if (purpose === "site-openings" && result?.status === "verification-required") throw new Error("newsletter-verification-required");
  if (purpose === "site-openings" && (result?.purpose !== purpose || result?.contract !== "opening-parts-v1")) throw new Error("newsletter-purpose-unavailable");
  if (!response.ok || result?.ok !== true || !["new", "exists"].includes(result?.status)) throw new Error("newsletter-request-failed");
  return { status: result.status };
}
