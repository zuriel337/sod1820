import { DEFAULTS, price, simulate } from "./resourceSimulator.js";
import { numeric, retentionRows, rows } from "./controlPlaneProjection.js";

// Planning functions reuse the lab's single pricing/model owner, loaded with the planning tabs.
export const CLEANUP_LIMITS = { bytesPerRow: 1000000000, averageGB: 10000000, rate: 100000, quota: 10000000 };
export const cleanupInput = (key, value) => { const n = numeric(value); return n != null && n <= CLEANUP_LIMITS[key] ? n : null; };
export function cleanupProjection(data, selected, assumptions = {}) {
  const tables = retentionRows(data);
  const chosen = tables.filter(r => r.eligible && selected.includes(r.key));
  const totalRows = tables.length && tables.every(r => r.total != null) ? tables.reduce((a, r) => a + r.total, 0) : null;
  const removedRows = chosen.reduce((a, r) => a + r.candidates, 0);
  const bytesPerRow = cleanupInput("bytesPerRow", assumptions.bytesPerRow), averageGB = cleanupInput("averageGB", assumptions.averageGB), rate = cleanupInput("rate", assumptions.rate), quota = cleanupInput("quota", assumptions.quota);
  const logicalGB = bytesPerRow == null ? null : removedRows * bytesPerRow / 1e9;
  const afterGB = averageGB == null || logicalGB == null || logicalGB > averageGB ? null : averageGB - logicalGB;
  let beforeCost = null, afterCost = null;
  if (afterGB != null && rate != null && quota != null) {
    const billing = { ...DEFAULTS, baseData: averageGB, dataRate: rate, includedData: quota };
    beforeCost = price(billing).costs.data;
    afterCost = price({ ...billing, baseData: afterGB }).costs.data;
  }
  return { tables, chosen, totalRows, removedRows, afterRows: totalRows == null ? null : totalRows - removedRows,
    logicalGB, afterGB, beforeCost, afterCost, saving: beforeCost == null ? null : beforeCost - afterCost };
}

export function budgetAlerts(result, budget, warningPercent = 80) {
  const limit = numeric(budget), warning = numeric(warningPercent);
  if (limit == null || warning == null || warning < 1 || warning > 100) return [];
  return rows(result?.rows).filter(row => Number.isFinite(row.delta)).map(row => ({
    month: row.month, amount: row.delta, ratio: limit === 0 ? (row.delta > 0 ? null : 0) : row.delta / limit,
    state: row.delta > limit ? "critical" : limit > 0 && row.delta >= limit * warning / 100 ? "warning" : "within",
  }));
}

export function viralComparison(values, factor = 3, month = 1) {
  const f = numeric(factor);
  if (f == null || f < 1 || f > 100) throw new Error("מכפיל העומס חייב להיות בין 1 ל־100");
  const baseline = simulate(values), stress = simulate(values, f);
  const selected = Math.max(1, Math.min(baseline.rows.length, Math.round(Number(month) || 1)));
  return { factor: f, current: baseline.rows[selected - 1], stress: stress.rows[selected - 1] };
}
