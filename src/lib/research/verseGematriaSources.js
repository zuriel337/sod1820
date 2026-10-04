import { supabase } from "../supabase.js";

const clean = (value) => value == null ? "" : String(value).trim();

export const DEFAULT_VERSE_GEMATRIA_LIMIT = 6;
export const MAX_VERSE_GEMATRIA_LIMIT = 120;

export async function fetchVersesByGematria(value, { limit = DEFAULT_VERSE_GEMATRIA_LIMIT } = {}) {
  const numericValue = Number(value);
  if (!Number.isSafeInteger(numericValue) || numericValue < 0) {
    return { value: numericValue, count: 0, verses: [] };
  }
  const safeLimit = Math.max(1, Math.min(MAX_VERSE_GEMATRIA_LIMIT, Math.trunc(Number(limit) || DEFAULT_VERSE_GEMATRIA_LIMIT)));
  const { data, error } = await supabase.rpc("fn_verses_by_gematria", {
    p_value: numericValue,
    p_limit: safeLimit,
  });
  if (error) throw error;
  const verses = Array.isArray(data?.verses)
    ? data.verses.map((row) => ({
        type: "verse",
        ref: clean(row?.ref),
        label: [clean(row?.ref), clean(row?.text)].filter(Boolean).join(" — "),
        text: clean(row?.text),
        value: numericValue,
        ragil: numericValue,
        matchKind: "verse_gematria",
      })).filter((row) => row.ref && row.text)
    : [];
  return {
    value: numericValue,
    count: Number.isFinite(Number(data?.count)) ? Number(data.count) : verses.length,
    verses,
  };
}
