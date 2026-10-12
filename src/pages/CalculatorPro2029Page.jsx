import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Sod2029Shell, { use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import ShareActions from "../components/ShareActions.jsx";
import MethodLens2029 from "../components/gematria2029/MethodLens2029.jsx";
import CalculatorCompare2029 from "../components/gematria2029/CalculatorCompare2029.jsx";
import CalculatorOpening2029 from "../components/gematria2029/CalculatorOpening2029.jsx";
import { emit } from "../lib/events.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { fetchNumberMethodProfile } from "../lib/research/numberCoreProjection.js";
import { fetchGematriaMethodTrace } from "../lib/research/gematriaTrace.js";
import { buildCalculator2029FastPreview } from "../lib/research/calculator2029FastPreview.js";
import { buildGematriaPresentationModel } from "../lib/presentation/gematriaPresentation.js";
import { hebrewReferenceNumber } from "../lib/presentation/canonicalPresentation.js";
import { numberExpressionFocusHref } from "../lib/research/numberExpressionFocus.js";
import {
  CALCULATOR_INPUT_KIND,
  classifyCalculatorInput,
  filterProfileRowsForInput,
  isEnglishMethodKey,
} from "../lib/research/calculator2029Input.js";
import { buildEnglishLaneRows } from "../lib/research/calculator2029English.js";
import { ledgerFromFinding } from "../lib/research/calculator2029Ledger.js";
import {
  buildCalculationSelection,
  buildCalculatorResearchContext,
  calculationAvailabilityLabel,
  normalizeCalculatorMethods,
} from "../lib/research/calculator2029Model.js";
import { buildCalculatorShareUrl, makeCalculatorShareId } from "../lib/research/calculator2029Viral.js";
import { applySeo } from "../lib/seo.js";
import "./calculatorPro2029.css";

const clean = (value) => value == null ? "" : String(value).trim();
const SETTLE_MS = 240;
const EXAMPLES = Object.freeze(["צוריאל", "אהבה", "משיח", "David"]);
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

function useCalculatorRow(seed = "") {
  const [draft, setDraft] = useState(seed);
  const [profile, setProfile] = useState({ loading: false, rows: [], error: null, expression: "" });
  const requestRef = useRef(0);
  const info = useMemo(() => classifyCalculatorInput(draft), [draft]);

  useEffect(() => {
    const phrase = info.expression;
    const id = ++requestRef.current;
    if (!phrase || !(info.hebrewApplicable || info.englishApplicable)) {
      setProfile({ loading: false, rows: [], error: null, expression: phrase });
      return undefined;
    }
    setProfile((current) => ({ ...current, loading: true, error: null }));
    const timer = window.setTimeout(async () => {
      try {
        const rows = await fetchNumberMethodProfile(phrase);
        if (id === requestRef.current) setProfile({ loading: false, rows, error: null, expression: phrase });
      } catch (error) {
        if (id === requestRef.current) setProfile({ loading: false, rows: [], error, expression: phrase });
      }
    }, SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [info.expression, info.hebrewApplicable, info.englishApplicable]);

  const canonicalSettled = Boolean(
    info.expression
    && clean(profile.expression) === info.expression
    && !profile.loading
    && !profile.error
    && profile.rows.length,
  );

  const preview = useMemo(() => buildCalculator2029FastPreview(draft), [draft]);

  const hebrewRows = useMemo(() => {
    if (!info.hebrewApplicable) return [];
    if (canonicalSettled) {
      return normalizeCalculatorMethods(filterProfileRowsForInput(profile.rows, info)
        .filter((row) => !isEnglishMethodKey(row.methodKey)));
    }
    return (preview.methods || []).map((row) => ({ ...row, label: row.displayLabel, category: "base" }));
  }, [info, canonicalSettled, profile.rows, preview]);

  const englishRows = useMemo(
    () => buildEnglishLaneRows(info.expression, canonicalSettled ? profile.rows : []),
    [info.expression, canonicalSettled, profile.rows],
  );

  return { draft, setDraft, info, profile, canonicalSettled, hebrewRows, englishRows };
}

const MethodTile = React.memo(function MethodTile({ method, active, sameValue, onChoose }) {
  const unavailable = calculationAvailabilityLabel(method);
  const note = method.previewOnly
    ? (method.pendingNote || "מיידי")
    : (EXCEPTIONAL_STATE_HE[method.exceptionalState] || unavailable);
  const value = method.computedValue ?? method.value;
  return (
    <button
      type="button"
      className={`sod29-calcpro-tile${active ? " is-active" : ""}${sameValue ? " is-same" : ""}${method.previewOnly ? " is-preview" : ""}`}
      onClick={() => onChoose(method)}
      aria-pressed={active}
      disabled={method.previewOnly && method.language !== "en"}
      data-method={method.methodKey}
      data-preview-state={method.previewOnly ? "preview" : "verified"}
    >
      <span>{method.publicLabel || method.label}</span>
      <strong>{value ?? "—"}</strong>
      {note ? <small>{note}</small> : null}
    </button>
  );
});

function LedgerStrip({ ledger }) {
  if (!ledger?.steps?.length) return null;
  return (
    <div className="sod29-calcpro-ledger" aria-label="פירוק האותיות מהמנוע">
      {ledger.steps.map((step, index) => (
        <span key={step.token + ":" + index} className="sod29-calcpro-ledger-step">
          <b>{step.token}</b>
          <em>{step.value}</em>
        </span>
      ))}
      {ledger.result != null ? <span className="sod29-calcpro-ledger-total">= {ledger.result}</span> : null}
    </div>
  );
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
  const [showAllFamilies, setShowAllFamilies] = useState(false);
  const [advanced, setAdvanced] = useState(params.get("mode") === "adv");
  const [wide, setWide] = useState(params.get("view") === "wide");
  const [showOpening, setShowOpening] = useState(false);
  const [ledgerState, setLedgerState] = useState({ key: null, loading: false, ledger: null, error: null });
  const [shareId, setShareId] = useState(() => makeCalculatorShareId());
  const [shareDiscovery, setShareDiscovery] = useState(null);
  const ledgerCacheRef = useRef(new Map());

  useEffect(() => {
    emit("calculator_2029", "calculator_view", { props: { surface: "professional", entry: seedExpression ? "handoff" : "direct" } });
  }, []);

  const allMethods = useMemo(() => [...row.hebrewRows, ...row.englishRows], [row.hebrewRows, row.englishRows]);
  const methodByKey = useMemo(() => new Map(allMethods.map((method) => [method.methodKey, method])), [allMethods]);
  const reportableRows = useMemo(
    () => allMethods.filter((method) => !method.previewOnly && Number.isFinite(Number(method.computedValue))),
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

  const presentation = useMemo(() => buildGematriaPresentationModel({
    expression: info.expression,
    methodProfile: row.hebrewRows.map((method) => ({ ...method, computedValue: method.computedValue })),
    activeMethodKey: selectedMethod && !isEnglishMethodKey(selectedMethod.methodKey) ? selectedMethod.methodKey : null,
  }), [info.expression, row.hebrewRows, selectedMethod]);

  const activeValue = selectedMethod?.computedValue ?? null;

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
    if (advanced) next.set("mode", "adv");
    if (wide) next.set("view", "wide");
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlExpression, canonicalSelection?.methodKey, selectedKey, advanced, wide]);

  // Letter ledger comes from the canonical trace RPC, one lazy fetch per expression+method.
  useEffect(() => {
    if (!canonicalSelection) {
      setLedgerState({ key: null, loading: false, ledger: null, error: null });
      return undefined;
    }
    const key = canonicalSelection.expression + "::" + canonicalSelection.methodKey;
    const cached = ledgerCacheRef.current.get(key);
    if (cached) {
      setLedgerState({ key, loading: false, ledger: cached, error: null });
      return undefined;
    }
    let alive = true;
    setLedgerState({ key, loading: true, ledger: null, error: null });
    fetchGematriaMethodTrace(canonicalSelection.methodKey, canonicalSelection.expression)
      .then((finding) => {
        if (!alive) return;
        const ledger = ledgerFromFinding(finding);
        ledgerCacheRef.current.set(key, ledger);
        setLedgerState({ key, loading: false, ledger, error: null });
      })
      .catch((error) => {
        if (alive) setLedgerState({ key, loading: false, ledger: null, error });
      });
    return () => { alive = false; };
  }, [canonicalSelection?.expression, canonicalSelection?.methodKey]);

  const chooseMethod = useCallback((method) => {
    setSelectedKey(method.methodKey);
  }, []);

  const fillExample = (text) => {
    row.setDraft(text);
    requestAnimationFrame(() => inputRef.current?.focus?.());
  };

  const shareUrl = useMemo(() => {
    if (!canonicalSelection) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://sod1820.co.il";
    return buildCalculatorShareUrl(canonicalSelection, { discovery: shareDiscovery, shareId, baseUrl: origin + "/2029/gematria" });
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

  const familyGroups = useMemo(() => presentation.familyGroups.map((group) => ({
    key: group.key,
    label: group.label,
    methods: group.methods.map((modelMethod) => ({
      ...(methodByKey.get(modelMethod.methodKey) || {}),
      methodKey: modelMethod.methodKey,
      publicLabel: modelMethod.publicLabel,
      exceptionalState: modelMethod.exceptionalState,
      computedValue: modelMethod.value ?? methodByKey.get(modelMethod.methodKey)?.computedValue ?? null,
    })),
  })), [presentation, methodByKey]);
  const visibleFamilies = showAllFamilies || advanced
    ? familyGroups
    : familyGroups.filter((group) => group.key === CORE_FAMILY_KEY);
  const hiddenMethodCount = familyGroups
    .filter((group) => group.key !== CORE_FAMILY_KEY)
    .reduce((sum, group) => sum + group.methods.length, 0);
  const activeNumericValue = Number(activeValue);
  const sameValueKeys = useMemo(() => {
    if (!Number.isFinite(activeNumericValue) || activeNumericValue <= 0) return new Set();
    return new Set(allMethods
      .filter((method) => method.methodKey !== selectedKey && Number(method.computedValue) === activeNumericValue && !method.previewOnly)
      .map((method) => method.methodKey));
  }, [allMethods, selectedKey, activeNumericValue]);

  const hasAnyResults = allMethods.length > 0;
  const unsupported = info.kind === CALCULATOR_INPUT_KIND.UNSUPPORTED || info.kind === CALCULATOR_INPUT_KIND.NUMERIC;

  return (
    <section className={`sod29-calcpro${wide ? " is-wide" : ""}`} data-experience-surface="calculator-pro-2029">
      <form className="sod29-calcpro-command" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="calculator-pro-input">שם, מילה או ביטוי</label>
        <input
          ref={inputRef}
          id="calculator-pro-input"
          value={row.draft}
          onChange={(event) => row.setDraft(event.target.value)}
          placeholder="עברית או English"
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
            <button type="button" aria-pressed={advanced} onClick={() => setAdvanced((value) => !value)}>
              {advanced ? "סגור מצב מתקדם" : "מצב מתקדם"}
            </button>
            <button type="button" aria-pressed={wide} onClick={() => setWide((value) => !value)}>
              {wide ? "מצב רגיל" : "מצב מורחב"}
            </button>
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

      {unsupported && info.expression ? (
        <div className="sod29-calcpro-empty">
          {info.kind === CALCULATOR_INPUT_KIND.NUMERIC
            ? <Link to={`/2029/number/${encodeURIComponent(info.expression.replace(/\D/g, ""))}`}>פתח את המספר {info.expression}</Link>
            : null}
        </div>
      ) : null}

      <div className="sod29-calcpro-body">
        <div className="sod29-calcpro-main">
          {selectedMethod && activeValue != null ? (
            <section className="sod29-calcpro-focal" aria-label="התוצאה הפעילה">
              <div>
                <span>{selectedMethod.language === "en" ? (selectedMethod.hebrewLabel || selectedMethod.label) : "שיטה פעילה"}</span>
                <strong className="sod29-calcpro-value">{activeValue}</strong>
                {selectedMethod.language !== "en" && hebrewReferenceNumber(activeValue)
                  ? <em>{hebrewReferenceNumber(activeValue)}</em> : null}
              </div>
              <div>
                <span>{info.expression}</span>
                <b>{selectedMethod.publicLabel || selectedMethod.label}</b>
                {selectedMethod.previewOnly && selectedMethod.language === "en" ? (
                  <small>תצוגה מיידית · {selectedMethod.pendingNote}. לא ניתנת לשיתוף עד אישור.</small>
                ) : null}
              </div>
            </section>
          ) : null}

          {canonicalSelection ? (
            <section className="sod29-calcpro-ledger-wrap">
              {ledgerState.loading ? <small>טוען את פירוק האותיות מהמנוע…</small> : null}
              {ledgerState.error ? <small>פירוק האותיות לא זמין כרגע לשיטה הזאת.</small> : null}
              <LedgerStrip ledger={ledgerState.ledger} />
            </section>
          ) : null}

          {hasAnyResults ? (
            <section className="sod29-calcpro-families" aria-label="כל השיטות">
              {visibleFamilies.map((group) => (
                <div className="sod29-calcpro-family" key={group.key}>
                  <h3>{group.label}</h3>
                  <div className="sod29-calcpro-grid">
                    {group.methods.map((method) => (
                      <MethodTile
                        key={method.methodKey}
                        method={method}
                        active={method.methodKey === selectedKey}
                        sameValue={sameValueKeys.has(method.methodKey)}
                        onChoose={chooseMethod}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {!advanced && hiddenMethodCount > 0 ? (
                <button type="button" className="sod29-calcpro-more" onClick={() => setShowAllFamilies((value) => !value)} aria-expanded={showAllFamilies}>
                  {showAllFamilies ? "צמצם" : `כל השיטות · עוד ${hiddenMethodCount}`}
                </button>
              ) : null}

              {row.englishRows.length ? (
                <div className="sod29-calcpro-family is-english">
                  <h3>אנגלית</h3>
                  <div className="sod29-calcpro-grid">
                    {row.englishRows.map((method) => (
                      <MethodTile
                        key={method.methodKey}
                        method={method}
                        active={method.methodKey === selectedKey}
                        sameValue={false}
                        onChoose={chooseMethod}
                      />
                    ))}
                  </div>
                  {selectedMethod?.language === "en" && selectedMethod.explain ? (
                    <p className="sod29-calcpro-explain">{selectedMethod.note ? selectedMethod.note + " · " : ""}{selectedMethod.explain}</p>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}
        </div>

        <aside className="sod29-calcpro-side">
          {canonicalSelection ? (
            <section className="sod29-calcpro-inspector" data-calculation-selection={canonicalSelection.methodKey}>
              <header>
                <span>הבחירה שלך</span>
                <strong>{canonicalSelection.expression} · {canonicalSelection.methodLabel}</strong>
                <b>{canonicalSelection.resultValue}</b>
              </header>
              <div className="sod29-calcpro-actions">
                <button type="button" onClick={openNumber}>פתח מספר</button>
                <Link to={"/beit-midrash/" + encodeURIComponent(canonicalSelection.methodKey)}>למד את השיטה</Link>
                <button type="button" onClick={() => setShowOpening((value) => !value)} aria-expanded={showOpening}>
                  {showOpening ? "סגור פתיחה" : "ראה פתיחה"}
                </button>
                <button type="button" onClick={openHeichal}>חקור בהיכל</button>
                <button type="button" className="is-raziel" onClick={openRaziel}>✦ רזיאל · תסביר לי</button>
              </div>
              <CalculatorOpening2029 selection={canonicalSelection} open={showOpening} onClose={() => setShowOpening(false)} />
            </section>
          ) : null}

          {advanced && canonicalSelection ? (
            <CalculatorCompare2029 selectionA={canonicalSelection} onClose={() => setAdvanced(false)} />
          ) : null}

          {canonicalSelection ? (
            <MethodLens2029
              selection={canonicalSelection}
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
                <strong>{canonicalSelection.expression} = {canonicalSelection.resultValue}</strong>
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
      description: "כל שיטות הגימטריה במבט אחד, עם מצב מתקדם להשוואה, פירוק אותיות מהמנוע הקנוני ואנגלית.",
      path: "/2029/calculator",
      noindex: true,
    });
  }, []);

  return (
    <Sod2029Shell
      wide
      surface="number"
      introVariant="compact"
      symbol="∑"
      eyebrow="מחשבון מקצועי"
      title="מחשבון גימטריה"
      description="כל השיטות במבט אחד, פירוק אותיות מהמנוע ומצב מתקדם להשוואה."
    >
      <ProExperience />
    </Sod2029Shell>
  );
}
