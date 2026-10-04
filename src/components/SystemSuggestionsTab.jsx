// 🧠 המלצות המערכת (system_suggestions_law) — Observe→Detect→Suggest→Explain→Decide.
// החוק בראש המערכת: «המערכת לעולם אינה משנה את עצמה. היא רק לומדת, מסבירה ומציעה.»
// כל כרטיס: Confidence · Reason · Observed · Estimated Impact · קבל/דחה/המתן.
// כולל הגדרות-התראה (השומר): ערוץ וואטסאפ/אימייל + «שלח לי דייג'סט עכשיו».
import React, { useState, useEffect, useCallback } from "react";
import { C, F } from "../theme.js";
import { adminSuggestionsList, adminSuggestionDecide, adminNotifyGet, adminNotifySet, adminFireWatchman } from "../lib/supabase.js";

const box = { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px" };
const pill = (c) => ({ display: "inline-block", background: c + "22", border: `1px solid ${c}`, color: c, borderRadius: 999, padding: "2px 10px", fontSize: 11.5, fontWeight: 800, fontFamily: F.heading });

const CAT = {
  ai: { emoji: "🤖", label: "AI · סגנון", color: "#3ea6ff" },
  ux: { emoji: "🎯", label: "UX · חוויה", color: "#c9a227" },
  research: { emoji: "🔬", label: "מחקר", color: "#4caf7d" },
  performance: { emoji: "⚡", label: "ביצועים/עלות", color: "#e0803a" },
  knowledge: { emoji: "🌳", label: "ידע", color: "#8a63f4" },
};
const STATUS_TABS = [["pending", "⏳ ממתינות"], ["accepted", "✅ התקבלו"], ["rejected", "❌ נדחו"], ["later", "🕒 להמתין"]];

export default function SystemSuggestionsTab() {
  const [tab, setTab] = useState("pending");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [notify, setNotify] = useState([]);
  const [waTarget, setWaTarget] = useState("");
  const [msg, setMsg] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [decisionBusy, setDecisionBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [it, nt] = await Promise.all([adminSuggestionsList(tab, 80), adminNotifyGet()]);
    setItems(it); setNotify(nt);
    const wa = (nt || []).find(n => n.channel === "whatsapp");
    setWaTarget(wa?.target || "");
    setLoading(false);
  }, [tab]);
  useEffect(() => { load(); }, [load]);

  const decide = async (id, status) => {
    if (decisionBusy != null) return;
    setDecisionBusy(id); setDecisionError("");
    try {
      const saved = await adminSuggestionDecide(id, status);
      if (!saved) throw new Error("השרת לא אישר את שמירת ההחלטה");
      setItems(x => x.filter(i => i.id !== id));
    } catch (error) {
      setDecisionError(`ההחלטה לא נשמרה. הפריט נשאר בתור. ${error?.message || "נסה שוב"}`);
    } finally { setDecisionBusy(null); }
  };
  const email = (notify || []).find(n => n.channel === "email");
  const wa = (notify || []).find(n => n.channel === "whatsapp");

  const saveWa = async () => {
    const ok = await adminNotifySet("whatsapp", waTarget.trim() || null, !!waTarget.trim());
    setMsg(ok ? "נשמר ✓ — עכשיו הדייג'סט יגיע גם לוואטסאפ" : "שגיאה");
    load();
  };
  const toggleEmail = async () => {
    await adminNotifySet("email", email?.target || "yosiviner7@gmail.com", !email?.enabled);
    load();
  };
  const fire = async () => {
    setMsg("שולח…");
    await adminFireWatchman();
    setMsg("נשלח דייג'סט-בדיקה ✓ (בדוק אימייל/וואטסאפ; אם לא הגיע — ראה סטטוס-ערוצים למטה)");
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={box}>
        <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 16, fontWeight: 800, marginBottom: 4 }}>🧠 המלצות המערכת</div>
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.7 }}>
          המערכת <b>צופה → מזהה דפוס → מציעה → מסבירה</b>. אתה <b>מחליט</b>: קבל / דחה / המתן. חוק-על: המערכת לעולם אינה משנה את עצמה.
        </div>
      </div>

      {/* 🔔 הגדרות השומר */}
      <div style={box}>
        <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 800, marginBottom: 8 }}>🔔 השומר — התראות כשאתה לא כאן</div>
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12, lineHeight: 1.7, marginBottom: 10 }}>
          פעם בשבוע (ראשון 08:00) השומר בודק את המערכת ושולח לך דייג'סט — <b>רק אם יש משהו ששווה לדווח</b>. שקט כשאין חדש.
        </div>
        <div style={{ display: "grid", gap: 9 }}>
          {/* אימייל */}
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 11, padding: "9px 13px" }}>
            <span style={{ fontSize: 17 }}>✉️</span>
            <b style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 13 }}>אימייל</b>
            <span style={{ color: C.muted, fontSize: 12 }} dir="ltr">{email?.target || "—"}</span>
            <button onClick={toggleEmail} style={{ marginInlineStart: "auto", cursor: "pointer", ...pill(email?.enabled ? "#4caf7d" : "#888") }}>{email?.enabled ? "פעיל" : "כבוי"}</button>
          </div>
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 11, marginTop: -4, paddingInlineStart: 4 }}>
            ⚠️ שליחת האימייל דורשת <b>RESEND_API_KEY</b> ב-Edge Secrets. אם הדייג'סט לא מגיע במייל — המפתח חסר/פג; הוסף אותו ב-Supabase → Edge Functions → Secrets.
          </div>
          {/* וואטסאפ */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 11, padding: "9px 13px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
              <span style={{ fontSize: 17 }}>📱</span>
              <b style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 13 }}>וואטסאפ פרטי</b>
              <span style={{ ...pill(wa?.enabled && wa?.target ? "#4caf7d" : "#888") }}>{wa?.enabled && wa?.target ? "פעיל" : "לא מוגדר"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginTop: 8 }}>
              <input value={waTarget} onChange={e => setWaTarget(e.target.value)} placeholder="972501234567@c.us (המספר שלך בפורמט Green API)" dir="ltr"
                style={{ flex: "1 1 240px", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 9, color: C.goldLight, fontFamily: F.body, fontSize: 13, padding: "8px 11px" }} />
              <button onClick={saveWa} style={{ cursor: "pointer", background: "rgba(76,175,125,0.14)", border: "1px solid rgba(76,175,125,0.55)", color: "#7fd49a", borderRadius: 999, padding: "8px 16px", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800 }}>שמור</button>
            </div>
            <div style={{ color: C.muted, fontFamily: F.body, fontSize: 11, marginTop: 6 }}>
              המספר נשמר בשרת בלבד ולא נחשף באתר לעולם. פורמט: קידומת בינ״ל בלי + ואז <code dir="ltr">@c.us</code>.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={fire} style={{ cursor: "pointer", background: "linear-gradient(135deg,#e3c259,#c9a227)", border: "none", color: "#2a1e00", borderRadius: 999, padding: "8px 18px", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800 }}>📤 שלח לי דייג'סט עכשיו (בדיקה)</button>
            {msg && <span style={{ color: C.muted, fontFamily: F.body, fontSize: 12 }}>{msg}</span>}
          </div>
        </div>
      </div>

      {/* טאבי-סטטוס */}
      {decisionError ? <p role="alert">{decisionError}</p> : null}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {STATUS_TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{ cursor: "pointer", background: tab === k ? "rgba(212,175,55,0.14)" : "transparent", border: `1px solid ${tab === k ? C.borderGold : C.border}`, color: tab === k ? C.goldBright : C.muted, borderRadius: 999, padding: "6px 14px", fontFamily: F.heading, fontWeight: 700, fontSize: 12.5 }}>{label}</button>
        ))}
      </div>

      {loading ? <div style={{ color: C.muted, textAlign: "center", padding: 20 }}>טוען…</div> : (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map(s => {
            const cat = CAT[s.category] || { emoji: "💡", label: s.category, color: C.goldBright };
            const conf = s.confidence ?? null;
            const confColor = conf == null ? "#888" : conf >= 80 ? "#4caf7d" : conf >= 55 ? "#c9a227" : "#e0803a";
            return (
              <div key={s.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 13, padding: "13px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 7 }}>
                  <span style={pill(cat.color)}>{cat.emoji} {cat.label}</span>
                  {conf != null && <span style={pill(confColor)}>ביטחון {conf}%</span>}
                  {s.sample_size > 0 && <span style={{ color: C.muted, fontSize: 11.5, fontFamily: F.body }}>מדגם: {s.sample_size}</span>}
                  <span style={{ color: C.muted, fontSize: 11, marginInlineStart: "auto" }}>{new Date(s.created_at).toLocaleDateString("he-IL", { day: "numeric", month: "short" })}</span>
                </div>
                <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 16, fontWeight: 800, marginBottom: 5 }}>{s.title}</div>
                {s.reason && <div style={{ color: C.goldLight, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.75, marginBottom: 6 }}><b style={{ color: C.muted }}>למה: </b>{s.reason}</div>}
                {s.estimated_impact && <div style={{ color: "#7fd49a", fontFamily: F.body, fontSize: 12.5, marginBottom: 6 }}>📈 {s.estimated_impact}</div>}
                {s.observed && (
                  <div style={{ marginBottom: 8 }}>
                    <button onClick={() => setOpenId(openId === s.id ? null : s.id)} style={{ cursor: "pointer", background: "none", border: "none", color: C.muted, fontFamily: F.body, fontSize: 11.5, textDecoration: "underline" }}>
                      {openId === s.id ? "הסתר נתונים ▴" : "הצג את הנתונים (Observed) ▾"}
                    </button>
                    {openId === s.id && <pre dir="ltr" style={{ marginTop: 6, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 9, padding: "8px 11px", color: C.muted, fontSize: 11.5, overflowX: "auto", whiteSpace: "pre-wrap" }}>{JSON.stringify(s.observed, null, 2)}</pre>}
                  </div>
                )}
                {tab === "pending" && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button disabled={decisionBusy != null} onClick={() => decide(s.id, "accepted")} style={{ cursor: "pointer", background: "rgba(76,175,125,0.14)", border: "1px solid rgba(76,175,125,0.55)", color: "#7fd49a", borderRadius: 999, padding: "6px 16px", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800 }}>✅ קבל</button>
                    <button disabled={decisionBusy != null} onClick={() => decide(s.id, "rejected")} style={{ cursor: "pointer", background: "rgba(220,90,90,0.12)", border: "1px solid rgba(220,90,90,0.5)", color: "#e88", borderRadius: 999, padding: "6px 16px", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800 }}>❌ דחה</button>
                    <button disabled={decisionBusy != null} onClick={() => decide(s.id, "later")} style={{ cursor: "pointer", background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 999, padding: "6px 16px", fontFamily: F.heading, fontSize: 12.5 }}>🕒 המתן לעוד נתונים</button>
                  </div>
                )}
                {tab !== "pending" && s.decided_at && <div style={{ color: C.muted, fontSize: 11.5, fontFamily: F.body }}>הוחלט: {new Date(s.decided_at).toLocaleDateString("he-IL")}{s.decision_note ? ` · ${s.decision_note}` : ""}{tab !== "accepted" && <button disabled={decisionBusy != null} onClick={() => decide(s.id, "pending")} style={{ marginInlineStart: 8, cursor: "pointer", background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 999, padding: "2px 10px", fontSize: 11 }}>↺ החזר לממתינות</button>}</div>}
              </div>
            );
          })}
          {!items.length && <div style={{ color: C.muted, textAlign: "center", padding: 16, fontFamily: F.body }}>אין המלצות בסטטוס הזה. ככל שתצטבר תנועה — הגלאים ייצרו כאן המלצות מבוססות-נתונים.</div>}
        </div>
      )}
    </div>
  );
}
