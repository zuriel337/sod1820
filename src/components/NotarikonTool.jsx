import React, { useState } from "react";
import { Link } from "react-router-dom";
import QuickActions from "./QuickActions.jsx";
import { calcGem } from "../theme.js";
import { onlyHeb } from "../lib/gematria.js";
import { entityFromPhrase } from "../lib/research/entity.js";

// 🔠 ראשי / סופי תיבות (נוטריקון) — הקלד ביטוי, קבל את ראשי-התיבות וסופי-התיבות + ערכם.
const heb = n => Number(n).toLocaleString("he");

function ResultRow({ title, sub, txt }) {
  if (!txt) return null;
  const val = calcGem(txt);
  return (
    <div className="rw-card" style={{ marginTop: 12 }}>
      <div className="rw-muted" style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>{title} <span style={{ fontWeight: 600 }}>· {sub}</span></div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div dir="rtl" style={{ fontSize: 28, fontWeight: 800, letterSpacing: 4, color: "var(--ink)" }}>{txt}</div>
        <Link to={`/number/${val}?from=notarikon`} title="פתח את דף המספר" style={{ fontSize: 14.5, fontWeight: 800, color: "var(--acc)", background: "var(--accS)", borderRadius: 999, padding: "5px 15px", textDecoration: "none" }}>= {heb(val)}</Link>
      </div>
      <QuickActions entity={entityFromPhrase(txt, val)} />
    </div>
  );
}

export default function NotarikonTool() {
  const [q, setQ] = useState("");
  const words = q.trim().split(/\s+/).map(w => onlyHeb(w)).filter(a => a.length);
  const rashei = words.map(a => a[0]).join("");
  const sofei = words.map(a => a[a.length - 1]).join("");
  return (
    <div className="rw-card">
      <div className="rw-muted" style={{ fontWeight: 700, marginBottom: 12 }}>🔠 ראשי / סופי תיבות — הקלידו ביטוי, וקבלו את ראשי-התיבות וסופי-התיבות + ערכם הגימטרי</div>
      <input className="rw-num-in" dir="rtl" value={q} onChange={e => setQ(e.target.value)}
        aria-label="ביטוי לראשי/סופי תיבות" placeholder="הקלידו ביטוי (כמה מילים)…" style={{ textAlign: "right" }} />
      {words.length >= 2 ? (
        <>
          <ResultRow title="ראשי תיבות" sub="האות הראשונה בכל מילה" txt={rashei} />
          <ResultRow title="סופי תיבות" sub="האות האחרונה בכל מילה" txt={sofei} />
        </>
      ) : q.trim() ? <div className="rw-muted" style={{ marginTop: 12 }}>הקלידו לפחות שתי מילים (למשל «רבי שמעון בר יוחאי»).</div> : (
        <div className="rw-muted" style={{ marginTop: 12, lineHeight: 1.7 }}>דוגמה: «את השמים ואת הארץ» → ראשי-תיבות «אהוה», סופי-תיבות «תםתץ».</div>
      )}
    </div>
  );
}
