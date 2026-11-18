// DRAFT reference for ELS_FINDING_SHARE_CONTRACT_DRAFT.md - scratch only, not in the repo, not wired into CI.
// Pure functions for the parts that can be specified and tested before PR #1397 merges.
// Sources it mirrors (read at origin/main 270bfab6a and PR #1397 head 19a66d4e6):
//   - src/lib/elsSavedMatrix.js (hasExactSavedMatrix, savedMatrixWorkspaceHref)          -> vendor/elsSavedMatrix.main.js
//   - src/lib/research/elsOccurrenceIdentity.js (PR #1397, engine occurrence_id)          -> vendor/elsOccurrenceIdentity.pr1397.js
//   - src/lib/research/publicLibraryContinuity2029.js (slugValue, projectPublicCipher2029 published+public rule)
//   - live RLS on public.els_records (pg_policies, read 18.11.2026): public_read_published_els, public_read_self_published_els
// After #1397 merges, the vendor imports become imports of the real modules; nothing here invents a second identity.
import { hasExactSavedMatrix } from "./vendor/elsSavedMatrix.main.js";
import { elsOccurrenceId, parseElsOccurrenceId } from "./vendor/elsOccurrenceIdentity.pr1397.js";

export const SITE = "https://sod1820.co.il";
const clean = value => typeof value === "string" ? value.trim() : "";
// Same rule as publicLibraryContinuity2029.js slugValue (no control chars, no / \ ? #, no encoded slash).
export function slugValue(value) {
  const slug = clean(value);
  return slug && slug.length <= 250 && !/[\u0000-\u001f\u007f/\\?#]/.test(slug) && !/%(?:2f|5c)/i.test(slug) ? slug : null;
}

// ---------------------------------------------------------------------------------------------
// 1. Visibility: who can read the record today (RLS) vs who may receive a public share (contract).
// ---------------------------------------------------------------------------------------------

/** Live RLS today, for a guest (anon): published+public OR self_published=true. */
export function currentGuestRlsReadable(row) {
  return !!row && ((row.status === "published" && row.visibility === "public") || row.self_published === true);
}

/**
 * Contract rule (decision 1): publicly reachable only when approved (published+public) or when the owner made an
 * EXPLICIT public-share choice. `explicitShare` must come from an explicit action (self_publish_matrix "show in public
 * dossier" or an explicit share-publicly control) - never from submitting for review. Today the row cannot tell the two
 * apart, because save_els_matrix sets self_published=true for every pending member submission (open decision D-1).
 */
export function contractPublicBasis(row, { explicitShare = false } = {}) {
  if (!row || !slugValue(row.slug)) return null;
  if (row.status === "published" && row.visibility === "public") return "approved";
  if (row.self_published === true && explicitShare === true) return "explicit-share";
  return null;
}

/** What a given viewer may see. Guests get the same answer for private and removed rows (no existence leak). */
export function viewerAccess(row, { viewerId = null, isAdmin = false, explicitShare = false } = {}) {
  if (!row) return "unavailable";
  const basis = contractPublicBasis(row, { explicitShare });
  if (basis) return basis === "approved" ? "public-approved" : "public-unapproved";
  if (isAdmin) return "admin-only";
  if (viewerId && row.owner_user_id === viewerId) return "owner-only";
  return "unavailable";
}

// ---------------------------------------------------------------------------------------------
// 2. Addresses. The record (els_records id/slug) is the finding identity; its exact occurrence is the engine
//    occurrence_id derived from the record's immutable axis columns.
// ---------------------------------------------------------------------------------------------

/** Public share URL for a saved finding: the existing canonical public address /codes/<slug>. */
export function elsFindingShareUrl(row, { origin = SITE, explicitShare = false } = {}) {
  if (!contractPublicBasis(row, { explicitShare })) return null;
  try {
    const url = new URL(`/codes/${encodeURIComponent(slugValue(row.slug))}`, origin);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    return url.href;
  } catch { return null; }
}

/** The live matrix (workspace) address that /codes/<slug> opens. Same as savedMatrixWorkspaceHref; never ?record= for a share. */
export function elsFindingWorkspaceHref(row) {
  const slug = slugValue(row?.slug);
  return slug ? `/code?cipher=${encodeURIComponent(slug)}` : null;
}

/** Classify an incoming address. Only these three shapes open a finding; anything else is not a finding link. */
export function parseElsFindingAddress(href, origin = SITE) {
  let url;
  try { url = new URL(href, origin); } catch { return null; }
  if (url.origin !== new URL(origin).origin) return null;
  let path;
  try { path = decodeURIComponent(url.pathname); } catch { return null; }
  const codes = /^\/codes\/([^/]+)$/u.exec(path);
  if (codes && codes[1] !== "מחקר") {
    const slug = slugValue(codes[1]);
    return slug ? { kind: "record", via: "public-page", slug } : null;
  }
  if (path === "/code" || path === "/els") {
    const cipher = url.searchParams.get("cipher");
    if (cipher != null) { const slug = slugValue(cipher); return slug ? { kind: "record", via: "workspace", slug } : null; }
    if (url.searchParams.get("record") != null) return { kind: "record-id", via: "workspace", ownerOnly: true };
    if (url.hash.startsWith("#els-matrix=")) return { kind: "fragment", via: "workspace" };
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// 3. Labels. Approval and verification are separate and both are always shown.
// ---------------------------------------------------------------------------------------------

export function approvalLabel(row, access) {
  if (!row) return null;
  if (row.status === "published" && row.visibility === "public") return { key: "approved", text: "אושר ופורסם בספריית הצפנים" };
  if (access === "public-unapproved") {
    if (row.status === "pending") return { key: "shared-pending", text: "שותף בידי החוקר · ממתין לבדיקה · לא אושר" };
    if (row.status === "hidden") return { key: "shared-not-library", text: "מוצג בתיק החוקר · לא אושר לספריית האתר" };
    return { key: "shared-unreviewed", text: "שותף בידי החוקר · לא נשלח לבדיקה · לא אושר" };
  }
  if (row.status === "pending") return { key: "private-pending", text: "ממתין לבדיקה · פרטי" };
  return { key: "private", text: "פרטי · גלוי רק לך" };
}

/** Engine verification label for THIS opening. A published record never implies a verified occurrence. */
export function verificationLabel({ exact, state, error } = {}) {
  if (!exact) return { key: "legacy", text: "צופן ותיק: המיקום המדויק לא נשמר. מוצגת התמונה השמורה; המופע לא אומת." };
  switch (state) {
    case "MATCH": return { key: "verified", text: "המופע אומת עכשיו במנוע הקנוני" };
    case "MISMATCH": return { key: "mismatch", text: "המופע השמור לא אומת. לא מוצג מופע אחר במקומו." };
    case "corpus-mismatch": return { key: "corpus-mismatch", text: "הממצא שייך לקורפוס אחר. לא מוצג מופע אחר במקומו." };
    case "occurrence-mismatch": return { key: "occurrence-mismatch", text: "מזהה המופע סותר את המיקום השמור. לא מוצג מופע אחר במקומו." };
    case "UNAVAILABLE":
      return error === "rate_limited"
        ? { key: "rate-limited", text: "האימות מוגבל כרגע. מוצגת התמונה השמורה; אפשר לנסות שוב מאוחר יותר." }
        : { key: "verify-unavailable", text: "האימות לא הושלם. מוצגת התמונה השמורה; אפשר לנסות שוב." };
    default: return { key: "verifying", text: "מאמת את המופע השמור…" };
  }
}

// ---------------------------------------------------------------------------------------------
// 4. Open plan. Bounded: never a discovery scan on open.
// ---------------------------------------------------------------------------------------------

const HIT = /^(\d+)_(-?1)_(\d+)$/;
/** What opening this record costs. Exact: 1 axis verify + 1 verify per word that has saved verified hits. */
export function elsFindingOpenPlan(row) {
  if (!row) return { mode: "unavailable", discovery: false, serverCalls: 0 };
  if (!hasExactSavedMatrix(row)) {
    return { mode: "saved-image", discovery: false, serverCalls: 0, explicitActions: ["find-at-saved-skip"],
      image: row.positions?.shapeUrl || row.image_url || null };
  }
  const dir = row.direction === "back" ? -1 : 1;
  const occurrenceId = elsOccurrenceId({ corpusId: row.corpus_id, term: row.search_term, skip: row.skip_distance, dir, start: row.start_index });
  if (!occurrenceId) return { mode: "unavailable", discovery: false, serverCalls: 0, reason: "invalid-identity" };
  const words = (Array.isArray(row.positions?.findings) ? row.positions.findings : []).slice(0, 24)
    .map(w => ({ t: clean(w?.t), hits: (Array.isArray(w?.sh) ? w.sh : []).filter(k => typeof k === "string" && HIT.test(k) && Number(k.split("_")[0]) >= 2) }))
    .filter(w => w.t && w.hits.length);
  return { mode: "exact", discovery: false, occurrenceId, hitId: parseElsOccurrenceId(occurrenceId).hitId,
    axisCandidates: 1, serverCalls: 1 + words.length, words, explicitActions: ["find-other-occurrences"] };
}

/** Map an engine/bridge outcome to the failure state shown to the guest. */
export function openFailureState({ rowFound, access, engineReason, bridgeError } = {}) {
  if (!rowFound || access === "unavailable") return "unavailable";       // removed or private: same answer for a guest
  if (bridgeError === "rate_limited") return "rate-limited";
  if (bridgeError) return "verify-unavailable";                          // today mis-reported as anchor-not-found
  if (engineReason === "corpus-mismatch" || engineReason === "occurrence-mismatch") return engineReason;
  if (engineReason === "anchor-not-found") return "mismatch";
  return engineReason ? "load-failed" : null;
}

// ---------------------------------------------------------------------------------------------
// 5. Preview / Open Graph. Only public fields; status in the description; unapproved = noindex.
// ---------------------------------------------------------------------------------------------

const ALLOWED_PREVIEW_FIELDS = ["slug", "title", "search_term", "skip_distance", "scope", "direction", "image_url", "status", "visibility", "self_published", "positions"];
export function elsFindingPreview(row, { access, origin = SITE } = {}) {
  if (!row || !["public-approved", "public-unapproved"].includes(access)) return { status: 404, robots: "noindex, follow" };
  const safe = Object.fromEntries(ALLOWED_PREVIEW_FIELDS.map(k => [k, row[k]]));
  const term = clean(safe.search_term), name = clean(safe.title) || term;
  const scope = safe.scope === "tanakh" ? "כל התנ״ך" : "התורה";
  const words = (Array.isArray(safe.positions?.findings) ? safe.positions.findings : []).map(f => clean(f?.t)).filter(Boolean).slice(0, 6);
  const approval = approvalLabel(safe, access).text;
  const shape = typeof safe.positions?.shapeUrl === "string" ? safe.positions.shapeUrl : null;
  return {
    status: 200,
    title: `הצופן «${name}» — דילוג ${safe.skip_distance} · סוד 1820`,
    description: `«${term}» ב${scope}, בדילוג ${safe.skip_distance}${words.length ? " · " + words.join(" · ") : ""}. ${approval}. עדות — לא ניבוי.`.slice(0, 300),
    image: safe.image_url || shape || `${origin}/api/card?w=${encodeURIComponent(term)}&sub=${encodeURIComponent("צופן דילוג · דילוג " + safe.skip_distance)}&sig=els`,
    canonical: elsFindingShareUrl(safe, { origin, explicitShare: access === "public-unapproved" }),
    robots: access === "public-approved" ? "index, follow" : "noindex, follow",
  };
}
