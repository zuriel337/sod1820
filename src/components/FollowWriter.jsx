import React, { useEffect, useState, useCallback } from "react";
import { F } from "../theme.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { getVisitorId } from "../lib/tracking.js";
import { getNotificationPrefs, saveNotificationPrefs } from "../lib/supabase.js";
import { trackConversion } from "../lib/marketing.js";

// 🔔 מעקב אחרי כתב — עץ אחד (canonical_ui_components_law): אין טבלת-מעקב מקבילה. המעקב נשמר
// כנושא `author:<display_name>` ב-notification_prefs — אותו מנגנון בדיוק של PostFollowBox. מחובר =
// user_id · אנונימי = visitor_id (נתבע אוטומטית בהתחברות, claimVisitorPrefs). חיכוך מינימלי:
// לחיצה אחת עוקבת, בלי לבקש מייל; אם יש מייל/ערוץ — יקבל עדכונים, אחרת המעקב נשמר עד שיוסיף ערוץ.
export default function FollowWriter({ name, P, compact = false }) {
  const { user } = useAuth();
  const topic = name ? `author:${name}` : null;
  const [prefs, setPrefs] = useState(null);
  const [busy, setBusy] = useState(false);
  const following = !!prefs?.topics?.includes(topic);

  const idObj = user?.id ? { userId: user.id } : { visitorId: getVisitorId() };
  const load = useCallback(() => {
    if (!topic) return;
    getNotificationPrefs(idObj)
      .then(p => setPrefs(p || { topics: [], channels: [] }))
      .catch(() => setPrefs({ topics: [], channels: [] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, user?.id]);
  useEffect(() => { load(); }, [load]);

  async function toggle() {
    if (!topic || busy) return;
    setBusy(true);
    const cur = prefs || { topics: [], channels: [] };
    const has = (cur.topics || []).includes(topic);
    const topics = has ? cur.topics.filter(t => t !== topic) : [...(cur.topics || []), topic];
    setPrefs({ ...cur, topics });   // אופטימי
    try {
      await saveNotificationPrefs({
        ...idObj, topics,
        channels: cur.channels?.length ? cur.channels : (user?.email ? ["email"] : []),
        email: cur.email || user?.email || null,
      });
      if (!has) trackConversion("follow", { source: "researcher" });
    } catch {
      load();   // כשל → חזרה למצב-האמת
    } finally {
      setBusy(false);
    }
  }

  if (!topic) return null;
  const on = following;
  return (
    <button onClick={toggle} disabled={busy} aria-pressed={on}
      title={on ? `עוקבים אחרי ${name} — לחצו לביטול` : `קבלו עדכון כש-${name} מוסיף רמז חדש`}
      style={{
        cursor: busy ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 6,
        minHeight: 40, padding: compact ? "7px 15px" : "9px 18px", borderRadius: 999,
        fontFamily: F.heading, fontSize: 13, fontWeight: 800, whiteSpace: "nowrap",
        border: `1px solid ${on ? P.accent : "transparent"}`,
        background: on ? P.glow : P.accentBtn,
        color: on ? P.accentText : (P.onAccent || "#1a0e00"),
      }}>
      {on ? "🔔 עוקבים ✓" : "🔔 עקבו"}
    </button>
  );
}
