import React, { useState, useEffect, useRef } from "react";
import { F } from "../theme.js";
import { getVisitorId } from "../lib/tracking.js";
import { subscribeEmail, saveNotificationPrefs } from "../lib/supabase.js";
import { ONBOARDING_GATES, ONBOARDING_INTENTS, gatesToTopics } from "../lib/notifications.js";

// 👑 טקס כניסה — 3 שלבים לשער המציאות (סגנון אפליקציית AI עתידית).
// השערים = עדשה מעל notification_prefs (עץ אחד). מייל נאסף בשלב 3 ("נעילת הזרם").
// onDone() נקרא בסיום/דילוג — הקורא אחראי לסמן שנראה ולנווט.

const SYNC_LINES = [
  "מכייל זרם מידע…",
  "מסנכרן שערים…",
  "מחבר אותך למערכת…",
  "מייצר התאמה אישית…",
];

export default function OnboardingRitual({ onDone }) {
  const [step, setStep] = useState(1);
  const [intent, setIntent] = useState(null);   // שלב 1 — בחירה רכה
  const [gates, setGates] = useState([]);        // שלב 2 — שערים שנבחרו
  const [email, setEmail] = useState("");
  const [syncDone, setSyncDone] = useState(false); // שלב 3 — האנימציה הסתיימה
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [finished, setFinished] = useState(false); // מסך הפתיחה (post-onboarding)

  const finish = (skip = false) => { try { localStorage.setItem("sod_onboarded", "1"); } catch { /* noop */ } onDone?.(skip); };

  // ── שלב 1: בחירת כוונה → מסמן שער מראש ומתקדם ──
  function pickIntent(key) {
    setIntent(key);
    setGates(g => (g.includes(key) ? g : [...g, key]));
  }

  const toggleGate = (key) => setGates(g => g.includes(key) ? g.filter(x => x !== key) : [...g, key]);
  const openAll = () => setGates(ONBOARDING_GATES.map(g => g.key));

  // ── שלב 3: אנימציית סנכרון (typing) ואז חשיפת שדה המייל ──
  const [lines, setLines] = useState([]);
  const timers = useRef([]);
  useEffect(() => {
    if (step !== 3) return;
    setLines([]); setSyncDone(false);
    SYNC_LINES.forEach((ln, i) => {
      timers.current.push(setTimeout(() => setLines(prev => [...prev, ln]), 650 * (i + 1)));
    });
    timers.current.push(setTimeout(() => setSyncDone(true), 650 * (SYNC_LINES.length + 1)));
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  }, [step]);

  // ── שמירה: שערים → נושאים → notification_prefs (+ מייל ל-subscribers) ──
  async function complete(withEmail) {
    setErr("");
    if (withEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setErr("נא להזין מייל תקין (או להמשיך בלי)"); return; }
    setBusy(true);
    try {
      const topics = gatesToTopics(gates.length ? gates : ONBOARDING_GATES.map(g => g.key));
      const mail = withEmail ? email.trim() : null;
      if (mail) { try { await subscribeEmail({ email: mail, source: "onboarding" }); } catch { /* noop */ } }
      await saveNotificationPrefs({ visitorId: getVisitorId(), topics, channels: ["email"], email: mail });
      setFinished(true);
    } catch {
      setErr("משהו השתבש — נסו שוב");
    } finally {
      setBusy(false);
    }
  }

  // ===== עיצוב — Dark futuristic =====
  const GOLD = "#e8c84a", BLUE = "#5b8cff", PURPLE = "#9a6cff", INK = "#e8eaf2", DIM = "#8b90a8";
  const overlay = {
    position: "fixed", inset: 0, zIndex: 9999, direction: "rtl",
    background: "radial-gradient(1200px 800px at 50% -10%, rgba(90,140,255,0.10), transparent 60%), radial-gradient(900px 700px at 50% 110%, rgba(154,108,255,0.10), transparent 60%), #05060A",
    display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 18px",
    overflowY: "auto",
  };
  const wrap = { maxWidth: 600, width: "100%", textAlign: "center", animation: "sod-fade .5s ease both" };
  const h1 = { color: INK, fontFamily: F.regal, fontWeight: 800, fontSize: "clamp(26px,5vw,40px)", lineHeight: 1.2, margin: "0 0 12px", letterSpacing: 0.5 };
  const sub = { color: GOLD, fontFamily: F.heading, fontSize: "clamp(14px,2.4vw,16px)", margin: "0 0 22px", letterSpacing: 0.5 };
  const body = { color: DIM, fontFamily: F.body, fontSize: 15.5, lineHeight: 1.9, maxWidth: 440, margin: "0 auto 26px" };
  const primary = {
    cursor: "pointer", border: "none", borderRadius: 999, padding: "13px 34px",
    background: `linear-gradient(135deg, ${GOLD}, #f3dd7e)`, color: "#0a0a12",
    fontFamily: F.heading, fontWeight: 800, fontSize: 16, letterSpacing: 0.5,
    boxShadow: `0 0 28px rgba(232,200,74,0.4)`, animation: "sod-glow 2.6s ease-in-out infinite",
  };
  const skip = { background: "none", border: "none", color: "#5a6080", fontFamily: F.heading, fontSize: 12.5, cursor: "pointer", letterSpacing: 0.5 };
  const styleTag = (
    <style>{`
      @keyframes sod-fade { from { opacity:0; transform:translateY(10px);} to {opacity:1; transform:none;} }
      @keyframes sod-glow { 0%,100%{ box-shadow:0 0 22px rgba(232,200,74,0.32);} 50%{ box-shadow:0 0 40px rgba(232,200,74,0.6);} }
      @keyframes sod-pulse { 0%,100%{ transform:scale(1); opacity:.85;} 50%{ transform:scale(1.06); opacity:1;} }
      @keyframes sod-ring { 0%{ transform:scale(.6); opacity:.7;} 100%{ transform:scale(1.8); opacity:0;} }
      @keyframes sod-blink { 0%,100%{opacity:1;} 50%{opacity:0;} }
      .sod-gate { cursor:pointer; border-radius:16px; padding:18px 16px; text-align:right; transition:all .18s; background:rgba(255,255,255,0.03); }
      .sod-gate:hover { transform:translateY(-2px); }
    `}</style>
  );

  // ===== מסך פתיחה (post-onboarding) =====
  if (finished) {
    return (
      <div style={overlay}>{styleTag}
        <div style={wrap}>
          <div style={{ fontSize: 52, marginBottom: 10, animation: "sod-pulse 2.2s ease-in-out infinite" }}>🌌</div>
          <h1 style={h1}>הזרם שלך התחיל</h1>
          <p style={body}>מעתה תקבל עדכונים לפי השערים שבחרת. כל עדכון הוא חלק ממערכת חיה של פרשנות למציאות.</p>
          <button style={primary} onClick={() => finish(false)}>להיכנס לשדה ✦</button>
        </div>
      </div>
    );
  }

  return (
    <div style={overlay}>{styleTag}
      <div style={wrap} key={step}>

        {/* דלג — בשלבים 1-2 */}
        {step < 3 && (
          <div style={{ position: "fixed", top: 16, insetInlineStart: 18 }}>
            <button style={skip} onClick={() => finish(true)}>דלג לעולם ←</button>
          </div>
        )}

        {/* ── שלב 1 — התכווננות ── */}
        {step === 1 && (
          <>
            <div style={{ color: BLUE, fontFamily: F.heading, fontSize: 12, letterSpacing: 4, marginBottom: 14 }}>🜂 התכווננות</div>
            <h1 style={h1}>ברוך הבא ל־SOD1820</h1>
            <div style={sub}>מערכת קריאת מציאות דרך רמזים, מספרים ותודעה חיה</div>
            <p style={body}>לפני שהמערכת נפתחת, אנחנו מכוונים את הזרם שלך. לא כל משתמש רואה את אותה מציאות דרך אותו מסנן.</p>
            <div style={{ color: INK, fontFamily: F.heading, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>מה אתה מחפש כאן?</div>
            <div style={{ display: "grid", gap: 10, maxWidth: 380, margin: "0 auto 26px" }}>
              {ONBOARDING_INTENTS.map(it => {
                const on = intent === it.key;
                return (
                  <button key={it.key} onClick={() => pickIntent(it.key)} style={{
                    cursor: "pointer", borderRadius: 12, padding: "13px 18px", textAlign: "right",
                    border: `1px solid ${on ? GOLD : "rgba(255,255,255,0.12)"}`,
                    background: on ? "rgba(232,200,74,0.12)" : "rgba(255,255,255,0.03)",
                    color: on ? GOLD : INK, fontFamily: F.heading, fontSize: 15, fontWeight: 600, transition: "all .15s",
                  }}>{it.emoji} {it.label}{on ? "  ✓" : ""}</button>
                );
              })}
            </div>
            <button style={{ ...primary, opacity: intent ? 1 : 0.5 }} disabled={!intent} onClick={() => setStep(2)}>להיכנס לשלב הבא →</button>
          </>
        )}

        {/* ── שלב 2 — בחירת שערים ── */}
        {step === 2 && (
          <>
            <div style={{ color: PURPLE, fontFamily: F.heading, fontSize: 12, letterSpacing: 4, marginBottom: 14 }}>🜁 בחירת שערים</div>
            <h1 style={h1}>בחר את השערים שלך</h1>
            <p style={body}>אפשר לפתוח שער אחד בלבד, או את כולם יחד. כל שער משנה את סוג הזרם שתפגוש בתוך המערכת.</p>
            <div style={{ display: "grid", gap: 12, maxWidth: 460, margin: "0 auto 18px" }}>
              {ONBOARDING_GATES.map(g => {
                const on = gates.includes(g.key);
                return (
                  <div key={g.key} className="sod-gate" onClick={() => toggleGate(g.key)} style={{
                    border: `1px solid ${on ? GOLD : "rgba(255,255,255,0.12)"}`,
                    boxShadow: on ? `0 0 26px rgba(232,200,74,0.22)` : "none",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 28 }}>{g.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: on ? GOLD : INK, fontFamily: F.regal, fontSize: 17, fontWeight: 700 }}>{g.title}</div>
                        <div style={{ color: DIM, fontFamily: F.body, fontSize: 13, marginTop: 2 }}>{g.desc}</div>
                      </div>
                      <span style={{ color: on ? GOLD : "#4a4f6a", fontFamily: F.heading, fontSize: 13, fontWeight: 700 }}>{on ? "נפתח ✓" : "לפתוח שער"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ color: "#6a708c", fontFamily: F.body, fontSize: 12.5, marginBottom: 18 }}>מומלץ להתחיל עם שער אחד בלבד</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button style={{ ...primary, opacity: gates.length ? 1 : 0.5 }} disabled={!gates.length} onClick={() => setStep(3)}>להמשיך →</button>
              <button onClick={openAll} style={{ cursor: "pointer", borderRadius: 999, padding: "13px 26px", background: "transparent", border: `1px solid ${PURPLE}`, color: "#c4b5fd", fontFamily: F.heading, fontWeight: 700, fontSize: 15 }}>אני פותח את כל השערים</button>
            </div>
          </>
        )}

        {/* ── שלב 3 — התחברות לשדה ── */}
        {step === 3 && (
          <>
            <div style={{ position: "relative", height: 96, marginBottom: 8 }}>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 70, height: 70, borderRadius: "50%", background: `radial-gradient(circle, ${GOLD}, transparent 70%)`, animation: "sod-pulse 1.8s ease-in-out infinite" }} />
                <div style={{ position: "absolute", width: 70, height: 70, borderRadius: "50%", border: `1px solid ${BLUE}`, animation: "sod-ring 2.2s ease-out infinite" }} />
              </div>
            </div>
            <h1 style={h1}>השערים נפתחים</h1>
            <div style={{ minHeight: 120, maxWidth: 360, margin: "14px auto 22px", textAlign: "right" }}>
              {lines.map((ln, i) => (
                <div key={i} style={{ color: i === lines.length - 1 && !syncDone ? GOLD : DIM, fontFamily: F.mono, fontSize: 13.5, lineHeight: 2, animation: "sod-fade .4s ease both" }}>
                  <span style={{ color: BLUE }}>›</span> {ln}{i === lines.length - 1 && !syncDone && <span style={{ animation: "sod-blink 1s step-end infinite" }}>▌</span>}
                </div>
              ))}
              {syncDone && <div style={{ color: GOLD, fontFamily: F.regal, fontSize: 19, fontWeight: 700, marginTop: 14, textAlign: "center", animation: "sod-fade .5s ease both" }}>אתה מחובר.</div>}
            </div>

            {/* נעילת הזרם — מייל (נחשף אחרי הסנכרון) */}
            {syncDone && (
              <div style={{ animation: "sod-fade .6s ease both" }}>
                <div style={{ color: INK, fontFamily: F.regal, fontSize: 18, fontWeight: 700, marginBottom: 6 }}>לנעול את הזרם שלך</div>
                <p style={{ color: DIM, fontFamily: F.body, fontSize: 14, lineHeight: 1.8, maxWidth: 380, margin: "0 auto 16px" }}>
                  כדי לשמור את החיבור שלך למערכת, נשלח לך עדכונים מותאמים — לפי השערים שבחרת.
                </p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", maxWidth: 420, margin: "0 auto" }}>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="📧 הזן מייל" dir="ltr"
                    onKeyDown={e => e.key === "Enter" && complete(true)}
                    style={{ flex: "1 1 200px", minWidth: 180, padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: INK, fontFamily: F.body, fontSize: 15, textAlign: "center", outline: "none" }} />
                  <button style={primary} disabled={busy} onClick={() => complete(true)}>{busy ? "מסנכרן…" : "לסיים סנכרון"}</button>
                </div>
                {err && <div style={{ color: "#e0857a", fontFamily: F.body, fontSize: 13, marginTop: 10 }}>{err}</div>}
                <div style={{ marginTop: 14 }}>
                  <button style={skip} disabled={busy} onClick={() => complete(false)}>להמשיך בלי מייל</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
