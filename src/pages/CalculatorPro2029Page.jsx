import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Sod2029Shell, { use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import ShareActions from "../components/ShareActions.jsx";
import MethodLens2029 from "../components/gematria2029/MethodLens2029.jsx";
import CalculatorOpening2029 from "../components/gematria2029/CalculatorOpening2029.jsx";
import CalculatorDuo2029 from "../components/gematria2029/CalculatorDuo2029.jsx";
import CalculatorLedgerCard2029 from "../components/gematria2029/CalculatorLedgerCard2029.jsx";
import CalculatorAiAnalysis2029 from "../components/gematria2029/CalculatorAiAnalysis2029.jsx";
import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import { emit } from "../lib/events.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { useCalculatorRow, useMethodLedger } from "../lib/research/useCalculatorRow.js";
import { buildGematriaPresentationModel } from "../lib/presentation/gematriaPresentation.js";
import { numberExpressionFocusHref } from "../lib/research/numberExpressionFocus.js";
import { CALCULATOR_INPUT_KIND, isEnglishMethodKey, isReportableValue } from "../lib/research/calculator2029Input.js";
import {
  buildCalculationSelection,
  buildCalculatorResearchContext,
  calculationAvailabilityLabel,
} from "../lib/research/calculator2029Model.js";
import { buildCalculatorShareUrl, makeCalculatorShareId } from "../lib/research/calculator2029Viral.js";
import { applySeo } from "../lib/seo.js";
import "./calculatorPro2029.css";

const clean = (value) => value == null ? "" : String(value).trim();
const fmt = (value) => Number.isFinite(Number(value)) ? Number(value).toLocaleString("en-US") : "—";
const EXAMPLES = Object.freeze(["אהבה", "משיח", "David"]);
const CORE_FAMILY_KEY = "base";
const EXCEPTIONAL_STATE_HE = Object.freeze({
  composite: "מורכב",
  derived: "נגזר",
  equivalent: "שקול",
  contextual: "הקשרי",
  candidate: "מועמד",
  unverified: "לא נבדק",
  mismatch: "אי־התאמה",
  unavailable: "לא זמין",
});

const MethodTile = React.memo(function MethodTile({ method, active, sameCount, onChoose }) {
  const unavailable = calculationAvailabilityLabel(method);
  const note = method.previewOnly
    ? (method.pendingNote || "מיידי")
    : (EXCEPTIONAL_STATE_HE[method.exceptionalState] || unavailable
      || (sameCount > 0 ? `שווה ל־${sameCount} נוספות` : null));
  return (
    <button
      type="button"
      className={`sod29-calcpro-tile${active ? " is-active" : ""}${sameCount > 0 ? " is-same" : ""}${method.previewOnly ? " is-preview" : ""}`}
      onClick={() => onChoose(method)}
      aria-pressed={active}
      disabled={method.previewOnly && method.language !== "en"}
      data-method={method.methodKey}
      data-preview-state={method.previewOnly ? "preview" : "verified"}
    >
      <span>{method.publicLabel || method.label}</span>
      <strong>{method.computedValue == null ? "—" : fmt(method.computedValue)}</strong>
      <small>{note || " "}</small>
    </button>
  );
});

function LetterStrip({ ledgerState }) {
  const steps = ledgerState?.ledger?.steps || [];
  return (
    <div className="sod29-calcpro-letters" aria-label="ערכי האותיות מהמנוע" data-loading={ledgerState?.loading ? "true" : "false"}>
      {steps.map((step, index) => (
        <div className="sod29-calcpro-letter" key={step.token + ":" + index}>
          <b>{step.token}</b>
          <i>{step.value}</i>
        </div>
      ))}
    </div>
  );
}

function MethodBars({ groups, selectedKey, activeValue, onChoose }) {
  const rows = groups.flatMap((group) => group.methods.map((method) => ({ ...method, family: group.label })));
  const max = rows.reduce((top, method) => Math.max(top, Number(method.computedValue) || 0), 1);
  const scale = (value) => Math.max(4, (Math.log10(Math.max(1, Number(value))) / Math.log10(Math.max(10, max))) * 100);
  let lastFamily = "";
  return (
    <div className="sod29-calcpro-bars" aria-label="כל השיטות בסולם לוגריתמי">
      <header><b>כל השיטות · סולם לוגריתמי</b><small>אותו ערך מודגש</small></header>
      {rows.map((method) => {
        const heading = method.family !== lastFamily ? method.family : null;
        lastFamily = method.family;
        const same = Number(method.computedValue) === Number(activeValue) && method.methodKey !== selectedKey;
        return (
          <React.Fragment key={method.methodKey}>
            {heading ? <h4>{heading}</h4> : null}
            <button
              type="button"
              className={`sod29-calcpro-bar${method.methodKey === selectedKey ? " is-active" : ""}${same ? " is-same" : ""}`}
              onClick={() => onChoose(method)}
              disabled={method.previewOnly}
            >
              <span>{method.publicLabel || method.label}</span>
              <i aria-hidden="true"><u style={{ width: scale(method.computedValue) + "%" }} /></i>
              <b>{method.computedValue == null ? "—" : fmt(method.computedValue)}</b>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function MethodRail({ groups, englishRows, selectedKey, activeValue, onChoose }) {
  return (
    <aside className="sod29-calcpro-rail" aria-label="רשימת השיטות">
      {groups.map((group) => (
        <div key={group.key}>
          <h4>{group.label} · {group.methods.length}</h4>
          {group.methods.map((method) => {
            const same = Number(method.computedValue) === Number(activeValue) && method.methodKey !== selectedKey;
            return (
              <button
                type="button"
                key={method.methodKey}
                className={`sod29-calcpro-li${method.methodKey === selectedKey ? " is-active" : ""}${same ? " is-same" : ""}`}
                onClick={() => onChoose(method)}
                disabled={method.previewOnly}
              >
                <span>{method.publicLabel || method.label}</span>
                <b>{method.computedValue == null ? "—" : fmt(method.computedValue)}</b>
              </button>
            );
          })}
        </div>
      ))}
      {englishRows.length ? (
        <div>
          <h4>אנגלית · תצוגה מיידית</h4>
          {englishRows.map((method) => (
            <button
              type="button"
              key={method.methodKey}
              className={`sod29-calcpro-li is-preview${method.methodKey === selectedKey ? " is-active" : ""}`}
              onClick={() => onChoose(method)}
            >
              <span>{method.label}</span>
              <b>{fmt(method.computedValue)}</b>
            </button>
          ))}
        </div>
      ) : null}
    </aside>
  );
}

function useIsDesktop(minWidth = 1100) {
  const query = `(min-width: ${minWidth}px)`;
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const handler = (event) => setMatches(event.matches);
    setMatches(media.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

function ProExperience() {
  const navigate = useNavigate();
  const research = useResearch();
  const shell = use2029Shell();
  const [params, setParams] = useSearchParams();
  const seedExpression = clean(params.get("q"));
  const seedMethod = clean(params.get("m"));
  const inputRef = useRef(null);
  const row = useCalculatorRow(seedExpression);
  const { info } = row;

  const [selectedKey, setSelectedKey] = useState(seedMethod || null);
  const [view, setView] = useState(params.get("tab") === "ledger" ? "ledger" : "tiles");
  const [showAllFamilies, setShowAllFamilies] = useState(false);
  const [advanced, setAdvanced] = useState(params.get("mode") === "adv");
  const desktop = useIsDesktop();
  const [wideRequested, setWide] = useState(params.get("view") === "wide");
  const wide = wideRequested && desktop;
  const [showOpening, setShowOpening] = useState(false);
  const [shareId, setShareId] = useState(() => makeCalculatorShareId());
  const [shareDiscovery, setShareDiscovery] = useState(null);

  useEffect(() => {
    emit("calculator_2029", "calculator_view", { props: { surface: "professional", entry: seedExpression ? "handoff" : "direct" } });
  }, []);

  const allMethods = useMemo(() => [...row.hebrewRows, ...row.englishRows], [row.hebrewRows, row.englishRows]);
  const methodByKey = useMemo(() => new Map(allMethods.map((method) => [method.methodKey, method])), [allMethods]);
  const reportableRows = useMemo(
    () => allMethods.filter((method) => !method.previewOnly && isReportableValue(method.computedValue)),
    [allMethods],
  );

  // Method choice survives typing a new expression; otherwise default to רגיל once the engine settles.
  useEffect(() => {
    if (!row.canonicalSettled && !row.englishRows.length) return;
    if (selectedKey && methodByKey.has(selectedKey)) return;
    const fallback = methodByKey.get("רגיל") || reportableRows[0] || row.englishRows[0] || null;
    setSelectedKey(fallback ? fallback.methodKey : null);
  }, [row.canonicalSettled, row.englishRows, methodByKey, reportableRows, selectedKey]);

  const selectedMethod = selectedKey ? methodByKey.get(selectedKey) || null : null;
  const canonicalSelection = selectedMethod && !selectedMethod.previewOnly && row.canonicalSettled
    ? buildCalculationSelection(row.profile.expression, selectedMethod)
    : null;
  const ledgerState = useMethodLedger(canonicalSelection);

  const presentation = useMemo(() => buildGematriaPresentationModel({
    expression: info.expression,
    methodProfile: row.hebrewRows,
    activeMethodKey: selectedMethod && !isEnglishMethodKey(selectedMethod.methodKey) ? selectedMethod.methodKey : null,
  }), [info.expression, row.hebrewRows, selectedMethod]);

  const activeValue = selectedMethod?.computedValue ?? null;
  const activeNumber = Number(activeValue);

  const valueCounts = useMemo(() => {
    const counts = new Map();
    for (const method of allMethods) {
      if (method.previewOnly || !isReportableValue(method.computedValue)) continue;
      const key = Number(method.computedValue);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [allMethods]);

  const familyGroups = useMemo(() => presentation.familyGroups.map((group) => ({
    key: group.key,
    label: group.label,
    methods: group.methods.map((modelMethod) => {
      const source = methodByKey.get(modelMethod.methodKey) || {};
      return {
        ...source,
        methodKey: modelMethod.methodKey,
        publicLabel: modelMethod.publicLabel,
        exceptionalState: modelMethod.exceptionalState,
        computedValue: modelMethod.value ?? source.computedValue ?? null,
      };
    }),
  })), [presentation, methodByKey]);

  const compositeRows = useMemo(
    () => row.hebrewRows.filter((method) => method.category === "composite" && isReportableValue(method.computedValue)),
    [row.hebrewRows],
  );

  const sameValueMethods = useMemo(() => {
    if (!isReportableValue(activeNumber)) return [];
    return allMethods.filter((method) => (
      method.methodKey !== selectedKey && !method.previewOnly && Number(method.computedValue) === activeNumber
    ));
  }, [allMethods, selectedKey, activeNumber]);

  useEffect(() => {
    setShareId(makeCalculatorShareId());
    setShareDiscovery(null);
    setShowOpening(false);
    if (canonicalSelection) {
      research.updateResearchContext?.(buildCalculatorResearchContext(canonicalSelection, { surface: "calculator-pro-2029" }));
      emit("calculator_2029", "result_selected", {
        props: { surface: "professional", expression: canonicalSelection.expression, method: canonicalSelection.methodKey, value: canonicalSelection.resultValue },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canonicalSelection?.expression, canonicalSelection?.methodKey, canonicalSelection?.resultValue]);

  // Deep link: expression + method + mode survive reload without serializing the UI tree.
  // Only the settled expression is written, so typing never churns the router.
  const urlExpression = clean(row.profile.expression) || (info.expression === seedExpression ? seedExpression : "");
  useEffect(() => {
    const next = new URLSearchParams();
    if (urlExpression) next.set("q", urlExpression);
    if (canonicalSelection?.methodKey) next.set("m", canonicalSelection.methodKey);
    else if (selectedKey && isEnglishMethodKey(selectedKey)) next.set("m", selectedKey);
    if (view === "ledger") next.set("tab", "ledger");
    if (advanced) next.set("mode", "adv");
    if (wideRequested) next.set("view", "wide");
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlExpression, canonicalSelection?.methodKey, selectedKey, view, advanced, wideRequested]);

  const chooseMethod = useCallback((method) => setSelectedKey(method.methodKey), []);
  const fillExample = (text) => {
    row.setDraft(text);
    requestAnimationFrame(() => inputRef.current?.focus?.());
  };

  const shareUrl = useMemo(() => {
    if (!canonicalSelection) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://sod1820.co.il";
    return buildCalculatorShareUrl(canonicalSelection, { discovery: shareDiscovery, shareId, baseUrl: origin + "/2029/gematria/viral" });
  }, [canonicalSelection, shareDiscovery, shareId]);

  const openNumber = () => {
    if (!canonicalSelection || canonicalSelection.resultValue == null) return;
    const href = numberExpressionFocusHref(canonicalSelection.resultValue, {
      expression: canonicalSelection.expression,
      method: canonicalSelection.methodKey,
    });
    if (href) navigate(href);
  };

  const openHeichal = () => {
    if (!canonicalSelection) return;
    research.updateResearchContext?.(buildCalculatorResearchContext(canonicalSelection, { focusOrigin: "calculator-pro-2029" }));
    research.updateResearchContext?.({ lens: "heichal" });
    navigate("/heichal");
  };

  const openRaziel = () => {
    if (!canonicalSelection || canonicalSelection.resultValue == null) return;
    const numberCoreFocus = {
      kind: "method",
      root: canonicalSelection.resultValue,
      expression: canonicalSelection.expression,
      method: canonicalSelection.methodKey,
      methodLabel: canonicalSelection.methodLabel,
      resultValue: canonicalSelection.resultValue,
    };
    research.updateResearchContext?.(buildCalculatorResearchContext(canonicalSelection, { numberCoreFocus, razielMicroIntent: "explain_method" }));
    emit("calculator_2029", "raziel_opened", { props: { surface: "professional", expression: canonicalSelection.expression, method: canonicalSelection.methodKey } });
    shell.openRaziel?.({ numberCoreFocus, razielMicroIntent: "explain_method" });
  };

  const handleLensProjection = useCallback((data) => {
    if (!canonicalSelection) return;
    const items = Array.isArray(data?.items) ? data.items : [];
    const exact = items.find((item) => (
      item?.phrase
      && clean(item.phrase) !== clean(canonicalSelection.expression)
      && Number(item?.value) === Number(canonicalSelection.resultValue)
      && item?.relation?.status !== "dependent"
    ));
    setShareDiscovery(exact ? { phrase: clean(exact.phrase), value: Number(exact.value) } : null);
  }, [canonicalSelection]);

  const englishPending = row.englishRows.some((method) => method.previewOnly);
  const englishOnlyPending = englishPending && !info.hebrewApplicable;
  const status = row.profile.error
    ? "error"
    : row.profile.loading ? "verifying" : row.canonicalSettled && !englishOnlyPending ? "verified" : "instant";
  const statusText = status === "error"
    ? "לא ניתן לקבל כרגע את פרופיל השיטות מהמנוע."
    : status === "verifying" ? "מאמת מול המנוע הקנוני…"
      : status === "verified" ? "מאומת"
        : englishOnlyPending ? "מיידי · האנגלית ממתינה להפעלה קנונית במנוע"
          : info.expression ? "מיידי" : "";

  const effectiveView = info.hebrewApplicable ? view : "tiles";
  const visibleFamilies = showAllFamilies || advanced || wide
    ? familyGroups
    : familyGroups.filter((group) => group.key === CORE_FAMILY_KEY);
  const hiddenMethodCount = familyGroups
    .filter((group) => group.key !== CORE_FAMILY_KEY)
    .reduce((sum, group) => sum + group.methods.length, 0);
  const isNumeric = info.kind === CALCULATOR_INPUT_KIND.NUMERIC;
  const hasAnyResults = allMethods.length > 0;
  const showDuo = Boolean(canonicalSelection) && (advanced || wide);
  const isEnglishSelected = selectedMethod?.language === "en";

  const hero = selectedMethod && activeValue != null ? (
    <section className="sod29-calcpro-hero" aria-label="התוצאה הפעילה">
      <strong className="sod29-calcpro-hero-value">{fmt(activeValue)}</strong>
      <div>
        <b>{selectedMethod.publicLabel || selectedMethod.label}</b>
        <span>{info.expression}</span>
        {sameValueMethods.length ? (
          <p>
            {sameValueMethods.slice(0, 3).map((method) => (
              <em key={method.methodKey}>{method.publicLabel || method.label} = {fmt(method.computedValue)}</em>
            ))}
            {sameValueMethods.length > 3 ? <em>+{sameValueMethods.length - 3}</em> : null}
          </p>
        ) : null}
        {selectedMethod.previewOnly && isEnglishSelected ? (
          <small>תצוגה מיידית · {selectedMethod.pendingNote}. לא ניתנת לשיתוף עד אישור.</small>
        ) : null}
      </div>
    </section>
  ) : null;

  const tilesView = hasAnyResults ? (
    <>
      {canonicalSelection ? <LetterStrip ledgerState={ledgerState} /> : null}
      <section className="sod29-calcpro-families" aria-label="כל השיטות">
        {visibleFamilies.map((group) => (
          <div className="sod29-calcpro-family" key={group.key}>
            <h3>{group.label}<span>{group.methods.length}</span></h3>
            <div className="sod29-calcpro-grid">
              {group.methods.map((method) => (
                <MethodTile
                  key={method.methodKey}
                  method={method}
                  active={method.methodKey === selectedKey}
                  sameCount={method.previewOnly ? 0 : Math.max(0, (valueCounts.get(Number(method.computedValue)) || 1) - 1)}
                  onChoose={chooseMethod}
                />
              ))}
            </div>
          </div>
        ))}
        {!advanced && !wide && hiddenMethodCount > 0 ? (
          <button type="button" className="sod29-calcpro-more" onClick={() => setShowAllFamilies((value) => !value)} aria-expanded={showAllFamilies}>
            {showAllFamilies ? "צמצם" : `שיטות עומק ומורכבות · עוד ${hiddenMethodCount}`}
          </button>
        ) : null}
      </section>
    </>
  ) : null;

  const ledgerView = canonicalSelection ? (
    <div className="sod29-calcpro-ledgerview">
      <CalculatorLedgerCard2029
        tag="הפירוק מגיע מהמנוע"
        expression={canonicalSelection.expression}
        methodLabel={canonicalSelection.methodLabel}
        value={fmt(canonicalSelection.resultValue)}
        ledgerState={ledgerState}
      />
      <MethodBars
        groups={visibleFamilies}
        selectedKey={selectedKey}
        activeValue={activeValue}
        onChoose={chooseMethod}
      />
    </div>
  ) : (
    <div className="sod29-calcpro-ledger-state">הפנקס נפתח כשהמנוע מאמת את התוצאה.</div>
  );

  const englishBlock = row.englishRows.length ? (
    <section className="sod29-calcpro-family is-english" aria-label="אנגלית">
      <h3>אנגלית · תצוגה מיידית<span>ממתינה להפעלה קנונית</span></h3>
      <div className="sod29-calcpro-grid">
        {row.englishRows.map((method) => (
          <MethodTile key={method.methodKey} method={method} active={method.methodKey === selectedKey} sameCount={0} onChoose={chooseMethod} />
        ))}
      </div>
      {isEnglishSelected && selectedMethod.explain ? (
        <p className="sod29-calcpro-explain">{selectedMethod.note ? selectedMethod.note + " · " : ""}{selectedMethod.explain}</p>
      ) : null}
    </section>
  ) : null;

  return (
    <section className={`sod29-calcpro${wide ? " is-wide" : ""}`} data-experience-surface="calculator-pro-2029">
      <h1 className="sod29-calcpro-sr">מחשבון גימטריה מקצועי</h1>
      <form className="sod29-calcpro-command" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="calculator-pro-input" className="sod29-calcpro-sr">שם, מילה או ביטוי</label>
        <input
          ref={inputRef}
          id="calculator-pro-input"
          value={row.draft}
          onChange={(event) => row.setDraft(event.target.value)}
          placeholder="שם, מילה או ביטוי · עברית או English"
          dir="auto"
          autoComplete="off"
          spellCheck="false"
          aria-describedby="calculator-pro-status"
        />
        <div className="sod29-calcpro-bar">
          <span id="calculator-pro-status" className={`sod29-calcpro-status is-${status}`} aria-live="polite" role={status === "error" ? "alert" : undefined}>
            {statusText}
          </span>
          <div className="sod29-calcpro-modes">
            {!wide ? (
              <div className="sod29-calcpro-tabs" role="tablist" aria-label="תצוגה">
                <button type="button" role="tab" aria-selected={effectiveView === "tiles"} onClick={() => setView("tiles")}>אריחים</button>
                <button type="button" role="tab" aria-selected={effectiveView === "ledger"} onClick={() => setView("ledger")} disabled={!info.hebrewApplicable}>פנקס</button>
              </div>
            ) : null}
            {!wide ? (
              <button type="button" aria-pressed={advanced} onClick={() => setAdvanced((value) => !value)}>
                {advanced ? "סגור מתקדם" : "מתקדם"}
              </button>
            ) : null}
            {desktop ? (
              <button type="button" aria-pressed={wide} onClick={() => setWide((value) => !value)}>
                {wide ? "מצב רגיל" : "מורחב"}
              </button>
            ) : null}
          </div>
        </div>
        {info.notice ? <p className="sod29-calcpro-notice" role="status">{info.notice}</p> : null}
        {!info.expression ? (
          <div className="sod29-calcpro-examples" aria-label="דוגמאות">
            {EXAMPLES.map((text) => (
              <button type="button" key={text} onClick={() => fillExample(text)} dir="auto">{text}</button>
            ))}
          </div>
        ) : null}
      </form>

      {isNumeric ? (
        <div className="sod29-calcpro-empty">
          <Link to={`/2029/number/${encodeURIComponent(info.expression.replace(/\D/g, ""))}`}>פתח את המספר {info.expression}</Link>
        </div>
      ) : null}

      <div className="sod29-calcpro-layout">
        {wide && hasAnyResults ? (
          <MethodRail
            groups={familyGroups}
            englishRows={row.englishRows}
            selectedKey={selectedKey}
            activeValue={activeValue}
            onChoose={chooseMethod}
          />
        ) : null}

        <div className="sod29-calcpro-main">
          {hero}
          {wide ? null : (effectiveView === "ledger" ? ledgerView : tilesView)}
          {!wide ? englishBlock : null}
          {showDuo ? (
            <CalculatorDuo2029
              expressionA={canonicalSelection.expression}
              selectionA={canonicalSelection}
              ledgerA={ledgerState}
              compositeRows={compositeRows}
            />
          ) : null}
          {wide && !canonicalSelection && hasAnyResults ? <div className="sod29-calcpro-ledger-state">בחרו שיטה ברשימה כדי לפתוח שתי שורות.</div> : null}
        </div>

        <aside className="sod29-calcpro-side">
          {canonicalSelection ? (
            <section className="sod29-calcpro-inspector" data-calculation-selection={canonicalSelection.methodKey}>
              <h4>הבחירה שלך · {canonicalSelection.expression} · {canonicalSelection.methodLabel}</h4>
              <div className="sod29-calcpro-actions">
                <button type="button" className="is-primary" onClick={openNumber}><NavigationIcon2029 name="number" size={18} /> גלה הכל על {fmt(canonicalSelection.resultValue)} ←</button>
                <button type="button" onClick={() => setShowOpening((value) => !value)} aria-expanded={showOpening}>
                  <NavigationIcon2029 name="discovery" size={18} /> {showOpening ? "סגור פתיחה" : "ראה פתיחה"}
                </button>
                <Link to={"/beit-midrash/" + encodeURIComponent(canonicalSelection.methodKey)}><NavigationIcon2029 name="study" size={18} /> למד את השיטה</Link>
                <button type="button" onClick={openHeichal}><NavigationIcon2029 name="heichal" size={18} /> חקור בהיכל</button>
                <button type="button" className="is-raziel" onClick={openRaziel}><NavigationIcon2029 name="raziel" size={18} /> שאל את רזיאל</button>
              </div>
              <CalculatorOpening2029 selection={canonicalSelection} open={showOpening} onClose={() => setShowOpening(false)} />
            </section>
          ) : null}

          {canonicalSelection ? (
            <CalculatorAiAnalysis2029
              selection={canonicalSelection}
              ledger={ledgerState?.ledger || null}
              sameValueLabels={sameValueMethods.map((method) => `${method.publicLabel || method.label}=${method.computedValue}`)}
            />
          ) : null}

          {canonicalSelection ? (
            <MethodLens2029
              selection={canonicalSelection}
              compact
              onOpened={() => emit("calculator_2029", "method_opened", { props: { surface: "professional", expression: canonicalSelection.expression, method: canonicalSelection.methodKey } })}
              onProjection={handleLensProjection}
              onOpenExpression={(item) => {
                if (!item?.phrase || canonicalSelection.resultValue == null) return;
                const href = numberExpressionFocusHref(canonicalSelection.resultValue, { expression: item.phrase, method: canonicalSelection.methodKey });
                if (href) navigate(href);
              }}
            />
          ) : null}

          {shareUrl ? (
            <section className="sod29-calcpro-share" aria-label="שיתוף התוצאה" data-share-url={shareUrl}>
              <div>
                <span>שתף כגילוי</span>
                <strong>{canonicalSelection.expression} = {fmt(canonicalSelection.resultValue)}</strong>
                <small>הקישור נפתח במחשבון הקהילתי ומשחזר את אותה תוצאה מהמנוע.</small>
              </div>
              <ShareActions
                type="gematria_result"
                url={shareUrl}
                title={`${canonicalSelection.expression} = ${canonicalSelection.resultValue} · ${canonicalSelection.methodLabel} · מה מסתתר בשם שלך?`}
                channels={["native", "whatsapp", "telegram", "copy"]}
                force
                onShare={(channel) => emit("calculator_2029", "share_created", {
                  props: { surface: "professional", expression: canonicalSelection.expression, method: canonicalSelection.methodKey, share_id: shareId, channel },
                })}
              />
            </section>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

export default function CalculatorPro2029Page() {
  useEffect(() => {
    applySeo({
      title: "מחשבון גימטריה מקצועי · SOD1820",
      description: "כל שיטות הגימטריה במבט אחד, עם פנקס פירוק אותיות מהמנוע הקנוני, מצב מתקדם להשוואה ומצב מורחב.",
      path: window.location.pathname,
      noindex: true,
    });
  }, []);

  return (
    <Sod2029Shell
      wide
      surface="number"
      introVariant="none"
      symbol={<NavigationIcon2029 name="calculator" />}
      eyebrow="מחשבון מקצועי"
      title="מחשבון גימטריה"
      description="כל השיטות במבט אחד, פירוק אותיות מהמנוע ומצב מתקדם להשוואה."
    >
      <ProExperience />
    </Sod2029Shell>
  );
}
