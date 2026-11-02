// A bounded, in-memory reuse window for already read canonical calculations.
// No identity is persisted. Changing readers invalidates old read handles too.
export function createNumberMethodProfileReuse({ now = Date.now, ttlMs = 30_000, limit = 36 } = {}) {
  let reader = null, generation = 0;
  const rows = new Map();
  return {
    forReader(identity) {
      if (identity !== reader) { reader = identity; generation += 1; rows.clear(); }
      const token = generation;
      const current = () => identity != null && reader === identity && generation === token;
      return {
        get(expression) {
          if (!current()) return null;
          const entry = rows.get(expression);
          if (!entry || now() - entry.at >= ttlMs || now() < entry.at) { rows.delete(expression); return null; }
          return entry.rows;
        },
        remember(expression, value) {
          if (!current() || !Array.isArray(value)) return;
          rows.delete(expression); rows.set(expression, { at: now(), rows: value });
          while (rows.size > limit) rows.delete(rows.keys().next().value);
        },
        invalidate(expression) { if (current()) rows.delete(expression); },
      };
    },
  };
}
