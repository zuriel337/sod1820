import { supabase } from "../supabase.js";
import { verseIdentity } from "./tanakhVerseIdentity.js";

const clean = (value) => value == null ? "" : String(value).trim();

function escapeLike(value) {
  return clean(value).replace(/[\\%_]/g, (match) => `\\${match}`);
}

/**
 * Read-only Tanakh occurrence projection for the currently selected expression.
 * This is textual occurrence, not gematria equality and not interpretation.
 */
export async function fetchExpressionVerseOccurrences(expression, { limit = 8 } = {}) {
  const phrase = clean(expression);
  if (!phrase || /^\d+$/.test(phrase) || phrase.length < 2) return [];

  const cap = Math.max(1, Math.min(Number(limit) || 8, 24));
  const { data, error } = await supabase
    .from("tanach_verses")
    .select("book_idx,book,chapter,verse,text,ragil")
    .ilike("text", `%${escapeLike(phrase)}%`)
    .order("book_idx", { ascending: true })
    .order("chapter", { ascending: true })
    .order("verse", { ascending: true })
    .limit(cap);

  if (error) throw error;
  return (Array.isArray(data) ? data : []).map((row) => {
    const identity = verseIdentity(
      { bookIdx: Number(row.book_idx), chapter: Number(row.chapter), verse: Number(row.verse) },
      { textWitness: "displayText" },
    );
    return {
      id: identity?.verseIdentity || `verse:${row.book_idx}:${row.chapter}:${row.verse}`,
      type: "verse",
      ref: identity?.displayRef || `${row.book} ${row.chapter}:${row.verse}`,
      label: identity?.displayRef || `${row.book} ${row.chapter}:${row.verse}`,
      text: clean(row.text),
      verseGematria: Number.isFinite(Number(row.ragil)) ? Number(row.ragil) : null,
      matchKind: "text_occurrence",
      expression: phrase,
      provenance: identity?.source || null,
    };
  });
}
