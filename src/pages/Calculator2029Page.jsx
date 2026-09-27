import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
import { numberExpressionFocusHref } from "../lib/research/numberExpressionFocus.js";
import {
  buildCalculationSelection,
  calculationAvailabilityLabel,
  splitCalculatorMethods,
} from "../lib/research/calculator2029Model.js";
import {
  buildCalculatorShareUrl,
  makeCalculatorShareId,
  parseCalculatorShareState,
  pickVerifiedShareDiscovery,
} from "../lib/research/calculator2029Viral.js";
import { applySeo } from "../lib/seo.js";
import "./calculator2029.css";

const clean = (value) => value == null ? "" : String(value).trim();
const CALCULATOR_2029_AUTO_COMPUTE_DEBOUNCE_MS = 240;

function traceSteps(finding) {
  const raw = finding?.projection?.dimensions?.trace?.steps;
  if (!Array.isArray(raw)) return [];
  return raw.map((step) => {
    if (typeof step === "string") return step;
    if (!step || typeof step !== "object") return "";
    return clean(step.label || step.description || step.expression || step.token || step.word || step.step);
  }).filter(Boolean);
}

function eventProps(selection, extra = {}) {
  return {
    expression: selection?.expression || null,
    method: selection?.methodKey || null,
    value: selection?.resultValue ?? null,
    ...extra,
  };
}

const CalculatorFastCore2029 = React.memo(function CalculatorFastCore2029({
  seedExpression = "",
  resetToken = 0,
  inputRef,
  profile,
  selectedKey,
  onTypingStart,
  onSettleExpression,
  onChooseMethod,
}) {
  const [draft, setDraft] = useState(seedExpression);
  const [showAll, setShowAll] = useState(false);
  const settleTimerRef = useRef(null);
  const typingBurstRef = useRef(false);

  useEffect(() => {
    setDraft(seedExpression || "");
    setShowAll(false);
    typingBurstRef.current = false;
    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
  }, [resetToken]);

  useEffect(() => () => {
    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
  }, []);

  const fastPreview = useMemo(
    () => buildCalculator2029FastPreview(draft),
    [draft]
  );
  const canonicalSettled = clean(profile.expression) === clean(draft)
    && Array.isArray(profile.rows)
    && profile.rows.length > 0
    && !profile.loading;
  const displayRows = canonicalSettled ? profile.rows : (fastPreview?.methods || []);
  const methods = useMemo(() => splitCalculatorMethods(displayRows), [displayRows]);

  const handleDraftChange = (value) => {
    const next = String(value ?? "");
    setDraft(next);

    if (!typingBurstRef.current) {
      typingBurstRef.current = true;
      onTypingStart?.();
    }

    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    const phrase = clean(next);
    if (!phrase) {
      typingBurstRef.current = false;
      onSettleExpression?.("");
      return;
    }

    settleTimerRef.current = window.setTimeout(() => {
      typingBurstRef.current = false;
      onSettleExpression?.(phrase);
    }, CALCULATOR_2029_AUTO_COMPUTE_DEBOUNCE_MS);
  };

  return (
    <>
      <form className="sod29-calc2029-command" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="calculator-2029-input">שם, מילה או ביטוי</label>
        <div className="sod29-calc2029-input-row">
          <input
            ref={inputRef}
            id="calculator-2029-input"
            value={draft}
            onChange={(event) => handleDraftChange(event.target.value)}
            placeholder="למשל: צוריאל"
            dir="rtl"
            autoComplete="off"
            spellCheck="false"
            aria-describedby="calculator-2029-help"
            data-fast-core-local="true"
          />
        </div>
        <div className="sod29-calc2029-command-meta" id="calculator-2029-help">
          <span>התוצאות מתעדכנות אוטומטית</span>
          <span>AI ורזיאל רק בפעולה מפורשת</span>
          <span>מנוע + Registry קנוניים</span>
        </div>
      </form>

      <div
        className={`sod29-calc2029-engine-status${profile.error ? " is-error" : ""}`}
        aria-live="polite"
        role={profile.error ? "alert" : undefined}
        data-engine-status={profile.error ? "error" : profile.loading ? "verifying" : canonicalSettled ? "verified" : "instant"}
      >
        {profile.error
          ? String(profile.error?.message || "").includes("SHARED_RESULT_CANONICAL_MISMATCH")
            ? "הקישור המשותף לא תאם לתוצאה הקנונית הנוכחית ולכן לא הוצג כעובדה."
            : "לא ניתן לקבל כרגע את פרופיל השיטות."
          : profile.loading
            ? "מאמת מול המנוע הקנוני…"
            : canonicalSettled
              ? "מאומת"
              : "מיידי"}
      </div>

      {methods.all.length ? (
        <section className="sod29-calc2029-results" aria-label="תוצאות גימטריה">
          <header>
            <div>
              <span>תוצאות</span>
              <strong>{clean(draft) || "הקלידו שם, מילה או ביטוי"}</strong>
            </div>
            <button
              type="button"
              className={!methods.rest.length ? "is-placeholder" : ""}
              onClick={() => methods.rest.length && setShowAll((value) => !value)}
              aria-expanded={methods.rest.length ? showAll : false}
              aria-hidden={!methods.rest.length}
              tabIndex={methods.rest.length ? 0 : -1}
            >
              {showAll && methods.rest.length ? "צמצם" : "כל השיטות"}
            </button>
          </header>

          <div className="sod29-calc2029-grid">
            {methods.core.map((method) => {
              const active = !method.previewOnly && method.methodKey === selectedKey;
              const unavailable = calculationAvailabilityLabel(method);
              return (
                <button
                  type="button"
                  key={method.methodKey}
                  className={`${active ? "is-active" : ""}${method.previewOnly ? " is-preview" : ""}`}
                  onClick={() => !method.previewOnly && onChooseMethod?.(method, draft)}
                  aria-pressed={active}
                  disabled={Boolean(method.previewOnly)}
                  data-preview-state={method.previewOnly ? "preview" : "verified"}
                >
                  <span>{method.label}</span>
                  <strong>{method.computedValue ?? "—"}</strong>
                  {method.previewOnly ? <small>מיידי</small> : unavailable ? <small>{unavailable}</small> : null}
                </button>
              );
            })}
          </div>

          {showAll ? (
            <div className="sod29-calc2029-all" aria-label="כל השיטות">
              {methods.rest.map((method) => {
                const active = !method.previewOnly && method.methodKey === selectedKey;
                const unavailable = calculationAvailabilityLabel(method);
                return (
                  <button
                    type="button"
                    key={method.methodKey}
                    className={`${active ? "is-active" : ""}${method.previewOnly ? " is-preview" : ""}`}
                    onClick={() => !method.previewOnly && onChooseMethod?.(method, draft)}
                    aria-pressed={active}
                    disabled={Boolean(method.previewOnly)}
                    data-preview-state={method.previewOnly ? "preview" : "verified"}
                  >
                    <span>{method.label}</span>
                    <strong>{method.computedValue ?? "—"}</strong>
                    {method.previewOnly ? <small>מיידי</small> : unavailable ? <small>{unavailable}</small> : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );
});

function CalculatorExperience() {
  const location = useLocation();
  const navigate = useNavigate();
  const research = useResearch();
  const shell = use2029Shell();
  const inputRef = useRef(null);
  const firstComputeRef = useRef(false);
  const restoredRef = useRef("");
  const computeRequestRef = useRef(0);
  const computeRef = useRef(null);
  const sharedState = useMemo(() => parseCalculatorShareState(location.search), [location.search]);
  const arrivalShareIdRef = useRef(sharedState.shareId || null);

  const [expression, setExpression] = useState(sharedState.expression || "");
  const [profile, setProfile] = useState({ loading: false, rows: [], error: null, expression: "" });
  const [selectedKey, setSelectedKey] = useState(null);
  const [fastResetToken, setFastResetToken] = useState(0);
  const [showCompare, setShowCompare] = useState(false);
  const [showOpening, setShowOpening] = useState(false);
  const [trace, setTrace] = useState({ loading: false, finding: null, error: null, key: null });
  const [shareId, setShareId] = useState(() => makeCalculatorShareId());
  const [shareDiscovery, setShareDiscovery] = useState(null);
  const [sharedRestored, setSharedRestored] = useState(false);

  useEffect(() => {
    emit("calculator_2029", "calculator_view", {
      props: {
        entry: sharedState.isShared ? "shared_result" : "direct",
        share_id: sharedState.shareId || null,
      },
    });
  }, []);

  const updateSelectionContext = useCallback((next, extraDimensions = {}) => {
    if (!next) return;
    research.updateResearchContext?.({
      subject: {
        id: String(next.resultValue ?? next.expression),
        type: next.resultValue != null ? "number" : "phrase",
        label: next.expression,
        href: next.resultValue != null
          ? numberExpressionFocusHref(next.resultValue, { expression: next.expression, method: next.methodKey })
          : "/2029/gematria",
      },
      selection: {
        entityId: next.resultValue != null ? String(next.resultValue) : next.expression,
        entityType: next.resultValue != null ? "number" : "phrase",
        expression: next.expression,
        method: next.methodKey,
        resultValue: next.resultValue,
        focusKind: "calculation",
      },
      lens: "gematria",
      dimensions: {
        calculationSelection: true,
        source: "calculator-2029",
        ...extraDimensions,
      },
    });
  }, [research]);

  const commitMethod = useCallback((method, phrase, reason = "manual") => {
    const next = buildCalculationSelection(phrase, method);
    if (!next) return null;
    setSelectedKey(method.methodKey);
    setTrace({ loading: false, finding: null, error: null, key: null });
    setShowOpening(false);
    setShareDiscovery(null);
    setShareId(makeCalculatorShareId());
    updateSelectionContext(next);
    emit("calculator_2029", "result_selected", {
      props: eventProps(next, { reason, share_id: arrivalShareIdRef.current }),
    });
    return next;
  }, [updateSelectionContext]);

  const compute = useCallback(async (raw, { restore = false, preferredMethodKey = null, expectedValue = null } = {}) => {
    const phrase = clean(raw);
    if (!phrase) return;
    const requestId = ++computeRequestRef.current;
    setProfile({ loading: true, rows: [], error: null, expression: phrase });
    setSelectedKey(null);
    setTrace({ loading: false, finding: null, error: null, key: null });
    setShowCompare(false);
    setShowOpening(false);
    setShareDiscovery(null);
    try {
      const rows = await fetchNumberMethodProfile(phrase);
      if (requestId !== computeRequestRef.current) return;
      const list = Array.isArray(rows) ? rows : [];
      const preferred = preferredMethodKey
        ? list.find((row) => row.methodKey === preferredMethodKey)
        : null;
      if (restore && (!preferred || preferred.computedValue == null || Number(preferred.computedValue) !== Number(expectedValue))) {
        throw new Error("SHARED_RESULT_CANONICAL_MISMATCH");
      }
      const method = preferred || list[0] || null;
      setProfile({ loading: false, rows: list, error: null, expression: phrase });
      if (method) commitMethod(method, phrase, restore ? "share_restore" : "compute_default");

      if (restore) {
        setSharedRestored(true);
        emit("calculator_2029", "shared_result_opened", {
          props: {
            expression: phrase,
            method: preferredMethodKey,
            value: expectedValue,
            share_id: sharedState.shareId,
          },
        });
      } else {
        if (!firstComputeRef.current) {
          firstComputeRef.current = true;
          emit("calculator_2029", "first_compute", {
            props: { expression_length: phrase.length, from_share: Boolean(arrivalShareIdRef.current) },
          });
        }
        if (arrivalShareIdRef.current) {
          emit("calculator_2029", "new_compute_from_share", {
            props: { share_id: arrivalShareIdRef.current, expression_length: phrase.length },
          });
        }
      }
    } catch (error) {
      if (requestId !== computeRequestRef.current) return;
      setProfile({ loading: false, rows: [], error, expression: phrase });
    }
  }, [commitMethod, sharedState.shareId]);

  useEffect(() => {
    computeRef.current = compute;
  }, [compute]);

  useEffect(() => {
    if (!sharedState.isShared) return;
    const key = [sharedState.expression, sharedState.methodKey, sharedState.resultValue, sharedState.shareId].join("::");
    if (restoredRef.current === key) return;
    restoredRef.current = key;
    setExpression(sharedState.expression);
    compute(sharedState.expression, {
      restore: true,
      preferredMethodKey: sharedState.methodKey,
      expectedValue: sharedState.resultValue,
    });
  }, [sharedState, compute]);

  const canonicalMethods = useMemo(() => splitCalculatorMethods(profile.rows), [profile.rows]);
  const selectedMethod = useMemo(() => (
    canonicalMethods.all.find((row) => row.methodKey === selectedKey) || null
  ), [canonicalMethods, selectedKey]);
  const selection = useMemo(() => (
    selectedMethod ? buildCalculationSelection(profile.expression, selectedMethod) : null
  ), [profile.expression, selectedMethod]);

  const beginFastTyping = useCallback(() => {
    computeRequestRef.current += 1;
    setProfile({ loading: false, rows: [], error: null, expression: "" });
    setSelectedKey(null);
    setTrace({ loading: false, finding: null, error: null, key: null });
    setShowCompare(false);
    setShowOpening(false);
    setShareDiscovery(null);
    setSharedRestored(false);
    if (location.search) navigate("/2029/gematria", { replace: true });
  }, [location.search, navigate]);

  const settleFastExpression = useCallback((raw) => {
    const phrase = clean(raw);
    setExpression(phrase);
    if (!phrase) return;
    computeRef.current?.(phrase);
  }, []);

  const chooseMethod = useCallback((method, phrase) => {
    if (method?.previewOnly) return;
    commitMethod(method, profile.expression || phrase || expression, "manual_method");
  }, [commitMethod, expression, profile.expression]);

  const loadTrace = async () => {
    if (!selection || selection.resultValue == null) return;
    const key = selection.expression + "::" + selection.methodKey;
    if (trace.key === key && (trace.finding || trace.error)) {
      setTrace({ loading: false, finding: null, error: null, key: null });
      return;
    }
    setTrace({ loading: true, finding: null, error: null, key });
    try {
      const finding = await fetchGematriaMethodTrace(selection.methodKey, selection.expression);
      setTrace({ loading: false, finding, error: null, key });
    } catch (error) {
      setTrace({ loading: false, finding: null, error, key });
    }
  };

  const openNumber = () => {
    if (!selection || selection.resultValue == null) return;
    const href = numberExpressionFocusHref(selection.resultValue, {
      expression: selection.expression,
      method: selection.methodKey,
    });
    if (href) navigate(href);
  };

  const openHeichal = () => {
    if (!selection) return;
    updateSelectionContext(selection, { focusOrigin: "calculator-2029" });
    research.updateResearchContext?.({ lens: "heichal" });
    navigate("/heichal");
  };

  const openRaziel = () => {
    if (!selection || selection.resultValue == null) return;
    const numberCoreFocus = {
      kind: "method",
      root: selection.resultValue,
      expression: selection.expression,
      method: selection.methodKey,
      methodLabel: selection.methodLabel,
      resultValue: selection.resultValue,
    };
    updateSelectionContext(selection, { numberCoreFocus, razielMicroIntent: "explain_method" });
    emit("calculator_2029", "raziel_opened", {
      props: eventProps(selection, { share_id: arrivalShareIdRef.current }),
    });
    shell.openRaziel?.({ numberCoreFocus, razielMicroIntent: "explain_method" });
  };

  const shareUrl = useMemo(() => {
    if (!selection || selection.resultValue == null) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://sod1820.co.il";
    return buildCalculatorShareUrl(selection, {
      discovery: shareDiscovery,
      shareId,
      baseUrl: origin + "/2029/gematria",
    });
  }, [selection, shareDiscovery, shareId]);

  const handleLensProjection = useCallback((data) => {
    if (!selection) return;
    if (sharedState.discoveryPhrase) {
      const exact = (Array.isArray(data?.items) ? data.items : []).find((item) => (
        clean(item?.phrase) === sharedState.discoveryPhrase
        && Number(item?.value) === Number(selection.resultValue)
        && item?.relation?.status !== "dependent"
      ));
      if (exact) {
        setShareDiscovery({ phrase: clean(exact.phrase), value: Number(exact.value) });
        return;
      }
    }
    setShareDiscovery(pickVerifiedShareDiscovery(data, selection));
  }, [selection, sharedState.discoveryPhrase]);

  const startOwnCompute = () => {
    computeRequestRef.current += 1;
    setExpression("");
    setFastResetToken((value) => value + 1);
    setProfile({ loading: false, rows: [], error: null, expression: "" });
    setSelectedKey(null);
    setTrace({ loading: false, finding: null, error: null, key: null });
    setShowCompare(false);
    setShowOpening(false);
    setSharedRestored(false);
    if (location.search) navigate("/2029/gematria", { replace: true });
    requestAnimationFrame(() => inputRef.current?.focus?.());
  };

  const steps = traceSteps(trace.finding);

  return (
    <section className="sod29-calc2029" data-experience-surface="calculator-2029">
      {sharedRestored && selection ? (
        <section className="sod29-calc2029-shared" aria-label="תוצאה משותפת">
          <span>מישהו שיתף איתך גילוי</span>
          <strong>{selection.expression} = {selection.resultValue}</strong>
          <small>{selection.methodLabel}</small>
          {shareDiscovery ? <p>{shareDiscovery.phrase} = {shareDiscovery.value} · קשר מספרי מאומת, לא הוכחה למשמעות.</p> : null}
          <button type="button" onClick={startOwnCompute}>מה מסתתר בשם שלך?</button>
        </section>
      ) : null}

      <CalculatorFastCore2029
        seedExpression={expression}
        resetToken={fastResetToken}
        inputRef={inputRef}
        profile={profile}
        selectedKey={selectedKey}
        onTypingStart={beginFastTyping}
        onSettleExpression={settleFastExpression}
        onChooseMethod={chooseMethod}
      />

      {selection ? (
        <section className="sod29-calc2029-inspector" data-calculation-selection={selection.methodKey}>
          <header>
            <div>
              <span>הגילוי שלך</span>
              <strong>{selection.expression} · {selection.methodLabel}</strong>
              <small>{selection.resultValue != null ? "= " + selection.resultValue : calculationAvailabilityLabel(selectedMethod)}</small>
            </div>
            <div className="sod29-calc2029-selection-value">{selection.resultValue ?? "—"}</div>
          </header>

          <div className="sod29-calc2029-actions">
            <button type="button" onClick={loadTrace} disabled={selection.resultValue == null}>
              {trace.finding ? "סגור חישוב" : trace.loading ? "טוען…" : "איך מחשבים?"}
            </button>
            <Link to={"/beit-midrash/" + encodeURIComponent(selection.methodKey)}>למד את השיטה</Link>
            <button type="button" onClick={openNumber} disabled={selection.resultValue == null}>פתח מספר</button>
            <button type="button" onClick={openHeichal}>חקור בהיכל</button>
            <button type="button" onClick={() => setShowCompare((value) => !value)} aria-expanded={showCompare}>
              {showCompare ? "סגור השוואה" : "השווה"}
            </button>
            <button type="button" onClick={() => setShowOpening((value) => !value)} aria-expanded={showOpening}>
              {showOpening ? "סגור פתיחה" : "ראה פתיחה"}
            </button>
            <button type="button" className="is-raziel" onClick={openRaziel} disabled={selection.resultValue == null}>
              ✦ רזיאל · תסביר לי
            </button>
          </div>

          {trace.error ? <div className="sod29-calc2029-trace is-error">הסבר החישוב לא זמין כרגע לשילוב הזה.</div> : null}
          {trace.finding ? (
            <div className="sod29-calc2029-trace">
              <div>
                <span>חישוב קנוני · {selection.methodLabel}</span>
                <strong>{selection.expression} → {selection.resultValue}</strong>
              </div>
              {steps.length ? (
                <div className="sod29-calc2029-trace-steps">
                  {steps.map((step, index) => <span key={step + ":" + index}>{step}</span>)}
                </div>
              ) : <small>המנוע החזיר Trace מאומת ללא צעדים טקסטואליים להצגה.</small>}
            </div>
          ) : null}

          {showCompare ? <CalculatorCompare2029 selectionA={selection} onClose={() => setShowCompare(false)} /> : null}

          <CalculatorOpening2029
            selection={selection}
            open={showOpening}
            onClose={() => setShowOpening(false)}
          />

          <MethodLens2029
            selection={selection}
            autoOpen={sharedState.isShared}
            onOpened={() => emit("calculator_2029", "method_opened", { props: eventProps(selection) })}
            onProjection={handleLensProjection}
            onOpenExpression={(item) => {
              if (!item?.phrase || selection.resultValue == null) return;
              const href = numberExpressionFocusHref(selection.resultValue, {
                expression: item.phrase,
                method: selection.methodKey,
              });
              if (href) navigate(href);
            }}
          />

          {shareUrl ? (
            <section className="sod29-calc2029-share" aria-label="שיתוף התוצאה" data-share-url={shareUrl}>
              <div>
                <span>שתף את הגילוי</span>
                <strong>{selection.expression} = {selection.resultValue}</strong>
                <small>{selection.methodLabel}{shareDiscovery ? " · " + shareDiscovery.phrase + " = " + shareDiscovery.value : ""}</small>
              </div>
              <ShareActions
                type="gematria_result"
                url={shareUrl}
                title={`${selection.expression} = ${selection.resultValue} · ${selection.methodLabel} · מה מסתתר בשם שלך?`}
                channels={["native", "whatsapp", "telegram", "copy"]}
                force
                onShare={(channel) => emit("calculator_2029", "share_created", {
                  props: eventProps(selection, { share_id: shareId, channel, has_discovery: Boolean(shareDiscovery) }),
                })}
              />
            </section>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}

function CalculatorBody() {
  return (
    <Sod2029Shell
      wide
      surface="number"
      symbol="∑"
      eyebrow="ONE GEMATRIA ENGINE · ONE DISCOVERY PATH"
      title="מה מסתתר בשם שלך?"
      description="חשב דרך המנוע הקנוני, בחר תוצאה, גלה קשרים אמיתיים, שאל את רזיאל ושתף קישור חי."
    >
      <CalculatorExperience />
    </Sod2029Shell>
  );
}

export default function Calculator2029Page() {
  useEffect(() => {
    applySeo({
      title: "מחשבון גימטריה 2029 · SOD1820",
      description: "חשבו שם, מילה או ביטוי דרך מנוע הגימטריה הקנוני של SOD1820 ופתחו מסע גילוי.",
      path: "/2029/gematria",
      noindex: true,
    });
  }, []);

  return <CalculatorBody />;
}
