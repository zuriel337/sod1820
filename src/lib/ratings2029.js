// Presentation semantics for the three separate ratings on a convergence card.
// They are different measures and are never combined or derived from one another:
//   1. quality  - manual card rating (topic_cards.quality, 0-10), shown as 0-5 stars (same mapping as topicStars).
//   2. strength - the existing convergence meter value (topic_cards.meter_score / convergence_meter().score, 0-100).
//   3. tiers    - Gold/Diamond entities that ZURIEL designated, found by the existing convergence_meter() reader.
// Missing data is "unknown", never zero. golden_entity_law v4: tiers are never inferred from quality, stars or strength.

const isFiniteNumber = (value) => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));

/** 0 or missing = not rated; outside 0-10 = invalid value (not displayed). */
export function qualityStars(quality) {
  if (!isFiniteNumber(quality)) return { state: "unrated", stars: null, raw: null };
  const raw = Number(quality);
  if (raw === 0) return { state: "unrated", stars: null, raw };
  if (raw < 0 || raw > 10) return { state: "invalid", stars: null, raw };
  return { state: "rated", stars: Math.max(0, Math.min(5, Math.round(raw / 2))), raw };
}

/** The existing single meter value, kept as a value only: no bands or thresholds are invented here. */
export function strengthValue(meterScore) {
  if (!isFiniteNumber(meterScore)) return { state: "unknown", value: null };
  const value = Number(meterScore);
  if (value < 0 || value > 100) return { state: "invalid", value: null };
  return { state: "known", value: Math.round(value) };
}

/** Counts distinct designated entities by tier from one or more convergence_meter() payloads. */
export function tierCounts(payloads = []) {
  const seen = { diamond: new Set(), gold: new Set(), silver: new Set() };
  const anchors = new Set();
  let entities = 0;
  let loaded = false;
  for (const payload of payloads) {
    if (!payload || typeof payload !== "object") continue;
    loaded = true;
    for (const entity of Array.isArray(payload.entities) ? payload.entities : []) {
      entities += 1;
      const tier = entity?.tier;
      if (tier && seen[tier]) seen[tier].add(String(entity.label || ""));
    }
    if (payload.anchor) anchors.add(String(payload.anchor));
  }
  if (!loaded) return { loaded: false, diamond: null, gold: null, silver: null, anchors: [], entities: null };
  return { loaded: true, diamond: seen.diamond.size, gold: seen.gold.size, silver: seen.silver.size, anchors: [...anchors], entities };
}

/** Numbers whose tiers are looked up: the card's highlighted numbers first, at most two. */
export function tierLookupNumbers(highlightNumbers, numbers, limit = 2) {
  const source = Array.isArray(highlightNumbers) && highlightNumbers.length ? highlightNumbers : numbers;
  const out = [];
  for (const value of Array.isArray(source) ? source : []) {
    const n = Number(value);
    if (Number.isInteger(n) && n >= 10 && !out.includes(n)) out.push(n);
    if (out.length >= limit) break;
  }
  return out;
}

/** Level 1 = the card's highlighted numbers, level 2 = the other numbers (existing highlight_numbers); level 1 first. */
export function levelNumbers(numbers, highlightNumbers, limit = 5) {
  const all = [...new Set((Array.isArray(numbers) ? numbers : []).map(Number).filter(Number.isFinite))];
  const high = new Set((Array.isArray(highlightNumbers) ? highlightNumbers : []).map(Number).filter(Number.isFinite));
  const l1 = all.filter((n) => high.has(n)).map((n) => ({ n, level: 1 }));
  const l2 = all.filter((n) => !high.has(n)).map((n) => ({ n, level: 2 }));
  return [...l1, ...l2].slice(0, limit);
}
