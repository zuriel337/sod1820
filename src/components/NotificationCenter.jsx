import React, { useEffect, useState } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { GoldButton } from "./ui.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { ONBOARDING_GATES, gatesToTopics } from "../lib/notifications.js";
import { getNotificationPrefs, saveNotificationPrefs } from "../lib/supabase.js";
import { PUSH_CONFIGURED, pushSupported, enablePush, disablePush } from "../lib/push.js";
import { trackConversion } from "../lib/marketing.js";

// "הזרם שלך" — עריכת השערים (אותה שפה כמו טקס הכניסה) + עוצמת זרם + מצב שקט.
// אין תגיות טכניות למשתמש: שער = קבוצת topics (gatesToTopics). 7 התגיות פנימיות בלבד.
const INTENSITY = [
  { key: "low", label: "מעט" },
  { key: "normal", label: "רגיל" },
  { key: "high", label: "הרבה" },
];

export default function NotificationCenter() {
  const P = usePalette();
  const { user, profile } = useAuth();
  const [gates, setGates] = useState([]);
  const [intensity, setIntensity] = useState("normal");
  const [mutedUntil, setMutedUntil] = useState(null);
  const [pushOn, setPushOn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const pushReady = PUSH_CONFIGURED && pushSupported();

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user) { setLoading(false); return; }
      try {
        const p = await getNotificationPrefs({ userId: user.id });
        if (!alive) return;
        if (p) {
          const t = Array.isArray(p.topics) ? p.topics : [];
          setGates(ONBOARDING_GATES.filter(g => g.topics.every(x => t.includes(x))).map(g => g.key));
          setIntensity(p.intensity || "normal");
          setMutedUntil(p.muted_until || null);
          setPushOn(Array.isArray(p.channels) && p.channels.includes("push"));
        }
      } catch { /* noop */ }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [user]);

  const toggleGate = (k) => { setMsg(""); setGates(g => g.includes(k) ? g.filter(x => x !== k) : [...g, k]); };

  const isMuted = mutedUntil && new Date(mutedUntil).getTime() > Date.now();

  // בונה את אובייקט הזהות + ה-row לשמירה (לפי הבחירה הנוכחית).
  function buildSave(extra = {}) {
    const topics = gatesToTopics(gates);
    const channels = pushOn ? ["email", "push"] : ["email"];
    return { userId: user.id, topics, channels, intensity, mutedUntil, email: user.email || profile?.email || null, ...extra };
  }

  async function save() {
    if (!user) return;
    setBusy(true); setMsg("");
    try {
      await saveNotificationPrefs(buildSave());
      if (pushOn && pushReady) await enablePush({ userId: user.id, topics: gatesToTopics(gates) });
      setMsg("הזרם שלך עודכן ✦");
    } catch { setMsg("שגיאה בשמירה"); }
    setBusy(false);
  }

  // מצב שקט — נאכף מיד (שמירה ישירה), חוזר אוטומטית אחרי 24 שעות.
  async function toggleQuiet() {
    if (!user) return;
    setBusy(true); setMsg("");
    const next = isMuted ? null : new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    try {
      await saveNotificationPrefs(buildSave({ mutedUntil: next }));
      setMutedUntil(next);
      setMsg(next ? "הזרם הושהה ל-24 שעות 🔕" : "הזרם חודש ✦");
    } catch { setMsg("שגיאה"); }
    setBusy(false);
  }

  async function togglePush() {
    setMsg("");
    if (pushOn) { await disablePush(); setPushOn(false); return; }
    const r = await enablePush({ userId: user.id, topics: gatesToTopics(gates) });
    if (r.ok) { setPushOn(true); trackConversion("push_enabled", { source: "notification-center" }); }
    else setMsg(r.reason === "denied" ? "הדפדפן חסם התראות" : "לא ניתן להפעיל התראות כרגע");
  }

  if (!user) return null;

  const card = {
    background: P.cardGrad, border: `1px solid ${P.border}`, borderTop: `3px solid ${P.accent}`,
    borderRadius: 12, padding: "28px 26px", boxShadow: `0 4px 40px ${P.glow}`, marginTop: 22, scrollMarginTop: 80,
  };
  const sectionLabel = { color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 1, margin: "20px 0 10px" };
  const soft = P.accentSoft || "rgba(212,175,55,0.15)";

  return (
    <div id="notifications" style={card}>
      <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 19, fontWeight: 800 }}>🌊 הזרם שלך</div>
      <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12.5, marginTop: 3 }}>
        שולטים בזרם — אילו שערים פתוחים, באיזו עוצמה, ומתי שקט.
      </div>

      {loading ? (
        <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 13, marginTop: 16 }}>טוען…</div>
      ) : (
        <>
          {/* השערים שלך */}
          <div style={sectionLabel}>השערים שלך</div>
          <div style={{ display: "grid", gap: 10 }}>
            {ONBOARDING_GATES.map(g => {
              const on = gates.includes(g.key);
              return (
                <div key={g.key} onClick={() => toggleGate(g.key)} style={{
                  cursor: "pointer", borderRadius: 12, padding: "13px 15px", display: "flex", alignItems: "center", gap: 12,
                  border: `1px solid ${on ? P.accent : P.borderStrong}`,
                  background: on ? soft : P.cardSoft,
                  boxShadow: on ? `0 0 22px ${P.glow}` : "none", transition: "all .15s",
                }}>
                  <span style={{ fontSize: 26 }}>{g.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: on ? P.accentText : P.ink, fontFamily: F.regal, fontSize: 16, fontWeight: 700 }}>{g.title}</div>
                    <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12.5, marginTop: 2 }}>{g.desc}</div>
                  </div>
                  <span style={{ color: on ? P.accentText : P.accentDim, fontFamily: F.heading, fontSize: 13, fontWeight: 700 }}>{on ? "פעיל ✓" : "כבוי"}</span>
                </div>
              );
            })}
          </div>

          {/* עוצמת זרם */}
          <div style={sectionLabel}>עוצמת זרם</div>
          <div style={{ display: "flex", gap: 8 }}>
            {INTENSITY.map(it => {
              const on = intensity === it.key;
              return (
                <button key={it.key} onClick={() => { setMsg(""); setIntensity(it.key); }} style={{
                  flex: 1, cursor: "pointer", fontFamily: F.heading, fontSize: 14, fontWeight: 700, padding: "10px 0", borderRadius: 10,
                  border: `1px solid ${on ? P.accent : P.borderStrong}`, background: on ? soft : P.cardSoft,
                  color: on ? P.accentText : P.accentDim,
                }}>{it.label}</button>
              );
            })}
          </div>

          {/* מצב שקט */}
          <div style={sectionLabel}>מצב שקט</div>
          <button onClick={toggleQuiet} disabled={busy} style={{
            width: "100%", cursor: busy ? "wait" : "pointer", fontFamily: F.heading, fontSize: 14, fontWeight: 700, padding: "12px 0", borderRadius: 10,
            border: `1px solid ${isMuted ? P.accent : P.borderStrong}`, background: isMuted ? soft : P.cardSoft,
            color: isMuted ? P.accentText : P.accentDim,
          }}>
            {isMuted ? `🔕 מושהה — חידוש זרם` : "🔕 השהיית זרם ל-24 שעות"}
          </button>
          {isMuted && <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, marginTop: 6 }}>חוזר אוטומטית: {new Date(mutedUntil).toLocaleString("he-IL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>}

          {/* Push — toggle משני עדין */}
          {pushReady && (
            <button onClick={togglePush} style={{
              marginTop: 18, cursor: "pointer", fontFamily: F.heading, fontSize: 13, fontWeight: 600, padding: "8px 14px", borderRadius: 999,
              border: `1px solid ${pushOn ? P.accent : P.borderStrong}`, background: pushOn ? soft : "transparent", color: pushOn ? P.accentText : P.accentDim,
            }}>🔔 התראות בדפדפן {pushOn ? "✓" : ""}</button>
          )}

          {msg && <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13, marginTop: 16 }}>{msg}</div>}

          <div style={{ marginTop: 20 }}>
            <GoldButton onClick={save} disabled={busy}>{busy ? "שומר…" : "שמירת הזרם"}</GoldButton>
          </div>
        </>
      )}
    </div>
  );
}
