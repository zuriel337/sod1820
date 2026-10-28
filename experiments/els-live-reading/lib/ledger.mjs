// The spend ledger for every live call approved under the total cap. Amounts are computed from the usage object and list prices (not invoices); the guard refuses a call
// whose worst case (the preflight upper bound, halved for batches) would take the total past the hard guard, and refuses new arms once the stop level is reached.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export const BUDGET = Object.freeze({ cap_usd: 40, hard_guard_usd: 36, stop_new_usd: 30 });

export function loadLedger(path) {
  if (!existsSync(path)) throw new Error(`no ledger at ${path}: refusing to call any model`);
  const ledger = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(ledger.entries)) throw new Error("ledger: no entries");
  return ledger;
}

export const spentOf = (ledger) => Number(ledger.entries.reduce((sum, entry) => sum + (entry.usd ?? 0), 0).toFixed(6));

/** { ok, reason, spent, worstCase } for a call whose preflight upper bound (standard prices) is `upperBoundUsd`. A batch costs at most half of it. */
export function guardSpend(ledger, upperBoundUsd, { batch = true, budget = BUDGET } = {}) {
  const spent = spentOf(ledger);
  const worstCase = Number((spent + (batch ? 0.5 : 1) * upperBoundUsd).toFixed(6));
  if (!Number.isFinite(upperBoundUsd)) return { ok: false, reason: "the preflight gave no upper bound", spent, worstCase: null };
  if (spent > budget.stop_new_usd) return { ok: false, reason: `spent ${spent} is above the stop level ${budget.stop_new_usd}: no new calls`, spent, worstCase };
  if (worstCase > budget.hard_guard_usd) return { ok: false, reason: `worst case ${worstCase} would pass the hard guard ${budget.hard_guard_usd} (cap ${budget.cap_usd})`, spent, worstCase };
  return { ok: true, reason: null, spent, worstCase };
}

export function appendEntry(path, entry) {
  const ledger = loadLedger(path);
  ledger.entries.push(entry);
  ledger.spent_usd = spentOf(ledger);
  ledger.remaining_usd = Number((ledger.cap_usd - ledger.spent_usd).toFixed(6));
  writeFileSync(path, `${JSON.stringify(ledger, null, 2)}\n`);
  return ledger;
}
