// Honest readiness of Home's own content, exposed as non-visual attributes so a test, a measurement or later RUM can tell
// real content from a loading skeleton. "loading" is never "ready": loading slots (aria-hidden, .is-loading) and a hero that
// only says "loading" do not count, and a settled outcome without content is explicit ("empty" or "error").

// `hasHero`: a real hero (the temporal "now" card or a lead Post). `postCount`: real update cards shown.
export function primaryContentState({ loading = false, failed = false, hasHero = false, postCount = 0 } = {}) {
  if (hasHero || postCount > 0) return "ready";
  if (loading) return "loading";
  return failed ? "error" : "empty";
}

// `itemCount`: populated gateway rows/previews across the four gateways. `failed`: every reader of the section rejected.
export function gatewayContentState({ loading = false, failed = false, itemCount = 0 } = {}) {
  if (loading) return "loading";
  if (itemCount > 0) return "ready";
  return failed ? "error" : "empty";
}
