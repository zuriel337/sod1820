import React, { useState, useEffect } from "react";
import { F } from "../theme.js";
import { useThemeMode } from "../lib/themeMode.js";
import { chromeColors } from "../lib/chromeTheme.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { PUSH_CONFIGURED, pushSupported, pushPermission, enablePush } from "../lib/push.js";

// הודעת Push פשוטה — "לקבל עדכונים מהאתר?" עם כן/לא. בלי שערים/נושאים (הרשמה כללית).
// מופיע רק אם הוגדר VITE_VAPID_PUBLIC_KEY, הדפדפן תומך, הרשות עדיין 'default',
// ולא טופל בעבר. פס תחתון עדין ופעם-אחת בלבד (לא מטריד).
const KEY = "sod_push_prompt";

export default function PushPrompt() {
  const cc = chromeColors(useThemeMode());
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!PUSH_CONFIGURED || !pushSupported()) return;
    if (pushPermission() !== "default") return;       // כבר אישר/חסם → לא מנדנדים
    try { if (localStorage.getItem(KEY)) return; } catch { return; }
    const t = setTimeout(() => setShow(true), 6000);  // קצת אחרי הכניסה, לא על המסך הראשון
    return () => clearTimeout(t);
  }, []);

  const close = () => { try { localStorage.setItem(KEY, "1"); } catch { /* noop */ } setShow(false); };

  async function allow() {
    setBusy(true);
    try { await enablePush({ userId: user?.id || null, topics: [] }); } catch { /* noop */ }
    setBusy(false);
    close();
  }

  if (!show) return null;

  return (
    <div style={{
      position: "fixed", insetInline: 0, bottom: 0, zIndex: 300, direction: "rtl",
      background: cc.bgScrolled || cc.bg, borderTop: `1px solid ${cc.borderGold}`,
      backdropFilter: "blur(14px)", boxShadow: "0 -8px 30px rgba(0,0,0,0.35)",
      padding: "12px 16px",
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <span style={{ color: cc.goldLight, fontFamily: F.heading, fontSize: 14.5, fontWeight: 700 }}>
          🔔 לקבל עדכונים מהאתר?
        </span>
        <span style={{ color: cc.muted, fontFamily: F.body, fontSize: 13 }}>נודיע לכם כשעולה משהו חדש — בלי הצפה.</span>
        <div style={{ display: "flex", gap: 8, marginInlineStart: "auto" }}>
          <button onClick={allow} disabled={busy} style={{
            cursor: busy ? "wait" : "pointer", border: "none", borderRadius: 999, padding: "8px 20px",
            background: cc.accentBtn || cc.goldBright, color: cc.onAccent || "#1a0e00",
            fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, whiteSpace: "nowrap",
          }}>{busy ? "רגע…" : "כן, אשמח"}</button>
          <button onClick={close} style={{
            cursor: "pointer", border: `1px solid ${cc.border}`, borderRadius: 999, padding: "8px 16px",
            background: "transparent", color: cc.muted, fontFamily: F.heading, fontSize: 13.5, whiteSpace: "nowrap",
          }}>לא עכשיו</button>
        </div>
      </div>
    </div>
  );
}
