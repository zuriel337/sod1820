import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { verifyEls2029Selection } from "../../lib/research/els2029ReplayClient.js";
import { buildElsAdvancedLoadItem, buildElsAdvancedPageRequest, buildElsAdvancedSelection, buildElsExactSkipProbe, elsSearchSpelling, projectElsAdvancedPage } from "../../lib/research/elsAdvancedPage.js";
import { prepareElsAutomaticResearchPlan, prepareElsCipherDiscoveryPlan, projectElsAutomaticResearchTargets, runElsAutomaticResearchSlice, summarizeElsAutomaticPlan } from "../../lib/research/elsAutomaticResearchPlan.js";

const initialForm = { term: "", scope: "torah", spelling: "regular", skipMin: "2", skipMax: "80", pageSize: "20" };

function AdvancedLiveProgress({ label, completed = 0, total = 0, onStop, reduction, onReduce }) {
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  const elapsed = (now - startedAt) / 1000;
  return <section className="els29-advanced-progress" aria-label="התקדמות מחקר הדילוגים">
    <strong role="status" aria-live="polite">{label}</strong>
    <small aria-hidden="true">עברו {elapsed.toFixed(1)} שניות · המערכת ממשיכה לעבוד</small>
    {total > 0 ? <><progress max={total} value={completed} aria-label="צורות מחקר שהושלמו" /><small>{completed} מתוך {total} צורות הושלמו</small></>
      : <progress aria-label={label} />}
    {elapsed >= 8 ? <small>אפשר להמתין גם לסריקה ארוכה. עצירה שומרת כל דף שכבר הושלם ודוחה תשובות מאוחרות.</small> : null}
    <span>
      {elapsed >= 8 && reduction ? <button type="button" className="sod29-action" onClick={onReduce}>{reduction.label}</button> : null}
      <button type="button" className="sod29-action" onClick={onStop}>עצור סריקה</button>
    </span>
  </section>;
}

export default function ElsAdvancedSearch2029({ onLoad, onExactSkip, deriveCanonicalForms, onPlanSummary, exactStatus = "idle" }) {
  const [form, setForm] = useState(initialForm);
  const [briefAnchor, setBriefAnchor] = useState("");
  const [briefText, setBriefText] = useState("");
  const [briefRequired, setBriefRequired] = useState("");
  const [briefPlan, setBriefPlan] = useState(null);
  const [briefAnchorId, setBriefAnchorId] = useState(null);
  const [briefSelected, setBriefSelected] = useState(() => new Set());
  const [briefSplit, setBriefSplit] = useState(() => new Set());
  const [advancedOpen, setAdvancedOpen] = useState(false);
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
  const revision = useRef(0);
  const exactRequestId = useRef(0);
  const briefRequestId = useRef(0);
  const abortRef = useRef(null);
  const beginRequest = () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    return controller;
  };
  const finishRequest = controller => {
    if (abortRef.current === controller) abortRef.current = null;
  };
  const stopCurrent = (message = "הסריקה הופסקה. תוצאות שהושלמו נשמרו; שאר הבדיקות עדיין לא בוצעו.") => {
    revision.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false); setSelecting(null); setActiveVariant(null); setNotice(message);
  };
  useEffect(() => () => abortRef.current?.abort(), []);
  const edit = (field, value) => {
    abortRef.current?.abort(); abortRef.current = null;
    revision.current += 1;
    setForm(current => ({ ...current, [field]: value }));
    setQuery(null); setPages([]); setCursor(null); setAutomaticPlan(null); setAutomaticSlices([]); setAutomaticPages({}); setLiveRows({}); setActiveVariant(null); onPlanSummary?.(null); setNotice(""); setBusy(false); setSelecting(null);
  };
  const search = async (more = false) => {
    const source = more ? query : form;
    const built = buildElsAdvancedPageRequest(source, more ? cursor : null);
    if (built.error) { setNotice(built.error); return; }
    const seq = ++revision.current;
    const controller = beginRequest();
    setBusy(true); setNotice("");
    if (!more) { setQuery({ ...form }); setPages([]); setCursor(null); setAutomaticPlan(null); setAutomaticSlices([]); setAutomaticPages({}); onPlanSummary?.(null); }
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
        if (seq !== revision.current || signal?.aborted) return;
        setActiveVariant(progress.phase === "searching" ? progress.term : null);
        if (progress.row) setLiveRows(current => ({ ...current, [progress.term]: progress.row }));
      }, invokePage: async request => {
        if (seq !== revision.current || signal?.aborted) throw new DOMException("cancelled", "AbortError");
        return supabase.functions.invoke("els-search-bridge", { body: request, signal });
      } });
      if (seq !== revision.current || signal?.aborted) return;
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
  const searchAutomatic = async inputOverride => {
    const input = typeof inputOverride === "string" ? inputOverride
      : [researchTarget !== "secondary" ? form.term : "", researchTarget !== "primary" ? related : ""].filter(Boolean).join("\n");
    const preflight = prepareElsAutomaticResearchPlan({ expressions: input, scope: form.scope,
      skipMin: form.skipMin, skipMax: form.skipMax, pageSize: form.pageSize });
    if (preflight.error) { setNotice(preflight.error); return; }
    const seq = ++revision.current;
    const controller = beginRequest();
    setBusy(true); setNotice(""); setAutomaticPlan(null); setAutomaticSlices([]); setAutomaticPages({}); setLiveRows({}); setActiveVariant(null); setPages([]); setCursor(null); setQuery({ ...form });
    try {
      let canonicalForms = [];
      try { canonicalForms = await deriveCanonicalForms?.(preflight.sources) || []; }
      catch { if (seq === revision.current) setNotice("צורות FORMS לא נטענו מהמנוע. שאר הצורות מוכנות; אפשר לנסות שוב בהמשך."); }
      if (seq !== revision.current) return;
      const plan = prepareElsAutomaticResearchPlan({ expressions: input, scope: form.scope,
        skipMin: form.skipMin, skipMax: form.skipMax, pageSize: form.pageSize, canonicalForms });
      if (plan.error) { setNotice(plan.error); return; }
      setAutomaticPlan(plan);
      onPlanSummary?.(summarizeElsAutomaticPlan(plan));
      await scanAutomaticPlan(plan, seq, [], controller.signal);
    } catch (error) {
      if (seq === revision.current && !controller.signal.aborted) setNotice(`תוכנית המחקר לא הושלמה: ${error?.message || "שגיאת תקשורת"}`);
    } finally {
      if (seq === revision.current) { setBusy(false); setActiveVariant(null); }
      finishRequest(controller);
    }
  };
  const buildBrief = () => {
    const next = prepareElsCipherDiscoveryPlan({ text: briefText, anchorTerm: briefAnchor, requiredTerms: briefRequired, scope: form.scope });
    if (next.error) { setBriefPlan(null); setBriefAnchorId(null); setBriefSelected(new Set()); setBriefSplit(new Set()); setNotice(next.error); return; }
    setBriefPlan(next);
    setBriefAnchorId(next.recommendedAnchorId);
    setBriefSelected(new Set(next.contextCandidates.filter(candidate => candidate.selected).map(candidate => candidate.id)));
    setBriefSplit(new Set());
    setNotice("");
  };
  const clearBrief = () => {
    setBriefAnchor(""); setBriefText(""); setBriefRequired(""); setBriefPlan(null); setBriefAnchorId(null); setBriefSelected(new Set()); setBriefSplit(new Set()); setNotice("");
  };
  const toggleBriefCandidate = id => setBriefSelected(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleBriefSplit = id => setBriefSplit(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const startBriefResearch = () => {
    const anchor = briefPlan?.anchorCandidates.find(candidate => candidate.id === briefAnchorId);
    if (!anchor) { setNotice("בחרו ציר ראשי אחד לפני תחילת המחקר."); return; }
    const contextTerms = (briefPlan?.contextCandidates || []).filter(candidate => briefSelected.has(candidate.id)).map(candidate => ({
      term: candidate.term,
      mode: candidate.mode,
      required: candidate.required === true,
      split: candidate.splitAllowed && briefSplit.has(candidate.id),
    }));
    onLoad?.({
      contract: "els_anchor_context_request_v1",
      researchCommand: true,
      term: anchor.term,
      scope: briefPlan.scope,
      contextTerms,
      discoveryGoal: briefPlan.goal,
      researchNonce: ++briefRequestId.current,
      returnLabel: "גילוי צופן",
    });
    setNotice(`הציר ${anchor.term} נשלח לחיפוש. המנוע מחפש סביב כל מופע זוג ממצאים מתחבר.`);
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
      if (seq === revision.current && !controller.signal.aborted) setNotice(`המשך התוכנית לא הושלם: ${error?.message || "שגיאת תקשורת"}`);
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
      if (seq === revision.current && !controller.signal.aborted) setNotice(`המשך הצורה לא הושלם: ${error?.message || "שגיאת תקשורת"}`);
    } finally {
      if (seq === revision.current) setBusy(false);
      finishRequest(controller);
    }
  };
  const searchExactSkip = () => {
    const built = buildElsExactSkipProbe({ term: form.term, scope: form.scope, spelling: form.spelling, skip: exactSkip }, ++exactRequestId.current);
    if (built.error) { setNotice(built.error); return; }
    revision.current += 1; abortRef.current?.abort(); abortRef.current = null; setBusy(false); setSelecting(null); setNotice("");
    onExactSkip?.(built.request);
  };
  const select = async (occurrence, projection, options = {}) => {
    const selection = buildElsAdvancedSelection(occurrence, projection, query?.scope);
    if (!selection) { setNotice("אי אפשר לבחור מופע בלי זהות מלאה."); return; }
    const seq = ++revision.current;
    const controller = beginRequest();
    setSelecting(occurrence.occurrenceId); setNotice("");
    try {
      const verified = await verifyEls2029Selection(selection, body => supabase.functions.invoke("els-search-bridge", { body, signal: controller.signal }));
      if (seq !== revision.current) return;
      if (!verified.ok) { setNotice(`המופע לא אומת: ${verified.state}. בחרו מופע אחר.`); return; }
      const loadItem = buildElsAdvancedLoadItem(selection, projection);
      onLoad?.(options.researchBundle === true ? { ...loadItem, researchBundle: true, returnLabel: "תוכנית המטרות" } : loadItem);
      setNotice(options.researchBundle === true
        ? "המופע אומת ונשלח למטריצה. ליבת הציר, המקור והמבנים נאספים כעת לאותה חבילת מחקר."
        : "המופע אומת ונשלח למטריצה. הממצאים והמקור יופיעו בכלי המשותף.");
    } catch (error) {
      if (seq === revision.current && !controller.signal.aborted) setNotice(`אימות המופע לא הושלם: ${error?.message || "שגיאת תקשורת"}`);
    } finally {
      if (seq === revision.current) setSelecting(null);
      finishRequest(controller);
    }
  };
  const count = pages.reduce((total, page) => total + page.projection.occurrences.length, 0);
  const spellingPreview = elsSearchSpelling(form.term, form.spelling);
  const completedRows = new Map(automaticSlices.flatMap(slice => slice.rows).map(row => [row.canonicalTerm, row]));
  const automaticRows = automaticPlan?.candidates.map(candidate => liveRows[candidate.term] || completedRows.get(candidate.canonicalTerm) || { ...candidate, state: "NOT_SCANNED", count: 0 }) || [];
  const automaticTargets = projectElsAutomaticResearchTargets(automaticPlan, automaticRows);
  const completedAutomatic = automaticRows.filter(row => !["NOT_SCANNED", "BUDGET_STOPPED"].includes(row.state)).length;
  const rangeMin = Number(form.skipMin);
  const rangeMax = Number(form.skipMax);
  const reduction = form.scope === "tanakh" ? { type: "scope", label: "המשך בתורה בלבד" }
    : Number.isSafeInteger(rangeMin) && Number.isSafeInteger(rangeMax) && rangeMax - rangeMin > 80
      ? { type: "range", label: "הקטן את טווח הדילוגים" }
      : null;
  const reduceSearch = () => {
    if (!reduction) return;
    stopCurrent();
    setForm(current => {
      if (reduction.type === "scope") return { ...current, scope: "torah" };
      const min = Number(current.skipMin);
      const max = Number(current.skipMax);
      return { ...current, skipMax: String(min + Math.max(50, Math.ceil((max - min) / 2))) };
    });
    setQuery(null); setPages([]); setCursor(null); setAutomaticPlan(null); setAutomaticSlices([]); setAutomaticPages({}); setLiveRows({}); onPlanSummary?.(null);
    setNotice(reduction.type === "scope" ? "הסריקה נעצרה וההיקף הוקטן לתורה. לחצו שוב כדי להתחיל." : "הסריקה נעצרה וטווח הדילוגים הוקטן. לחצו שוב כדי להתחיל.");
  };
  return <section className="sod29-section" aria-label="גילוי צופן" data-els-advanced-search="v1" data-els-cipher-discovery="v1">
    <div className="sod29-section-head"><div><div className="sod29-kicker">גילוי צופן</div><h3>ספרו מה אתם רוצים למצוא</h3></div></div>
    <div className="els29-research-brief els29-cipher-discovery" data-els-research-brief="v1">
      <p className="els29-advanced-note">כתבו את הסיפור במילים שלכם. המערכת תבחר ציר ראשי ותכין חיפוש מוגבל שמטרתו למצוא שני ממצאים מתחברים סביבו.</p>
      <label>הסיפור
        <textarea aria-label="סיפור או הקשר למחקר" value={briefText} onChange={event => {
          setBriefText(event.target.value); setBriefPlan(null); setBriefAnchorId(null); setBriefSelected(new Set()); setBriefSplit(new Set()); setNotice("");
        }} rows={6} maxLength={6000} placeholder="לדוגמה: מעבורת החלל קולומביה התפרקה בחזרה לכדור הארץ ועלתה באש…" />
      </label>
      <details className="els29-discovery-refine">
        <summary>דיוק ידני · רשות</summary>
        <div className="els29-discovery-refine-grid">
          <label>ציר ראשי, אם כבר ידוע
            <input aria-label="ציר ראשי למחקר" value={briefAnchor} onChange={event => {
              setBriefAnchor(event.target.value); setBriefPlan(null); setBriefAnchorId(null); setBriefSelected(new Set()); setBriefSplit(new Set()); setNotice("");
            }} maxLength={200} placeholder="לדוגמה: קולומביה" />
            <small className="sod29-muted">מילה או ביטוי קצר של 3–12 אותיות.</small>
          </label>
          <label>מילים שחייבים לבדוק
            <textarea aria-label="מונחים שחייבים לבדוק" value={briefRequired} onChange={event => {
              setBriefRequired(event.target.value); setBriefPlan(null); setBriefAnchorId(null); setBriefSelected(new Set()); setBriefSplit(new Set()); setNotice("");
            }} rows={2} maxLength={1000} placeholder="מונח אחד בכל שורה, למשל: יכל אש" />
          </label>
          <label>היקף החיפוש
            <select aria-label="היקף גילוי הצופן" value={form.scope} onChange={event => {
              setForm(current => ({ ...current, scope: event.target.value })); setBriefPlan(null); setBriefAnchorId(null); setBriefSelected(new Set()); setBriefSplit(new Set()); setNotice("");
            }}><option value="torah">תורה</option><option value="tanakh">כל התנ״ך</option></select>
          </label>
        </div>
      </details>
      <div className="sod29-actions els29-brief-actions">
        <button type="button" className="sod29-action primary" disabled={busy || !!selecting} onClick={buildBrief}>הבן את הסיפור</button>
        <button type="button" className="sod29-action" disabled={busy || !!selecting || (!briefAnchor && !briefText && !briefRequired && !briefPlan)} onClick={clearBrief}>נקה</button>
      </div>
      <p className="sod29-muted els29-brief-privacy">הסיפור נשאר בזיכרון המסך בלבד. בשלב הזה התכנון מקומי ודטרמיניסטי; רזיאל עדיין אינו מופעל. רק הציר ומילות החיפוש שנבחרו נשלחים למנוע הקנוני.</p>
      {briefPlan ? <section className="els29-brief-plan" aria-label="תוכנית גילוי הצופן">
        <div className="els29-brief-plan-head">
          <div><strong>מה המערכת הבינה</strong><small>המנוע יחפש זוג מתחבר מתוך {briefSelected.size} יעדי הקשר נבחרים.</small></div>
          <span className="sod29-chip">ציר אחד + שני ממצאים</span>
        </div>
        <fieldset className="els29-brief-axis">
          <legend>הציר הראשי</legend>
          {briefPlan.anchorCandidates.map(candidate => <label key={candidate.id} className="els29-brief-candidate">
            <input type="radio" name="els-brief-axis" checked={briefAnchorId === candidate.id} onChange={() => setBriefAnchorId(candidate.id)} />
            <span><bdi>{candidate.term}</bdi><small>{candidate.reason}</small></span>
          </label>)}
        </fieldset>
        <details className="els29-discovery-targets">
          <summary>מה המערכת תבדוק סביב הציר · {briefPlan.contextCandidates.length} הצעות</summary>
          <p className="sod29-muted">אלו מועמדים לחיפוש בלבד. ביטוי בן כמה מילים נשאר רצף מדויק ואינו הופך לראיה לפני אימות.</p>
          <div className="els29-brief-candidates">
            {briefPlan.contextCandidates.map(candidate => <div key={candidate.id} className="els29-brief-context-row">
              <label className="els29-brief-candidate">
                <input type="checkbox" checked={briefSelected.has(candidate.id)} onChange={() => toggleBriefCandidate(candidate.id)} />
                <span><bdi>{candidate.term}</bdi><small>{candidate.reason}{candidate.required ? " · מונח מחייב" : ""}{candidate.mode === "exact_phrase" ? " · רצף מדויק" : ""}</small></span>
              </label>
              {candidate.splitAllowed && briefSelected.has(candidate.id) ? <button type="button" className="sod29-action els29-brief-split" aria-pressed={briefSplit.has(candidate.id)} onClick={() => toggleBriefSplit(candidate.id)}>
                {briefSplit.has(candidate.id) ? "✓ חפש גם כל מילה בנפרד" : "גם כל מילה בנפרד"}
              </button> : null}
            </div>)}
          </div>
        </details>
        {!briefPlan.contextCandidates.length ? <p className="sod29-muted">לא נבחרו מונחי הקשר. עדיין אפשר למצוא את הציר ולבנות סביבו חבילה מהמילון הקנוני.</p> : null}
        {briefPlan.references.length ? <p className="sod29-muted">תאריכים ומספרים שנשמרו כהקשר בלבד, לא כמילת ELS: <bdi>{briefPlan.references.join(" · ")}</bdi></p> : null}
        <button type="button" className="sod29-action primary els29-brief-start" disabled={busy || !!selecting || !briefAnchorId} onClick={startBriefResearch}>
          מצא ציר ושני ממצאים מתחברים
        </button>
      </section> : null}
    </div>
    {notice ? <p role="status">{notice}</p> : null}
    <details className="sod29-els-research-details els29-advanced-options" data-els-advanced-options="explicit-open-v1" open={advancedOpen} onToggle={event => setAdvancedOpen(event.currentTarget.open)}>
      <summary>חיפוש ידני והגדרות מתקדמות</summary>
      <form onSubmit={event => { event.preventDefault(); search(false); }} className="els29-advanced-form">
      <label>מונח <input aria-label="מונח לחיפוש מתקדם" value={form.term} onChange={event => edit("term", event.target.value)} /></label>
      <label>טקסט <select aria-label="טקסט לחיפוש מתקדם" value={form.scope} onChange={event => edit("scope", event.target.value)}><option value="torah">תורה</option><option value="tanakh">תנ״ך</option></select></label>
      <label>צורת כתיבה לחיפוש יחיד <select aria-label="צורת כתיבה לחיפוש" value={form.spelling} onChange={event => edit("spelling", event.target.value)}>
        <option value="regular">כפי שהוקלד</option><option value="reverse_all">היפוך כל הביטוי</option>
        <option value="reverse_words">היפוך כל מילה בנפרד</option><option value="reverse_last">היפוך המילה האחרונה</option>
      </select></label>
      {spellingPreview && form.spelling !== "regular" ? <p className="els29-spelling-preview">יחופש בפועל: <bdi>{spellingPreview}</bdi></p> : null}
      <label>דילוג מ־ <input aria-label="דילוג מינימלי" type="number" min="2" step="1" value={form.skipMin} onChange={event => edit("skipMin", event.target.value)} /></label>
      <label>עד <input aria-label="דילוג מקסימלי" type="number" min="2" step="1" value={form.skipMax} onChange={event => edit("skipMax", event.target.value)} /></label>
      <label>תוצאות בדף <input aria-label="תוצאות בדף" type="number" min="1" max="100" value={form.pageSize} onChange={event => edit("pageSize", event.target.value)} /></label>
      <button className="sod29-action primary" type="submit" disabled={busy || !!selecting}>חפש בטווח</button>
      <label>דילוג מדויק <input aria-label="דילוג מדויק ללא תקרת 500" type="number" min="2" step="1" value={exactSkip} onChange={event => {
        abortRef.current?.abort(); abortRef.current = null; revision.current += 1; setBusy(false); setSelecting(null); setExactSkip(event.target.value);
      }} /></label>
      <button type="button" className="sod29-action" disabled={busy || !!selecting} onClick={searchExactSkip}>פתח דילוג מדויק</button>
      <label>מונחים משניים למחקר, אחד בשורה או מופרדים בפסיק
        <textarea aria-label="מילות המשך למחקר" value={related} onChange={event => {
          abortRef.current?.abort(); abortRef.current = null; revision.current += 1; setRelated(event.target.value); setAutomaticPlan(null); setAutomaticSlices([]); setAutomaticPages({}); setLiveRows({}); setActiveVariant(null); onPlanSummary?.(null); setNotice(""); setBusy(false); setSelecting(null);
        }} rows={3} placeholder="אמת, חסד" />
      </label>
      <label>מה לחקור <select aria-label="מונחים למחקר הצורות" value={researchTarget} onChange={event => {
        stopCurrent(""); setResearchTarget(event.target.value); setAutomaticPlan(null); setAutomaticSlices([]); setAutomaticPages({}); setLiveRows({}); onPlanSummary?.(null);
      }}>
        <option value="all">ראשי ומשניים</option><option value="primary">המונח הראשי</option><option value="secondary">המונחים המשניים</option>
      </select></label>
      <button type="button" className="sod29-action" disabled={busy || !!selecting} onClick={() => searchAutomatic()}>חקור את כל הצורות אוטומטית</button>
      </form>
    </details>
    {exactStatus === "failed" ? <p role="alert">לא הצלחנו למצוא או לאמת מופע בדילוג המבוקש. המטריצה הקיימת נשמרה.</p>
      : exactStatus === "verified" ? <p role="status">המופע אומת ונשלח למטריצה.</p>
        : exactStatus === "probing" ? <p role="status">מחפש ומאמת מופע במנוע הקנוני…</p> : null}
    {busy ? <AdvancedLiveProgress
      label={activeVariant ? `סורק עכשיו: ${activeVariant}` : automaticPlan ? "מכין את קבוצת הצורות הבאה…" : "סורק את טווח הדילוגים וממתין לאימות…"}
      completed={automaticPlan ? completedAutomatic : 0}
      total={automaticPlan?.candidates.length || 0}
      reduction={reduction}
      onReduce={reduceSearch}
      onStop={() => stopCurrent()}
    /> : null}
    {pages.length ? <div aria-label="מופעי החיפוש המתקדם"><p>{count} מופעים נטענו ב־{pages.length} דפים{cursor ? " · יש תוצאות נוספות" : " · סוף התוצאות בטווח"}</p>
      <ol>{pages.flatMap(page => page.projection.occurrences.map(hit => <li key={hit.occurrenceId}>
        <button type="button" className="sod29-action" disabled={busy || !!selecting} onClick={() => select(hit, page.projection)}>
          <bdi>{page.projection.term}</bdi> · דילוג {hit.skip} · {hit.dir === 1 ? "קדימה" : "אחורה"} · מיקום {hit.start + 1}
        </button>
      </li>))}</ol>
      {cursor ? <button type="button" className="sod29-action" disabled={busy || !!selecting} onClick={() => search(true)}>טען תוצאות נוספות</button> : null}
    </div> : null}
    {automaticPlan ? <div aria-label="תוכנית צורות אוטומטית" className="els29-automatic-plan">
      <p>{automaticPlan.sources.length} ביטויים · {automaticPlan.candidates.length} צורות שונות · {automaticRows.filter(row => row.state === "OK" || row.state === "EXECUTED_EMPTY").length} הושלמו · {automaticRows.filter(row => row.state === "FAILED").length} נכשלו</p>
      {automaticPlan.canonicalFormsPending ? <p className="sod29-muted">צורות FORMS של המנוע עדיין לא נטענו לכל הביטויים; המופעים המוצגים מתייחסים לצורות שנסרקו בלבד.</p> : null}
      {automaticTargets.length ? <section className="els29-automatic-targets" aria-label="יעדי מחקר מוכנים מהתוכנית">
        <header><strong>{automaticTargets.length} יעדי מחקר שכדאי לפתוח קודם</strong><small>לפי סדר המטרות שבחרתם והמשך מדויק שנמצא; זהו סדר בדיקה, לא ציון אמת.</small></header>
        {automaticTargets.map(row => <article key={`target-${row.canonicalTerm}`}>
          <span className="els29-target-rank">{row.researchRank}</span>
          <div><b><bdi>{row.term}</bdi></b><small>{row.researchReason} · {row.count} מופעים בדף הראשון</small></div>
          <button type="button" className="sod29-action primary" disabled={busy || !!selecting}
            onClick={() => select(row.primaryOccurrence, row.projection, { researchBundle: true })}>פתח חבילת מחקר</button>
        </article>)}
      </section> : null}
      <div className="els29-automatic-results" role="region" tabIndex={0} aria-label="כל תוצאות תוכנית המחקר">
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
          key={hit.occurrenceId} type="button" className="sod29-action" disabled={busy || !!selecting} onClick={() => select(hit, projection, { researchBundle: true })}>
          פתח חבילה · דילוג {hit.skip} · {hit.dir === 1 ? "קדימה" : "אחורה"} · מיקום {hit.start + 1}
        </button>))}
        {(automaticPages[row.canonicalTerm]?.cursor || (automaticPages[row.canonicalTerm] ? null : row.cursor)) ? <button type="button" className="sod29-action" disabled={busy || !!selecting} onClick={() => continueVariant(row)}>טען עוד מופעים לצורה זו</button> : null}
      </section>)}
      </div>
      {automaticSlices.at(-1)?.hasMoreCandidates && !busy ? <button type="button" className="sod29-action" disabled={!!selecting} onClick={continueAutomatic}>המשך לסרוק צורות</button> : null}
      <p className="sod29-muted">צורות של אותו ביטוי הן ניסויים תלויים. קרבה או ריבוי התאמות אינם הוכחת הצלבה; בחרו מופע מאומת לפתיחה במטריצה.</p>
    </div> : null}
  </section>;
}
