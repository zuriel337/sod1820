// /number: the landing of the number page, "the Google of numbers" (ZURIEL 27.11.2026). Royal classes only, no engine of its own.
// What loads when: the search box and the page frame at once; the live gematria preview, the mathematical profile, the verse and post readers, the discovery
// feed and the pulse only when they are needed (lazy modules / a reader called after the first paint). Nothing here is written or logged.
import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import { readAdaptivePulse, readResearchPulse, PULSE_WINDOWS, pulseCount } from "../../lib/researchPulse2029.js";
import {
  SEARCH_MODES, landingHref, isNumericTerm, numberOfTheDay, foundationGroups, pickSurprise, mathFacts, crossMatches,
  readFoundationNumbers, readAdmittedNumbers,
} from "../../lib/research/numberLanding2029.js";
import "../experience2029/royal2029.css";
import "./numberLanding2029.css";

const DiscoveryBlocks = lazy(() => import("./NumberLandingDiscoveries2029.jsx"));
const fmt = n => Number(n).toLocaleString("he-IL");

/** The fast gematria preview (client): loaded on the first keystroke, never on page load. */
function useFastPreview(text) {
  const [build, setBuild] = useState(null);
  useEffect(() => { if (text && !build) import("../../lib/research/calculator2029FastPreview.js").then(m => setBuild(() => m.buildCalculator2029FastPreview)); }, [text, build]);
  return useMemo(() => (text && build) ? build(text) : null, [text, build]);
}

const valueChips = preview => (preview?.methods || []).filter(m => m.computedValue > 0);

function LiveValues({ preview }) {
  const rows = valueChips(preview).slice(0, 6);
  if (!rows.length) return null;
  return <ul className="nl29-values" aria-label="הערכים בשיטות השונות">
    {rows.map(m => <li key={m.methodKey}><span className="r29-coin"><b>{fmt(m.computedValue)}</b></span><small>{m.displayLabel}</small></li>)}
  </ul>;
}

/** Reverse search: the published, verified expressions of one value (the existing reader; loaded on demand). */
function ReversePhrases({ value }) {
  const [state, setState] = useState({ status: "loading", rows: [], count: 0 });
  useEffect(() => {
    let live = true;
    setState({ status: "loading", rows: [], count: 0 });
    import("../../lib/supabaseApi2029.js").then(m => m.getValuePhrasesPage(value, { limit: 18 }))
      .then(r => live && setState({ status: "ready", rows: r.rows, count: r.count }), () => live && setState({ status: "failed", rows: [], count: 0 }));
    return () => { live = false; };
  }, [value]);
  if (state.status === "loading") return <p className="nl29-note" role="status">מחפש ביטויים שערכם {fmt(value)}…</p>;
  if (state.status === "failed") return <p className="nl29-note" role="status">הביטויים אינם זמינים כרגע. אפשר לנסות שוב.</p>;
  if (!state.rows.length) return <p className="nl29-note">אין עדיין ביטוי מאומת בערך {fmt(value)}. <Link to={landingHref(value)}>לדף המספר</Link></p>;
  return <div className="nl29-result">
    <p className="nl29-note">{fmt(state.count)} ביטויים מאומתים בערך {fmt(value)}</p>
    <ul className="nl29-phrases">{state.rows.map(row => <li key={row.id || row.phrase}><Link className="r29-chip" to={landingHref(row.phrase)}>{row.phrase}</Link></li>)}</ul>
    {state.count > state.rows.length ? <Link className="r29-btn is-quiet" to={landingHref(value)}>כל הביטויים בדף המספר</Link> : null}
  </div>;
}

function CrossResult({ a, b }) {
  const previewA = useFastPreview(a), previewB = useFastPreview(b);
  if (!previewA || !previewB) return null;
  const rows = crossMatches(previewA, previewB);
  return <div className="nl29-result">
    {rows.length ? <ul className="nl29-cross" aria-label="ערכים משותפים">{rows.slice(0, 8).map(row => <li key={row.value}>
      <span className="r29-coin"><b>{fmt(row.value)}</b></span><small>{a}: {row.methodsA.join(", ")} · {b}: {row.methodsB.join(", ")}</small></li>)}</ul>
      : <p className="nl29-note">אין ערך משותף בשיטות המהירות. אפשר לבדוק שיטות נוספות בדף כל אחד מהביטויים.</p>}
    <p className="nl29-note">ערכים מהירים לבחינה; הפירוט המלא והמקורות בדף המספר. <Link to={landingHref(a)}>{a}</Link> · <Link to={landingHref(b)}>{b}</Link></p>
  </div>;
}

/** Where a number appears: read only after the visitor asks (verses of the Torah, posts; ciphers and the map continue on the number page). */
function WhereItAppears({ value }) {
  const [state, setState] = useState({ status: "loading" });
  useEffect(() => {
    let live = true;
    setState({ status: "loading" });
    Promise.all([
      import("../../lib/research/verseGematriaSources.js").then(m => m.fetchVersesByGematria(value, { limit: 3 })).catch(() => null),
      Promise.resolve(supabase.rpc("posts_by_number_strict", { num: value, lim: 3 })).then(({ data, error }) => error ? null : (data || [])).catch(() => null),
    ]).then(([verses, posts]) => live && setState({ status: "ready", verses, posts }));
    return () => { live = false; };
  }, [value]);
  if (state.status === "loading") return <p className="nl29-note" role="status">בודק איפה {fmt(value)} מופיע…</p>;
  return <div className="nl29-where" aria-label={`איפה ${fmt(value)} מופיע`}>
    <div><h4>במקרא</h4>{state.verses?.verses?.length
      ? <ul>{state.verses.verses.map(v => <li key={v.ref}><small>{v.ref}</small> {v.text}</li>)}</ul>
      : <p className="nl29-note">{state.verses ? "לא נמצא פסוק בערך הזה." : "הפסוקים אינם זמינים כרגע."}</p>}
      {state.verses?.count > 3 ? <small>{fmt(state.verses.count)} פסוקים בסך הכול</small> : null}</div>
    <div><h4>בפוסטים</h4>{state.posts?.length
      ? <ul>{state.posts.map(p => <li key={p.wp_id}><Link to={`/post/${p.slug}`}>{p.title}</Link></li>)}</ul>
      : <p className="nl29-note">{state.posts ? "אין פוסט שהמספר מסומן בו." : "הפוסטים אינם זמינים כרגע."}</p>}</div>
    <div><h4>בצפנים ובמפת המציאות</h4><p className="nl29-note">הצפנים והמפה נפתחים בדף המספר, כדי לשמור על עמוד מהיר.</p>
      <Link className="r29-btn is-quiet" to={landingHref(value)}>לדף המספר {fmt(value)}</Link></div>
  </div>;
}

function NumberOfTheDay({ anchors }) {
  const day = useMemo(() => numberOfTheDay(anchors), [anchors]);
  const [facts, setFacts] = useState(null);
  useEffect(() => {
    if (!day) return undefined;
    let live = true;
    import("../../lib/research/numberMathProfile.js").then(m => { if (live) setFacts(mathFacts(m.analyzeNumberMath(day.value))); }).catch(() => {});
    return () => { live = false; };
  }, [day?.value]);
  if (!day) return null;
  return <section className="r29-hall nl29-card" aria-label="מספר היום">
    <h3>מספר היום</h3>
    <p className="nl29-day"><Link className="r29-coin" to={landingHref(day.value)} aria-label={`פתיחת דף המספר ${fmt(day.value)}`}><b>{fmt(day.value)}</b></Link><span>{day.category}</span></p>
    <p className="nl29-note">נבחר לפי התאריך העברי: {day.dateLabel}</p>
    {facts ? <p className="nl29-facts">{facts.prime ? "ראשוני" : (facts.factors ? `פירוק: ${facts.factors}` : null)}{facts.digitSum != null ? ` · סכום ספרות ${facts.digitSum}` : ""}{facts.families.length ? ` · ${facts.families.join(", ")}` : ""}</p> : null}
  </section>;
}

function HotNumbers() {
  const [selected, setSelected] = useState(null);
  const [state, setState] = useState({ status: "loading" });
  useEffect(() => {
    let live = true;
    setState({ status: "loading" });
    const job = selected == null ? readAdaptivePulse().then(r => r ? { data: r.data, hours: r.hours } : null) : readResearchPulse(selected).then(data => ({ data, hours: selected }));
    job.then(r => live && setState(r ? { status: "ready", ...r } : { status: "failed" }), () => live && setState({ status: "failed" }));
    return () => { live = false; };
  }, [selected]);
  const hours = selected ?? state.hours;
  const numbers = state.data?.version === 1 && state.data.state !== "refreshing" ? (state.data.numbers || []).slice(0, 8) : [];
  return <section className="r29-hall nl29-card" aria-label="המספרים החמים">
    <div className="nl29-head"><h3>המספרים החמים</h3>
      <span className="nl29-tabs" role="group" aria-label="טווח הפעילות">{PULSE_WINDOWS.map(([h, , short]) => <button key={h} type="button" className="r29-chip" aria-pressed={h === hours} onClick={() => setSelected(h)}>{short}</button>)}</span></div>
    {state.status === "loading" ? <p className="nl29-note" role="status">בודק את הפעילות…</p>
      : numbers.length ? <ul className="nl29-hot">{numbers.map(x => <li key={x.n}><Link className="r29-coin" to={landingHref(x.n)}><b>{fmt(x.n)}</b></Link><small>{pulseCount(x.events)} פתיחות</small></li>)}</ul>
      : <p className="nl29-note">עדיין אין מספיק פעילות מדודה בטווח הזה. נתונים מצרפיים בלבד, לא מספר אנשים.</p>}
  </section>;
}

function Foundation({ anchors }) {
  const groups = useMemo(() => foundationGroups(anchors), [anchors]);
  if (!groups.length) return null;
  return <section className="r29-hall nl29-card nl29-wide" aria-label="מספרי יסוד">
    <h3>מספרי יסוד</h3>
    {groups.map(group => <div className="nl29-group" key={group.category}><h4>{group.category}</h4>
      <ul className="nl29-hot">{group.values.map(v => <li key={v}><Link className="r29-coin" to={landingHref(v)}><b>{fmt(v)}</b></Link></li>)}</ul></div>)}
  </section>;
}

export default function NumberLanding2029() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("expression");
  const [term, setTerm] = useState(""), [second, setSecond] = useState(""), [method, setMethod] = useState("רגיל");
  const [reverseValue, setReverseValue] = useState(null), [crossPair, setCrossPair] = useState(null), [where, setWhere] = useState(null);
  const [anchors, setAnchors] = useState(null), [surprise, setSurprise] = useState("idle");
  useEffect(() => { let live = true; readFoundationNumbers().then(rows => live && setAnchors(rows)); return () => { live = false; }; }, []);
  const text = term.trim();
  const preview = useFastPreview(text);
  const numeric = isNumericTerm(text) ? Number(text) : null;
  const methods = useMemo(() => (preview?.methods || []).filter(m => m.computedValue != null), [preview]);
  const changeMode = key => { setMode(key); setReverseValue(null); setCrossPair(null); setWhere(null); };
  const submit = event => {
    event.preventDefault();
    if (!text) return;
    if (mode === "reverse") { if (numeric != null) setReverseValue(numeric); return; }
    if (mode === "cross") { if (second.trim()) setCrossPair([text, second.trim()]); return; }
    navigate(landingHref(text, { method: mode === "method" && method !== "רגיל" ? method : null }));
  };
  const surpriseMe = async () => {
    setSurprise("loading");
    const admitted = await readAdmittedNumbers();
    const value = pickSurprise(admitted, { avoid: numeric });
    if (value == null) { setSurprise("failed"); return; }
    setSurprise("idle");
    navigate(landingHref(value));
  };
  return <div className="r29 nl29" data-number-landing="open">
    <section className="r29-hall nl29-hero" aria-label="חיפוש מספר או ביטוי">
      <h2 className="nl29-lead">מספר, שם, פסוק או רמז</h2>
      <p className="nl29-sub">גלו קשרים בין מספרים, ביטויים ומקורות. החיפוש אינו פרסום, והחישוב המלא נעשה בדף המספר.</p>
      <div className="nl29-modes" role="group" aria-label="סוג החיפוש">
        {SEARCH_MODES.map(([key, label]) => <button key={key} type="button" className="r29-chip" aria-pressed={mode === key} onClick={() => changeMode(key)}>{label}</button>)}
      </div>
      <form className="nl29-search" onSubmit={submit}>
        <div className="nl29-fields">
          <input className="r29-input" aria-label={mode === "cross" ? "ביטוי ראשון" : "חיפוש מספר או ביטוי"} inputMode={mode === "reverse" ? "numeric" : undefined} maxLength={200}
            placeholder={mode === "reverse" ? "הקלידו מספר" : "הקלידו מספר, שם, פסוק או רמז…"} value={term} onChange={e => { setTerm(e.target.value); setReverseValue(null); setCrossPair(null); }} />
          {mode === "cross" ? <input className="r29-input" aria-label="ביטוי שני" maxLength={200} placeholder="ביטוי שני להצלבה" value={second} onChange={e => { setSecond(e.target.value); setCrossPair(null); }} /> : null}
          {mode === "method" ? <select className="r29-input" aria-label="שיטה" value={method} onChange={e => setMethod(e.target.value)}>
            {(methods.length ? methods : [{ methodKey: "רגיל", displayLabel: "רגיל" }]).map(m => <option key={m.methodKey} value={m.methodKey}>{m.displayLabel}{m.computedValue ? ` · ${fmt(m.computedValue)}` : ""}</option>)}</select> : null}
        </div>
        <button type="submit" className="r29-btn is-primary">{mode === "reverse" ? "הצג ביטויים" : mode === "cross" ? "הצלב" : "גלו"}</button>
        <button type="button" className="r29-btn" onClick={surpriseMe} disabled={surprise === "loading"} aria-busy={surprise === "loading"}>גלו לי משהו</button>
      </form>
      {surprise === "failed" ? <p className="nl29-note" role="status">לא הצלחתי לבחור מספר כרגע. אפשר לנסות שוב.</p> : null}
      {mode !== "reverse" && mode !== "cross" ? <LiveValues preview={preview} /> : null}
      {mode === "expression" && numeric != null ? <p className="nl29-actions"><button type="button" className="r29-btn is-quiet" onClick={() => setWhere(numeric)}>איפה {fmt(numeric)} מופיע</button><Link className="r29-btn is-quiet" to={landingHref(numeric)}>לדף המספר</Link></p> : null}
      {mode === "reverse" && numeric == null && text ? <p className="nl29-note">בחיפוש ההפוך מקלידים מספר שלם.</p> : null}
      {reverseValue != null ? <ReversePhrases value={reverseValue} /> : null}
      {crossPair ? <CrossResult a={crossPair[0]} b={crossPair[1]} /> : null}
      {where != null && mode === "expression" ? <WhereItAppears value={where} /> : null}
      {!text ? <p className="nl29-try"><span>נסו:</span>{["1820", "1237", "דוד", "שמע ישראל", "משיח"].map(t => <button key={t} type="button" className="r29-chip" onClick={() => setTerm(t)}>{t}</button>)}</p> : null}
    </section>
    <div className="nl29-grid">
      <NumberOfTheDay anchors={anchors} />
      <HotNumbers />
      <Foundation anchors={anchors} />
      <Suspense fallback={null}><DiscoveryBlocks /></Suspense>
    </div>
  </div>;
}
