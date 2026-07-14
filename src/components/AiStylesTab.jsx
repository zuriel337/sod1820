// 📊 ביצועי ניתוח-ה-AI (admin) — «מקום עדכוני ה-AI» באזור הבקרה.
// עודכן 14.7: מציג את ביצועי הניתוח *הממוזג* (חם + עמוק) בשלוש רמות —
//   ❤️ אהבו · 🔬 יצרו מחקר · 📚 יצרו ידע — תואם לדוח השבועי של «השומר».
// מובייל-ראשון (כרטיסים גמישים, בלי טבלה שנגללת לצדדים). המנוע מסכם נתונים בלבד; צוריאל מחליט.
import React, { useState, useEffect, useCallback } from "react";
import { C, F } from "../theme.js";
import { engName } from "../lib/aiEngines.js";
import { listAiStyles, adminAiRecent, adminAiRate, adminAiStyleReport, adminAiStyleSave, adminAiStyleActivate, adminAiPulse, adminResearchMap } from "../lib/supabase.js";

const box = { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 14, padding: "15px 16px" };
const pill = (c) => ({ display: "inline-block", background: c + "22", border: `1px solid ${c}`, color: c, borderRadius: 999, padding: "1px 9px", fontSize: 11, fontWeight: 800, fontFamily: F.heading });

// סיבות-הדירוג — מהן נבנה הסיכום שממנו צוריאל מעצב את הסגנון הבא
const RATE_REASONS = ["ארוך מדי", "פרשנות חזקה מדי", "שטחי", "חסר עוגן/הצלבה", "לא בעברית טובה", "מצוין ככה"];

// 🧱 כרטיס-מדד יחיד (מובייל-ראשון) — מספר גדול + תווית
function Stat({ value, label, accent = C.goldBright }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 8px", textAlign: "center", minWidth: 0 }}>
      <div style={{ color: accent, fontFamily: F.heading, fontSize: 21, fontWeight: 800, lineHeight: 1.05, whiteSpace: "nowrap" }}>{value}</div>
      <div style={{ color: C.muted, fontFamily: F.body, fontSize: 11, marginTop: 3, lineHeight: 1.35 }}>{label}</div>
    </div>
  );
}
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(104px,1fr))", gap: 7 };

// 🎚 שכבת-מדידה (❤️/🔬/📚) עם כותרת צבעונית
function Level({ emoji, title, tint, children }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px 12px" }}>
      <div style={{ color: tint, fontFamily: F.heading, fontSize: 13, fontWeight: 800, marginBottom: 8 }}>{emoji} {title}</div>
      <div style={grid}>{children}</div>
    </div>
  );
}

export default function AiStylesTab() {
  const [pulse, setPulse] = useState(null);
  const [rmap, setRmap] = useState(null);          // 🧭 מפת-מחקר: מה חיפשו + מסעות
  const [styles, setStyles] = useState([]);
  const [report, setReport] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rateId, setRateId] = useState(null);      // ניתוח שנפתחו לו סיבות
  const [ratePending, setRatePending] = useState(null); // {id, rating} ממתין לסיבה
  const [openId, setOpenId] = useState(null);      // ניתוח פתוח לקריאה מלאה
  const [editing, setEditing] = useState(null);    // טופס סגנון (חדש/עריכה)
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [pl, rm, st, rep, rec] = await Promise.all([adminAiPulse(30), adminResearchMap(30), listAiStyles(), adminAiStyleReport(), adminAiRecent(40)]);
    setPulse(pl); setRmap(rm); setStyles(st); setReport(rep); setRecent(rec);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const rate = async (l, rating, reason = null) => {
    await adminAiRate(l.id, rating, reason);
    setRecent(r => r.map(x => x.id === l.id ? { ...x, admin_rating: rating, admin_reason: reason } : x));
    setRateId(null); setRatePending(null);
  };

  const saveStyle = async () => {
    if (!editing?.style_key || !editing?.name) { setMsg("חסר מפתח/שם"); return; }
    const ok = await adminAiStyleSave(editing);
    setMsg(ok ? "נשמר ✓" : "שגיאה בשמירה");
    if (ok) { setEditing(null); load(); }
  };

  // 📋 משפטי-מגמה פשוטים לכל סגנון (המערכת מסכמת, לא מציעה)
  const trendLines = (r) => {
    const out = [];
    const rated = (r.admin_good || 0) + (r.admin_bad || 0);
    if (!r.analyses) return ["אין עדיין ניתוחים בסגנון הזה."];
    if (rated) {
      out.push(`דורגו ${rated} ניתוחים: ${r.admin_good || 0} 👍 · ${r.admin_bad || 0} 👎.`);
      if (r.avg_len_good && r.avg_len_bad) {
        out.push(Number(r.avg_len_good) < Number(r.avg_len_bad)
          ? `הניתוחים שסומנו כטובים קצרים יותר בממוצע (${r.avg_len_good} מול ${r.avg_len_bad} תווים).`
          : `הניתוחים שסומנו כטובים ארוכים יותר בממוצע (${r.avg_len_good} מול ${r.avg_len_bad} תווים).`);
      }
      const reasons = Object.entries(r.reasons || {});
      if (reasons.length) out.push(`הסיבות הנפוצות: ${reasons.map(([k, v]) => `«${k}» ×${v}`).join(" · ")}.`);
    } else out.push(`${r.analyses} ניתוחים נרשמו — עדיין לא דורגו.`);
    if (r.continue_rate != null) out.push(`אחרי הניתוח: ${r.continue_rate}% המשיכו לחקור · ${r.research_rate}% הוסיפו למחקר · ${r.share_rate}% שיתפו.`);
    if ((r.user_up || 0) + (r.user_down || 0) > 0) out.push(`משוב גולשים: ${r.user_up} 👍 · ${r.user_down} 👎.`);
    return out;
  };

  const emptyStyle = { style_key: "", name: "", depth: "בינוני", facts_level: "גבוה", interpretation_level: "בינונית", length_pref: "קצר (2-4 משפטים)", directives: "", notes: "" };
  const P = pulse || {};

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* כותרת — ממוזג, לא A/B */}
      <div style={box}>
        <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 16, fontWeight: 800, marginBottom: 4 }}>🤖 ניתוח-ה-AI · ביצועים ומדדים</div>
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.65 }}>
          הניתוח העמוק כיום הוא <b>ממוזג</b> — פרשנות חמה <i>ועומק בין-שיטתי יחד</i>. למטה: איך הוא מתפקד ב-3 רמות
          (אהבו · יצרו מחקר · יצרו ידע) — אותם מדדים שמגיעים אליך בדוח השבועי של «השומר».
        </div>
      </div>

      {loading ? <div style={{ color: C.muted, textAlign: "center", padding: 20 }}>טוען…</div> : <>

      {/* 📊 ביצועי הניתוח הממוזג — 3 רמות (מובייל-ראשון) */}
      <div style={box}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 11 }}>
          <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 15, fontWeight: 800 }}>📊 ביצועי ניתוח-ה-AI</div>
          <span style={{ color: C.muted, fontFamily: F.body, fontSize: 11.5 }}>30 יום אחרונים</span>
        </div>
        <div style={{ display: "grid", gap: 9 }}>
          {/* כמות + מנועים */}
          <div style={grid}>
            <Stat value={P.analyses ?? 0} label="ניתוחים" />
            <Stat value={P.deep ?? 0} label="עמוקים-ממוזגים" />
            <Stat value={P.claude ?? 0} label="🔵 הפרשן" accent="#3ea6ff" />
            <Stat value={P.gemini ?? 0} label="🟣 האנליטי" accent="#b49af0" />
            <Stat value={P.avg_len ?? 0} label="אורך ממוצע (תווים)" />
            <Stat value={P.users ?? 0} label="משתמשים" />
          </div>
          <Level emoji="❤️" title="אהבו את התשובה" tint="#e0819e">
            <Stat value={P.up ?? 0} label="👍 גולשים" accent="#7fd49a" />
            <Stat value={P.down ?? 0} label="👎 גולשים" accent="#e08a8a" />
            <Stat value={`${P.admin_good ?? 0} / ${P.admin_bad ?? 0}`} label="דירוג שלך 👍/👎" />
            <Stat value={P.pending_ratings ?? 0} label="ממתינים לדירוג" />
          </Level>
          <Level emoji="🔬" title="יצרו מחקר — גם בלי הצבעה" tint="#6cc6d6">
            <Stat value={`${P.continue_rate ?? 0}%`} label="המשיכו לחקור" />
            <Stat value={`${P.research_rate ?? 0}%`} label="הוסיפו למחקר" />
            <Stat value={`${P.share_rate ?? 0}%`} label="שיתפו" />
          </Level>
          <Level emoji="📚" title="יצרו ידע" tint="#d4af37">
            <Stat value={P.ai_insights ?? 0} label="חידושי-AI חדשים בגרף" />
            <Stat value={P.knowledge_contributions ?? 0} label="תרומות-חוקרים" />
          </Level>
        </div>
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 11, fontStyle: "italic", marginTop: 9, lineHeight: 1.6 }}>
          «יצרו מחקר» נמדד על <b>כל</b> ניתוח — לא רק על מי שהצביע 👍. זה המדד האמיתי: האם התשובה פתחה כיוון.
        </div>
      </div>

      {/* 🧭 מסעות מחקר — מה חיפשו + לאן הלכו אחר כך */}
      <div style={box}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 11 }}>
          <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 15, fontWeight: 800 }}>🧭 מסעות מחקר</div>
          <span style={{ color: C.muted, fontFamily: F.body, fontSize: 11.5 }}>{Number(rmap?.total_searches ?? 0).toLocaleString("he-IL")} חיפושים · 30 יום</span>
        </div>

        {/* מה הכי חיפשו */}
        <div style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, marginBottom: 7 }}>🔎 מה הכי חיפשו</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 15 }}>
          {(rmap?.top_searches || []).map((s, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 999, padding: "4px 11px", fontFamily: F.body, fontSize: 12.5, color: C.goldLight }}>
              <b style={{ color: C.goldBright, fontFamily: F.heading }}>{s.term}</b>
              <span style={{ color: C.muted, fontSize: 11 }}>×{s.hits}</span>
            </span>
          ))}
          {!(rmap?.top_searches || []).length && <span style={{ color: C.muted, fontSize: 12 }}>אין עדיין חיפושים בחלון הזה.</span>}
        </div>

        {/* המסעות — לאן הלכו אחר כך */}
        <div style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, marginBottom: 7 }}>
          🧭 לאן הלכו אחר כך <span style={{ color: C.muted, fontWeight: 400, fontSize: 11 }}>(כל צעד: מאיפה → לאן · דרך איזו שיטה)</span>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {(rmap?.trails || []).map((t, ti) => {
            const nodes = [];
            (t.path || []).forEach((s, i) => { if (i === 0 && s.from) nodes.push({ label: s.from, via: null }); nodes.push({ label: s.to, via: s.via }); });
            return (
              <div key={ti} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 11, padding: "9px 12px" }}>
                <div style={{ color: C.muted, fontFamily: F.body, fontSize: 10.5, marginBottom: 6 }}>
                  {t.steps} צעדים · {new Date(t.last_at).toLocaleString("he-IL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · חוקר #{t.visitor}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5 }}>
                  {nodes.map((n, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span style={{ color: C.muted, fontFamily: F.body, fontSize: 11, whiteSpace: "nowrap" }}>→{n.via ? ` ${n.via}` : ""}</span>}
                      <span style={{ background: "rgba(212,175,55,0.10)", border: `1px solid ${C.borderGold}`, borderRadius: 8, padding: "3px 9px", color: C.goldBright, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>{n.label}</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })}
          {!(rmap?.trails || []).length && <div style={{ color: C.muted, fontSize: 12, padding: "4px 0" }}>עוד לא נרשמו מסעות בחלון הזה (המעקב חדש — יגדל עם הזמן).</div>}
        </div>
      </div>

      {/* 📝 ניתוחים אחרונים — דרג ולמד את המערכת */}
      <div style={box}>
        <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 14.5, fontWeight: 800, marginBottom: 10 }}>📝 ניתוחים אחרונים — דרג</div>
        <div style={{ display: "grid", gap: 8 }}>
          {recent.map(l => (
            <div key={l.id} style={{ background: C.surface, border: `1px solid ${l.admin_rating === 1 ? "rgba(76,175,125,0.5)" : l.admin_rating === -1 ? "rgba(220,90,90,0.5)" : C.border}`, borderRadius: 11, padding: "9px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <b style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 13.5 }}>{l.subject || "—"}</b>
                <span style={pill(C.goldBright)}>{l.kind}</span>
                <span style={{ color: C.muted, fontSize: 11 }}>{engName(l.engine)}</span>
                <span style={{ color: C.muted, fontSize: 11 }}>{new Date(l.created_at).toLocaleString("he-IL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                {(l.up_votes > 0 || l.down_votes > 0) && <span style={{ color: C.muted, fontSize: 11 }}>{l.up_votes}👍 {l.down_votes}👎</span>}
                {l.continue_ct > 0 && <span style={pill("#3ea6ff")}>המשיכו ×{l.continue_ct}</span>}
                <span style={{ marginInlineStart: "auto", display: "flex", gap: 5, alignItems: "center" }}>
                  {l.admin_rating === 1 && <span style={pill("#4caf7d")}>👍 {l.admin_reason || ""}</span>}
                  {l.admin_rating === -1 && <span style={pill("#dc5a5a")}>👎 {l.admin_reason || ""}</span>}
                  {l.admin_rating == null && <>
                    <button onClick={() => { setRateId(l.id); setRatePending({ id: l.id, rating: 1 }); }} style={{ cursor: "pointer", background: "none", border: "1px solid rgba(76,175,125,0.5)", borderRadius: 999, padding: "3px 11px", fontSize: 13 }}>👍</button>
                    <button onClick={() => { setRateId(l.id); setRatePending({ id: l.id, rating: -1 }); }} style={{ cursor: "pointer", background: "none", border: "1px solid rgba(220,90,90,0.5)", borderRadius: 999, padding: "3px 11px", fontSize: 13 }}>👎</button>
                  </>}
                </span>
              </div>
              <div onClick={() => setOpenId(openId === l.id ? null : l.id)} style={{ cursor: "pointer", color: C.goldLight, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.7, marginTop: 6, whiteSpace: "pre-line" }}>
                {openId === l.id ? l.content : `${(l.content || "").slice(0, 160)}${(l.content || "").length > 160 ? "… (לחץ להרחבה)" : ""}`}
              </div>
              {rateId === l.id && ratePending && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7 }}>
                  {RATE_REASONS.map(r => (
                    <button key={r} onClick={() => rate(l, ratePending.rating, r)} style={{ cursor: "pointer", background: "rgba(212,175,55,0.1)", border: `1px solid ${C.border}`, color: C.goldLight, borderRadius: 999, padding: "3px 11px", fontSize: 11.5, fontFamily: F.heading }}>{r}</button>
                  ))}
                  <button onClick={() => rate(l, ratePending.rating)} style={{ cursor: "pointer", background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 999, padding: "3px 11px", fontSize: 11.5, fontFamily: F.heading }}>בלי סיבה</button>
                </div>
              )}
            </div>
          ))}
          {!recent.length && <div style={{ color: C.muted, textAlign: "center", padding: 12 }}>ניתוחים חדשים יופיעו כאן אוטומטית (כל ניתוח AI באתר נרשם).</div>}
        </div>
      </div>

      {/* 🎨 פרופילי סגנון — משני (מוזג לניתוח אחד; מקום לניסויי-סגנון עתידיים) */}
      <details style={box}>
        <summary style={{ cursor: "pointer", color: C.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 800, listStyle: "none" }}>
          🎨 פרופילי סגנון · לימוד-סגנון מתקדם <span style={{ color: C.muted, fontSize: 11.5, fontWeight: 400 }}>(פתח להרחבה)</span>
        </summary>
        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <span style={{ color: C.muted, fontFamily: F.body, fontSize: 12 }}>המערכת מסכמת נתונים בלבד — יצירת/עיצוב סגנון = ההחלטה שלך.</span>
            <button onClick={() => setEditing(emptyStyle)} style={{ cursor: "pointer", background: "rgba(212,175,55,0.14)", border: `1px solid ${C.borderGold}`, color: C.goldBright, borderRadius: 999, padding: "5px 14px", fontFamily: F.heading, fontSize: 12, fontWeight: 800 }}>➕ סגנון חדש</button>
          </div>
          {styles.map(s => (
            <div key={s.style_key} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: C.surface, border: `1px solid ${s.is_active ? C.borderGold : C.border}`, borderRadius: 11, padding: "9px 12px" }}>
              {s.is_active && <span style={pill("#4caf7d")}>● פעיל</span>}
              <b style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 14 }}>{s.name}</b>
              <span style={{ color: C.muted, fontSize: 11.5, fontFamily: F.body }} dir="ltr">{s.style_key}</span>
              <span style={{ color: C.goldLight, fontSize: 11.5, fontFamily: F.body }}>עומק {s.depth} · עובדות {s.facts_level} · פרשנות {s.interpretation_level}</span>
              <span style={{ marginInlineStart: "auto", display: "flex", gap: 6 }}>
                <button onClick={() => setEditing({ ...s })} style={{ cursor: "pointer", background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 999, padding: "3px 11px", fontSize: 11.5, fontFamily: F.heading }}>✏️ ערוך</button>
                {!s.is_active && <button onClick={async () => { await adminAiStyleActivate(s.style_key); load(); }} style={{ cursor: "pointer", background: "rgba(76,175,125,0.12)", border: "1px solid rgba(76,175,125,0.5)", color: "#7fd49a", borderRadius: 999, padding: "3px 11px", fontSize: 11.5, fontWeight: 800, fontFamily: F.heading }}>הפעל</button>}
              </span>
            </div>
          ))}
          {editing && (
            <div style={{ marginTop: 4, background: C.surface, border: `1px solid ${C.borderGold}`, borderRadius: 11, padding: 13, display: "grid", gap: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
                {[["style_key", "מפתח (אנגלית, למשל short_v2)"], ["name", "שם קריא (למשל: קצר וממוקד)"], ["depth", "עומק"], ["facts_level", "עובדות"], ["interpretation_level", "פרשנות"], ["length_pref", "אורך"]].map(([k, ph]) => (
                  <input key={k} value={editing[k] || ""} onChange={e => setEditing(v => ({ ...v, [k]: e.target.value }))} placeholder={ph} dir={k === "style_key" ? "ltr" : "rtl"}
                    style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 9, color: C.goldLight, fontFamily: F.body, fontSize: 16, padding: "9px 11px" }} />
                ))}
              </div>
              <textarea value={editing.directives || ""} onChange={e => setEditing(v => ({ ...v, directives: e.target.value }))} rows={3}
                placeholder="הנחיות-הסגנון שיצורפו לחוקי הברזל (למשל: כתוב 2-3 משפטים בלבד; פחות פרשנות, יותר הפניות להצלבות; פתח תמיד בעובדה)"
                style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 9, color: C.goldLight, fontFamily: F.body, fontSize: 16, padding: "9px 11px", resize: "vertical" }} />
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button onClick={saveStyle} style={{ cursor: "pointer", background: "rgba(76,175,125,0.14)", border: "1px solid rgba(76,175,125,0.55)", color: "#7fd49a", borderRadius: 999, padding: "7px 18px", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800 }}>💾 שמור</button>
                <button onClick={() => setEditing(null)} style={{ cursor: "pointer", background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 999, padding: "7px 14px", fontFamily: F.heading, fontSize: 12.5 }}>בטל</button>
                {msg && <span style={{ color: C.muted, fontSize: 12 }}>{msg}</span>}
              </div>
            </div>
          )}
          {/* סיכום לפי סגנון — כרטיסים (בלי טבלה שנגללת) */}
          {report.map(r => (
            <div key={r.style_key} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 11, padding: "10px 12px" }}>
              <b style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 13 }}>{r.is_active ? "● " : ""}{r.name} <span style={{ color: C.muted, fontWeight: 400, fontSize: 11.5 }}>· {r.analyses} ניתוחים</span></b>
              <ul style={{ margin: "5px 0 0", paddingInlineStart: 18, color: C.goldLight, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.7 }}>
                {trendLines(r).map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </details>
      </>}
    </div>
  );
}
