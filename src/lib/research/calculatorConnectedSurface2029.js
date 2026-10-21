// Calculator 2029: safe, read-only projections over EXISTING owners.
// No extra engine, history store, public search log, Person record, or Raziel instance.
// Owners: Gematria Engine/Method Registry; ResearchProvider history; PersonJourney;
// public aggregate numbers from existing getHotNumbers/getWallCount readers.

const finiteInt = (input, { min = 0 } = {}) =>
  input !== null && input !== undefined && input !== ""
    && Number.isSafeInteger(Number(input)) && Number(input) >= min ? Number(input) : null;
const limitTo = (value, max = 12) => Number.isSafeInteger(value) ? Math.max(0, Math.min(30, value)) : max;
const personalTypes = new Set(['number', 'gematria_expression', 'gematria_result']);
const safeLabel = value => typeof value === 'string' ? value.trim().slice(0, 120) : '';

/**
 * Public overview: counts + NUMBERS only. Raw search terms, names, emails,
 * dates of birth and private wall rows are never part of this output.
 * Input comes from getWallCount/getHotNumbers (the latter has a bounded 4000
 * event sample); never present its trend counts as a full-site total.
 */
export function projectPublicCalculatorActivity({ publicPhraseCount = null, hotNumbers = [] } = {}, { limit = 10 } = {}) {
  const seen = new Set();
  const trendingNumbers = [];
  for (const row of Array.isArray(hotNumbers) ? hotNumbers : []) {
    const value = finiteInt(row?.n ?? row?.value, { min: 1 });
    const searches = finiteInt(row?.count, { min: 1 });
    if (value === null || searches === null || seen.has(value)) continue;
    seen.add(value);
    trendingNumbers.push({ value, searches, href: '/number/' + value });
  }
  trendingNumbers.sort((a, b) => b.searches - a.searches || a.value - b.value);
  return {
    scope: 'public_aggregate',
    publicPhraseCount: finiteInt(publicPhraseCount),
    trendingNumbers: trendingNumbers.slice(0, limitTo(limit, 10)),
    trendCoverage: 'bounded_existing_reader',
    // never return raw terms or person identifiers, even if present in rows
  };
}

/**
 * The current viewer's saved/research history only. This is not a history
 * of every keystroke; callers must label it as "פעילות מחקר אישית" and obtain
 * history solely from their ResearchProvider (not search_log / public wall).
 * Never publish, share or log the projection.
 */
export function projectOwnCalculatorActivity(history, { limit = 8 } = {}) {
  const seen = new Set();
  const items = [];
  if (limitTo(limit, 8) === 0) return { scope: 'viewer_private', items, historyMeaning: 'research_activity_not_every_search' };
  for (const item of Array.isArray(history) ? history : []) {
    if (!personalTypes.has(item?.type)) continue;
    const id = safeLabel(String(item?.id ?? item?.ref ?? ''));
    const key = String(item.type) + ':' + id;
    if (!id || seen.has(key)) continue;
    seen.add(key);
    const label = safeLabel(item?.title || item?.label || item?.expression || id);
    const timestamp = Number.isFinite(item?.t) && item.t >= 0 ? item.t : null;
    const numeric = finiteInt(item?.resultValue ?? item?.value ?? (item?.type === 'number' ? id : null), { min: 1 });
    items.push({ id, type: item.type, label, timestamp, number: numeric });
    if (items.length >= limitTo(limit, 8)) break;
  }
  return { scope: 'viewer_private', items, historyMeaning: 'research_activity_not_every_search' };
}

/**
 * Only after an explicit user action identifying their given name; Router
 * location.state is ephemeral and does not place the name in a URL, telemetry,
 * shared Research Context or public search wall. PersonJourney owns consent,
 * authenticated profile writes and date/family data after navigation.
 */
export function createFirstNameJourneyHandoff(raw, { explicitlyConfirmed = false } = {}) {
  if (explicitlyConfirmed !== true || typeof raw !== 'string') return null;
  const firstName = raw.replace(/\s+/g, ' ').trim();
  if (!firstName || firstName.length > 80 || !/\p{L}/u.test(firstName)) return null;
  if (!/^[\p{L}\p{M}\s'׳־-]+$/u.test(firstName)) return null;
  return {
    pathname: '/journey',
    state: { kind: 'calculator_first_name_suggestion', firstName, from: 'calculator' },
  };
}
