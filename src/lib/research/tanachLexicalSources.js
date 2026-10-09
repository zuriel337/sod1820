import { supabase } from "../supabase.js";

const clean = (value) => value == null ? "" : String(value).trim();
const NIQQUD = /[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C7]/g;
const MAQAF = /\u05BE/g;

export function normalizeTanachLexicalQuery(value) {
  return clean(value)
    .normalize("NFKC")
    .replace(NIQQUD, "")
    .replace(MAQAF, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function trimItems(items, limit = 6) {
  const cap = Math.max(1, Math.min(12, Math.trunc(Number(limit) || 6)));
  return Array.isArray(items) ? items.slice(0, cap) : [];
}

export async function fetchTanachTermOccurrences(term, { limit = 6 } = {}) {
  const queryTerm = normalizeTanachLexicalQuery(term);
  if (!queryTerm) return { term: queryTerm, count: 0, items: [] };
  const { data, error } = await supabase.rpc("fn_name_in_tanach", { p_name: queryTerm });
  if (error) throw error;
  const samples = trimItems(data?.samples, limit).map((row) => ({
    type: "verse",
    ref: clean(row?.ref),
    text: clean(row?.text),
    lexicalMatchKind: "exact_token",
  })).filter((row) => row.ref && row.text);
  return {
    term: queryTerm,
    count: Number.isFinite(Number(data?.count)) ? Number(data.count) : samples.length,
    items: samples,
  };
}

export async function fetchTanachPhraseOccurrences(term, { limit = 6 } = {}) {
  const queryTerm = normalizeTanachLexicalQuery(term);
  if (!queryTerm) return { term: queryTerm, count: 0, items: [] };
  const { data, error } = await supabase.rpc("fn_name_in_verse", { p_term: queryTerm });
  if (error) throw error;
  const items = trimItems(data?.items, limit).map((row) => ({
    type: "verse",
    ref: clean(row?.ref),
    text: clean(row?.text),
    lexicalMatchKind: "substring_spaceless",
  })).filter((row) => row.ref && row.text);
  return {
    term: queryTerm,
    count: Number.isFinite(Number(data?.count)) ? Number(data.count) : items.length,
    items,
  };
}

export async function fetchTanachNotarikon(term, { limit = 6 } = {}) {
  const queryTerm = normalizeTanachLexicalQuery(term);
  if (!/^[א-תךםןףץ]{2,6}$/.test(queryTerm)) {
    return {
      term: queryTerm,
      count: 0,
      rasheiCount: 0,
      sofeiCount: 0,
      rasheiTevot: [],
      sofeiTevot: [],
      status: "not_applicable",
    };
  }
  const { data, error } = await supabase.rpc("fn_notarikon", { p_word: queryTerm });
  if (error) throw error;
  return {
    term: queryTerm,
    count: Number.isFinite(Number(data?.count)) ? Number(data.count) : 0,
    rasheiCount: Number.isFinite(Number(data?.rashei_count)) ? Number(data.rashei_count) : 0,
    sofeiCount: Number.isFinite(Number(data?.sofei_count)) ? Number(data.sofei_count) : 0,
    rasheiTevot: trimItems(data?.rashei_tevot, limit),
    sofeiTevot: trimItems(data?.sofei_tevot, limit),
    status: "ready",
  };
}

export async function fetchTanachTermsTogether(terms, { limit = 6 } = {}) {
  const words = (Array.isArray(terms) ? terms : [])
    .map(normalizeTanachLexicalQuery)
    .filter(Boolean);
  if (words.length < 2) {
    return { terms: words, sameVerseCount: 0, sameChapterCount: 0, sameVerse: [], sameChapter: [] };
  }
  const { data, error } = await supabase.rpc("fn_tanach_together", { p_words: words });
  if (error) throw error;
  return {
    terms: words,
    sameVerseCount: Number.isFinite(Number(data?.same_verse_count)) ? Number(data.same_verse_count) : 0,
    sameChapterCount: Number.isFinite(Number(data?.same_chapter_count)) ? Number(data.same_chapter_count) : 0,
    sameVerse: trimItems(data?.same_verse, limit),
    sameChapter: trimItems(data?.same_chapter, limit),
  };
}

export async function fetchTanachTermProximity(a, b, { gap = 6, limit = 6 } = {}) {
  const left = normalizeTanachLexicalQuery(a);
  const right = normalizeTanachLexicalQuery(b);
  const safeGap = Math.max(1, Math.min(12, Math.trunc(Number(gap) || 6)));
  if (!left || !right || left === right) {
    return { terms: [left, right].filter(Boolean), gap: safeGap, count: 0, items: [] };
  }
  const { data, error } = await supabase.rpc("fn_tanach_proximity", {
    p_a: left,
    p_b: right,
    p_gap: safeGap,
  });
  if (error) throw error;
  return {
    terms: [left, right],
    gap: safeGap,
    count: Number.isFinite(Number(data?.count)) ? Number(data.count) : 0,
    items: trimItems(data?.items, limit),
  };
}
