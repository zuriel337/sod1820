import React, { useCallback, useEffect, useMemo, useState } from "react";
import { buildCalculator2029FastPreview, CALCULATOR_2029_FAST_CORE_KEYS } from "../../lib/research/calculator2029FastPreview.js";
import { buildNumberExpressionHandoff } from "../../lib/research/numberExpressionFocus.js";
import { canonicalMethodPublicLabel } from "../../lib/presentation/canonicalPresentation.js";
import "./numberQuickInspect2029.css";

// Light side-panel projection of a number / expression. The full product stays at /number/:value.
// Instant values are the local fast preview (marked as such). At most ONE bounded canonical read
// (fn_method_profile, value depth) verifies the expression/method; it is aborted on close.
const clean = (value) => value == null ? "" : String(value).trim();
const CANONICAL_TIMEOUT_MS = 8000;
const CORE_KEYS = new Set(CALCULATOR_2029_FAST_CORE_KEYS);
const safeInt = (value) => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
};

async function readCanonicalProfile(expression, signal) {
  const { supabase } = await import("../../lib/supabase.js");
  if (signal.aborted) return null;
  const { data, error } = await supabase
    .rpc("fn_method_profile", { p_phrase: expression, p_depth: "value" })
    .abortSignal(signal);
  if (error) throw error;
  return (Array.isArray(data) ? data : [])
    .map((row) => ({
      methodKey: clean(row?.method_key),
      displayLabel: clean(row?.display_label || row?.method_key),
      value: safeInt(row?.computed_value),
      version: safeInt(row?.definition_version),
    }))
    .filter((row) => row.methodKey && row.value != null && CORE_KEYS.has(row.methodKey));
}

export default function NumberQuickInspect2029({ target, context, research, go, sourceReturn = null } = {}) {
  const targetNumber = target?.type === "number" ? safeInt(target.id) : null;
  const contextNumber = context?.subject?.type === "number" ? safeInt(context.subject.id) : null;
  const seedExpression = target?.type === "number"
    ? ""
    : clean(target?.expression || (target?.type === "phrase" ? (target.label || target.id) : "")) || clean(context?.selection?.expression);
  const seedMethod = clean(target?.method || target?.methodKey) || clean(context?.selection?.method);
  const seedRoot = targetNumber ?? (seedExpression ? null : contextNumber);

  const [input, setInput] = useState(seedExpression || (seedRoot != null ? String(seedRoot) : ""));
  const [committed, setCommitted] = useState(seedExpression || (seedRoot != null ? String(seedRoot) : ""));
  const [canonical, setCanonical] = useState({ status: "idle", rows: [], error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const next = seedExpression || (seedRoot != null ? String(seedRoot) : "");
    setInput(next);
    setCommitted(next);
  }, [seedExpression, seedRoot]);

  const numeric = /^\d+$/.test(committed) && safeInt(committed) != null;
  const preview = useMemo(() => (committed && !numeric ? buildCalculator2029FastPreview(committed) : null), [committed, numeric]);
  const hasValues = Boolean(preview?.methods?.some((m) => m.computedValue != null));
  const needsRead = Boolean(preview && hasValues && preview.inputKind === "hebrew");

  // One bounded read per (expression, retry). Aborted on close / change so no work outlives the panel.
  useEffect(() => {
    if (!needsRead) { setCanonical({ status: "idle", rows: [], error: null }); return undefined; }
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, CANONICAL_TIMEOUT_MS);
    setCanonical({ status: "loading", rows: [], error: null });
    readCanonicalProfile(committed, controller.signal)
      .then((rows) => {
        if (controller.signal.aborted) return;
        setCanonical(rows?.length ? { status: "verified", rows, error: null } : { status: "empty", rows: [], error: null });
      })
      .catch(() => {
        if (controller.signal.aborted && !timedOut) return;
        setCanonical({ status: "error", rows: [], error: "האימות הקנוני לא הושלם" });
      })
      .finally(() => clearTimeout(timer));
    return () => { controller.abort(); clearTimeout(timer); };
  }, [needsRead, committed, attempt]);

  const verified = canonical.status === "verified";
  const rows = useMemo(() => {
    if (!preview) return [];
    if (verified) {
      const byKey = new Map(canonical.rows.map((r) => [r.methodKey, r]));
      return preview.methods.map((m) => {
        const c = byKey.get(m.methodKey);
        return c ? { key: m.methodKey, label: m.displayLabel, value: c.value } : null;
      }).filter(Boolean);
    }
    return preview.methods.filter((m) => m.computedValue != null).map((m) => ({ key: m.methodKey, label: m.displayLabel, value: m.computedValue }));
  }, [preview, verified, canonical.rows]);

  const selectedKey = seedMethod && rows.some((r) => r.key === seedMethod) ? seedMethod : (rows.find((r) => r.key === "רגיל")?.key || rows[0]?.key || null);
  const [pickedKey, setPickedKey] = useState(null);
  const activeKey = pickedKey && rows.some((r) => r.key === pickedKey) ? pickedKey : selectedKey;
  const active = rows.find((r) => r.key === activeKey) || null;
  const root = numeric ? safeInt(committed) : (active?.value ?? null);
  const expression = numeric ? null : committed || null;

  const openFull = useCallback(() => {
    if (root == null) return;
    const focus = { root, expression, method: expression ? active?.key || seedMethod || null : null, resultValue: expression ? root : null, sourceReturn, lens: "number" };
    const handoff = buildNumberExpressionHandoff({ ...focus, context });
    if (!handoff) return;
    research?.updateResearchContext?.((current) => buildNumberExpressionHandoff({ ...focus, context: current }).context);
    go?.(handoff.href, { preserve: false });
  }, [root, expression, active, seedMethod, sourceReturn, context, research, go]);

  const submit = (event) => {
    event.preventDefault();
    const raw = clean(input).replace(/\s+/g, " ");
    if (!raw || raw.length > 120) return;
    setPickedKey(null);
    setCommitted(raw);
  };

  const methodTitle = active ? canonicalMethodPublicLabel({ method_key: active.key }) || active.label : null;
  return (
    <div className="sod29-quick-inspect" data-quick-inspect="number">
      <form className="sod29-quick-inspect-form" onSubmit={submit}>
        <input data-autofocus value={input} onChange={(e) => setInput(e.target.value)} placeholder="התגלות · 1237" aria-label="מספר או ביטוי" maxLength={120} dir="auto" />
        <button type="submit">בדוק</button>
      </form>

      {!committed ? <p className="sod29-quick-inspect-note">הקלד מספר או ביטוי לבדיקה מהירה. העומק המלא נמצא בדף המספר.</p> : null}

      {numeric ? (
        <section className="sod29-quick-inspect-result" aria-live="polite">
          <small>מספר</small>
          <b className="sod29-quick-inspect-value">{safeInt(committed)}</b>
          <p>הדף המלא מציג את המספר ברשת השיטות, הביטויים והחיבורים שלו.</p>
        </section>
      ) : null}

      {preview && !hasValues ? (
        <p className="sod29-quick-inspect-note" role="status">{preview.inputNotice || "אין שיטות עבריות שחלות על הקלט הזה."}</p>
      ) : null}

      {preview && hasValues ? (
        <section className="sod29-quick-inspect-result" aria-live="polite">
          <small>ביטוי</small>
          <span className="sod29-quick-inspect-expression" dir="auto">{committed}</span>
          {active ? <div className="sod29-quick-inspect-headline"><span>{methodTitle}</span><b className="sod29-quick-inspect-value">{active.value}</b></div> : null}
          <p className={verified ? "sod29-quick-inspect-status is-verified" : "sod29-quick-inspect-status"} role="status">
            {verified ? "אומת במנוע הקנוני"
              : canonical.status === "loading" ? "תצוגה מקדימה מקומית · מאמת…"
              : canonical.status === "error" ? "תצוגה מקדימה מקומית · לא אומת"
              : "תצוגה מקדימה מקומית · לא אומת"}
          </p>
          {canonical.status === "error" ? (
            <div className="sod29-quick-inspect-error" role="alert">
              <span>{canonical.error}</span>
              <button type="button" onClick={() => setAttempt((n) => n + 1)}>נסה שוב</button>
            </div>
          ) : null}
          <ul className="sod29-quick-inspect-methods" aria-label="שיטות">
            {rows.map((row) => (
              <li key={row.key}>
                <button type="button" aria-pressed={row.key === activeKey} onClick={() => setPickedKey(row.key)}>
                  <span>{row.label}</span><b>{row.value}</b>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {root != null ? (
        <button type="button" className="sod29-quick-inspect-open" onClick={openFull}>לדף המספר המלא · {root}</button>
      ) : null}
    </div>
  );
}
