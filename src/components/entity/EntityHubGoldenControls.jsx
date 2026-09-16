import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AskRaziel from "../AskRaziel.jsx";
import WatchButton from "../WatchButton.jsx";
import PulseRing, { pulseFromCounts } from "../PulseRing.jsx";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import { supabase } from "../../lib/supabase.js";
import { fetchGematriaMethodTrace } from "../../lib/research/gematriaTrace.js";
import { numberAnchorToUniversalFinding } from "../../lib/research/numberAnchorFinding.js";

const C = {
  ink: "var(--eh-ink)", muted: "var(--eh-muted)", line: "var(--eh-line)",
  paper: "var(--eh-panel)", soft: "var(--eh-soft)", blue: "var(--eh-blue)",
  blue2: "var(--eh-bluebg)", onBlue: "var(--eh-onblue)", gold: "var(--eh-gold)",
  gold2: "var(--eh-goldbg)", green: "var(--eh-green)", green2: "var(--eh-greenbg)",
};

const card = { background: C.paper, border: `1px solid ${C.line}`, borderRadius: 20, boxShadow: "0 8px 28px rgba(0,0,0,.05)" };
const chip = (active = false) => ({
  border: `1px solid ${active ? C.blue : C.line}`,
  background: active ? C.blue : C.paper,
  color: active ? C.onBlue : C.ink,
  borderRadius: 999,
  padding: "8px 12px",
  fontWeight: 850,
  cursor: "pointer",
  whiteSpace: "nowrap",
});

function phraseOf(item) {
  if (typeof item === "string") return item;
  return item?.phrase || item?.label || "";
}

export default function EntityHubGoldenControls({ data, relationGroups = [], onLeave }) {
  const navigate = useNavigate();
  const { addToResearch } = useResearch();
  const identity = data?.identity || {};
  const number = Number(identity.label);
  const surface = data?.surface || {};
  const families = Array.isArray(data?.gematria?.families) ? data.gematria.families : [];
  const topics = Array.isArray(data?.topics?.rows) ? data.topics.rows : [];
  const research = Array.isArray(data?.research?.rows) ? data.research.rows : [];
  const zero = data?.zeroScale || null;
  const zeroChain = Array.isArray(zero?.scale_chain) ? zero.scale_chain : [];
  const [resolver, setResolver] = useState("");
  const [activeMethod, setActiveMethod] = useState("");
  const [activeExpression, setActiveExpression] = useState("");
  const [traceState, setTraceState] = useState({ loading: false, finding: null, error: null });
  const [anchorFinding, setAnchorFinding] = useState(null);

  const regular = useMemo(() => families.find(f => f.method === "רגיל") || families[0] || null, [families]);

  useEffect(() => {
    if (!families.length) return;
    if (!activeMethod || !families.some(f => f.method === activeMethod)) {
      const method = regular?.method || families[0].method;
      setActiveMethod(method);
      const first = phraseOf((regular?.phrases || families[0].phrases || [])[0]);
      if (first) setActiveExpression(first);
    }
  }, [families, regular, activeMethod]);

  useEffect(() => {
    let alive = true;
    if (!Number.isSafeInteger(number)) { setAnchorFinding(null); return undefined; }
    supabase.from("number_anchors")
      .select("value,category,fact,hint,created_at,updated_at")
      .eq("value", number)
      .maybeSingle()
      .then(({ data: row, error }) => {
        if (!alive) return;
        if (error || !row) setAnchorFinding(null);
        else setAnchorFinding(numberAnchorToUniversalFinding(row));
      })
      .catch(() => alive && setAnchorFinding(null));
    return () => { alive = false; };
  }, [number]);

  useEffect(() => {
    let alive = true;
    const phrase = String(activeExpression || "").trim();
    const method = String(activeMethod || "").trim();
    if (!phrase || !method) { setTraceState({ loading: false, finding: null, error: null }); return undefined; }
    setTraceState({ loading: true, finding: null, error: null });
    fetchGematriaMethodTrace(method, phrase)
      .then(finding => alive && setTraceState({ loading: false, finding, error: null }))
      .catch(error => alive && setTraceState({ loading: false, finding: null, error }));
    return () => { alive = false; };
  }, [activeMethod, activeExpression]);

  const activeFamily = families.find(f => f.method === activeMethod) || regular || null;
  const suggestions = (activeFamily?.phrases || []).slice(0, 10).map(phraseOf).filter(Boolean);
  const methodLabel = activeFamily?.registry?.display_label || activeMethod || "";
  const traceValue = traceState.finding?.subject?.value;
  const trace = traceState.finding?.projection?.dimensions?.trace || null;
  const anchor = anchorFinding?.projection?.dimensions?.legacyNumberAnchor || null;
  const leading = topics[0] || null;
  const pulse = pulseFromCounts({
    posts: surface.postsCount ?? surface.posts?.length ?? 0,
    galleries: surface.galleriesCount ?? surface.galleries?.length ?? 0,
    words: surface.phrasesCount ?? surface.phrases?.length ?? 0,
    events: Array.isArray(surface.events) ? surface.events.length : 0,
    ai: Array.isArray(surface.insights) ? surface.insights.length : 0,
    comm: Array.isArray(surface.comments) ? surface.comments.length : 0,
  });

  const entity = useMemo(() => ({
    id: `number:${identity.label}`,
    type: "number",
    ref: String(identity.label || ""),
    title: String(identity.label || ""),
    link: `/entity-hub-preview/number/${encodeURIComponent(identity.label || "")}`,
    metadata: { source: "entity-hub-golden", node_id: identity.nodeId || null },
  }), [identity]);

  const resolverSubmit = (e) => {
    e.preventDefault();
    const q = resolver.trim();
    if (!q) return;
    if (/^\d+$/.test(q)) navigate(`/entity-hub-preview/number/${encodeURIComponent(q)}`);
    else {
      setActiveExpression(q);
      if (!activeMethod && families[0]?.method) setActiveMethod(families[0].method);
    }
  };

  const razielFacts = [];
  if (Number.isFinite(traceValue)) razielFacts.push({ label: `${activeExpression} · ${methodLabel}`, value: traceValue });
  if (zero?.applicable) razielFacts.push({ label: "שורש סדרת האפס", value: zero.core_root });
  const razielContext = [
    `שורש הדף: ${identity.label}`,
    activeExpression ? `ביטוי פעיל: ${activeExpression}` : null,
    activeMethod ? `שיטה פעילה: ${methodLabel}` : null,
    leading?.title ? `התכנסות מובילה בתצוגה: ${leading.title}` : null,
    anchor?.fact ? `עוגן מחקר נוכחי: ${anchor.fact}` : null,
  ].filter(Boolean).join(" · ");

  return <div style={{ marginTop: 0 }}>
    <section style={{ ...card, padding: 20 }}>
      <form onSubmit={resolverSubmit} style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
        <input value={resolver} onChange={e => setResolver(e.target.value)} placeholder="מספר או ביטוי"
          style={{ flex: "1 1 260px", minHeight: 46, border: `1px solid ${C.line}`, background: C.soft, color: C.ink, borderRadius: 14, padding: "0 14px", font: "inherit" }} />
        <button type="submit" style={{ ...chip(true), minHeight: 46, paddingInline: 18 }}>פתח / בדוק</button>
      </form>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 18, alignItems: "center", marginTop: 20 }}>
        <div>
          <div style={{ color: C.gold, fontSize: 11, fontWeight: 900, letterSpacing: 1.6 }}>NUMBER / EXPRESSION HUB</div>
          <h1 style={{ margin: "4px 0 6px", fontSize: "clamp(54px,10vw,96px)", lineHeight: .95 }}>{identity.label}</h1>
          {anchor ? <div style={{ maxWidth: 760 }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{anchor.fact}</div>
            {anchor.hint ? <div style={{ color: C.muted, lineHeight: 1.7, marginTop: 4 }}>{anchor.hint}</div> : null}
            <div style={{ color: C.muted, fontSize: 11.5, marginTop: 5 }}>עוגן מחקר נוכחי · משתנה עם המחקר · אינו קידום אוטומטי לאמת קנונית</div>
          </div> : <div style={{ color: C.muted }}>אין כרגע Anchor Profile ציבורי למספר הזה.</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            <button onClick={() => addToResearch?.(entity)} style={chip(false)}>＋ הוסף למחקר</button>
            <WatchButton topic={`number:${identity.label}`} source="entity_hub_golden" compact ghost label={`עקוב אחרי ${identity.label}`} explainer="" />
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <PulseRing value={pulse} size={92} label={false} />
          <div style={{ color: C.muted, fontSize: 11.5, marginTop: 4 }}>דופק פעילות · לא מדד אמת</div>
        </div>
      </div>
    </section>

    <section style={{ ...card, padding: 20, marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <div style={{ color: C.gold, fontSize: 11, fontWeight: 900, letterSpacing: 1.5 }}>SMART CORE</div>
          <h2 style={{ margin: "4px 0 0", fontSize: 24 }}>ביטוי פעיל · שיטה · תוצאה</h2>
        </div>
        {Number.isFinite(traceValue) ? <div style={{ fontSize: 28, fontWeight: 950, color: traceValue === number ? C.green : C.ink }}>
          {traceValue}{traceValue === number ? " · פוגש את המספר" : ""}
        </div> : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, marginTop: 14 }}>
        <input value={activeExpression} onChange={e => setActiveExpression(e.target.value)} placeholder="הקלד ביטוי למחקר"
          style={{ minHeight: 50, border: `1px solid ${C.line}`, background: C.soft, color: C.ink, borderRadius: 14, padding: "0 14px", font: "inherit", fontSize: 17, fontWeight: 750 }} />
        <div style={{ minWidth: 150, border: `1px solid ${C.line}`, borderRadius: 14, padding: "10px 14px", background: C.paper }}>
          <div style={{ color: C.muted, fontSize: 10.5 }}>שיטה פעילה</div>
          <b>{methodLabel || "—"}</b>
        </div>
      </div>

      <div style={{ display: "flex", gap: 7, overflowX: "auto", padding: "12px 0 4px" }}>
        {families.map(f => <button key={f.method} onClick={() => {
          setActiveMethod(f.method);
          const currentExists = (f.phrases || []).map(phraseOf).includes(activeExpression);
          if (!currentExists) {
            const first = phraseOf((f.phrases || [])[0]);
            if (first) setActiveExpression(first);
          }
        }} style={chip(activeMethod === f.method)}>
          {f.registry?.display_label || f.method} · {f.count ?? f.phrases?.length ?? 0}
        </button>)}
      </div>

      {suggestions.length ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
        {suggestions.map((p, i) => <button key={`${p}-${i}`} onClick={() => setActiveExpression(p)}
          style={{ border: `1px solid ${p === activeExpression ? C.gold : C.line}`, background: p === activeExpression ? C.gold2 : C.soft, color: C.ink, borderRadius: 999, padding: "6px 9px", cursor: "pointer" }}>{p}</button>)}
      </div> : null}

      <div style={{ marginTop: 14, borderTop: `1px solid ${C.line}`, paddingTop: 13 }}>
        {traceState.loading ? <div style={{ color: C.muted }}>מחשב דרך המנוע הקנוני…</div> : null}
        {traceState.error ? <div style={{ color: "#9b3d32" }}>Trace אינו זמין כרגע.</div> : null}
        {!traceState.loading && !traceState.error && traceState.finding ? <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <b>Trace · {activeExpression}</b>
            <span style={{ color: C.muted }}>{methodLabel}</span>
            <span style={{ border: `1px solid ${C.line}`, background: C.soft, borderRadius: 999, padding: "4px 8px", fontWeight: 900 }}>= {traceValue}</span>
          </div>
          {Array.isArray(trace?.steps) && trace.steps.length ? <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.7, marginTop: 7 }}>
            {trace.steps.slice(0, 4).map((s, i) => <div key={i}>• {typeof s === "string" ? s : (s.word || s.label || s.step || JSON.stringify(s).slice(0, 120))}</div>)}
          </div> : null}
          <div style={{ color: C.muted, fontSize: 11.5, marginTop: 6 }}>עובדת חישוב מהמנוע · לא פרשנות.</div>
        </div> : null}
      </div>
    </section>

    <section style={{ ...card, padding: 20, marginTop: 16 }}>
      <div style={{ color: C.gold, fontSize: 11, fontWeight: 900, letterSpacing: 1.5, marginBottom: 9 }}>RAZIEL · SAME CONTEXT</div>
      <AskRaziel
        subject={activeExpression || String(identity.label || "")}
        facts={razielFacts}
        context={razielContext}
        greeting={`אני קורא את ${identity.label} דרך הביטוי והשיטה שבחרת עכשיו.`}
        title={`רזיאל · ${identity.label}`}
        subtitle="עובדות מהמנוע תחילה · אחר כך פרשנות והמשך מחקר"
        metatron
        cta={false}
      />
    </section>

    <section style={{ ...card, padding: 20, marginTop: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
        <div>
          <div style={{ color: C.gold, fontSize: 11, fontWeight: 900, letterSpacing: 1.4 }}>ZERO SCALE</div>
          <h3 style={{ margin: "4px 0 8px", fontSize: 20 }}>ניווט מספרי עליון</h3>
          {zero?.applicable ? <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {zeroChain.slice(0, 6).map(n => <Link key={n} to={`/entity-hub-preview/number/${n}`} onClick={() => onLeave?.("number", { entityId: String(n), entityType: "number" })}
              style={{ textDecoration: "none", border: `1px solid ${n === number ? C.blue : C.line}`, background: n === number ? C.blue2 : C.soft, color: C.ink, borderRadius: 11, padding: "8px 10px", fontWeight: 900 }}>{n}</Link>)}
          </div> : <div style={{ color: C.muted }}>לא ישים לערך הזה.</div>}
        </div>

        <div>
          <div style={{ color: C.gold, fontSize: 11, fontWeight: 900, letterSpacing: 1.4 }}>LEADING CONVERGENCE</div>
          <h3 style={{ margin: "4px 0 8px", fontSize: 20 }}>ההתכנסות המובילה כרגע</h3>
          {leading ? <div>
            <b style={{ fontSize: 17 }}>{leading.title || leading.slug}</b>
            {leading.subtitle ? <div style={{ color: C.muted, lineHeight: 1.65, marginTop: 4 }}>{leading.subtitle}</div> : null}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 9 }}>
              {leading.meter_score != null ? <span style={{ border: `1px solid ${C.line}`, borderRadius: 999, padding: "5px 8px" }}>signal {leading.meter_score}</span> : null}
              <Link to={`/topic/${encodeURIComponent(leading.slug)}`} onClick={() => onLeave?.("convergence", { entityId: leading.id, entityType: "convergence" })}
                style={{ textDecoration: "none", color: C.blue, fontWeight: 850 }}>פתח Explain-Why ←</Link>
            </div>
          </div> : <div style={{ color: C.muted }}>אין כרגע התכנסות מאושרת להצגה.</div>}
        </div>
      </div>
    </section>
  </div>;
}
