// SOD1820 #1457 — pure budget QUOTE / simulation only.
// Neither this module nor its result may authorize or run a provider call.
// The authoritative ledger, standing grant and atomic monthly reservation
// must be implemented separately in the existing server/cost owner.
export const OPERATIONAL_COST_POLICY_V1 = Object.freeze({
  version: 1,
  status: "proposal_only",
  timeZone: "Asia/Jerusalem",
  monthlyCapAgorot: 5000, // 50 ILS, NOT USD
  perCallMaxAgorot: 100, // conservative design proposal; owner can review
  safetyMultiplierNumerator: 125, // 25% upper-bound margin
  safetyMultiplierDenominator: 100,
  absoluteMaxInputTokens: 4096,
  absoluteMaxOutputTokens: 512,
});

const MILLION = 1000000n;
const COST_DENOMINATOR = MILLION * MILLION * MILLION;
const ceilDiv = (a,b) => (a+b-1n)/b;

function decimalMicro(raw) {
  // Accept only fixed-point decimal rates. Exponent, undefined, NaN,
  // 0 and negative values fail closed. No binary-float cost arithmetic.
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const str = String(raw).trim();
  if (!/^(?:[1-9][0-9]{0,5}|0)(?:\.[0-9]{1,6})?$/.test(str)) return null;
  const [whole, frac = ""] = str.split(".");
  const value = BigInt(whole) * MILLION + BigInt(frac.padEnd(6,"0") || "0");
  return value > 0n ? value : null;
}

const integerIn = (n, lo, hi) => Number.isSafeInteger(n) && n >= lo && n <= hi;

/** Pure quotation based on server-supplied maximum tokens and effective-dated pricing.
 * A quote is NOT an authorization. A server must independently validate source,
 * model, pricing provenance, grant, worst-case usage, and atomic account balance.
 */
export function quoteOperationalAiUpperBound(input = {}) {
  const { absoluteMaxInputTokens, absoluteMaxOutputTokens,
    safetyMultiplierNumerator, safetyMultiplierDenominator } = OPERATIONAL_COST_POLICY_V1;
  const inputTokens = input.maxInputTokens, outputTokens = input.maxOutputTokens;
  if (!integerIn(inputTokens, 1, absoluteMaxInputTokens)
    || !integerIn(outputTokens, 1, absoluteMaxOutputTokens)) {
    return Object.freeze({ state: "DENIED", reason: "unbounded_model_tokens", providerCallAuthorized: false });
  }
  if (input.pricingVerified !== true || input.rateEffectiveForOperation !== true) {
    return Object.freeze({ state: "DENIED", reason: "unverified_or_stale_provider_pricing", providerCallAuthorized: false });
  }
  const inRate = decimalMicro(input.usdPerMillionInput);
  const outRate = decimalMicro(input.usdPerMillionOutput);
  const exchange = decimalMicro(input.ilsPerUsd);
  if (!inRate || !outRate || !exchange) {
    return Object.freeze({ state: "DENIED", reason: "unknown_or_invalid_fx_or_rate", providerCallAuthorized: false });
  }
  // USD / million tokens * ILS/USD * 100 agorot/ILS, with fixed-point rates.
  // 3 micro-decimal factors (price, FX, tokens/million) => 10^18.
  const numerator = (BigInt(inputTokens) * inRate + BigInt(outputTokens) * outRate)
    * exchange * 100n * BigInt(safetyMultiplierNumerator);
  const denom = COST_DENOMINATOR * BigInt(safetyMultiplierDenominator);
  const quoteAgorotBig = ceilDiv(numerator, denom);
  if (quoteAgorotBig <= 0n || quoteAgorotBig > BigInt(Number.MAX_SAFE_INTEGER)) {
    return Object.freeze({ state: "DENIED", reason: "invalid_cost_quote", providerCallAuthorized: false });
  }
  const upperBoundAgorot = Number(quoteAgorotBig);
  return Object.freeze({
    state: "QUOTED", upperBoundAgorot,
    upperBoundIls: (upperBoundAgorot / 100).toFixed(2),
    reason: "conservative_estimate_not_reserved",
    providerCallAuthorized: false,
  });
}

/** Preview of a budget decision over a single trusted snapshot.
 * NEVER a spending gate: concurrent calls require one database transaction
 * with row locking / conditional reservation and an idempotency key.
 */
export function previewOperationalAiBudget(input = {}) {
  const cap = OPERATIONAL_COST_POLICY_V1.monthlyCapAgorot;
  const spent = input.spentAgorot, reserved = input.reservedAgorot;
  const proposed = input.upperBoundAgorot;
  if (![spent,reserved,proposed].every(x=>integerIn(x,0,Number.MAX_SAFE_INTEGER))
      || proposed <= 0) return Object.freeze({ state: "DENIED", reason: "untrusted_budget_snapshot" });
  if (proposed > OPERATIONAL_COST_POLICY_V1.perCallMaxAgorot)
    return Object.freeze({ state: "DENIED", reason: "per_operation_limit" });
  if (spent > cap || reserved > cap || spent + reserved > cap ||
      proposed > cap - spent - reserved)
    return Object.freeze({ state: "DENIED", reason: "monthly_ils_cap_exceeded" });
  return Object.freeze({
    state: "WOULD_FIT_UNDER_SNAPSHOT", reason: "atomic_reservation_still_required",
    remainingAfterAgorot: cap - spent - reserved - proposed,
    providerCallAuthorized: false,
  });
}

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: OPERATIONAL_COST_POLICY_V1.timeZone,
  year: "numeric", month: "2-digit",
});
export function operationalBudgetMonth(utcTimestamp) {
  const date = new Date(utcTimestamp);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = Object.fromEntries(monthFormatter.formatToParts(date).map(p => [p.type,p.value]));
  return /^\d{4}$/.test(parts.year) && /^\d{2}$/.test(parts.month)
    ? `${parts.year}-${parts.month}` : null;
}
