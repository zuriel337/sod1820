import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { loadProfile, saveProfile, emptyProfile, fieldMap, cleanInput, promptNarrative, promptFieldMap, EVENT_TYPES } from "../lib/research/lifeProfile.js";

// 🧬 ניתוח חיים — תשתית קלט→מנועים→פלט. קלט אחיד אחד (נשמר מקומית) מוזן ל:
// (א) מנוע מובנה «מפת השדה» — מחושב מלא, גימטריה/מבנה, בלי AI.
// (ב) חריצי AI — פרומפט מוכן-להדבקה לכל מודל + מקום להדביק את הפלט בחזרה להשוואה.
// המשתמש מחבר עוד מנועים בלי לגעת בשלד. גימטריה=עובדה; פרשנות AI=נפרדת ומסומנת.

const card = { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 16, marginTop: 12 };
const inp = { width: "100%", boxSizing: "border-box", fontSize: 16, fontWeight: 600, padding: "9px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", outline: "none", fontFamily: "inherit" };
const lbl = { fontSize: 12.5, fontWeight: 800, color: "var(--ink2)", marginBottom: 4 };
const btn = (pri) => ({ cursor: "pointer", borderRadius: 999, fontWeight: 800, fontSize: 13.5, padding: "9px 16px", fontFamily: "inherit", border: pri ? "none" : "1px solid var(--acc)", background: pri ? "var(--acc)" : "var(--card)", color: pri ? "#fff" : "var(--acc)" });

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <div style={lbl}>{label}</div>
      <input style={inp} dir="rtl" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export default function LifeProfile() {
  const [p, setP] = useState(loadProfile);
  const [copied, setCopied] = useState("");
  useEffect(() => { saveProfile(p); }, [p]);

  const set = (path, val) => setP(prev => {
    const n = structuredClone(prev); let o = n; const ks = path.split(".");
    for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = val; return n;
  });
  const addEvent = () => setP(prev => ({ ...prev, life_events: [...prev.life_events, { date: "", title: "", description: "", type: "other" }] }));
  const setEvent = (i, k, v) => setP(prev => { const e = prev.life_events.slice(); e[i] = { ...e[i], [k]: v }; return { ...prev, life_events: e }; });
  const delEvent = i => setP(prev => ({ ...prev, life_events: prev.life_events.filter((_, x) => x !== i) }));

  const input = useMemo(() => cleanInput(p), [p]);
  const fm = useMemo(() => fieldMap(p), [p]);
  const json = useMemo(() => JSON.stringify(input, null, 2), [input]);

  const copy = (text, tag) => { try { navigator.clipboard?.writeText(text); setCopied(tag); setTimeout(() => setCopied(""), 1800); } catch { /* noop */ } };

  return (
    <div>
      <div className="rw-h1">🧬 ניתוח חיים</div>
      <div className="rw-sub">קלט אחד אחיד → כמה מנועים → פלט להשוואה. הנתונים נשמרים אצלך בלבד (מקומי). גימטריה = עובדה; פרשנות AI = נפרדת ומסומנת.</div>

      {/* ===== קלט ===== */}
      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>📥 הקלט שלך</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
          <Field label="השם שלך" value={p.profile.name} onChange={v => set("profile.name", v)} placeholder="שם פרטי / מלא" />
          <Field label="שם האב" value={p.profile.parents.father} onChange={v => set("profile.parents.father", v)} placeholder="אופציונלי" />
          <Field label="שם האם" value={p.profile.parents.mother} onChange={v => set("profile.parents.mother", v)} placeholder="אופציונלי" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginTop: 10 }}>
          <Field label="תאריך נישואין" value={p.key_dates.marriage} onChange={v => set("key_dates.marriage", v)} placeholder="dd.mm.yyyy" />
          <Field label="תאריך פרידה (אם יש)" value={p.key_dates.divorce} onChange={v => set("key_dates.divorce", v)} placeholder="אופציונלי" />
        </div>

        {/* אירועי חיים */}
        <div style={{ ...lbl, marginTop: 14, fontSize: 13.5 }}>אירועי חיים</div>
        {p.life_events.map((e, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <input style={inp} dir="rtl" value={e.date} onChange={ev => setEvent(i, "date", ev.target.value)} placeholder="תאריך" />
            <input style={inp} dir="rtl" value={e.title} onChange={ev => setEvent(i, "title", ev.target.value)} placeholder="מה קרה (כותרת)" />
            <select style={{ ...inp, cursor: "pointer" }} value={e.type} onChange={ev => setEvent(i, "type", ev.target.value)}>{EVENT_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}</select>
            <button onClick={() => delEvent(i)} style={{ ...btn(false), border: "1px solid var(--line)", color: "var(--ink2)", padding: "8px 12px" }}>✕</button>
          </div>
        ))}
        <button onClick={addEvent} style={btn(false)}>➕ הוסף אירוע</button>

        <div style={{ marginTop: 12 }}>
          <div style={lbl}>הערות הקשר (אופציונלי)</div>
          <textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} dir="rtl" value={p.context_notes} onChange={e => set("context_notes", e.target.value)} placeholder="כל דבר שחשוב להוסיף…" />
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => copy(json, "json")} style={btn(true)}>{copied === "json" ? "✓ הועתק" : "📋 העתק קלט (JSON)"}</button>
          <button onClick={() => { if (confirm("לאפס את כל הנתונים?")) setP(emptyProfile()); }} style={{ ...btn(false), border: "1px solid var(--line)", color: "var(--ink2)" }}>אפס</button>
        </div>
      </div>

      {/* ===== מנוע מובנה: מפת השדה ===== */}
      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>🧭 מנוע «מפת השדה» <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--good)", background: "#e4f6ea", borderRadius: 999, padding: "2px 9px", marginInlineStart: 6 }}>● מחושב · עובדה</span></div>
        <div className="rw-sub" style={{ marginTop: 4 }}>מבנה בלבד — גימטריה ותאריכים. בלי פרשנות.</div>

        {fm.core.name ? <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
            {fm.people.map((pe, i) => <span key={i} className="rw-chip">{pe.role}: {pe.name} = {pe.value.toLocaleString("he")}</span>)}
          </div>

          {fm.clusters.length > 0 && <div style={{ marginTop: 12 }}>
            <div style={lbl}>אשכולות (לפי סוג)</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{fm.clusters.map((c, i) => <span key={i} className="rw-chip">{c.label} · {c.count}</span>)}</div>
          </div>}

          {fm.pressure.length > 0 && <div style={{ marginTop: 12 }}>
            <div style={lbl}>נקודות לחץ (שנים עמוסות)</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{fm.pressure.slice(0, 6).map((c, i) => <span key={i} className="rw-chip">{c.year} · {c.count} אירועים</span>)}</div>
          </div>}

          {fm.transitions.length > 0 && <div style={{ marginTop: 12 }}>
            <div style={lbl}>ציר מעבר</div>
            <div style={{ display: "grid", gap: 6 }}>{fm.transitions.map((e, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line)", padding: "5px 0", fontSize: 14 }}>
                <span><b style={{ color: "var(--acc)" }}>{e.year}</b> · {e.title} <span style={{ color: "var(--ink3)" }}>({e.typeLabel})</span></span>
                <Link to={`/number/${e.value}?from=life`} style={{ color: "var(--acc)", fontWeight: 800, textDecoration: "none" }}>= {e.value.toLocaleString("he")}</Link>
              </div>
            ))}</div>
          </div>}

          {(fm.convergences.nameMatches.length > 0 || fm.convergences.pairs.length > 0) && <div style={{ marginTop: 12 }}>
            <div style={lbl}>✦ התכנסויות מספריות (עובדה)</div>
            {fm.convergences.nameMatches.map((e, i) => <div key={i} style={{ fontSize: 14, marginBottom: 4 }}>«{e.title}» = שמך = <b style={{ color: "var(--acc)" }}>{e.value.toLocaleString("he")}</b></div>)}
            {fm.convergences.pairs.map((pr, i) => <div key={i} style={{ fontSize: 14, marginBottom: 4 }}>«{pr.a}» = «{pr.b}» = <b style={{ color: "var(--acc)" }}>{pr.value.toLocaleString("he")}</b></div>)}
          </div>}
        </> : <div className="rw-sub" style={{ marginTop: 8 }}>הזן שם ואירועים למעלה — מפת השדה תיבנה כאן בזמן אמת.</div>}
      </div>

      {/* ===== חריצי מנועי AI ===== */}
      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>🤖 מנועי AI <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--acc)", background: "var(--accS)", borderRadius: 999, padding: "2px 9px", marginInlineStart: 6 }}>חבר/השווה</span></div>
        <div className="rw-sub" style={{ marginTop: 4 }}>העתק את הפרומפט (כולל הקלט) לכל מודל, והדבק את הפלט חזרה — כדי להשוות עדשות. פרשנות, לא עובדה.</div>

        {[{ k: "a", title: "🧠 עדשת נרטיב (עומק)", prompt: promptNarrative(input) }, { k: "b", title: "🧭 עדשת מפת-שדה (מבנה)", prompt: promptFieldMap(input) }].map(m => (
          <div key={m.k} style={{ marginTop: 12, border: "1px solid var(--line)", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <b style={{ fontSize: 14 }}>{m.title}</b>
              <button onClick={() => copy(m.prompt, "p" + m.k)} style={btn(true)}>{copied === "p" + m.k ? "✓ הועתק" : "📋 העתק פרומפט"}</button>
            </div>
            <textarea style={{ ...inp, minHeight: 90, resize: "vertical", marginTop: 8 }} dir="rtl" value={p._ai[m.k]} onChange={e => set("_ai." + m.k, e.target.value)} placeholder="הדבק כאן את הפלט של המודל — כדי להשוות" />
          </div>
        ))}

        {(p._ai.a || p._ai.b) && <div style={{ marginTop: 12, background: "var(--bg)", borderRadius: 12, padding: 12 }}>
          <div style={lbl}>📊 השוואת עדשות (מה חוזר בשתיהן = הכי משמעותי)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13.5, lineHeight: 1.7 }}>
            <div><b>נרטיב</b><div className="rw-muted" style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{p._ai.a || "—"}</div></div>
            <div><b>מפת-שדה</b><div className="rw-muted" style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{p._ai.b || "—"}</div></div>
          </div>
        </div>}
      </div>
    </div>
  );
}
