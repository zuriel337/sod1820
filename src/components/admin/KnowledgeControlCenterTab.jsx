import React, { useEffect, useMemo, useState } from "react";
import { F } from "../../theme.js";
import { supabase } from "../../lib/supabase.js";

const P = {
  gold: "var(--adm-gold)",
  goldBright: "var(--adm-goldBright)",
  goldDim: "var(--adm-goldDim)",
  muted: "var(--adm-muted)",
  surface: "var(--adm-surface2)",
  border: "var(--adm-border)",
  borderGold: "var(--adm-borderGold)",
};

const box = {
  background: P.surface,
  border: `1px solid ${P.border}`,
  borderRadius: 14,
  padding: "16px 18px",
  minWidth: 0,
};

const SOURCE_LABELS = {
  chiddush_submissions: "חידושים",
  research_contributions: "תרומות מחקר",
  research_objects: "אובייקטי מחקר",
  topic_cards: "כרטיסי נושא",
  convergences: "התכנסויות ישנות",
  relation_evidence: "ראיות לקשרים",
  nodes: "Nodes בעץ",
  edges: "Edges בעץ",
};

function n(v) {
  return Number(v || 0).toLocaleString("he-IL");
}

function StatusPill({ children, tone = "neutral" }) {
  const tones = {
    neutral: [P.muted, "transparent"],
    good: ["#65d487", "rgba(70,180,105,.10)"],
    warn: ["#e7c75c", "rgba(210,170,45,.10)"],
    danger: ["#ee8c8c", "rgba(190,70,70,.10)"],
    info: ["#9eb0ff", "rgba(100,120,220,.10)"],
  };
  const [color, background] = tones[tone] || tones.neutral;
  return <span style={{ color, background, border: `1px solid ${color}55`, borderRadius: 999, padding: "3px 9px", fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, whiteSpace: "nowrap" }}>{children}</span>;
}

async function loadSnapshot() {
  if (!supabase) throw new Error("Supabase client unavailable");
  const { data, error } = await supabase.rpc("admin_knowledge_control_snapshot");
  if (error) throw new Error(`admin snapshot: ${error.message}`);
  if (!data || typeof data !== "object") throw new Error("admin snapshot: empty response");
  return {
    totals: data.totals || {},
    reconciliation: data.reconciliation || {},
    recentRO: data.recentRO || [],
    recentTopics: data.recentTopics || [],
  };
}

function classifyRO(r) {
  if (r.status === "canonical" && r.promoted_node_id) return ["בעץ — Current Path", "good"];
  if (r.status === "canonical") return ["Canonical · לא מוקרן לעץ", "info"];
  if (r.status === "approved") return ["ממתין לצוריאל", "warn"];
  if (r.status === "candidate") return ["ממתין לבדיקה", "neutral"];
  if (r.status === "rejected") return ["נדחה / נשמר", "danger"];
  return [r.status || "לא ידוע", "neutral"];
}

export default function KnowledgeControlCenterTab() {
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const reload = () => {
    setState(s => ({ ...s, loading: true, error: "" }));
    loadSnapshot()
      .then(data => setState({ loading: false, error: "", data }))
      .catch(err => setState({ loading: false, error: err?.message || String(err), data: null }));
  };
  useEffect(() => { reload(); }, []);

  const kpis = useMemo(() => {
    const r = state.data?.reconciliation;
    if (!r) return [];
    return [
      { label: "Topic Cards ממופים", value: r.topicMapped, sub: `${n(r.topicUnmapped)} ללא node`, tone: r.topicUnmapped ? "warn" : "good" },
      { label: "Convergence Nodes", value: r.convergenceNodes, sub: `${n(r.convergenceEdges)} converges_on edges`, tone: "info" },
      { label: "Legacy relation edges", value: r.legacyRelationEdges, sub: `${n(r.relationWithDecision)} עם decision ledger`, tone: r.legacyRelationEdges ? "warn" : "good" },
      { label: "Research candidates", value: r.candidateRO, sub: `${n(r.approvedRO)} approved · ${n(r.canonicalRO)} canonical`, tone: "neutral" },
    ];
  }, [state.data]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={box}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ color: P.goldBright, fontFamily: F.regal, fontSize: 26, fontWeight: 800 }}>🌳 מרכז בקרת הידע · v0</div>
            <div style={{ color: P.muted, fontFamily: F.body, fontSize: 14, lineHeight: 1.7, marginTop: 5 }}>
              Projection קריאה בלבד מעל מקורות הידע הקיימים. הוא לא יוצר סטטוס אמת חדש, לא מקדם לקנוני ולא מכניס לעץ.
            </div>
          </div>
          <button onClick={reload} disabled={state.loading} style={{ cursor: state.loading ? "wait" : "pointer", border: `1px solid ${P.borderGold}`, color: P.goldBright, background: "transparent", borderRadius: 999, padding: "9px 16px", fontFamily: F.heading, fontWeight: 800 }}>
            {state.loading ? "טוען…" : "↻ רענן"}
          </button>
        </div>
      </div>

      {state.error && <div style={{ ...box, borderColor: "rgba(220,80,80,.45)", color: "#ee9a9a", fontFamily: F.body }}>שגיאת קריאה: {state.error}</div>}

      {state.data && <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
          {kpis.map(k => <div key={k.label} style={box}>
            <div style={{ color: P.goldDim, fontFamily: F.heading, fontSize: 12, fontWeight: 800 }}>{k.label}</div>
            <div style={{ color: P.goldBright, fontFamily: F.mono, fontSize: 28, fontWeight: 900, marginTop: 4 }}>{n(k.value)}</div>
            <div style={{ marginTop: 7 }}><StatusPill tone={k.tone}>{k.sub}</StatusPill></div>
          </div>)}
        </div>

        <div style={box}>
          <div style={{ color: P.goldBright, fontFamily: F.heading, fontSize: 16, fontWeight: 900, marginBottom: 12 }}>Inventory — מה נמצא במערכת</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 8 }}>
            {Object.entries(state.data.totals).map(([key, value]) => <div key={key} style={{ border: `1px solid ${P.border}`, borderRadius: 11, padding: "11px 12px" }}>
              <div style={{ color: P.muted, fontFamily: F.body, fontSize: 12.5 }}>{SOURCE_LABELS[key] || key}</div>
              <div style={{ color: P.goldBright, fontFamily: F.mono, fontSize: 22, fontWeight: 800 }}>{n(value)}</div>
            </div>)}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 12 }}>
          <div style={box}>
            <div style={{ color: P.goldBright, fontFamily: F.heading, fontSize: 16, fontWeight: 900, marginBottom: 10 }}>Research Objects אחרונים</div>
            <div style={{ display: "grid", gap: 8 }}>
              {state.data.recentRO.map(r => {
                const [label, tone] = classifyRO(r);
                return <div key={r.id} style={{ border: `1px solid ${P.border}`, borderRadius: 10, padding: "10px 11px" }}>
                  <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                    <StatusPill tone={tone}>{label}</StatusPill>
                    <StatusPill>{r.kind || "—"}</StatusPill>
                    {r.engine_verified === true && <StatusPill tone="good">engine verified</StatusPill>}
                  </div>
                  <div style={{ color: P.goldBright, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.55, marginTop: 7 }}>{r.statement || "—"}</div>
                  <div style={{ color: P.goldDim, fontFamily: F.body, fontSize: 11.5, marginTop: 5 }}>{r.source || "ללא מקור טקסטואלי"}</div>
                </div>;
              })}
            </div>
          </div>

          <div style={box}>
            <div style={{ color: P.goldBright, fontFamily: F.heading, fontSize: 16, fontWeight: 900, marginBottom: 10 }}>Topic Cards אחרונים</div>
            <div style={{ display: "grid", gap: 8 }}>
              {state.data.recentTopics.map(t => <div key={t.id} style={{ border: `1px solid ${P.border}`, borderRadius: 10, padding: "10px 11px" }}>
                <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                  <StatusPill tone={t.node_id ? "good" : "warn"}>{t.node_id ? "יש Graph identity" : "מחוץ לעץ"}</StatusPill>
                  <StatusPill>{t.status || "—"}</StatusPill>
                </div>
                <div style={{ color: P.goldBright, fontFamily: F.body, fontSize: 14, fontWeight: 700, lineHeight: 1.55, marginTop: 7 }}>{t.title || "—"}</div>
                <div style={{ color: P.goldDim, fontFamily: F.body, fontSize: 11.5, marginTop: 5 }}>{t.created_by || "יוצר לא ידוע"}</div>
              </div>)}
            </div>
          </div>
        </div>

        <div style={{ ...box, borderColor: P.borderGold }}>
          <div style={{ color: P.goldBright, fontFamily: F.heading, fontSize: 15, fontWeight: 900 }}>פירוש הסטטוסים במסך הזה</div>
          <div style={{ color: P.muted, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.8, marginTop: 6 }}>
            "מחוץ לעץ", "Legacy relation edge", "ממתין לבדיקה" ו"ממתין לצוריאל" הם מצבי Projection מחושבים לצורכי reconciliation בלבד. הם אינם מחליפים את research_objects.status, relation_evidence.status, verification state, publication/access או decision_ledger.
          </div>
        </div>
      </>}
    </div>
  );
}
