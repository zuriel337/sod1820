// Enforcement of gematria_auto_registry_law v2 (GEMATRIA ROOT GATE / ROOT-BEFORE-TREE, ZURIEL 4.9.2026; checked by ZURIEL's request 26.11.2026):
// a gematria claim that appears in a Post body or in a unit item must also exist as a canonical row of public.gematria_words (the one root), with the value the
// engine computed for that method. A claim that exists only inside a Post body is a finding. This module only DETECTS; it never writes and never calculates:
// values are the engine's, read from the root row's own method column (gematria_methods.db_column). The same rule runs live as
// docs/reviews/discovery-center-20261126/db/E1-gematria-root-gate-check.sql (read only).
const squash = (value) => String(value ?? "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
export const normalizePhrase = (value) => squash(value).toLowerCase();

const BLOCK = /<b>\s*הביטוי:\s*<\/b>\s*([^<]+)<\/p>\s*<p[^>]*>\s*<b>\s*השיטה:\s*<\/b>\s*([^<]+)<\/p>\s*<p[^>]*>\s*<b>\s*התוצאה:\s*<\/b>\s*<span[^>]*data-gem="(\d+)"/g;

/** The claims a Post body states in its "phrase / method / result" blocks. */
export function extractPostGematriaClaims(html, source = "post") {
  const claims = [];
  for (const match of String(html ?? "").matchAll(BLOCK)) claims.push({ source, phrase: squash(match[1]), methodKey: squash(match[2]), stated: Number(match[3]) });
  return claims;
}

/** The claims of unit gematria items ({ phrase, methodKey, stated }). An item without a phrase and a method is ignored: it states nothing. */
export function claimsFromUnitItems(items, source = "unit") {
  return (Array.isArray(items) ? items : []).filter((item) => item && squash(item.phrase) && squash(item.methodKey))
    .map((item) => ({ source, phrase: squash(item.phrase), methodKey: squash(item.methodKey), stated: item.stated == null ? null : Number(item.stated) }));
}

/**
 * @param claims   from the extractors above
 * @param roots    rows of gematria_words: { phrase, is_verified, is_published, is_encrypted, ...method columns }
 * @param methods  rows of gematria_methods: { method_key, db_column, active, in_engine }
 * @returns findings: { kind: "no_root" | "root_not_public" | "unknown_method" | "value_mismatch", claim, root? } (empty = the law holds)
 */
export function rootGateFindings(claims, roots, methods) {
  const byPhrase = new Map();
  for (const row of roots) { const key = normalizePhrase(row.phrase); if (!byPhrase.has(key)) byPhrase.set(key, []); byPhrase.get(key).push(row); }
  const column = new Map((methods || []).filter((m) => m.active && m.in_engine && m.db_column).map((m) => [m.method_key, m.db_column]));
  const findings = [];
  for (const claim of claims) {
    const rows = byPhrase.get(normalizePhrase(claim.phrase)) || [];
    if (!rows.length) { findings.push({ kind: "no_root", claim }); continue; }
    const publicRows = rows.filter((row) => row.is_verified && row.is_published && !row.is_encrypted);
    if (!publicRows.length) { findings.push({ kind: "root_not_public", claim, root: rows[0] }); continue; }
    const col = column.get(claim.methodKey);
    if (!col) { findings.push({ kind: "unknown_method", claim, root: publicRows[0] }); continue; }
    if (claim.stated != null && !publicRows.some((row) => Number(row[col]) === claim.stated)) findings.push({ kind: "value_mismatch", claim, root: publicRows[0] });
  }
  return findings;
}
