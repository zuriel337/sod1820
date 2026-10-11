import { projectEls2029Result } from "./els2029Projection.js";

const integer = value => value === "" || value == null ? null : Number.isInteger(Number(value)) ? Number(value) : null;
const SQL_INT_MAX = 2_147_483_647;

export function elsSearchSpelling(term, mode = "regular") {
  const words = String(term || "").trim().split(/\s+/).filter(Boolean);
  const reverse = word => [...word].reverse().join("");
  if (mode === "reverse_all") return words.slice().reverse().map(reverse).join(" ");
  if (mode === "reverse_words") return words.map(reverse).join(" ");
  if (mode === "reverse_last") return words.map((word, index) => index === words.length - 1 ? reverse(word) : word).join(" ");
  return words.join(" ");
}

export function buildElsAdvancedPageRequest(form, cursor = null) {
  const term = elsSearchSpelling(form?.term, form?.spelling);
  const scope = form?.scope === "tanakh" ? "tanakh" : "torah";
  const skipMin = integer(form?.skipMin);
  const skipMax = integer(form?.skipMax);
  const pageSize = integer(form?.pageSize);
  if ([...term].length < 2) return { error: "הזינו מונח של שתי אותיות לפחות." };
  if (skipMin == null || skipMax == null || skipMin < 2 || skipMax < skipMin || skipMax > SQL_INT_MAX)
    return { error: "בחרו טווח דילוגים שלם מ־2 ומעלה, מהקטן לגדול." };
  if (pageSize == null || pageSize < 1 || pageSize > 100)
    return { error: "מספר התוצאות בדף צריך להיות בין 1 ל־100." };
  if (cursor && (integer(cursor.skip) == null || integer(cursor.skip) < skipMin || integer(cursor.skip) > skipMax
    || integer(cursor.start) == null || integer(cursor.start) < 0 || ![-1, 1].includes(integer(cursor.dir))))
    return { error: "סמן ההמשך אינו תקין. התחילו חיפוש חדש." };
  return { request: {
    op: "page", term, scope, skip_min: skipMin, skip_max: skipMax, page_size: pageSize,
    selection_protocol: "POST_HOC_EXPLORATORY",
    ...(cursor ? { after_skip: cursor.skip, after_start: cursor.start, after_dir: cursor.dir } : {}),
  } };
}

export function projectElsAdvancedPage(response) {
  if (response?.error) return { error: String(response.error.message || response.error) };
  const result = response?.data?.result ?? response?.result;
  if (result?.contract !== "els_search_page_v1" || !["OK", "EXECUTED_EMPTY"].includes(result?.status))
    return { error: result?.reason || result?.status || "תשובת החיפוש אינה תקינה." };
  if (result?.completion?.executed !== true || !Array.isArray(result?.hits))
    return { error: "השרת לא השלים את דף התוצאות." };
  const projection = projectEls2029Result(result);
  const after = result?.completion?.continuation?.after;
  const more = result?.completion?.has_more === true || result?.completion?.truncated === true;
  const cursor = more && integer(after?.skip) != null
    && integer(after?.start) != null && [-1, 1].includes(integer(after?.dir))
    ? { skip: after.skip, start: after.start, dir: after.dir } : null;
  if (more && !cursor) return { error: "השרת דיווח על תוצאות נוספות ללא סמן המשך תקין." };
  return { projection, cursor, traceId: response?.data?.trace_id ?? response?.trace_id ?? null };
}

export function buildElsAdvancedSelection(occurrence, projection, scope) {
  if (!occurrence || !projection?.corpusId || !projection?.term || !["torah", "tanakh"].includes(scope)) return null;
  return {
    entityType: "els", term: projection.term, corpus: scope, corpusVersion: projection.corpusVersion,
    occurrenceId: occurrence.occurrenceId, start: occurrence.start, skip: occurrence.skip, dir: occurrence.dir,
  };
}

export function buildElsAdvancedLoadItem(selection, projection) {
  if (!selection || !projection?.corpusId) return null;
  return {
    term: selection.term, scope: selection.corpus, corpusId: projection.corpusId,
    skip: selection.skip, dir: selection.dir, start: selection.start,
    hitId: `${selection.skip}_${selection.dir}_${selection.start}`, words: [],
  };
}

// A user-chosen skip has no arbitrary 500 ceiling. The canonical iframe discovers and verifies
// the first available occurrence at that skip; this is not an exhaustive page of all hits.
export function buildElsExactSkipProbe(form, requestId) {
  const term = elsSearchSpelling(form?.term, form?.spelling);
  const skip = integer(form?.skip);
  if (term.replace(/[^א-ת]/g, "").length < 2) return { error: "הזינו מונח עברי של שתי אותיות לפחות." };
  if (!Number.isSafeInteger(skip) || skip < 2) return { error: "הזינו דילוג שלם וחיובי מ־2 ומעלה." };
  return { request: { term, scope: form?.scope === "tanakh" ? "tanakh" : "torah", skip, requestId } };
}
