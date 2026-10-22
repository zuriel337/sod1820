import { supabase } from "../supabase.js";
import {
  presentBookCoverageKey,
  presentBookCoverageValue,
} from "./bookHebrewPresentation.js";

const BOOK_LIBRARY_FIELDS = "id,label,description,identity_key,metadata,is_active,created_at";
const MAX_BOOK_LIBRARY_ITEMS = 200;

const clean = value => value == null ? "" : String(value).trim();
const asObject = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const asArray = value => Array.isArray(value) ? value : [];

function coverageEntries(metadata) {
  const coverage = {
    ...asObject(metadata.coverage),
    ...asObject(metadata.coverage_2029),
  };
  return Object.entries(coverage)
    .filter(([, value]) => value != null && typeof value !== "object")
    .slice(0, 4)
    .map(([key, value]) => ({
      key,
      labelHe: presentBookCoverageKey(key).labelHe,
      valueHe: presentBookCoverageValue(value).labelHe,
    }));
}

function exactWitnessPresentation(metadata) {
  const coverage = {
    ...asObject(metadata.coverage),
    ...asObject(metadata.coverage_2029),
  };
  const raw = coverage.exact_witness_close_read
    ?? coverage.exact_witness
    ?? coverage.historical_witness_collation
    ?? null;
  return presentBookCoverageValue(raw);
}

function projectBook(row) {
  const metadata = asObject(row?.metadata);
  const tiers = asObject(metadata.identity_tiers);
  const digitalObject = asObject(tiers.digital_object);
  const supports = asArray(asObject(metadata.projection).supports).map(clean).filter(Boolean);
  const slug = clean(metadata.slug);
  const active = row?.is_active === true;
  const family = asObject(metadata.corpus).family === "tanakh" ? "tanakh" : "research";
  const hasSource = Boolean(clean(digitalObject.path) || clean(digitalObject.url) || clean(digitalObject.identity));
  const hasResearchMap = active && Boolean(metadata.coverage_2029 || metadata.coverage);
  const witness = exactWitnessPresentation(metadata);
  const hasPointVerification = ["verified", "complete"].includes(witness.semanticRole);
  const spatialReady = supports.includes("3d");

  return Object.freeze({
    id: clean(row?.id),
    slug,
    label: clean(row?.label) || "ספר ללא כותרת",
    description: clean(row?.description) || "זהות ספר קיימת במערכת המחקר.",
    family,
    active,
    status: Object.freeze({
      identity: Object.freeze({ complete: Boolean(clean(row?.id) && slug), labelHe: "זהות ספר קיימת" }),
      source: Object.freeze({ complete: hasSource, labelHe: hasSource ? "מקור דיגיטלי קיים" : "המקור דורש השלמה" }),
      research: Object.freeze({ complete: hasResearchMap, labelHe: hasResearchMap ? "מפת מחקר פעילה" : "טרם הופעל למחקר" }),
      verification: Object.freeze({ complete: hasPointVerification, labelHe: witness.labelHe, detailHe: witness.detailHe }),
      spatial: Object.freeze({ complete: spatialReady, labelHe: spatialReady ? "מוכן לתכנון מרחבי" : "דורש תכנון מרחבי" }),
      publication: Object.freeze({ complete: false, labelHe: "טרם התקבלה החלטת פרסום" }),
    }),
    coverage: Object.freeze(coverageEntries(metadata).map(entry => Object.freeze(entry))),
    unresolvedCount: Number(asObject(metadata.coverage_2029).unresolved_total || 0) || 0,
    nextActionHe: active
      ? "להיכנס למפת המחקר, לעבור על הראיות ולהחליט מה ראוי להעמקה."
      : "להפעיל מחקר ממוקד ראשון בלי להציג את הספר כמאומת.",
  });
}

export function projectBookLibraryJourney(rows, { totalCount = null } = {}) {
  const items = asArray(rows)
    .map(projectBook)
    .filter(item => item.id && item.slug)
    .sort((a, b) => Number(b.active) - Number(a.active) || a.label.localeCompare(b.label, "he"));
  const knownTotal = Number.isInteger(totalCount) && totalCount >= items.length ? totalCount : items.length;

  return Object.freeze({
    items: Object.freeze(items),
    summary: Object.freeze({
      total: knownTotal,
      visible: items.length,
      activeResearch: items.filter(item => item.active).length,
      awaitingResearch: items.filter(item => !item.active).length,
      sourcesAvailable: items.filter(item => item.status.source.complete).length,
      pointVerified: items.filter(item => item.status.verification.complete).length,
      spatialReady: items.filter(item => item.status.spatial.complete).length,
      publicDecided: 0,
    }),
    partial: knownTotal > items.length,
    readOnly: true,
    publicationEffect: "none",
  });
}

export async function loadBookLibraryJourney() {
  const { data, error, count } = await supabase
    .from("nodes")
    .select(BOOK_LIBRARY_FIELDS, { count: "exact" })
    .eq("type", "book")
    .order("is_active", { ascending: false })
    .order("label", { ascending: true })
    .limit(MAX_BOOK_LIBRARY_ITEMS);

  if (error) throw error;
  return projectBookLibraryJourney(data || [], { totalCount: count });
}

