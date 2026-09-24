import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { fetchGematriaMethodStates } from "../lib/research/gematriaMethodRegistry.js";
import { fetchNumberMethodProfile } from "../lib/research/numberCoreProjection.js";
import { fetchGematriaMethodTrace } from "../lib/research/gematriaTrace.js";
import { methodMechanicalDefinition } from "../lib/research/beitMidrashMethodDefinition.js";

// 📐 ספריית שיטות הגימטריה — Registry/Engine projection (GEMATRIA_METHOD_EXPLANATION_PROJECTION_V1).
// זהו Reader בלבד מעל fetchGematriaMethodStates + fetchNumberMethodProfile + fetchGematriaMethodTrace
// (canonical_methods_registry_law + engine_governance_registry_authority_law). הרכיב אינו Registry
// שני ואינו מחשב גימטריה בעצמו — אפס נוסחה מקומית. שיטות רשומות-לא-פעילות מוצגות בנפרד, בלי ערכים מומצאים.

// מיפויים תיאוריים-בלבד (לא פרשנות) — הופכים שדות טכניים לעברית קריאה מבלי להמציא משמעות.
const CATEGORY_LABEL = { base: "יסוד", composite: "מורכבת", depth: "עומק", context: "הקשר" };
const EXECUTION_KIND_LABEL = {
  sql_function: "פונקציית מנוע",
  composite_engine: "הרכבה של שיטות (מנוע)",
  context_activated: "מופעלת בהקשר",
  unimplemented: "טרם מומשה במנוע",
};
const NOT_SCANNABLE_REASON_LABEL = {
  scannable_flag_false_human_gate: "לא נסרקת כרגע (שער אנושי)",
  not_active_human_gate: "לא פעילה כרגע (שער אנושי)",
};

function safeDecode(v) {
  if (!v) return "";
  try { return decodeURIComponent(v).trim(); } catch { return String(v).trim(); }
}

function TraceValue({ value, depth = 0 }) {
  if (value == null) return <span style={{ opacity: 0.6 }}>—</span>;
  if (Array.isArray(value)) {
    if (!value.length) return <span style={{ opacity: 0.6 }}>—</span>;
    return (
      <ol style={{ margin: "4px 0", paddingInlineStart: 18 }}>
        {value.map((v, i) => (
          <li key={i} style={{ marginBottom: 3 }}><TraceValue value={v} depth={depth + 1} /></li>
        ))}
      </ol>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (!entries.length) return <span style={{ opacity: 0.6 }}>—</span>;
    return (
      <div style={{ display: "grid", gap: 2, marginInlineStart: depth ? 10 : 0 }}>
        {entries.map(([k, v]) => (
          <div key={k}><b style={{ opacity: 0.75 }}>{k}:</b> <TraceValue value={v} depth={depth + 1} /></div>
        ))}
      </div>
    );
  }
  return <span>{String(value)}</span>;
}

function MethodCard({ row, sampleExpression, profileByKey, labelByKey, palette: L, highlighted, cardRef, trace, onExplain }) {
  const profileRow = profileByKey.get(row.method_key) || null;
  const hasComputed = profileRow && Number.isFinite(profileRow.computedValue);
  const derivedFrom = Array.isArray(row.derived_from) ? row.derived_from : (Array.isArray(profileRow?.derivedFrom) ? profileRow.derivedFrom : []);
  const operator = row.operator || profileRow?.operator || null;
  const definition = methodMechanicalDefinition(row, profileRow || {}, labelByKey);
  const scannable = row.scannable !== false;
  const executionKindLabel = EXECUTION_KIND_LABEL[row.execution_kind] || row.execution_kind || null;

  const traceState = trace; // undefined | 'loading' | 'error' | Finding-object

  return (
    <div
      id={`bm-method-${row.method_key}`}
      ref={cardRef}
      style={{
        background: L.panel,
        border: `1px solid ${highlighted ? L.gold : L.line}`,
        borderRadius: 14, padding: "16px 18px",
        boxShadow: highlighted ? `0 0 0 3px ${L.gold}, 0 8px 30px rgba(154,120,24,0.28)` : "0 1px 3px rgba(0,0,0,0.04)",
        transition: "box-shadow .4s",
        scrollMarginTop: 80,
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        <h3 style={{ color: L.ink, fontFamily: F.regal, fontSize: 20, fontWeight: 700, margin: 0 }}>{row.display_label || row.method_key}</h3>
        {row.display_label && row.display_label !== row.method_key && (
          <span style={{ color: L.sub, fontFamily: F.mono, fontSize: 11.5 }}>({row.method_key})</span>
        )}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {row.category && (
          <span style={{ fontFamily: F.heading, fontSize: 10.5, fontWeight: 700, padding: "2px 9px", borderRadius: 999, border: `1px solid ${L.line}`, color: L.sub }}>
            {CATEGORY_LABEL[row.category] || row.category}
          </span>
        )}
        {executionKindLabel && (
          <span style={{ fontFamily: F.heading, fontSize: 10.5, fontWeight: 700, padding: "2px 9px", borderRadius: 999, border: `1px solid ${L.blueLine}`, color: L.blue, background: L.blueBg }}>
            {executionKindLabel}
          </span>
        )}
        {!scannable && (
          <span title={row.not_scannable_reason || ""} style={{ fontFamily: F.heading, fontSize: 10.5, fontWeight: 700, padding: "2px 9px", borderRadius: 999, border: "1px solid #e0b040", color: "#8a6410", background: "#fff6df" }}>
            ⚠️ {NOT_SCANNABLE_REASON_LABEL[row.not_scannable_reason] || row.not_scannable_reason || "לא נסרקת כרגע"}
          </span>
        )}
      </div>

      <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
        <p style={{ color: L.sub, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.75, margin: 0 }}>
          <b style={{ color: L.goldDeep }}>מה השיטה עושה: </b>{definition.what}
        </p>
        {definition.structure && (
          <p style={{ color: L.sub, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.75, margin: 0 }}>
            <b style={{ color: L.goldDeep }}>איך היא בנויה: </b>{definition.structure}
          </p>
        )}
        {definition.dependencies.length > 0 && (
          <div style={{ display: "grid", gap: 4 }}>
            <b style={{ color: L.goldDeep, fontFamily: F.body, fontSize: 13 }}>מתי צריך להיזהר מספירה כפולה:</b>
            {definition.dependencies.map((item, index) => (
              <span key={index} style={{ color: L.sub, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.65 }}>• {item}</span>
            ))}
          </div>
        )}
        {definition.interpretation && (
          <p style={{ color: L.sub, fontFamily: F.body, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
            <b style={{ color: L.goldDeep }}>רעיון מחקרי: </b>{definition.interpretation}
          </p>
        )}
      </div>

      <div style={{ color: L.sub, fontFamily: F.heading, fontSize: 11, margin: "2px 0 6px" }}>דוגמה חיה · {sampleExpression}</div>
      {hasComputed ? (
        <div style={{ background: L.soft, border: `1px solid ${L.line}`, borderRadius: 10, padding: "8px 12px", fontFamily: F.mono, fontSize: 16, fontWeight: 700, color: L.goldDeep, display: "inline-block" }}>
          {sampleExpression} = {profileRow.computedValue}
        </div>
      ) : (
        <div style={{ color: L.sub, fontFamily: F.body, fontSize: 13, opacity: 0.75 }}>אין דוגמה חיה זמינה לשיטה זו כרגע.</div>
      )}

      <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${L.line}` }}>
        <button
          onClick={() => onExplain(row.method_key)}
          disabled={traceState === "loading"}
          style={{
            cursor: traceState === "loading" ? "wait" : "pointer", background: "none", border: `1px solid ${L.gold}`,
            color: L.goldDeep, borderRadius: 999, fontFamily: F.heading, fontSize: 12, fontWeight: 700, padding: "5px 13px",
          }}>
          {traceState === "loading" ? "טוען עקבה…" : "🔍 הצג עקבת חישוב מהמנוע"}
        </button>
        {traceState && traceState !== "loading" && (
          <div style={{ marginTop: 10, background: L.soft, border: `1px solid ${L.line}`, borderRadius: 10, padding: "10px 12px", fontFamily: F.mono, fontSize: 12.5, lineHeight: 1.7, color: L.ink }}>
            {traceState === "error" || !traceState?.projection?.dimensions?.trace ? (
              <span style={{ color: L.sub }}>לא ניתן להציג עקבה חיה לשיטה זו כרגע.</span>
            ) : (
              <TraceValue value={traceState.projection.dimensions.trace} />
            )}
          </div>
        )}
      </div>

      <Link to={`/research?tool=midrash&tab=calc&w=${encodeURIComponent(sampleExpression)}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 11, color: L.goldDeep, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}>
        🧮 נסה את השיטה במחשבון ←
      </Link>
    </div>
  );
}

function UnavailableMethodRow({ row, palette: L }) {
  const reason = NOT_SCANNABLE_REASON_LABEL[row.not_scannable_reason]
    || (row.execution_kind === "unimplemented" ? "טרם מומשה במנוע" : null)
    || row.not_scannable_reason
    || "רשומה, לא פעילה כרגע";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: L.soft, border: `1px solid ${L.line}`, borderRadius: 10, padding: "8px 12px", opacity: 0.8 }}>
      <span style={{ color: L.sub, fontFamily: F.regal, fontSize: 14.5, fontWeight: 700 }}>{row.display_label || row.method_key}</span>
      {row.category && <span style={{ color: L.sub, fontFamily: F.heading, fontSize: 10.5 }}>{CATEGORY_LABEL[row.category] || row.category}</span>}
      <span style={{ marginInlineStart: "auto", color: L.sub, fontFamily: F.body, fontSize: 12 }}>{reason}</span>
    </div>
  );
}

export default function BeitMidrashMethodsRegistry({ sampleExpression = "חכמה", focusMethodKey = null, palette }) {
  const L = palette;
  const [methodStates, setMethodStates] = useState(undefined); // undefined=loading, null=error, array=loaded
  const [profile, setProfile] = useState([]);
  const [traces, setTraces] = useState({});
  const [highlightKey, setHighlightKey] = useState(null);
  const [focusNotFound, setFocusNotFound] = useState(false);
  const cardRefs = useRef({});

  useEffect(() => {
    let live = true;
    fetchGematriaMethodStates()
      .then(rows => { if (live) setMethodStates(Array.isArray(rows) ? rows : []); })
      .catch(() => { if (live) setMethodStates(null); });
    fetchNumberMethodProfile(sampleExpression)
      .then(rows => { if (live) setProfile(Array.isArray(rows) ? rows : []); })
      .catch(() => { if (live) setProfile([]); });
    return () => { live = false; };
  }, [sampleExpression]);

  useEffect(() => {
    if (!focusMethodKey || !Array.isArray(methodStates)) return;
    const decoded = safeDecode(focusMethodKey);
    if (!decoded) return;
    const resolved = methodStates.find(r => r.method_key === decoded)
      || methodStates.find(r => (r.display_label || "").trim() === decoded)
      || null;
    if (!resolved) { setFocusNotFound(true); return; }
    setFocusNotFound(false);
    setHighlightKey(resolved.method_key);
    const t = setTimeout(() => cardRefs.current[resolved.method_key]?.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
    const t2 = setTimeout(() => setHighlightKey(null), 3200);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [focusMethodKey, methodStates]);

  async function onExplain(methodKey) {
    setTraces(prev => (prev[methodKey] && prev[methodKey] !== "error") ? prev : { ...prev, [methodKey]: "loading" });
    if (traces[methodKey] && traces[methodKey] !== "error") return; // כבר טעון — לא מרעננים מיותר
    try {
      const finding = await fetchGematriaMethodTrace(methodKey, sampleExpression);
      setTraces(prev => ({ ...prev, [methodKey]: finding || "error" }));
    } catch {
      setTraces(prev => ({ ...prev, [methodKey]: "error" }));
    }
  }

  if (methodStates === undefined) return <div style={{ color: L.sub, padding: 16 }}>טוען שיטות מהרישום…</div>;
  if (methodStates === null) return <div style={{ color: L.sub, padding: 16 }}>לא ניתן לטעון כרגע את רשימת השיטות מהרישום החי.</div>;

  const profileByKey = new Map(profile.map(row => [row.methodKey, row]));
  const labelByKey = new Map(methodStates.map(row => [row.method_key, row.display_label || row.method_key]));
  const primary = methodStates.filter(r => r.active === true)
    .sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999) || String(a.method_key).localeCompare(String(b.method_key), "he"));
  const secondary = methodStates.filter(r => r.registered === true && r.active !== true)
    .sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999) || String(a.method_key).localeCompare(String(b.method_key), "he"));

  return (
    <div>
      {focusNotFound && (
        <div style={{ background: "#fff6df", border: "1px solid #e0b040", color: "#8a6410", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontFamily: F.body, fontSize: 13.5 }}>
          השיטה המבוקשת לא נמצאה ברישום החי.
        </div>
      )}
      <p style={{ color: L.sub, fontFamily: F.body, fontSize: 15, lineHeight: 1.9, margin: "0 0 20px", maxWidth: 660 }}>
        {primary.length} שיטות חישוב פעילות ברישום, עם דוגמה חיה (על המילה <b style={{ color: L.goldDeep }}>{sampleExpression}</b>) ועקבת חישוב מהמנוע לפי דרישה.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {primary.map(row => (
          <MethodCard
            key={row.method_key}
            row={row}
            sampleExpression={sampleExpression}
            profileByKey={profileByKey}
            labelByKey={labelByKey}
            palette={L}
            highlighted={highlightKey === row.method_key}
            cardRef={el => { cardRefs.current[row.method_key] = el; }}
            trace={traces[row.method_key]}
            onExplain={onExplain}
          />
        ))}
      </div>

      {secondary.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ color: L.gold, fontFamily: F.heading, fontSize: 11, letterSpacing: 1, fontWeight: 700, marginBottom: 10 }}>
            רשומות ברישום · לא פעילות כרגע ({secondary.length})
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {secondary.map(row => <UnavailableMethodRow key={row.method_key} row={row} palette={L} />)}
          </div>
        </div>
      )}
    </div>
  );
}