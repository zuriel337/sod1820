// 🧪 מעבדת-הסגנון (ai_style_learning_law) — החלטת צוריאל 12.7.2026:
// המנוע מייצר נתונים → המערכת מסכמת מגמות (דוחות בלבד!) → צוריאל מעצב את הסגנון ומחליט.
// אין שום למידה אוטומטית שמשנה סגנון. משוב = סגנון והגשה בלבד — לעולם לא עובדות.
// כל פרופיל קריא לבן-אדם (שם + עומק/עובדות/פרשנות/אורך), לא רק style_v7.
import React, { useState, useEffect, useCallback } from "react";
import { C, F } from "../theme.js";
import { listAiStyles, adminAiRecent, adminAiRate, adminAiStyleReport, adminAiStyleSave, adminAiStyleActivate } from "../lib/supabase.js";

const box = { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px" };
const pill = (c) => ({ display: "inline-block", background: c + "22", border: `1px solid ${c}`, color: c, borderRadius: 999, padding: "1px 9px", fontSize: 11, fontWeight: 800, fontFamily: F.heading });
const th = { color: C.goldBright, fontFamily: F.heading, fontSize: 12, fontWeight: 700, textAlign: "right", padding: "7px 10px", borderBottom: `1px solid ${C.borderGold}`, whiteSpace: "nowrap" };
const td = { color: C.goldLight, fontFamily: F.body, fontSize: 13, padding: "7px 10px", borderBottom: `1px solid ${C.border}` };

// סיבות-הדירוג — מהן נבנה הסיכום שממנו צוריאל מעצב את הסגנון הבא
const RATE_REASONS = ["ארוך מדי", "פרשנות חזקה מדי", "שטחי", "חסר עוגן/הצלבה", "לא בעברית טובה", "מצוין ככה"];

export default function AiStylesTab() {
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
    const [st, rep, rec] = await Promise.all([listAiStyles(), adminAiStyleReport(), adminAiRecent(40)]);
    setStyles(st); setReport(rep); setRecent(rec);
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

  // 📋 "המערכת מסכמת את הנתונים" — משפטי-מגמה פשוטים מהדו"ח (לא הצעת סגנון!)
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

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={box}>
        <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 16, fontWeight: 800, marginBottom: 4 }}>🧪 מעבדת הסגנון של ה-AI</div>
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.7 }}>
          המנוע מייצר → המערכת <b>מסכמת נתונים בלבד</b> → אתה מעצב את הסגנון ומחליט. המשוב משנה סגנון והגשה — לעולם לא עובדות.
        </div>
      </div>

      {loading ? <div style={{ color: C.muted, textAlign: "center", padding: 20 }}>טוען…</div> : <>

      {/* 1. הפרופילים — קריאים לבן-אדם */}
      <div style={box}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 14.5, fontWeight: 800 }}>🎨 פרופילי סגנון</div>
          <button onClick={() => setEditing(emptyStyle)} style={{ cursor: "pointer", background: "rgba(212,175,55,0.14)", border: `1px solid ${C.borderGold}`, color: C.goldBright, borderRadius: 999, padding: "5px 14px", fontFamily: F.heading, fontSize: 12, fontWeight: 800 }}>➕ סגנון חדש</button>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {styles.map(s => (
            <div key={s.style_key} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: C.surface, border: `1px solid ${s.is_active ? C.borderGold : C.border}`, borderRadius: 11, padding: "9px 13px" }}>
              {s.is_active && <span style={pill("#4caf7d")}>● פעיל</span>}
              <b style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 14 }}>{s.name}</b>
              <span style={{ color: C.muted, fontSize: 11.5, fontFamily: F.body }} dir="ltr">{s.style_key}</span>
              <span style={{ color: C.goldLight, fontSize: 12, fontFamily: F.body }}>עומק: {s.depth} · עובדות: {s.facts_level} · פרשנות: {s.interpretation_level} · אורך: {s.length_pref}</span>
              <span style={{ marginInlineStart: "auto", display: "flex", gap: 6 }}>
                <button onClick={() => setEditing({ ...s })} style={{ cursor: "pointer", background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 999, padding: "3px 11px", fontSize: 11.5, fontFamily: F.heading }}>✏️ ערוך</button>
                {!s.is_active && <button onClick={async () => { await adminAiStyleActivate(s.style_key); load(); }} style={{ cursor: "pointer", background: "rgba(76,175,125,0.12)", border: "1px solid rgba(76,175,125,0.5)", color: "#7fd49a", borderRadius: 999, padding: "3px 11px", fontSize: 11.5, fontWeight: 800, fontFamily: F.heading }}>הפעל</button>}
              </span>
            </div>
          ))}
        </div>
        {editing && (
          <div style={{ marginTop: 12, background: C.surface, border: `1px solid ${C.borderGold}`, borderRadius: 11, padding: 13, display: "grid", gap: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8 }}>
              {[["style_key", "מפתח (אנגלית, למשל short_v2)"], ["name", "שם קריא (למשל: קצר וממוקד)"], ["depth", "עומק"], ["facts_level", "עובדות"], ["interpretation_level", "פרשנות"], ["length_pref", "אורך"]].map(([k, ph]) => (
                <input key={k} value={editing[k] || ""} onChange={e => setEditing(v => ({ ...v, [k]: e.target.value }))} placeholder={ph} dir={k === "style_key" ? "ltr" : "rtl"}
                  style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 9, color: C.goldLight, fontFamily: F.body, fontSize: 13, padding: "8px 11px" }} />
              ))}
            </div>
            <textarea value={editing.directives || ""} onChange={e => setEditing(v => ({ ...v, directives: e.target.value }))} rows={3}
              placeholder="הנחיות-הסגנון שיצורפו לחוקי הברזל (למשל: כתוב 2-3 משפטים בלבד; פחות פרשנות, יותר הפניות להצלבות; פתח תמיד בעובדה)"
              style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 9, color: C.goldLight, fontFamily: F.body, fontSize: 13, padding: "8px 11px", resize: "vertical" }} />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={saveStyle} style={{ cursor: "pointer", background: "rgba(76,175,125,0.14)", border: "1px solid rgba(76,175,125,0.55)", color: "#7fd49a", borderRadius: 999, padding: "6px 18px", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800 }}>💾 שמור</button>
              <button onClick={() => setEditing(null)} style={{ cursor: "pointer", background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 999, padding: "6px 14px", fontFamily: F.heading, fontSize: 12.5 }}>בטל</button>
              {msg && <span style={{ color: C.muted, fontSize: 12 }}>{msg}</span>}
            </div>
          </div>
        )}
      </div>

      {/* 2. הדו"ח — המערכת מסכמת, לא מציעה */}
      <div style={box}>
        <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 14.5, fontWeight: 800, marginBottom: 10 }}>📊 מה מספרים הנתונים (לפי סגנון)</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 640 }}>
            <thead><tr>
              <th style={th}>סגנון</th><th style={th}>ניתוחים</th><th style={th}>👍/👎 שלי</th><th style={th}>👍/👎 גולשים</th>
              <th style={th}>המשיכו לחקור</th><th style={th}>הוסיפו למחקר</th><th style={th}>שיתפו</th>
            </tr></thead>
            <tbody>
              {report.map(r => (
                <tr key={r.style_key}>
                  <td style={td}>{r.is_active ? "● " : ""}{r.name}</td>
                  <td style={td}>{r.analyses}</td>
                  <td style={td}>{r.admin_good || 0} / {r.admin_bad || 0}</td>
                  <td style={td}>{r.user_up || 0} / {r.user_down || 0}</td>
                  <td style={td}>{r.continue_rate != null ? `${r.continue_rate}%` : "—"}</td>
                  <td style={td}>{r.research_rate != null ? `${r.research_rate}%` : "—"}</td>
                  <td style={td}>{r.share_rate != null ? `${r.share_rate}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {report.map(r => (
          <div key={r.style_key} style={{ marginTop: 10, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 11, padding: "10px 13px" }}>
            <b style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 13 }}>{r.name}:</b>
            <ul style={{ margin: "5px 0 0", paddingInlineStart: 18, color: C.goldLight, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.75 }}>
              {trendLines(r).map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        ))}
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 11.5, fontStyle: "italic", marginTop: 8 }}>
          המערכת מסכמת בלבד. יצירת סגנון חדש (style_v2…) — ההחלטה והעיצוב שלך, בכפתור «➕ סגנון חדש».
        </div>
      </div>

      {/* 3. ניתוחים אחרונים — הדירוג שלך */}
      <div style={box}>
        <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 14.5, fontWeight: 800, marginBottom: 10 }}>📝 ניתוחים אחרונים — דרג ולמד את המערכת</div>
        <div style={{ display: "grid", gap: 8 }}>
          {recent.map(l => (
            <div key={l.id} style={{ background: C.surface, border: `1px solid ${l.admin_rating === 1 ? "rgba(76,175,125,0.5)" : l.admin_rating === -1 ? "rgba(220,90,90,0.5)" : C.border}`, borderRadius: 11, padding: "9px 13px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                <b style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 13.5 }}>{l.subject || "—"}</b>
                <span style={pill(C.goldBright)}>{l.kind}</span>
                <span style={{ color: C.muted, fontSize: 11 }}>{l.engine} · {l.style_key}</span>
                <span style={{ color: C.muted, fontSize: 11 }}>{new Date(l.created_at).toLocaleString("he-IL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                {(l.up_votes > 0 || l.down_votes > 0) && <span style={{ color: C.muted, fontSize: 11 }}>גולשים: {l.up_votes}👍 {l.down_votes}👎</span>}
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
      </>}
    </div>
  );
}
