const MODES = new Set(["incremental", "inventory", "backfill"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const HISTORICAL_DEFAULT_EXCLUDED_CHANNELS = Object.freeze(["or-geula"]);

// String#slice indexes UTF-16 code units and can leave a lone surrogate when the
// boundary lands inside an emoji or another non-BMP character. Such a string
// cannot be persisted through PostgREST JSON. Keep bounded evidence valid by
// truncating on Unicode code-point boundaries instead.
export function truncateUnicode(value, maxCodePoints) {
  const text = String(value || "");
  const limit = Math.max(0, Math.trunc(Number(maxCodePoints) || 0));
  return Array.from(text).slice(0, limit).join("");
}

function boundedInteger(value, fallback, min, max) {
  if (value == null || String(value).trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(Math.trunc(parsed), max));
}

function listParam(params, name) {
  return [...new Set(params.getAll(name)
    .flatMap((value) => String(value || "").split(","))
    .map((value) => value.trim())
    .filter(Boolean))];
}

function isoParam(params, name) {
  const raw = String(params.get(name) || "").trim();
  if (!raw) return { value: null, error: null };
  const time = Date.parse(raw);
  return Number.isFinite(time)
    ? { value: new Date(time).toISOString(), error: null }
    : { value: null, error: `invalid_${name}` };
}

export function parseResearchScanRequest(input, { now = Date.now() } = {}) {
  const url = input instanceof URL ? input : new URL(String(input), "https://scan.invalid");
  const params = url.searchParams;
  const mode = String(params.get("mode") || "incremental").trim().toLowerCase();
  if (!MODES.has(mode)) return { ok: false, error: "invalid_mode" };
  const repair = String(params.get("repair") || "").trim().toLowerCase() || null;
  if (repair && repair !== "truncated_json_v1") return { ok: false, error: "invalid_repair" };
  if (repair && mode === "incremental") return { ok: false, error: "repair_requires_historical_mode" };

  const after = isoParam(params, "after");
  if (after.error) return { ok: false, error: after.error };
  const before = isoParam(params, "before");
  if (before.error) return { ok: false, error: before.error };
  if (after.value && before.value && Date.parse(after.value) >= Date.parse(before.value)) {
    return { ok: false, error: "invalid_time_window" };
  }

  const contributorId = String(params.get("contributor_id") || "").trim().toLowerCase() || null;
  if (contributorId && !UUID_RE.test(contributorId)) return { ok: false, error: "invalid_contributor_id" };

  const requestedExclusions = listParam(params, "exclude_channel");
  const excludedChannels = mode === "incremental"
    ? requestedExclusions
    : [...new Set([...HISTORICAL_DEFAULT_EXCLUDED_CHANNELS, ...requestedExclusions])];
  const through = before.value || (mode === "incremental" ? null : new Date(now).toISOString());

  return {
    ok: true,
    mode,
    hours: boundedInteger(params.get("hours"), 168, 1, 720),
    limit: boundedInteger(params.get("limit"), 4, 1, 8),
    windowSize: boundedInteger(params.get("window"), 500, 1, 500),
    offset: boundedInteger(params.get("offset"), 0, 0, 1_000_000),
    after: after.value,
    through,
    repair,
    contributorId,
    includedChannels: listParam(params, "channel"),
    excludedChannels,
  };
}

export function buildResearchScanCursor({
  mode,
  offset = 0,
  rawCount = 0,
  windowSize = 500,
  remainingPending = 0,
}) {
  if (mode === "incremental") return null;
  const exhausted = rawCount < windowSize;
  if (mode === "backfill" && remainingPending > 0) {
    return Object.freeze({ complete: false, offset, reason: "window_pending" });
  }
  return Object.freeze({
    complete: exhausted,
    offset: exhausted ? null : offset + rawCount,
    reason: exhausted ? "source_exhausted" : "next_window",
  });
}
