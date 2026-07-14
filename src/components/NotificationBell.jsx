import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { F } from "../theme.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { useThemeMode } from "../lib/themeMode.js";
import { chromeColors } from "../lib/chromeTheme.js";
import { getMyNotifications, getUnreadCount, markNotificationRead, markAllRead } from "../lib/notifications.js";

// 🔔 פעמון ההתראות — עדשה על user_notifications (RLS מסננת לשורות המשתמש). מוצג רק למחוברים.
// לחיצה על התראה → ניווט אל «המיקום» (link) + סימון «נקרא». מקור-אמת אחד עם המודול באזור-האישי.
function fmt(ts) {
  try {
    const d = new Date(ts), now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return "עכשיו";
    if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דק׳`;
    if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שע׳`;
    if (diff < 604800) return `לפני ${Math.floor(diff / 86400)} ימים`;
    return d.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });
  } catch { return ""; }
}

export default function NotificationBell() {
  const cc = chromeColors(useThemeMode());
  const nav = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const refreshCount = useCallback(() => { getUnreadCount().then(setUnread).catch(() => {}); }, []);

  useEffect(() => {
    if (!user) { setUnread(0); setItems(null); return; }
    refreshCount();
    const onFocus = () => refreshCount();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user, refreshCount]);

  // סגירה בלחיצה בחוץ
  useEffect(() => {
    if (!open) return;
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) { setItems(await getMyNotifications()); }
  }

  async function pick(n) {
    setOpen(false);
    if (!n.read_at) { await markNotificationRead(n.id); refreshCount(); }
    if (n.link) nav(n.link);
  }

  async function readAll() {
    await markAllRead();
    setUnread(0);
    setItems(items => (items || []).map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
  }

  if (!user) return null;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={toggle} className="nav-bell" title="ההתראות שלי" aria-label={`ההתראות שלי${unread ? ` — ${unread} חדשות` : ""}`}>
        🔔
        {unread > 0 && <span className="nav-bell-dot">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0, width: "min(340px, 90vw)",
          background: cc.dropBg, backdropFilter: "blur(14px)", border: `1px solid ${cc.borderGold}`,
          borderRadius: 12, zIndex: 250, boxShadow: "0 14px 44px rgba(0,0,0,0.6)", overflow: "hidden",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderBottom: `1px solid ${cc.border}` }}>
            <span style={{ color: cc.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 800 }}>🔔 ההתראות שלי</span>
            {unread > 0 && (
              <button onClick={readAll} style={{ background: "none", border: "none", cursor: "pointer", color: cc.muted, fontFamily: F.body, fontSize: 12 }}>סמן הכל כנקרא</button>
            )}
          </div>
          <div style={{ maxHeight: "min(60vh, 420px)", overflowY: "auto" }}>
            {items === null ? (
              <div style={{ padding: 20, textAlign: "center", color: cc.muted, fontFamily: F.body, fontSize: 13 }}>טוען…</div>
            ) : !items.length ? (
              <div style={{ padding: "26px 18px", textAlign: "center", color: cc.muted, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7 }}>
                <div style={{ fontSize: 26, marginBottom: 6, opacity: 0.7 }}>🌱</div>
                אין התראות עדיין.<br />כאן יופיעו עדכונים אישיים — כמו אישור חידוש ששלחתם.
              </div>
            ) : items.map(n => (
              <button key={n.id} onClick={() => pick(n)} style={{
                display: "block", width: "100%", textAlign: "right", cursor: n.link ? "pointer" : "default",
                background: n.read_at ? "transparent" : cc.activeBg, border: "none",
                borderBottom: `1px solid ${cc.border}`, padding: "12px 14px", transition: "background .15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = cc.surface; }}
                onMouseLeave={e => { e.currentTarget.style.background = n.read_at ? "transparent" : cc.activeBg; }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                  {!n.read_at && <span style={{ width: 7, height: 7, borderRadius: "50%", background: cc.gold, flexShrink: 0 }} />}
                  <span style={{ flex: 1, color: cc.goldBright, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700 }}>{n.title}</span>
                  <span style={{ color: cc.muted, fontFamily: F.body, fontSize: 10.5, whiteSpace: "nowrap" }}>{fmt(n.created_at)}</span>
                </div>
                {n.body && <div style={{ color: cc.goldDim, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.6 }}>{n.body}</div>}
                {n.link && <div style={{ color: cc.gold, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, marginTop: 5 }}>לצפייה ←</div>}
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .nav-bell { position: relative; width: 38px; height: 38px; flex-shrink: 0; cursor: pointer; font-size: 17px; line-height: 1;
          background: ${cc.chipBg}; border: 1px solid ${cc.borderGold}; border-radius: 10px; color: ${cc.goldBright};
          display: inline-flex; align-items: center; justify-content: center;
          transition: transform 0.2s, box-shadow 0.2s, background 0.2s; }
        .nav-bell:hover { transform: scale(1.06); box-shadow: 0 0 16px rgba(212,175,55,0.3); background: ${cc.surface}; }
        .nav-bell-dot { position: absolute; top: -5px; left: -5px; min-width: 17px; height: 17px; padding: 0 4px;
          background: #d64545; color: #fff; border-radius: 999px; font-family: ${F.heading}; font-size: 10px; font-weight: 800;
          display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 0 0 2px ${cc.bg}; }
      `}</style>
    </div>
  );
}
