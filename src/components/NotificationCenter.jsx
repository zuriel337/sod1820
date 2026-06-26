import React, { useEffect, useState } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { GoldButton } from "./ui.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { NOTIFICATION_TOPICS, NOTIFICATION_CHANNELS, DEFAULT_CHANNELS } from "../lib/notifications.js";
import { getNotificationPrefs, saveNotificationPrefs } from "../lib/supabase.js";
import { PUSH_CONFIGURED, pushSupported, enablePush, disablePush } from "../lib/push.js";

// מרכז התראות — המשתמש בוחר נושאים שמעניינים אותו + ערוצים. ערוץ-אגנוסטי:
// בעתיד Push/וואטסאפ יקראו מאותו מקור. כרגע המייל הוא הערוץ הפעיל.
export default function NotificationCenter() {
  const P = usePalette();
  const { user, profile } = useAuth();
  const [topics, setTopics] = useState([]);
  const [channels, setChannels] = useState(DEFAULT_CHANNELS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user) { setLoading(false); return; }
      try {
        const p = await getNotificationPrefs({ userId: user.id });
        if (!alive) return;
        if (p) {
          setTopics(Array.isArray(p.topics) ? p.topics : []);
          setChannels(Array.isArray(p.channels) && p.channels.length ? p.channels : DEFAULT_CHANNELS);
        }
      } catch { /* noop */ }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [user]);

  // Push זמין רק אם הוגדר מפתח VAPID והדפדפן תומך.
  const pushReady = PUSH_CONFIGURED && pushSupported();

  const toggleTopic = (k) => { setMsg(""); setTopics(t => t.includes(k) ? t.filter(x => x !== k) : [...t, k]); };

  async function toggleChannel(k) {
    setMsg("");
    if (k === "push") {
      if (channels.includes("push")) {
        await disablePush();
        setChannels(c => c.filter(x => x !== "push"));
      } else {
        const r = await enablePush({ userId: user.id, topics });
        if (r.ok) setChannels(c => [...c, "push"]);
        else setMsg(
          r.reason === "denied" ? "הדפדפן חסם התראות — יש לאשר בהגדרות הדפדפן"
          : r.reason === "unsupported" ? "הדפדפן לא תומך בהתראות Push"
          : "לא ניתן להפעיל התראות כרגע"
        );
      }
      return;
    }
    setChannels(c => c.includes(k) ? c.filter(x => x !== k) : [...c, k]);
  }

  async function save() {
    if (!user) return;
    setBusy(true); setMsg("");
    try {
      await saveNotificationPrefs({
        userId: user.id, topics, channels,
        email: user.email || profile?.email || null,
      });
      // אם Push פעיל — לסנכרן את נושאי המנוי לבחירה הנוכחית.
      if (channels.includes("push") && pushReady) await enablePush({ userId: user.id, topics });
      setMsg("העדפות ההתראות נשמרו ✦");
    } catch {
      setMsg("שגיאה בשמירה");
    }
    setBusy(false);
  }

  const card = {
    background: P.cardGrad,
    border: `1px solid ${P.border}`, borderTop: `3px solid ${P.accent}`,
    borderRadius: 12, padding: "28px 26px", boxShadow: `0 4px 40px ${P.glow}`, marginTop: 22,
  };

  if (!user) return null;

  return (
    <div style={card}>
      <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>🔔 מרכז ההתראות</div>
      <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12.5, marginBottom: 18 }}>
        בחרו על מה לקבל עדכונים — וכל ערוץ ישלח רק את מה שמעניין אתכם.
      </div>

      {loading ? (
        <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 13 }}>טוען…</div>
      ) : (
        <>
          {/* נושאים */}
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, marginBottom: 8 }}>נושאים</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
            {NOTIFICATION_TOPICS.map(t => {
              const on = topics.includes(t.key);
              return (
                <button key={t.key} onClick={() => toggleTopic(t.key)} style={{
                  cursor: "pointer", fontFamily: F.heading, fontSize: 13, fontWeight: 600,
                  padding: "8px 14px", borderRadius: 999,
                  border: `1px solid ${on ? P.accent : P.borderStrong}`,
                  background: on ? P.accentSoft || "rgba(212,175,55,0.15)" : P.cardSoft,
                  color: on ? P.accentText : P.accentDim,
                  transition: "all .15s",
                }}>{t.emoji} {t.label}{on ? " ✓" : ""}</button>
              );
            })}
          </div>

          {/* ערוצים */}
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, marginBottom: 8 }}>ערוצים</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {NOTIFICATION_CHANNELS.map(ch => {
              const on = channels.includes(ch.key);
              const available = ch.key === "push" ? pushReady : ch.available;
              const disabled = !available;
              const note = ch.key === "push" && !pushReady ? "בקרוב" : ch.note;
              return (
                <button key={ch.key} onClick={() => !disabled && toggleChannel(ch.key)} disabled={disabled} style={{
                  cursor: disabled ? "not-allowed" : "pointer", fontFamily: F.heading, fontSize: 13, fontWeight: 600,
                  padding: "8px 14px", borderRadius: 10,
                  border: `1px solid ${on && !disabled ? P.accent : P.borderStrong}`,
                  background: on && !disabled ? (P.accentSoft || "rgba(212,175,55,0.15)") : P.cardSoft,
                  color: disabled ? P.accentDim : (on ? P.accentText : P.accentDim),
                  opacity: disabled ? 0.55 : 1,
                }}>
                  {ch.emoji} {ch.label}{note ? ` · ${note}` : (on ? " ✓" : "")}
                </button>
              );
            })}
          </div>

          {msg && <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13, marginTop: 16 }}>{msg}</div>}

          <div style={{ marginTop: 20 }}>
            <GoldButton onClick={save} disabled={busy}>{busy ? "שומר…" : "שמירת העדפות"}</GoldButton>
          </div>
        </>
      )}
    </div>
  );
}
