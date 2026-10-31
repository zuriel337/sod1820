import React, { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { verifyEls2029Selection } from "../../lib/research/els2029ReplayClient.js";
import { buildElsAdvancedLoadItem, buildElsAdvancedPageRequest, buildElsAdvancedSelection, buildElsExactSkipProbe, elsSearchSpelling, projectElsAdvancedPage } from "../../lib/research/elsAdvancedPage.js";
import { prepareElsAutomaticResearchPlan, runElsAutomaticResearchSlice, summarizeElsAutomaticPlan } from "../../lib/research/elsAutomaticResearchPlan.js";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import ElsResearchActivity2029 from "./ElsResearchActivity2029.jsx";

const initialForm = { term: "", scope: "torah", spelling: "regular", skipMin: "2", skipMax: "80", pageSize: "20" };

function AdvancedLiveProgress({ activeVariant, rows, reduction, onReduce, onStop }) {
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);
  const completed = rows.filter(row => ["OK", "EXECUTED_EMPTY"].includes(row.state)).length;
  const failed = rows.filter(row => row.state === "FAILED").length;
  return <section className="els29-advanced-progress" aria-label="התקדמות מחקר הדילוגים">
    <strong role="status">{activeVariant ? <>סורק עכשיו: <bdi>{activeVariant}</bdi></> : "מחפש מופעים או מכין צורות למחקר…"}</strong>
    <span>זמן שחלף: <bdi>{elapsed}</bdi> שניות</span>
    {activeVariant && rows.length ? <>
      <progress max={rows.length} value={completed + failed} aria-label="צורות שהבדיקה שלהן הסתיימה" />
      <span>{completed} צורות הושלמו · {failed} נכשלו · {rows.length - completed - failed} ממתינות או בסריקה</span>
      <span>ההתקדמות מתייחסת לצורות, לא לכל המופעים. ייתכנו דפים נוספים.</span>
    </> : <progress aria-label="ממתין לתשובת החיפוש" />}
    <div>
      <button type="button" className="sod29-action" onClick={onStop}>עצור סריקה</button>
      {reduction ? <button type="button" className="sod29-action" onClick={onReduce}>{reduction.label}</button> : null}
    </div>
    <span>עצירה וצמצום משאירים תוצאות שכבר הוצגו. בדיקה בהיקף החדש דורשת לחיצה נוספת; המטריצה הפעילה נשמרת.</span>
  </section>;
}

export default function ElsAdvancedSearch2029({ onLoad, onExactSkip, deriveCanonicalForms, onPlanSummary, exactStatus = "idle", researchOrigin = null, active = true, searchDraft = null, activeAxis = null, onChooseCross }) {
  const { elsResearchOperation } = useResearch();
  const [form, setForm] = useState(initialForm);
  const [query, setQuery] = useState(null);
  const [pages, setPages] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [related, setRelated] = useState("");
  const [researchTarget, setResearchTarget] = useState("all");
  const [exactSkip, setExactSkip] = useState("");
  const [automaticPlan, setAutomaticPlan] = useState(null);
  const [automaticSlices, setAutomaticSlices] = useState([]);
  const [automaticPages, setAutomaticPages] = useState({});
  const [liveRows, setLiveRows] = useState({});
  const [activeVariant, setActiveVariant] = useState(null);
  const [busy, setBusy] = useState(false);
  const [selecting, setSelecting] = useState(null);
  const [notice, setNotice] = useState("");
  const [searchMode, setSearchMode] = useState("range");
  const [runMode, setRunMode] = useState("single");
  const [fullRange, setFullRange] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [preparedPlan, setPreparedPlan] = useState(null);
  const [excludedTerms, setExcludedTerms] = useState([]);
  const [preparing, setPreparing] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const revision = useRef(0);
  const exactRequestId = useRef(0);
  const abortRef = useRef(null);
  const beginRequest = () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    return controller;
  };
  const finishRequest = controller => { if (abortRef.current === controller) abortRef.current = null; };
  const stopSearch = useCallback((message = "הסריקה הופסקה. תוצאות שהושלמו נשמרו; שאר הבדיקות לא הושלמו.") => {
    revision.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false); setPreparing(false); setSelecting(null); setActiveVariant(null);
    setNotice(message);
  }, []);
  useEffect(() => {
    if (!active && (busy || preparing || selecting)) stopSearch("החיפוש המקומי נעצר במעבר סוג החיפוש. הטיוטה והתוצאות שכבר התקבלו נשמרו.");
  }, [active, busy, preparing, selecting, stopSearch]);
  useEffect(() => () => abortRef.current?.abort(), []);
  const invalidateDraft = () => {
    stopSearch("");
    setPreparedPlan(null); setExcludedTerms([]);
  };
  const edit = (field, value) => {
    invalidateDraft();
    setForm(current => ({ ...current, [field]: value }));
  };
  const inputForm = { ...form, skipMax: fullRange ? "" : form.skipMax };
  const rangeError = !fullRange && form.skipMax.trim() === "" ? "הזינו גבול עליון, או סמנו במפורש חיפוש בכל הדילוגים האפשריים." : null;
  const draft = { form, related, researchTarget, exactSkip, searchMode, runMode, fullRange, excludedTerms };
  const settingsChanged = lastRun && JSON.stringify(draft) !== JSON.stringify(lastRun.draft);
  const rememberRun = () => setLastRun({ draft, preparedPlan });
  const restoreSettings = () => {
    if (!lastRun) return;
    stopSearch("");
    const saved = lastRun.draft;
    setForm(saved.form); setRelated(saved.related); setResearchTarget(saved.researchTarget);
    setExactSkip(saved.exactSkip); setSearchMode(saved.searchMode); setRunMode(saved.runMode);
    setFullRange(saved.fullRange); setExcludedTerms(saved.excludedTerms); setPreparedPlan(lastRun.preparedPlan);
    setOptionsOpen(saved.runMode !== "single" || saved.form.spelling !== "regular");
    setNotice("הגדרות החיפוש האחרון הוחזרו. לא הופעלה סריקה חדשה.");
  };
  const reuseTerm = source => {
    if (!source?.term) return;
    invalidateDraft();
    setForm(current => ({ ...current, term: source.term, scope: source.scope === "tanakh" ? "tanakh" : "torah" }));
  };
  const search = async (more = false) => {
    if (!more && rangeError) { setNotice(rangeError); return; }
    const source = more ? query : inputForm;
    const built = buildElsAdvancedPageRequest(source, more ? cursor : null);
    if (built.error) { setNotice(built.error); return; }
    const seq = ++revision.current;
    const controller = beginRequest();
    setBusy(true); setNotice("");
    if (!more) { rememberRun(); setQuery({ ...inputForm }); setPages([]); setCursor(null); setAutomaticPlan(null); setAutomaticSlices([]); setAutomaticPages({}); onPlanSummary?.(null); }
    try {
      const response = await supabase.functions.invoke("els-search-bridge", { body: built.request, signal: controller.signal });
      if (seq !== revision.current) return;
      if (response.error && built.request.skip_max > 500) {
        setNotice("החיפוש בטווח הגבוה לא הושלם. ייתכן שהבקשה הייתה כבדה מדי או שהשירות אינו זמין כרגע. אפשר לנסות טווח קטן יותר או דילוג מדויק.");
        return;
      }
      const page = projectElsAdvancedPage(response);
      if (page.error) { setNotice(`החיפוש לא הושלם: ${page.error}`); return; }
      if (more && page.cursor && page.cursor.skip === cursor.skip && page.cursor.start === cursor.start && page.cursor.dir === cursor.dir) {
        setNotice("סמן ההמשך לא התקדם. אפשר לנסות שוב או להתחיל חיפוש חדש."); return;
      }
      if (more) {
        const seen = new Set(pages.flatMap(previous => previous.projection.occurrences.map(hit => hit.occurrenceId)));
        if (page.projection.occurrences.some(hit => seen.has(hit.occurrenceId))) {
          setNotice("התקבלו תוצאות כפולות מהשרת. אפשר לנסות שוב או להתחיל חיפוש חדש."); return;
        }
      }
      setPages(current => more ? [...current, page] : [page]);
      setCursor(page.cursor);
      if (!page.projection.occurrences.length && !more) setNotice("לא נמצאו מופעים בטווח המבוקש. אפשר להרחיב את טווח הדילוגים ולחפש שוב.");
    } catch (error) {
      if (seq === revision.current && !controller.signal.aborted) setNotice(`החיפוש לא הושלם: ${error?.message || "שגיאת תקשורת"}`);
    } finally {
      if (seq === revision.current) setBusy(false);
      finishRequest(controller);
    }
  };
  const scanAutomaticPlan = async (plan, seq, existing = [], signal) => {
    const slices = [...existing];
    let offset = slices.at(-1)?.nextOffset ?? 0;
    while (offset < plan.candidates.length && seq === revision.current && !signal?.aborted) {
      const result = await runElsAutomaticResearchSlice({ plan, offset, onProgress: progress => {
        if (seq !== revision.current) return;
        setActiveVariant(progress.phase === "searching" ? progress.term : null);
        if (progress.row) setLiveRows(current => ({ ...current, [progress.term]: progress.row }));
      }, invokePage: async request => {
        if (seq !== revision.current || signal?.aborted) throw new Error("cancelled");
        return supabase.functions.invoke("els-search-bridge", { body: request, signal });
      } });
      if (seq !== revision.current) return;
      if (result.error) { setNotice(result.error); return; }
      slices.push(result);
      setAutomaticSlices([...slices]);
      onPlanSummary?.(summarizeElsAutomaticPlan(plan, slices));
      if (result.nextOffset <= offset) { setNotice("הסריקה נעצרה בלי להתקדם. אפשר לנסות שוב בטווח דילוגים מצומצם יותר."); return; }
      offset = result.nextOffset;
      if (result.rows.some(row => row.state === "FAILED") && result.hasMoreCandidates) {
        setNotice("חלק מהצורות לא הושלמו בגלל שגיאת שרת. הצורות שנותרו ממתינות; אפשר להמשיך את הסריקה.");
        return;
      }
    }
    if (seq === revision.current && slices.some(slice => slice.rows.some(row => row.state === "FAILED")))
      setNotice("הסריקה הסתיימה, אך חלק מהצורות לא נבדקו עד הסוף בגלל שגיאת שרת. אין להסיק שאין להן מופעים.");
  };
  const prepareForms = async () => {
    if (rangeError) { setNotice(rangeError); return; }
    const input = [researchTarget !== "secondary" ? form.term : "", researchTarget !== "primary" ? related : ""].filter(Boolean).join("\n");
    const preflight = prepareElsAutomaticResearchPlan({ expressions: input, scope: form.scope,
      skipMin: inputForm.skipMin, skipMax: inputForm.skipMax, pageSize: form.pageSize });
    if (preflight.error) { setNotice(preflight.error); return; }
    const seq = ++revision.current;
    abortRef.current?.abort(); abortRef.current = null;
    setPreparing(true); setNotice(""); setPreparedPlan(null); setExcludedTerms([]);
    try {
      let canonicalForms = [];
      try { canonicalForms = await deriveCanonicalForms?.(preflight.sources) || []; }
      catch { if (seq === revision.current) setNotice("חלק מצורות סדר המילים לא נטענו. הרשימה מציגה רק את הצורות שהוכנו; אפשר להכין אותה שוב."); }
      if (seq !== revision.current) return;
      const plan = prepareElsAutomaticResearchPlan({ expressions: input, scope: form.scope,
        skipMin: inputForm.skipMin, skipMax: inputForm.skipMax, pageSize: form.pageSize, canonicalForms });
      if (plan.error) { setNotice(plan.error); return; }
      setPreparedPlan(plan);
    } catch (error) {
      if (seq === revision.current) setNotice(`הכנת הביטויים לא הושלמה: ${error?.message || "שגיאת תקשורת"}`);
    } finally {
      if (seq === revision.current) setPreparing(false);
    }
  };
  const searchAutomatic = async () => {
    if (!preparedPlan) { setNotice("הכינו תחילה את רשימת הביטויים ובחרו מה לבדוק."); return; }
    const candidates = preparedPlan.candidates.filter(row => !excludedTerms.includes(row.canonicalTerm));
    if (!candidates.length) { setNotice("בחרו לפחות ביטוי אחד לבדיקה."); return; }
    const plan = Object.freeze({ ...preparedPlan, candidates: Object.freeze(candidates) });
    const seq = ++revision.current;
    const controller = beginRequest();
    rememberRun();
    setBusy(true); setNotice(""); setAutomaticPlan(plan); setAutomaticSlices([]); setAutomaticPages({}); setLiveRows({}); setActiveVariant(null); setPages([]); setCursor(null); setQuery({ ...inputForm });
    onPlanSummary?.(summarizeElsAutomaticPlan(plan));
    try {
      await scanAutomaticPlan(plan, seq, [], controller.signal);
    } catch (error) {
      if (seq === revision.current && !controller.signal.aborted) setNotice(`תוכנית המחקר לא הושלמה: ${error?.message || "שגיאת תקשורת"}`);
    } finally {
      if (seq === revision.current) { setBusy(false); setActiveVariant(null); }
      finishRequest(controller);
    }
  };
  const continueAutomatic = async () => {
    const offset = automaticSlices.at(-1)?.nextOffset ?? 0;
    if (!automaticPlan || offset >= automaticPlan.candidates.length) return;
    const seq = ++revision.current;
    const controller = beginRequest();
    setBusy(true); setNotice("");
    try {
      await scanAutomaticPlan(automaticPlan, seq, automaticSlices, controller.signal);
    } catch (error) {
      if (seq === revision.current) setNotice(`המשך התוכנית לא הושלם: ${error?.message || "שגיאת תקשורת"}`);
    } finally {
      if (seq === revision.current) { setBusy(false); setActiveVariant(null); }
      finishRequest(controller);
    }
  };
  const continueVariant = async row => {
    const prior = automaticPages[row.canonicalTerm];
    const cursorForTerm = prior ? prior.cursor : row.cursor;
    if (!cursorForTerm || !automaticPlan) return;
    const seq = ++revision.current;
    const controller = beginRequest();
    setBusy(true); setNotice("");
    try {
      const built = buildElsAdvancedPageRequest({ term: row.term, scope: automaticPlan.scope,
        skipMin: automaticPlan.skipMin, skipMax: automaticPlan.skipMax, pageSize: automaticPlan.pageSize }, cursorForTerm);
      if (built.error) { setNotice(built.error); return; }
      const response = await supabase.functions.invoke("els-search-bridge", { body: built.request, signal: controller.signal });
      if (seq !== revision.current) return;
      const page = projectElsAdvancedPage(response);
      if (page.error) { setNotice(`המשך הצורה לא הושלם: ${page.error}`); return; }
      if (page.cursor && page.cursor.skip === cursorForTerm.skip && page.cursor.start === cursorForTerm.start && page.cursor.dir === cursorForTerm.dir) {
        setNotice("סמן ההמשך לא התקדם. נסו שוב מאוחר יותר."); return;
      }
      const seen = new Set([...(row.projection?.occurrences || []), ...(prior?.pages || []).flatMap(item => item.projection.occurrences)].map(hit => hit.occurrenceId));
      if (page.projection.occurrences.some(hit => seen.has(hit.occurrenceId))) { setNotice("השרת החזיר מופעים כפולים; ההמשך לא צורף."); return; }
      const nextPages = { ...automaticPages, [row.canonicalTerm]: {
        pages: [...(prior?.pages || []), page], cursor: page.cursor,
      } };
      setAutomaticPages(nextPages);
      onPlanSummary?.(summarizeElsAutomaticPlan(automaticPlan, automaticSlices, nextPages));
    } catch (error) {
      if (seq === revision.current) setNotice(`המשך הצורה לא הושלם: ${error?.message || "שגיאת תקשורת"}`);
    } finally {
      if (seq === revision.current) setBusy(false);
      finishRequest(controller);
    }
  };
  const searchExactSkip = () => {
    const built = buildElsExactSkipProbe({ term: form.term, scope: form.scope, spelling: form.spelling, skip: exactSkip }, ++exactRequestId.current);
    if (built.error) { setNotice(built.error); return; }
    stopSearch("");
    rememberRun();
    setPages([]); setCursor(null); setAutomaticPlan(null); setAutomaticSlices([]); setAutomaticPages({}); onPlanSummary?.(null);
    onExactSkip?.(built.request);
  };
  const select = async (occurrence, projection, scope = query?.scope) => {
    const selection = buildElsAdvancedSelection(occurrence, projection, scope);
    if (!selection) { setNotice("אי אפשר לבחור מופע בלי זהות מלאה."); return; }
    const seq = ++revision.current;
    setSelecting(occurrence.occurrenceId); setNotice("");
    try {
      const verified = await verifyEls2029Selection(selection, body => supabase.functions.invoke("els-search-bridge", { body }));
      if (seq !== revision.current) return;
      if (!verified.ok) { setNotice(`המופע לא אומת: ${verified.state}. בחרו מופע אחר.`); return; }
      const loadItem = buildElsAdvancedLoadItem(selection, projection);
      onLoad?.(loadItem);
      setNotice("המופע אומת ונשלח למטריצה. הממצאים והמקור יופיעו בכלי המשותף.");
    } catch {
      if (seq === revision.current) setNotice("המופע לא אומת בגלל שגיאת תקשורת. המטריצה הקיימת נשמרה.");
    } finally {
      if (seq === revision.current) setSelecting(null);
    }
  };
  const count = pages.reduce((total, page) => total + page.projection.occurrences.length, 0);
  const spellingPreview = elsSearchSpelling(form.term, form.spelling);
  const completedRows = new Map(automaticSlices.flatMap(slice => slice.rows).map(row => [row.canonicalTerm, row]));
  const automaticRows = automaticPlan?.candidates.map(candidate => liveRows[candidate.term] || completedRows.get(candidate.canonicalTerm) || { ...candidate, state: "NOT_SCANNED", count: 0 }) || [];
  const rangeMin = Number(inputForm.skipMin), rangeMax = Number(inputForm.skipMax);
  const reduction = form.scope === "tanakh" ? { field: "scope", value: "torah", label: "עצור וצמצם לתורה" }
    : Number.isSafeInteger(rangeMin) && Number.isSafeInteger(rangeMax) && rangeMax - rangeMin > 80
      ? { field: "skipMax", value: String(rangeMin + Math.ceil((rangeMax - rangeMin) / 2)), label: "עצור והקטן את טווח הדילוגים" } : null;
  const reduceSearch = () => {
    if (!reduction) return;
    edit(reduction.field, reduction.value);
    setNotice("הסריקה נעצרה וההיקף צומצם. המטריצה הפעילה לא השתנתה. לחצו שוב כדי לחפש בהיקף החדש.");
  };
  const formMode = searchMode === "range" && runMode === "forms";
  const backgroundMode = searchMode === "range" && runMode === "background";
  const selectedForms = preparedPlan?.candidates.filter(row => !excludedTerms.includes(row.canonicalTerm)) || [];
  const backgroundUnavailable = !researchOrigin || !!elsResearchOperation?.task || !elsResearchOperation;
  const submitLabel = searchMode === "exact" ? "מצא ופתח בדילוג הידוע" : formMode ? "חפש את הביטויים שנבחרו" : backgroundMode ? "התחל בדיקה ברקע" : "חפש בטווח";
  const execute = async () => {
    if (busy || preparing || selecting || exactStatus === "probing") return;
    if (searchMode === "exact") { searchExactSkip(); return; }
    if (rangeError) { setNotice(rangeError); return; }
    if (formMode) { await searchAutomatic(); return; }
    if (backgroundMode) {
      if (backgroundUnavailable) { setNotice("לבדיקה ברקע צריך מופע מאומת וללא מחקר אחר במעקב."); return; }
      rememberRun();
      setPages([]); setCursor(null); setAutomaticPlan(null); setAutomaticSlices([]); setAutomaticPages({}); onPlanSummary?.(null);
      const result = await elsResearchOperation.start({ axis: form.term, related, spelling: form.spelling, scope: form.scope,
        skipMin: inputForm.skipMin, skipMax: inputForm.skipMax, pageSize: form.pageSize }, researchOrigin);
      if (!result?.ok && result?.error) setNotice(result.error);
      return;
    }
    await search(false);
  };
  return <section className="sod29-section" aria-label="חיפוש דילוגים מתקדם" data-els-advanced-search="v1">
    <div className="sod29-section-head"><div><h3>חיפוש מדויק, בקצב שלכם</h3><p>בוחרים ביטוי והיקף בדיקה. היפוכים ובדיקה ברקע נפתחים רק לפי בחירתכם — ללא AI.</p></div></div>
    <form noValidate onSubmit={event => { event.preventDefault(); execute(); }} className="els29-advanced-form">
      <fieldset className="els29-advanced-group">
        <legend>מה מחפשים?</legend>
        <div className="els29-advanced-fields">
          <label>הביטוי לבדיקה <input aria-label="מונח לחיפוש מתקדם" placeholder="כתבו מילה או ביטוי" value={form.term} onChange={event => edit("term", event.target.value)} /></label>
          <label>איפה לחפש <select aria-label="טקסט לחיפוש מתקדם" value={form.scope} onChange={event => edit("scope", event.target.value)}><option value="torah">תורה</option><option value="tanakh">כל התנ״ך</option></select></label>
        </div>
        {searchDraft?.term || activeAxis?.term ? <div className="els29-advanced-reuse">
          {searchDraft?.term ? <button type="button" className="sod29-action" onClick={() => reuseTerm(searchDraft)}>השתמש בביטוי שהקלדתי: <bdi>{searchDraft.term}</bdi></button> : null}
          {activeAxis?.term ? <button type="button" className="sod29-action" onClick={() => reuseTerm(activeAxis)}>השתמש בציר הפעיל: <bdi>{activeAxis.term}</bdi></button> : null}
        </div> : null}
      </fieldset>
      <fieldset className="els29-advanced-group">
        <legend>באילו דילוגים?</legend>
        <div className="els29-advanced-methods" role="group" aria-label="היקף בדיקת הדילוגים">
          <button type="button" className="sod29-action" aria-pressed={searchMode === "range"} onClick={() => { stopSearch(""); setSearchMode("range"); }}>טווח דילוגים</button>
          <button type="button" className="sod29-action" aria-pressed={searchMode === "exact"} onClick={() => { stopSearch(""); setSearchMode("exact"); }}>דילוג ידוע</button>
        </div>
        {searchMode === "range" ? <>
          <div className="els29-advanced-fields els29-advanced-range">
            <label>מדילוג <input aria-label="דילוג מינימלי" aria-describedby="els29-skip-help" type="number" min="2" step="1" value={form.skipMin} onChange={event => edit("skipMin", event.target.value)} /></label>
            <label>עד דילוג <input aria-label="דילוג מקסימלי" aria-describedby="els29-skip-help" disabled={fullRange} type="number" min="2" step="1" value={form.skipMax} onChange={event => edit("skipMax", event.target.value)} /></label>
          </div>
          <p id="els29-skip-help">דילוג הוא המרחק בין מיקומי האותיות בטקסט. נבדקים שני כיווני הקריאה. מופע מחוץ לטווח הזה לא יופיע בתוצאות.</p>
          <label className="els29-advanced-check"><input type="checkbox" checked={fullRange} onChange={event => { invalidateDraft(); setFullRange(event.target.checked); }} /> ללא גבול עליון שקבעתי — כל הדילוגים האפשריים מהגבול התחתון</label>
          {fullRange ? <p className="els29-advanced-warning">זהו חיפוש רחב שעלול להתארך. המנוע מגביל לפי אורך הביטוי והטקסט; ייתכנו דפי המשך או עצירה לפני השלמה.</p> : null}
        </> : <>
          <label>הדילוג שידוע לכם <input aria-label="דילוג מדויק ללא תקרת 500" aria-describedby="els29-exact-help" type="number" min="2" step="1" value={exactSkip} onChange={event => { stopSearch(""); setExactSkip(event.target.value); }} /></label>
          <p id="els29-exact-help">הזינו מספר חיובי; המנוע בודק קדימה ואחורה. הפעולה פותחת מופע מאומת אחד בדילוג הזה, לא רשימה של כל המופעים. טווח הדילוגים אינו משמש כאן.</p>
        </>}
      </fieldset>
      <details className="els29-advanced-options" open={optionsOpen} onToggle={event => setOptionsOpen(event.currentTarget.open)}>
        <summary>אפשרויות נוספות · היפוכים ובדיקה ברקע</summary>
        {searchMode === "range" ? <fieldset className="els29-advanced-group">
          <legend>אופן הבדיקה</legend>
          {[["single", "ביטוי אחד כפי שהוגדר"], ["forms", "בדוק גם היפוכים וסדר מילים"], ["background", "בדיקת ביטויים ברקע · ללא AI"]].map(([value, label]) => <label className="els29-advanced-check" key={value}>
            <input type="radio" name="els29-advanced-run-mode" value={value} checked={runMode === value} onChange={() => { stopSearch(""); setRunMode(value); }} />{label}
          </label>)}
        </fieldset> : null}
        {!formMode ? <label>צורת הביטוי שייבדק <select aria-label="צורת כתיבה לחיפוש" value={form.spelling} onChange={event => edit("spelling", event.target.value)}>
          <option value="regular">כפי שהוקלד</option><option value="reverse_all">היפוך כל הביטוי</option>
          <option value="reverse_words">היפוך האותיות בכל מילה</option><option value="reverse_last">היפוך האותיות במילה האחרונה</option>
        </select><span className="els29-advanced-help">משנה את סדר האותיות המבוקש, לא את כיוון הסריקה. בבדיקה ברקע השינוי חל גם על הביטויים הנוספים.</span></label> : null}
        {formMode || backgroundMode ? <div className="els29-advanced-related">
          <label>ביטויים נוספים לבדיקה בנפרד
            <textarea aria-label="מילות המשך למחקר" aria-describedby="els29-related-help" value={related} onChange={event => { invalidateDraft(); setRelated(event.target.value); }} rows={3} placeholder="ביטוי אחד בכל שורה, או הפרדה בפסיק" />
          </label>
          <p id="els29-related-help">כל ביטוי נבדק בנפרד בטקסט. זו אינה הצלבה ואין דרישה שייפגש עם הביטוי הראשי.</p>
          {onChooseCross ? <button type="button" className="sod29-action" onClick={onChooseCross}>רוצים ממצאים מחוברים? עברו להצלבה</button> : null}
        </div> : null}
        {formMode ? <div className="els29-advanced-forms-help">
          <label>על אילו ביטויים להפעיל את ההיפוכים? <select aria-label="מונחים למחקר הצורות" value={researchTarget} onChange={event => { invalidateDraft(); setResearchTarget(event.target.value); }}>
            <option value="all">הביטוי הראשי והביטויים הנוספים</option><option value="primary">הביטוי הראשי בלבד</option><option value="secondary">הביטויים הנוספים בלבד</option>
          </select></label>
          <p>בודק מקור, היפוך הביטוי, היפוך האותיות בכל מילה והיפוך המילה האחרונה. בביטוי בן שתי מילים נבדקים גם חילופי הסדר ושילובי ההיפוכים של שתיהן. אין ערבוב חופשי של אותיות.</p>
          <button type="button" className="sod29-action" disabled={busy || preparing || !!selecting} onClick={prepareForms}>{preparing ? "מכין את רשימת הביטויים…" : "הצג את הביטויים לפני החיפוש"}</button>
          <p>הכנת הרשימה אינה סריקה. צורות זהות מופיעות פעם אחת; אפשר לבטל סימון לפני ההפעלה.</p>
          {preparedPlan ? <fieldset className="els29-advanced-candidates">
            <legend>{selectedForms.length} מתוך {preparedPlan.candidates.length} ביטויים נבחרו</legend>
            {preparedPlan.canonicalFormsPending ? <p>חלק מצורות סדר המילים לא זמינות. ייבדקו רק הביטויים המוצגים כאן.</p> : null}
            {preparedPlan.candidates.map(row => <label className="els29-advanced-check" key={row.canonicalTerm}>
              <input type="checkbox" aria-label={`בדוק ${row.term}`} checked={!excludedTerms.includes(row.canonicalTerm)} onChange={event => { stopSearch(""); setExcludedTerms(current => event.target.checked ? current.filter(term => term !== row.canonicalTerm) : [...current, row.canonicalTerm]); }} />
              <span><bdi>{row.term}</bdi><small>{row.derivations.map(item => item.ruleLabel).join(" · ")}</small></span>
            </label>)}
          </fieldset> : null}
        </div> : null}
        {backgroundMode ? <p className="els29-advanced-note">{!researchOrigin ? "לבדיקה ברקע, פתחו תחילה מופע מאומת במטריצה. הוא משמש נקודת חזרה, לא גבול הסריקה." : elsResearchOperation?.task ? "כבר יש מחקר במעקב. עצרו ונקו אותו לפני התחלת בדיקה נוספת." : "הוסיפו 1–3 ביטויים. הבדיקה ממשיכה במעבר בין דפי האתר, ללא מילון או AI. סגירת הדף או רענון אינם מבטיחים המשך."}</p> : null}
        {searchMode === "range" ? <label>כמה תוצאות לטעון בכל דף <input aria-label="תוצאות בדף" type="number" min="1" max="100" value={form.pageSize} onChange={event => edit("pageSize", event.target.value)} /><span className="els29-advanced-help">זו כמות טעינה בלבד, לא גבול למספר המופעים שקיימים.</span></label> : null}
      </details>
      <div className="els29-advanced-summary" aria-label="מה ייבדק בלחיצה">
        <strong>מה ייבדק בלחיצה?</strong>
        {formMode ? <p>{preparedPlan ? `${selectedForms.length} ביטויים מהרשימה שסימנתם, כל אחד בנפרד.` : "הכינו את רשימת הביטויים באפשרויות הנוספות לפני ההפעלה."}</p>
          : <p className="els29-spelling-preview">יחופש בפועל: <bdi>{spellingPreview || "טרם נכתב ביטוי"}</bdi>{backgroundMode ? " והביטויים הנוספים, בנפרד." : ""}</p>}
        <p>{form.scope === "torah" ? "תורה" : "כל התנ״ך"} · {searchMode === "exact" ? <>דילוג <bdi>{exactSkip || "טרם הוגדר"}</bdi> בלבד · פתיחת מופע אחד</> : fullRange ? <>כל הדילוגים האפשריים מ־<bdi>{form.skipMin || "?"}</bdi></> : <>דילוגים <bdi>{form.skipMin || "?"}–{form.skipMax || "?"}</bdi> בלבד</>} · קדימה ואחורה · ללא AI</p>
        {searchMode === "range" ? <p>{backgroundMode ? "בדיקה ברקע של דפים ראשונים; אינה סריקה ממצה." : "תוצאות מתקבלות בדפים. המשך זמין כשיש עוד מופעים; מעבר לסוג חיפוש אחר עוצר את הסריקה המקומית."}</p> : null}
        <button className="sod29-action primary" type="submit" disabled={busy || preparing || !!selecting || exactStatus === "probing" || (formMode && !selectedForms.length) || (backgroundMode && backgroundUnavailable)}>{submitLabel}</button>
      </div>
    </form>
    {lastRun ? <div className="els29-advanced-last-run" aria-label="החיפוש האחרון שהופעל">
      <strong>החיפוש האחרון שהופעל</strong>
      <p><bdi>{lastRun.draft.form.term}</bdi> · {lastRun.draft.form.scope === "torah" ? "תורה" : "כל התנ״ך"} · {lastRun.draft.searchMode === "exact" ? `דילוג ${lastRun.draft.exactSkip}` : lastRun.draft.fullRange ? `מ־${lastRun.draft.form.skipMin} ללא גבול עליון שנבחר` : `דילוגים ${lastRun.draft.form.skipMin}–${lastRun.draft.form.skipMax}`}</p>
      {settingsChanged ? <><p>ההגדרות השתנו. התוצאות שכבר התקבלו שייכות לחיפוש הקודם; לא הופעלה בדיקה חדשה.</p><button type="button" className="sod29-action" onClick={restoreSettings}>חזור להגדרות החיפוש האחרון</button></> : null}
    </div> : null}
    {notice ? <p role="status">{notice}</p> : null}
    {lastRun?.draft.searchMode === "exact" ? exactStatus === "failed" ? <p role="alert">לא הצלחנו למצוא או לאמת מופע בדילוג המבוקש. המטריצה הקיימת נשמרה.</p>
      : exactStatus === "verified" ? <p role="status">המופע אומת ונשלח למטריצה.</p>
        : exactStatus === "probing" ? <p role="status">מחפש ומאמת מופע במנוע הקנוני…</p> : null : null}
    {busy ? <AdvancedLiveProgress key={revision.current} activeVariant={activeVariant} rows={automaticRows}
      reduction={reduction} onReduce={reduceSearch} onStop={() => stopSearch()} /> : null}
    {elsResearchOperation?.task ? <ElsResearchActivity2029 onOpenResult={select} selecting={busy || preparing || !!selecting} /> : null}
    {pages.length ? <div aria-label="מופעי החיפוש המתקדם"><p>{count} מופעים נטענו ב־{pages.length} דפים{cursor ? " · יש תוצאות נוספות" : " · סוף התוצאות בטווח"}</p>
      <ol>{pages.flatMap(page => page.projection.occurrences.map(hit => <li key={hit.occurrenceId}>
        <button type="button" className="sod29-action" disabled={busy || preparing || !!selecting} onClick={() => select(hit, page.projection)}>
          <bdi>{page.projection.term}</bdi> · דילוג {hit.skip} · {hit.dir === 1 ? "קדימה" : "אחורה"} · מיקום {hit.start + 1}
        </button>
      </li>))}</ol>
      {cursor ? <button type="button" className="sod29-action" disabled={busy || preparing || !!selecting} onClick={() => search(true)}>טען תוצאות נוספות</button> : null}
    </div> : null}
    {automaticPlan ? <div aria-label="תוכנית צורות אוטומטית">
      <p>{automaticPlan.sources.length} ביטויים · {automaticPlan.candidates.length} צורות שונות · {automaticRows.filter(row => row.state === "OK" || row.state === "EXECUTED_EMPTY").length} הושלמו · {automaticRows.filter(row => row.state === "FAILED").length} נכשלו</p>
      {automaticPlan.canonicalFormsPending ? <p className="sod29-muted">צורות FORMS של המנוע עדיין לא נטענו לכל הביטויים; המופעים המוצגים מתייחסים לצורות שנסרקו בלבד.</p> : null}
      {automaticRows.map(row => <section key={row.canonicalTerm} aria-label={`תוצאות ${row.term}`}>
        <h4><bdi>{row.term}</bdi> · {row.state === "FAILED" ? "הבדיקה לא הושלמה" : row.state === "NOT_SCANNED" ? "ממתין לסריקה" : `${row.count + (automaticPages[row.canonicalTerm]?.pages || []).reduce((total, page) => total + page.projection.occurrences.length, 0)} מופעים נטענו`}</h4>
        <p className="sod29-muted">{row.derivations.map(item => `״${item.source}״ ← ${item.ruleLabel}`).join(" · ")}</p>
        <p className="sod29-muted">{activeVariant === row.term ? "הצורה הזאת נסרקת כעת…" : row.error ? `הבדיקה לא הושלמה: ${row.error}`
          : row.state === "NOT_SCANNED" || row.state === "BUDGET_STOPPED" ? "הצורה ממתינה להמשך הסריקה."
            : (automaticPages[row.canonicalTerm] ? automaticPages[row.canonicalTerm].cursor != null : row.cursor != null) ? "יש עוד מופעים לצורה זו."
              : row.partial && !automaticPages[row.canonicalTerm] ? "הסריקה נעצרה או שיש עוד דפים לבדיקה."
              : row.count === 0 ? "לא נמצאו מופעים בטווח שנבדק."
                : "הדף הראשון הושלם בטווח שנבדק."}</p>
        {[...(row.projection ? [row.projection] : []), ...(automaticPages[row.canonicalTerm]?.pages || []).map(page => page.projection)].flatMap(projection => projection.occurrences.map(hit => <button
          key={hit.occurrenceId} type="button" className="sod29-action" disabled={busy || preparing || !!selecting} onClick={() => select(hit, projection)}>
          דילוג {hit.skip} · {hit.dir === 1 ? "קדימה" : "אחורה"} · מיקום {hit.start + 1}
        </button>))}
        {(automaticPages[row.canonicalTerm]?.cursor || (automaticPages[row.canonicalTerm] ? null : row.cursor)) ? <button type="button" className="sod29-action" disabled={busy || preparing || !!selecting} onClick={() => continueVariant(row)}>טען עוד מופעים לצורה זו</button> : null}
      </section>)}
      {automaticSlices.at(-1)?.hasMoreCandidates && !busy ? <button type="button" className="sod29-action" disabled={preparing || !!selecting} onClick={continueAutomatic}>המשך לסרוק צורות</button> : null}
      <p className="sod29-muted">צורות של אותו ביטוי הן ניסויים תלויים. קרבה או ריבוי התאמות אינם הוכחת הצלבה; בחרו מופע מאומת לפתיחה במטריצה.</p>
    </div> : null}
  </section>;
}
