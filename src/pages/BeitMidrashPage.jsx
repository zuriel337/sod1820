import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { SectionHeader } from "../components/ui.jsx";
import { NAV } from "../routes.jsx";
import { getInsights } from "../lib/supabase.js";
import InsightCard from "../components/InsightCard.jsx";
import VerifiedBadge from "../components/VerifiedBadge.jsx";
import SubscribeGate, { useSubscribed } from "../components/SubscribeGate.jsx";

const METHODS = NAV.find(i => i.to === "/beit-midrash")?.children || [];
const FREE_LIMIT = 2; // חוק subscribe_gate_law — 2 חידושים חינם ואז הרשמה

function SectionTitle({ emoji, title, badge, children }) {
  return (
    <div style={{ margin: "0 0 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 24, fontWeight: 700, margin: 0 }}>
          {emoji} {title}
        </h3>
        {badge}
      </div>
      {children && (
        <p style={{ color: C.goldDim, fontFamily: F.body, fontSize: 14, lineHeight: 1.8, margin: "8px 0 0" }}>
          {children}
        </p>
      )}
    </div>
  );
}

function ComingSoon({ text }) {
  return (
    <div style={{
      textAlign: "center", color: C.muted, fontFamily: F.heading, fontSize: 13,
      letterSpacing: 1, background: C.surface2, border: `1px dashed ${C.border}`,
      borderRadius: 12, padding: "28px 20px",
    }}>🚧 {text}</div>
  );
}

// רשימת חידושים עם שער המנוי (2 חינם → הרשמה)
function InsightList({ items, badgeVariant }) {
  const { subscribed, markSubscribed } = useSubscribed();
  const visible = subscribed ? items : items.slice(0, FREE_LIMIT);
  const locked = items.length - visible.length;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {visible.map(it => <InsightCard key={it.id} insight={it} badgeVariant={badgeVariant} />)}
      {!subscribed && locked > 0 && (
        <SubscribeGate lockedCount={locked} source="beit-midrash" onUnlock={markSubscribed} />
      )}
    </div>
  );
}

export default function BeitMidrashPage() {
  const [ai, setAi] = useState(null);
  const [system, setSystem] = useState(null);

  useEffect(() => {
    let alive = true;
    getInsights({ origin: "ai", limit: 30 })
      .then(d => alive && setAi(d)).catch(() => alive && setAi([]));
    getInsights({ convergence: true, limit: 30 })
      .then(d => alive && setSystem(d)).catch(() => alive && setSystem([]));
    return () => { alive = false; };
  }, []);

  return (
    <div style={{ direction: "rtl", maxWidth: 880, margin: "0 auto", padding: "64px 24px 96px", position: "relative", zIndex: 1 }}>
      <SectionHeader eyebrow="כמו אוניברסיטה" title="📚 בית המדרש" />

      {/* ── חידושי AI ── */}
      <section style={{ marginBottom: 52 }}>
        <SectionTitle emoji="🔵" title="חידושי AI" badge={<VerifiedBadge variant="ai" size={15} />}>
          חידושי גימטריה שנוצרו ואומתו חישובית על-ידי הבינה של סוד 1820. כל חידוש קצר — לחיצה פותחת את העומק.
        </SectionTitle>
        {ai === null ? <ComingSoon text="טוען חידושים…" />
          : ai.length === 0 ? <ComingSoon text="בקרוב" />
          : <InsightList items={ai} badgeVariant="ai" />}
      </section>

      {/* ── חידושי גולשים ── */}
      <section style={{ marginBottom: 52 }}>
        <SectionTitle emoji="👥" title="חידושי גולשים">
          המקום שבו הקהילה תשתף חידושים משלה — בבדיקה ובאישור צוות סוד 1820.
        </SectionTitle>
        <ComingSoon text="בקרוב — שיתוף חידושים מהקהילה" />
      </section>

      {/* ── חידושי המערכת ── */}
      <section style={{ marginBottom: 56 }}>
        <SectionTitle emoji="⚡" title="חידושי המערכת" badge={<VerifiedBadge variant="post" label="התכנסות" size={15} />}>
          התראות אוטומטיות של התכנסות וחותם 1820 — כשהמערכת מזהה צירים מתלכדים באירוע.
        </SectionTitle>
        {system === null ? <ComingSoon text="טוען…" />
          : system.length === 0 ? <ComingSoon text="בקרוב — אין עדיין התראות התכנסות פעילות" />
          : <InsightList items={system} badgeVariant="post" />}
      </section>

      {/* ── שיטות הלימוד ── */}
      <SectionHeader eyebrow="שיטות הגימטריה" title="🎓 שיטות הלימוד" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
        {METHODS.map(m => (
          <Link key={m.to} to={m.to} style={{
            textDecoration: "none", background: C.surface2, border: `1px solid ${C.border}`,
            borderInlineStart: `3px solid ${C.gold}`, borderRadius: 10, padding: "18px 20px",
            color: C.goldLight, fontFamily: F.royal, fontSize: 16, fontWeight: 700,
          }}>{m.label}</Link>
        ))}
      </div>
    </div>
  );
}
