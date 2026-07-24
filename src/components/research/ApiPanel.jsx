import React, { useState } from "react";
import { Link } from "react-router-dom";
import { METHODS, DEPTH_METHODS, hebrewNumeral } from "../../lib/gematria.js";

// 🔌 ApiPanel — אזור «API גימטריה» בסביבת-המחקר, ליד הסוכן (רזיאל). מציג את ה-API ללקוחות/מפתחים:
//    «נסה עכשיו» חי (מחושב במנוע הרשמי — METHODS/DEPTH_METHODS, אותם ערכים שה-API מחזיר) +
//    ה-endpoint + קטע-קוד להעתקה. עץ אחד: אין כאן לוגיקת-גימטריה משלו — רק המנוע הקנוני.
//    ה-API עצמו: Edge Function gematria-api → SQL public.gematria_api (fn_ragil/gem_calc/...).

const API_URL = "https://linswmnnkjxvweumprav.supabase.co/functions/v1/gematria-api";

// 9 השיטות שה-API מחזיר (זהה ל-public.gematria_api). key=שם-API · he=שם-תצוגה · engineKey=מפתח-המנוע.
const API_METHODS = [
  { key: "ragil", he: "רגיל", engineKey: "רגיל" },
  { key: "miluy", he: "מילוי", engineKey: "מילוי" },
  { key: "misratar", he: "מסתתר", engineKey: "מסתתר" },
  { key: "kadmi", he: "קדמי · משולש", engineKey: "קדמי" },
  { key: "gadol", he: "גדול", engineKey: "גדול" },
  { key: "siduri", he: "סידורי", engineKey: "סידורי" },
  { key: "atbash", he: "אתבש", engineKey: "אתבש" },
  { key: "albam", he: "אלבם", engineKey: "אלבם" },
  { key: "kadmi_gadol", he: "משולש גדול", engineKey: "משולש גדול" },
];
const ENGINE_FN = Object.fromEntries([...METHODS, ...DEPTH_METHODS].map(m => [m.key, m.fn]));

// חישוב מקומי במנוע הרשמי — מדגים בדיוק את תשובת ה-API (אותם ערכים).
function computeLocal(text) {
  const methods = {};
  for (const m of API_METHODS) methods[m.key] = ENGINE_FN[m.engineKey] ? ENGINE_FN[m.engineKey](text) : 0;
  const value = methods.ragil || 0;
  return { input: text, value, hebrew_numeral: hebrewNumeral(value), distance_from_1820: 1820 - value, methods };
}

function CopyBtn({ text, label = "העתק" }) {
  const [ok, setOk] = useState(false);
  const copy = () => { try { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1400); } catch { /* noop */ } };
  return <button className="rw-mini" onClick={copy} title="העתק ללוח">{ok ? "✓ הועתק" : `📋 ${label}`}</button>;
}

export default function ApiPanel() {
  const [text, setText] = useState("");
  const [res, setRes] = useState(null);
  const [showCode, setShowCode] = useState(false);
  const run = () => { const t = (text || "").trim(); setRes(t ? computeLocal(t) : null); };
  const onKey = e => { if (e.key === "Enter") run(); };

  const curl =
    `curl -X POST ${API_URL} \\\n` +
    `  -H "Content-Type: application/json" \\\n` +
    `  -d '{"text":"${res?.input || "משיח בן דוד"}"}'`;

  return (
    <div>
      <div className="rw-muted" style={{ fontSize: 12.5, lineHeight: 1.7, marginBottom: 10 }}>
        המנוע של סוד 1820 — גם מחוץ לאתר. שלחו מילה או ביטוי, קבלו את הערך ב-9 שיטות + מרחק מ-1820.
        אותו מנוע רשמי בדיוק. מיועד למפתחים ולקוחות.
      </div>

      {/* נסה עכשיו — חי, מחושב במנוע הרשמי */}
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <input
          dir="rtl"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKey}
          placeholder="הקלד ביטוי… (למשל: משיח בן דוד)"
          style={{
            flex: 1, minWidth: 0, borderRadius: 10, border: "1px solid var(--rw-line,#ece4d3)",
            padding: "8px 11px", fontSize: 14, fontFamily: "inherit", color: "var(--ink,#1b1d22)",
            background: "var(--rw-card,#fff)",
          }}
        />
        <button className="rw-chip" onClick={run} style={{ flex: "none", fontWeight: 800, cursor: "pointer" }}>חשב</button>
      </div>

      {res && (
        <div style={{ background: "rgba(47,109,246,0.05)", border: "1px solid rgba(47,109,246,0.22)", borderRadius: 12, padding: "11px 12px", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <Link to={`/number/${res.value}`} style={{ textDecoration: "none", background: "linear-gradient(135deg,#2f6df6,#5b8bff)", color: "#fff", borderRadius: 999, padding: "3px 13px", fontWeight: 800, fontSize: 17 }}>{res.value.toLocaleString("he")}</Link>
            {res.hebrew_numeral && <span className="rw-muted" style={{ fontWeight: 700, fontSize: 13 }}>{res.hebrew_numeral}</span>}
            <span className="rw-muted" style={{ fontSize: 11.5, marginInlineStart: "auto" }}>מרחק מ-1820: <b style={{ color: "var(--ink,#1b1d22)" }}>{res.distance_from_1820.toLocaleString("he")}</b></span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {API_METHODS.map(m => (
              <Link key={m.key} to={`/number/${res.methods[m.key]}`} className="rw-chip"
                style={{ textDecoration: "none", fontSize: 11.5, display: "inline-flex", gap: 5, alignItems: "center" }} title={`${m.he} → דף המספר`}>
                <span className="rw-muted">{m.he}</span><b>{Number(res.methods[m.key]).toLocaleString("he")}</b>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* endpoint + קוד להעתקה */}
      <button className="rw-mini" onClick={() => setShowCode(s => !s)} style={{ width: "100%" }}>
        {showCode ? "▾ הסתר את קטע-הקוד" : "🧑‍💻 איך קוראים ל-API מהאפליקציה שלך"}
      </button>
      {showCode && (
        <div style={{ marginTop: 8 }}>
          <div className="rw-muted" style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Endpoint</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
            <code style={{ flex: 1, minWidth: 0, overflow: "auto", whiteSpace: "nowrap", background: "#1b1d22", color: "#e8eefc", borderRadius: 8, padding: "6px 9px", fontSize: 11 }}>POST {API_URL}</code>
            <CopyBtn text={API_URL} label="" />
          </div>
          <div className="rw-muted" style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>דוגמה (curl)</span><CopyBtn text={curl} />
          </div>
          <pre dir="ltr" style={{ background: "#1b1d22", color: "#e8eefc", borderRadius: 8, padding: "9px 11px", fontSize: 11, lineHeight: 1.6, overflow: "auto", margin: 0 }}>{curl}</pre>
          <div className="rw-muted" style={{ fontSize: 11, lineHeight: 1.6, marginTop: 8 }}>
            התשובה: <code>value</code> (רגיל) · <code>hebrew_numeral</code> · <code>distance_from_1820</code> · <code>methods</code> (9 שיטות).
            רק אותיות עבריות נספרות. רוצים מפתח-גישה ללקוח? צרו קשר.
          </div>
        </div>
      )}
    </div>
  );
}
