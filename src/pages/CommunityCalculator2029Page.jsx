import React, { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import CommunityCalculatorPage from "./CommunityCalculatorPage.jsx";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import HumanDateInput from "../components/HumanDateInput.jsx";
import ShareActions from "../components/ShareActions.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { numberReadingReturnHref } from "../lib/research/numberExpressionFocus.js";
import { publicLaunchActionsLocked } from "../lib/publicLaunch2029.js";
import { canonicalMethodPublicLabel } from "../lib/presentation/canonicalPresentation.js";
import { applySeo } from "../lib/seo.js";
import {
  parseCommunityCalculatorState, selectCommunityCalculatorResult,
  communityCalculatorHref, communityCalculatorNumberNavigation,
} from "../lib/research/communityCalculatorContinuity2029.js";
import "./communityCalculator2029.css";

const Continuation = createContext(null);
const CORE_METHODS = ["רגיל", "מילוי", "מסתתר"];
const MODES = [
  ["name", "שם או ביטוי", "number"],
  ["compare", "השוואת שמות", "research"],
  ["baby", "שם לתינוק", "community"],
  ["date", "תאריך עברי", "now"],
];

function NumberLink({ value, expression, method = "רגיל", children, className = "", ...props }) {
  const continuation = useContext(Continuation);
  const destination = communityCalculatorNumberNavigation({ value, expression, method,
    returnHref: continuation.returnHref, current: continuation.research.context });
  if (!destination) return <span className={className}>{children}</span>;
  return <Link {...props} className={className} to={destination.href} state={{ sodResearchIntent: "continue" }}
    onClick={event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      continuation.research.setResearchContext?.(destination.context);
    }}>{children}</Link>;
}

function DateField({ value, onChange, afterSunset, onAfterSunset, label = "תאריך לידה לועזי" }) {
  return <fieldset className="sod29-community-calc-date-field">
    <legend>{label}</legend>
    <HumanDateInput value={value} onChange={onChange} disableFuture />
    <label className="sod29-community-calc-check">
      <input type="checkbox" checked={afterSunset} onChange={event => onAfterSunset(event.target.checked)} />
      <span>אחרי השקיעה — היום העברי הבא</span>
    </label>
  </fieldset>;
}

function MethodResults({ expression, result, selectedMethod, onSelect, showAll, onShowAll, comparison }) {
  const selected = result.all.find(row => row.key === selectedMethod || canonicalMethodPublicLabel(row.key) === selectedMethod);
  const rows = showAll ? result.all : result.all.filter(row => CORE_METHODS.includes(row.key) || row === selected);
  return <section className="sod29-community-calc-methods" aria-label={`שיטות החישוב של ${expression}`}>
    <header className="sod29-community-calc-section-heading">
      <h2>אותו שם, עוד דרכי חישוב</h2>
      <button type="button" className="sod29-community-calc-text-button" onClick={onShowAll} aria-expanded={showAll}>
        {showAll ? "שיטות הליבה" : `כל ${result.all.length} השיטות`}
      </button>
    </header>
    <div className="sod29-community-calc-method-grid">
      {rows.map(row => {
        const other = comparison?.all.find(item => item.key === row.key);
        return <div key={row.key} className={`sod29-community-calc-method${row === selected ? " is-selected" : ""}`}>
          <button type="button" aria-pressed={row === selected} onClick={() => onSelect(row.key)}>
            <span>{canonicalMethodPublicLabel(row.key)}</span>
            <strong className="sod29-community-calc-number">{row.value}</strong>
            {other && <span className="sod29-community-calc-comparison-value">מול <b className="sod29-community-calc-number">{other.value}</b>{other.value === row.value ? " · שווים" : ""}</span>}
            <small>{row.sub}</small>
          </button>
          <NumberLink value={row.value} expression={expression} method={row.key}>למספר ולביטוי ←</NumberLink>
        </div>;
      })}
    </div>
  </section>;
}

function RelatedPhrases({ phrases, value }) {
  if (!phrases.length) return null;
  return <section className="sod29-community-calc-related" aria-label="ביטויים באותו ערך">
    <h3>נפגשים באותו מספר</h3>
    <p>ביטויים שפורסמו במאגר ושווים בגימטריה רגילה.</p>
    <div className="sod29-community-calc-chips">
      {phrases.slice(0, 8).map(phrase => <NumberLink key={phrase.phrase} value={value} expression={phrase.phrase}>{phrase.phrase}</NumberLink>)}
    </div>
  </section>;
}

function BabyNames({ model }) {
  const { names, analyzed, fam, heb } = model;
  return <div className="sod29-community-calc-baby">
    <section className="sod29-community-calc-panel">
      <div className="sod29-community-calc-section-heading"><h2>איזה שם תרצו לגלות?</h2></div>
      <p>בדקו עד שלושה שמות. הקשרים מוצגים להשוואה, והבחירה נשארת שלכם.</p>
      <div className="sod29-community-calc-name-fields">
        {names.map((name, index) => <label key={index}>שם {index + 1}
          <input value={name} dir="auto" maxLength={500} onChange={event => model.setName(index, event.target.value)} placeholder="שם בעברית" />
        </label>)}
      </div>
      {names.length < 3 && <button type="button" className="sod29-community-calc-text-button" onClick={model.addName}>+ הוספת שם להשוואה</button>}
      <button type="button" className="sod29-community-calc-context-button" aria-expanded={model.showCtx} onClick={() => model.setShowCtx(!model.showCtx)}>
        <span>שם משפחה ותאריך לידה</span><span>{model.showCtx ? "סגירה −" : "הוספה +"}</span>
      </button>
      {model.showCtx && <div className="sod29-community-calc-family">
        <label>שם המשפחה<input value={model.family} dir="auto" maxLength={500} onChange={event => model.setFamily(event.target.value)} placeholder="לא חובה" /></label>
        <DateField value={model.bDate} onChange={model.setBDate} afterSunset={model.afterSunset} onAfterSunset={model.setAfterSunset} />
        {heb && <p className="sod29-community-calc-date-summary"><time dateTime={model.bDate}>{model.bDate}</time><span>{heb.pretty}</span><b className="sod29-community-calc-number">{heb.value}</b></p>}
      </div>}
    </section>
    <div className="sod29-community-calc-baby-results">
      {analyzed.map((item, index) => {
        if (!item) return null;
        const matches = fam ? item.all.filter(row => fam.all.some(other => other.key === row.key && other.value === row.value)) : [];
        const phrases = model.phraseMap[item.value] || [];
        return <article className="sod29-community-calc-panel" key={index}>
          <h2>{item.name}</h2>
          <div className="sod29-community-calc-baby-core">
            {item.core.map(row => <NumberLink key={row.key} value={row.value} expression={item.name} method={row.key}>
              <span>{canonicalMethodPublicLabel(row.key)}</span><strong className="sod29-community-calc-number">{row.value}</strong>
            </NumberLink>)}
          </div>
          {fam && <p>שם המשפחה <b>{fam.name}</b>: <b className="sod29-community-calc-number">{fam.value}</b> בגימטריה רגילה.</p>}
          {matches.length > 0 && <p>השם ושם המשפחה שווים ב{matches.length === 1 ? "שיטה" : "שיטות"}: {matches.map(row => canonicalMethodPublicLabel(row.key)).join(" · ")}.</p>}
          {heb?.value === item.value && <p>השם ותאריך הלידה העברי שווים בגימטריה רגילה.</p>}
          {item.geula && <p><NumberLink value={item.geula.num} expression={item.name} method={item.geula.method}>{item.geula.meaning} · <b className="sod29-community-calc-number">{item.geula.num}</b></NumberLink></p>}
          <RelatedPhrases phrases={phrases.filter(phrase => phrase.phrase !== item.name)} value={item.value} />
          <NumberLink className="sod29-community-calc-button" value={item.value} expression={item.name}>המשך עם השם {item.name} ←</NumberLink>
        </article>;
      })}
    </div>
  </div>;
}

function CalculatorExperience({ model, initialState, location }) {
  const research = useResearch();
  const { state, r1, r2 } = model;
  const mode = state.babyMode ? "baby" : state.dateMode ? "date" : state.compare ? "compare" : "name";
  const claimStillApplies = state.name1 === initialState.name1 && state.method === initialState.method;
  const selection = selectCommunityCalculatorResult(r1?.all || [], state.method, claimStillApplies ? initialState.resultRaw : "");
  const selected = selection.row;
  const second = r2?.all.find(row => row.key === selected?.key);
  const shareHref = communityCalculatorHref(location, state, selected?.value);
  const signature = JSON.stringify(state);
  const arrivalState = useRef(signature);
  const previousState = useRef(signature);
  const returnHref = signature === arrivalState.current ? numberReadingReturnHref(location) || shareHref : shareHref;

  useEffect(() => {
    // Keep the opened URL byte-for-byte until the visitor edits. Subsequent
    // edits replace this history entry so refresh/back restore the full form.
    if (previousState.current === signature) return;
    previousState.current = signature;
    try { window.history.replaceState(window.history.state, "", returnHref); } catch { /* State still travels in share/return links. */ }
  }, [signature, returnHref]);

  function chooseMode(next) {
    model.setBabyMode(next === "baby");
    model.setDateMode(next === "date");
    model.setCompare(next === "compare");
  }
  const origin = typeof window === "undefined" ? "https://sod1820.co.il" : window.location.origin;
  const shareTitle = state.babyMode ? "שמות, משפחה ותאריך — מחשבון הקהילה"
    : state.dateMode && model.heb ? `${model.heb.pretty} — מחשבון הקהילה`
      : selected ? `${state.name1} · ${canonicalMethodPublicLabel(selected.key)} · ${selected.value}` : "מחשבון הקהילה";

  return <Continuation.Provider value={{ returnHref, research }}>
    <main className="sod29-community-calc" dir="rtl">
      <header className="sod29-community-calc-hero">
        <span className="sod29-community-calc-eyebrow">גימטריה · שמות · תאריכים</span>
        <h1>מה מתחבר לשם שלכם?</h1>
        <p>שם אחד, כמה דרכי חישוב. גלו את הערכים, השוו בין שמות והמשיכו אל הביטויים שמתחברים אליהם.</p>
      </header>
      <div className="sod29-community-calc-modes" role="group" aria-label="בחירת כלי במחשבון הקהילה">
        {MODES.map(([key, label, icon]) => <button type="button" key={key} aria-pressed={mode === key} onClick={() => chooseMode(key)}>
          <NavigationIcon2029 name={icon} size={20} /><span>{label}</span>
        </button>)}
      </div>

      {state.babyMode ? <>
        {initialState.invalidBirthDate && !state.baby?.bDate && <p role="status" className="sod29-community-calc-notice">תאריך הלידה בקישור אינו תקין. הזינו יום, חודש ושנה כדי לחשב אותו.</p>}
        {model.babyTool}
      </> : <>
        <section className="sod29-community-calc-panel sod29-community-calc-input-panel">
          <div className="sod29-community-calc-name-fields">
            <label htmlFor="community-calculator-name">{state.compare ? "השם הראשון" : "שם, מילה או ביטוי"}
              <input id="community-calculator-name" value={state.name1} dir="auto" maxLength={500} autoComplete="off" spellCheck="false"
                placeholder="למשל: אור, אהבה, שלום" onChange={event => model.setName1(event.target.value)} />
            </label>
            {state.compare && <label htmlFor="community-calculator-other">השם השני
              <input id="community-calculator-other" value={state.name2} dir="auto" maxLength={500} autoComplete="off"
                placeholder="שם נוסף להשוואה" onChange={event => model.setName2(event.target.value)} />
            </label>}
          </div>
          <div className="sod29-community-calc-input-note"><span>החישוב מתעדכן בזמן ההקלדה</span>
            <button type="button" className="sod29-community-calc-text-button" onClick={() => model.setName1(model.daily.word)}>נסו את המילה ״{model.daily.word}״</button>
          </div>
          {state.name1.trim() && !r1 && <p role="status">הזינו אותיות בעברית כדי לחשב גימטריה.</p>}
        </section>

        {state.dateMode && <section className="sod29-community-calc-panel sod29-community-calc-date">
          <h2>המספר של התאריך העברי</h2><p>הזינו תאריך לועזי. אחרי השקיעה, התאריך העברי מתקדם ביום אחד.</p>
          <DateField value={state.gDate} onChange={model.setGDate} afterSunset={state.afterSunset} onAfterSunset={model.setAfterSunset} />
          {initialState.invalidDate && !state.gDate && <p role="status">התאריך בקישור אינו תקין. הזינו יום, חודש ושנה.</p>}
          <div aria-live="polite">
            {model.hebBusy ? <p>מחשב את התאריך העברי…</p> : model.heb && <div className="sod29-community-calc-date-result">
              <time dateTime={state.gDate}>{state.gDate}</time><h3>{model.heb.pretty}</h3>
              <NumberLink className="sod29-community-calc-date-number" value={model.heb.value} expression={model.heb.clean}>
                <strong className="sod29-community-calc-number">{model.heb.value}</strong><span>למספר ולתאריך ←</span>
              </NumberLink>
              <button type="button" className="sod29-community-calc-button" onClick={() => { model.setName1(model.heb.clean); model.setSelectedMethod("רגיל"); chooseMode("name"); }}>חישוב התאריך בכל השיטות</button>
            </div>}
          </div>
        </section>}

        {r1 && <>
          {selection.unavailable && <p className="sod29-community-calc-notice" role="status">השיטה ״{state.method}״ שבקישור אינה זמינה במחשבון הזה. בחרו אחת מהשיטות המוצגות כדי להמשיך.</p>}
          {selection.mismatch && <p className="sod29-community-calc-notice" role="status">התוצאה שבקישור אינה תואמת לחישוב. מוצגת כאן התוצאה המחושבת עבור השם והשיטה שנבחרו.</p>}
          {selected && <section id="result" className="sod29-community-calc-result" aria-label="תוצאת החישוב">
            <div><span className="sod29-community-calc-eyebrow">{canonicalMethodPublicLabel(selected.key)}</span><h2>{state.name1}</h2>
              <NumberLink value={selected.value} expression={state.name1} method={selected.key} className="sod29-community-calc-result-link">
                <strong className="sod29-community-calc-number">{selected.value}</strong><span>למספר ולביטוי ←</span>
              </NumberLink>
            </div>
            {second && <div><span className="sod29-community-calc-eyebrow">{canonicalMethodPublicLabel(second.key)}</span><h2>{state.name2}</h2>
              <NumberLink value={second.value} expression={state.name2} method={second.key} className="sod29-community-calc-result-link">
                <strong className="sod29-community-calc-number">{second.value}</strong><span>למספר ולביטוי ←</span>
              </NumberLink>
            </div>}
          </section>}
          {model.compat && <section id="comparison" className="sod29-community-calc-panel sod29-community-calc-compat">
            <h2><span className="sod29-community-calc-number">{model.compat.count}</span> מתוך <span className="sod29-community-calc-number">{model.compat.total}</span> שיטות נפגשות</h2>
            <p>{model.matches.length ? model.matches.map(row => canonicalMethodPublicLabel(row.key)).join(" · ") : "לשמות האלה אין כרגע ערך זהה באותה שיטה."}</p>
            <NumberLink value={r1.value + r2.value}>סכום השמות בגימטריה רגילה: <b className="sod29-community-calc-number">{r1.value + r2.value}</b> ←</NumberLink>
          </section>}
          <MethodResults expression={state.name1} result={r1} selectedMethod={state.method} onSelect={model.setSelectedMethod}
            showAll={model.showAll} onShowAll={() => model.setShowAll(!model.showAll)} comparison={r2} />
          <RelatedPhrases phrases={model.discoveries} value={r1.value} />
        </>}
        {!r1 && !state.dateMode && <div className="sod29-community-calc-empty"><NavigationIcon2029 name="number" size={32} /><h2>מתחילים בשם אחד</h2><p>רגיל, מילוי, מסתתר וכל שיטות החישוב של המחשבון מחכות כאן.</p></div>}
      </>}

      <footer className="sod29-community-calc-footer">
        <section aria-label="שיתוף המחשבון" className="sod29-community-calc-share">
          <div><h2>ממשיכים מאותה נקודה</h2><p>הקישור כולל את השמות, השיטה והתאריך שהזנתם.</p></div>
          <ShareActions type="calculator" sourceSurface="community-calculator" url={origin + shareHref} title={shareTitle} channels={["native", "whatsapp", "copy"]} force />
        </section>
        {model.actionsLocked ? <p className="sod29-community-calc-availability">חישוב ושיתוף זמינים. ניתוח AI ושמירה אינם זמינים כאן כרגע.</p>
          : r1 && !state.babyMode ? <div className="sod29-community-calc-ai">
            <button type="button" className="sod29-community-calc-button" disabled={model.aiBusy} onClick={() => model.runAi()}>{model.aiBusy ? "מכין ניתוח…" : "ניתוח AI של השם"}</button>
            {model.aiText && <p>{model.aiText}</p>}
          </div> : null}
        <Link className="sod29-community-calc-text-button" to="/gematria">למחשבון הגימטריה הכללי ←</Link>
      </footer>
    </main>
  </Continuation.Provider>;
}

export default function CommunityCalculator2029Page() {
  const location = useLocation();
  const initialState = useMemo(() => parseCommunityCalculatorState(location.search), [location.search]);
  const actionsLocked = publicLaunchActionsLocked(useAuth().isAdmin);
  useEffect(() => {
    applySeo({ title: "מחשבון הקהילה — גימטריה, שמות ותאריך עברי",
      description: "מחשבון הגימטריה הקהילתי של SOD1820: השוואת שמות, בדיקת שמות לתינוק, שם משפחה ותאריך עברי, עם קישור לחזרה ולשיתוף.",
      path: "/community/calculator", noindex: location.search !== "" });
  }, [location.search]);
  return <Sod2029Shell surface="community" title="מחשבון הקהילה" introVariant="none">
    <CommunityCalculatorPage key={location.key} initialState={initialState} passive actionsLocked={actionsLocked}
      renderCalculator={model => <CalculatorExperience model={model} initialState={initialState} location={location} />}
      renderBabyTool={model => <BabyNames model={model} />} />
  </Sod2029Shell>;
}
