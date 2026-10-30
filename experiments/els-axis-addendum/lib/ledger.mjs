// The spend ledger of EXP-22 (cap USD 4 for both runs, failures included). Amounts come from the usage object and list prices, not from invoices. A run's worst case is RESERVED before it
// is sent and replaced by the settled cost afterwards; a run whose outcome is unknown keeps its reservation (it may have been billed).
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export const seed = (capUsd) => ({ cap_usd: capUsd, basis: "usage x list prices of the product module (Message Batches at 50%); not an invoice", entries: [] });
export function loadLedger(path) {
  if (!existsSync(path)) throw new Error(`no ledger at ${path}: refusing to call any model`);
  const ledger = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(ledger.entries)) throw new Error("ledger: no entries");
  return ledger;
}
export const spentOf = (ledger) => Number(ledger.entries.reduce((sum, entry) => sum + (entry.usd ?? 0), 0).toFixed(6));
export const settledOf = (ledger) => Number(ledger.entries.filter((entry) => !entry.reserved).reduce((sum, entry) => sum + (entry.usd ?? 0), 0).toFixed(6));
/** { ok, reason, spent, worstCase }: a run may start only if everything spent or reserved so far plus its own worst case stays within the cap. */
export function guard(ledger, worstCaseUsd) {
  const spent = spentOf(ledger);
  if (!Number.isFinite(worstCaseUsd)) return { ok: false, reason: "no worst case could be computed", spent, worstCase: null };
  const worstCase = Number((spent + worstCaseUsd).toFixed(6));
  if (worstCase > ledger.cap_usd) return { ok: false, reason: `spent or reserved ${spent} plus this run's worst case ${worstCaseUsd} would pass the cap ${ledger.cap_usd}`, spent, worstCase };
  return { ok: true, reason: null, spent, worstCase };
}
const save = (path, ledger) => { ledger.spent_usd = spentOf(ledger); ledger.remaining_usd = Number((ledger.cap_usd - ledger.spent_usd).toFixed(6)); writeFileSync(path, `${JSON.stringify(ledger, null, 2)}\n`); return ledger; };
export function reserve(path, entry) { const ledger = loadLedger(path); ledger.entries.push({ ...entry, reserved: true }); return save(path, ledger); }
export function settle(path, id, entry) {
  const ledger = loadLedger(path);
  const at = ledger.entries.findIndex((item) => item.id === id && item.reserved);
  if (at < 0) throw new Error(`ledger: no reservation ${id}`);
  ledger.entries[at] = { ...entry, id };
  return save(path, ledger);
}
