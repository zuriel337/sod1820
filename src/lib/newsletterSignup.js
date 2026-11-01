// Transport adapter for the existing newsletter-signup Edge Function. No new
// subscriber store, delivery service, identity creation or retry automation.
export async function submitNewsletterSignup({ email, consent, acquisition = null }, {
  endpoint, request = globalThis.fetch, signal,
} = {}) {
  const address = String(email || "").trim().toLowerCase();
  if (consent !== true) throw new Error("newsletter-consent-required");
  if (address.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw new Error("newsletter-email-invalid");
  const response = await request(`${endpoint}?format=json`, {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, signal,
    body: JSON.stringify({ email: address, source: "2029-public-updates", ...(acquisition ? { acquisition } : {}) }),
  });
  const result = await response.json();
  if (!response.ok || result?.ok !== true || !["new", "exists"].includes(result?.status)) throw new Error("newsletter-request-failed");
  return { status: result.status };
}
