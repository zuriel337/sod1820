// Series title format — ZURIEL decision 25.11.2026 (work_log f1c40013, task MAH_KORE_HABORA_TITLE_FORMAT_20261125):
// a Post in «מה קורה הבורא» is titled "<content title> | מה קורה הבורא", the same way «מימד חמש» Posts are titled.
// The series name comes AFTER the content: never a leading "מה קורה הבורא —" and never a "| אלון לוי" segment
// (the writer stays the Post's author field and the visible credit in the body).
//
// Pure helpers over the existing series identities (contentSeries2029Identity.js). No store, no I/O. The publishing
// preflight (supabase/functions/_shared/postPublishPreflight.js) blocks a new series Post whose title breaks the format.
// Only the series listed here have a title rule; adding one is a ZURIEL decision.
import { CONTENT_SERIES_2029, contentSeriesAdmits } from "./contentSeries2029Identity.js";

export const SERIES_TITLE_SEPARATOR = " | ";

export const SERIES_TITLE_FORMATS = Object.freeze({
  "mah-kore-habora": Object.freeze({ decisionRef: "ZURIEL/20261125/mah-kore-title-format" }),
});

const escapeRe = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const specOf = (seriesKey) => CONTENT_SERIES_2029.find((spec) => spec.key === seriesKey && SERIES_TITLE_FORMATS[spec.key]) || null;

// The content part of a title: series label prefix/suffix and "| <writer>" segments removed.
export function seriesContentTitle(title, seriesKey) {
  const spec = specOf(seriesKey);
  let out = clean(title);
  if (!spec) return out;
  const label = escapeRe(spec.label);
  out = out.replace(new RegExp(`^${label}\\s*[—–:|-]\\s*`), "");
  out = out.replace(new RegExp(`\\s*\\|\\s*${label}$`), "");
  if (spec.writerLabel) out = out.replace(new RegExp(`\\s*\\|\\s*${escapeRe(spec.writerLabel)}(?=\\s*(\\||·|$))`, "g"), "");
  return clean(out);
}

export function seriesTitle(contentTitle, seriesKey) {
  const spec = specOf(seriesKey);
  const content = seriesContentTitle(contentTitle, seriesKey);
  return spec ? `${content}${SERIES_TITLE_SEPARATOR}${spec.label}` : content;
}

// null when the row is in no titled series or its title already has the format; otherwise what it should be.
export function seriesTitleViolation(row) {
  const title = clean(row?.title);
  for (const spec of CONTENT_SERIES_2029) {
    if (!SERIES_TITLE_FORMATS[spec.key] || !contentSeriesAdmits(row, spec)) continue;
    const expected = seriesTitle(title, spec.key);
    if (title !== expected) return { seriesKey: spec.key, title, expected };
  }
  return null;
}
