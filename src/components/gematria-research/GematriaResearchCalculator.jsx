import React, { useState, useCallback, useRef } from "react";
import { supabase } from "../../lib/supabase.js";
import { entityFromPhrase } from "../../lib/research/entity.js";
import { useNumHref } from "../../lib/numHrefCtx.js";
import QuickActions from "../QuickActions.jsx";
import GematriaTraceView from "./GematriaTraceView.jsx";
import { G } from "./theme.js";

// GEMATRIA_RESEARCH_CALCULATOR_V1 — Projection over the canonical engine only.
// Every numeric value shown here comes from a live RPC (gematria_method_trace, which itself
// equals fn_method_value). This component NEVER imports or calls anything from
// src/lib/gematria.js -- the browser does not calculate Gematria.
//
// Method list is read live from the gematria_methods registry (active+in_engine only) -- the
// active-method count is never hardcoded, so a future registry change is reflected automatically.

async function fetchActiveMethods() {
  const { data, error } = await supabase
    .from("gematria_methods")
    .select("method_key, display_label, category, mathematical_family, execution_kind, sort_order")
    .eq("active", true)
    .eq("in_engine", true)
    .order("sort_order", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data || [];
}

async function fetchTrace(methodKey, phrase) {
  const { data, error } = await supabase.rpc("gematria_method_trace", { p_method_key: methodKey, p_phrase: phrase });
  if (error) throw error;
  return data;
}

export default function GematriaResearchCalculator() {
  const numHref = useNumHref();
  const [q, setQ] = useState("");
  const [phrase, setPhrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [results, setResults] = useState([]); // [{method_key, display_label, category, mathematical_family, trace}]
  const [openMethod, setOpenMethod] = useState(null); // {display_label, trace}
  const methodsCache = useRef(null);

  const calculate = useCallback(async () => {
    const text = q.trim();
    if (!text) return;
    setLoading(true);
    setErr(null);
    setOpenMethod(null);
    try {
      const methods = methodsCache.current || (methodsCache.current = await fetchActiveMethods());
      const traces = await Promise.all(methods.map(m => fetchTrace(m.method_key, text).catch(e => ({ status: "error", error: String(e?.message || e) }))));
      setResults(methods.map((m, i) => ({ ...m, trace: traces[i] })));
      setPhrase(text);
    } catch (e) {
      setErr(e?.message || String(e));
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [q]);

  const onKeyDown = e => { if (e.key === "Enter") calculate(); };

  const validResults = results.filter(r => r.trace && r.trace.status !== "error");
  const ragilResult = validResults.find(r => r.method_key === "רגיל");
  const ragilValue = ragilResult?.trace?.result ?? null;

  // Optional trivial equal-result grouping -- purely a client-side grouping of values the server
  // already returned, never a recomputation.
  const valueGroups = React.useMemo(() => {
    const byValue = new Map();
    for (const r of validResults) {
      const v = r.trace?.result;
      if (v == null) continue;
      if (!byValue.has(v)) byValue.set(v, []);
      byValue.get(v).push(r.display_label);
    }
    return [...byValue.entries()].filter(([, labels]) => labels.length > 1);
  }, [validResults]);

  return (
    <div dir="rtl" style={{ maxWidth: 900, margin: "0 auto", fontFamily: G.body, color: G.ink }}>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ color: G.gold, fontFamily: G.heading, fontSize: 12, letterSpacing: 2, textTransform: "uppercase" }}>מעבדת גימטריה</div>
        <h1 style={{ margin: "4px 0 6px", fontFamily: G.heading, fontSize: "clamp(24px,4.5vw,34px)", fontWeight: 800, color: G.ink }}>חשב, פתח והבן כל שיטה</h1>
      </div>

      <div style={{ background: G.panel, border: `1px solid ${G.border}`, borderRadius: 16, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKeyDown}
            placeholder="הקלד מילה, שם או ביטוי" dir="rtl"
            style={{
              flex: "1 1 220px", boxSizing: "border-box", background: G.bg, border: `1px solid ${G.border}`,
              borderRadius: 10, padding: "12px 14px", fontSize: 18, fontWeight: 700, color: G.ink, outline: "none", textAlign: "center",
            }}
          />
          <button onClick={calculate} disabled={loading || !q.trim()} style={{
            cursor: loading ? "wait" : "pointer", background: G.accent, color: "#fff", border: "none",
            borderRadius: 10, padding: "12px 26px", fontFamily: G.heading, fontSize: 15, fontWeight: 800,
            opacity: loading || !q.trim() ? 0.6 : 1,
          }}>{loading ? "מחשב…" : "חשב"}</button>
        </div>

        {err && <div style={{ marginTop: 10, color: G.bad, fontSize: 13 }}>שגיאה בטעינת השיטות: {err}</div>}

        {phrase && !loading && !err && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 16, paddingTop: 12, borderTop: `1px solid ${G.border}` }}>
              <span style={{ color: G.sub, fontSize: 13 }}>קלט: <b style={{ color: G.ink }}>{phrase}</b></span>
              <span style={{ flex: 1 }} />
              <span style={{ color: G.accent, fontFamily: G.heading, fontSize: 12.5, fontWeight: 700 }}>
                {validResults.length} שיטות פעילות
              </span>
            </div>

            {valueGroups.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
                {valueGroups.map(([v, labels]) => (
                  <div key={v} style={{ background: G.goldSoft, border: `1px solid ${G.gold}`, borderRadius: 8, padding: "6px 10px", fontSize: 12.5, color: "#5b4108" }}>
                    ✦ {labels.join(" · ")} — כולן שוות ל-<b style={{ fontFamily: G.mono }}>{v}</b>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8, marginTop: 14 }}>
              {results.map(r => {
                const ok = r.trace && r.trace.status !== "error";
                return (
                  <div key={r.method_key} style={{
                    background: G.bg, border: `1px solid ${G.border}`, borderRadius: 12, padding: "10px 8px",
                    textAlign: "center", display: "flex", flexDirection: "column", gap: 4,
                  }}>
                    <div style={{ fontFamily: G.heading, fontSize: 11.5, fontWeight: 700, color: G.sub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={r.display_label}>
                      {r.display_label}
                    </div>
                    <div style={{ fontFamily: G.mono, fontSize: 20, fontWeight: 800, color: ok ? G.ink : G.bad }}>
                      {ok ? r.trace.result : "—"}
                    </div>
                    {ok && (
                      <div style={{ fontSize: 10, color: G.good }} title="מאומת מול המנוע הקנוני">✓ מאומת במנוע</div>
                    )}
                    <button
                      onClick={() => ok && setOpenMethod({ display_label: r.display_label, trace: r.trace })}
                      disabled={!ok}
                      style={{
                        marginTop: 4, cursor: ok ? "pointer" : "default", background: "none",
                        border: `1px solid ${ok ? G.accent : G.border}`, color: ok ? G.accent : G.sub,
                        borderRadius: 999, fontFamily: G.heading, fontSize: 11, fontWeight: 700, padding: "4px 10px",
                      }}>פתח שיטה</button>
                  </div>
                );
              })}
            </div>

            {ragilValue != null && (
              <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${G.border}`, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <a href={numHref(ragilValue)} style={{
                  textDecoration: "none", background: "linear-gradient(135deg,#e9c84a,#9a7818)", color: "#1a0e00",
                  fontFamily: G.heading, fontSize: 14.5, fontWeight: 800, padding: "10px 22px", borderRadius: 999,
                }}>חקור את המספר {ragilValue} ←</a>
                <QuickActions entity={entityFromPhrase(phrase, ragilValue)} hideAnalyze />
              </div>
            )}
          </>
        )}

        {!phrase && !loading && (
          <div style={{ textAlign: "center", marginTop: 16, color: G.sub, fontSize: 13.5 }}>
            הקלידו ביטוי ולחצו חשב — כל השיטות הפעילות יחושבו דרך המנוע הקנוני, וכל שיטה תיפתח להסבר מלא.
          </div>
        )}
      </div>

      {openMethod && (
        <GematriaTraceView
          methodLabel={openMethod.display_label}
          rawTrace={openMethod.trace}
          onClose={() => setOpenMethod(null)}
        />
      )}
    </div>
  );
}
