import React, { useState } from "react";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { ENTITY_ICON } from "../lib/research/entity.js";

// פאנל בודד — מודול עצמאי (Panel Registry).
function Panel({ icon, title, extra, children, bare }) {
  if (bare) return <div className="rw-pb bare">{children}</div>;
  return (
    <div className="rw-panel">
      <div className="rw-ph"><span>{icon} {title}</span>{extra != null && <span className="rw-muted" style={{ fontWeight: 600 }}>{extra}</span>}</div>
      <div className="rw-pb">{children}</div>
    </div>
  );
}

// 🧠 ResearchCenter — מערכת פאנלים (registry). מוסיפים פאנל עתידי בשורה אחת.
// variant: 'tools' (ימין) · 'context' (שמאל) · undefined (הכל — מובייל)
// tabbed: השמאל כטאבים — פשוט וברור (טאב אחד פעיל) אך משוכלל (badge · נשמר · נפתח לטאב מהמסילה).
// כשטאבים — activeTab/onTab מנוהלים מבחוץ (השלד) כדי שהמסילה תפתח ישר לטאב.
export default function ResearchCenter({ variant, tabbed, activeTab, onTab }) {
  const { cart = [], saved = [], removeFromResearch } = useResearch();
  const [localTab, setLocalTab] = useState("me");
  const tab = activeTab ?? localTab;
  const setTab = onTab ?? setLocalTab;

  const PANELS = [
    { id: "me", icon: "👤", label: "אני", render: bare => (
      <Panel icon="👤" title="אני" extra="עובד מקומית" bare={bare}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="rw-av" style={{ width: 38, height: 38 }}>א</div>
          <div><div style={{ fontWeight: 800 }}>שלום, אורח</div><div className="rw-muted">ללא הרשמה · נשמר בדפדפן</div></div>
        </div>
      </Panel>
    ) },
    { id: "active", icon: "🧠", label: "מחקר", badge: () => cart.length, render: bare => (
      <Panel icon="🧠" title="המחקר הפעיל" extra={cart.length || null} bare={bare}>
        {cart.length === 0
          ? <div className="rw-empty">לחצו «➕ הוסף למחקר» על מספר · ביטוי · פוסט — והם יצטברו כאן, ויישארו גם כשתעברו כלי.</div>
          : <>
              {cart.map((e, i) => (
                <React.Fragment key={e.id}>
                  {i > 0 && <div className="rw-arrow">↓</div>}
                  <span className="rw-chip" title="הסר מהמחקר" style={{ cursor: "pointer" }} onClick={() => removeFromResearch?.(e.id)}>
                    {ENTITY_ICON[e.type] || "•"} {e.title}
                  </span>
                </React.Fragment>
              ))}
              <div className="rw-cta"><button className="b1">🤖 נתח</button><button className="b2">✦ הצלב</button></div>
            </>}
      </Panel>
    ) },
    { id: "saved", icon: "📂", label: "שמורים", badge: () => saved.length, render: bare => (
      <Panel icon="📂" title="שמורים" extra={saved.length || null} bare={bare}>
        {saved.length === 0
          ? <div className="rw-empty">השמורים שלך יופיעו כאן — לחצו ⭐ על כל ישות.</div>
          : saved.slice(0, 8).map(e => <div className="rw-savei" key={e.id}>{ENTITY_ICON[e.type] || "•"} <span>{e.title}</span></div>)}
      </Panel>
    ) },
    { id: "whatsnew", icon: "🔔", label: "חדש", render: bare => (
      <Panel icon="🔔" title="מה מחפשים עכשיו" bare={bare}>
        <div className="rw-hot">🔥 הכי מחופש היום: 86</div>
      </Panel>
    ) },
    { id: "ai", icon: "🤖", label: "AI", render: bare => (
      <Panel icon="🤖" title="AI" bare={bare}>
        <div className="rw-muted">{cart.length ? `המשך מהמקום שעצרת — מחקר עם ${cart.length} פריטים.` : "התחילו מחקר, ואעזור לחבר את הקשרים."}</div>
      </Panel>
    ) },
    { id: "roadmap", icon: "🗺️", label: "מפה", render: bare => (
      <Panel icon="🗺️" title="לאן אפשר להגיע" bare={bare}>
        <div className="rw-future" style={{ marginTop: 0, borderTop: "none", paddingTop: 0 }}>
          <div className="lk">🕸️ מפת הקשרים <span className="rw-adv">מתקדם</span></div>
          <div className="rw-exp">רואים <b>איך כל מספר · פסוק · פוסט מחוברים</b> ברשת אחת. נפתח בשלב מתקדם.</div>
          <div className="lk">⏱️ ציר הזמן שלי <span className="rw-adv">מתקדם</span></div>
          <div className="rw-exp">כל מה שחקרת, <b>מסודר לפי זמן</b> — חוזרים בקלות לכל מחקר. (מתקדם)</div>
        </div>
      </Panel>
    ) },
  ];

  const ids = variant === "tools" ? ["ai", "whatsnew"]
    : variant === "context" ? ["me", "active", "saved", "roadmap"]
    : PANELS.map(p => p.id);
  const list = PANELS.filter(p => ids.includes(p.id));

  // טאבים — שורת-טאבים (פשוט) + גוף הטאב הפעיל (משוכלל: badge חי, נשמר מבחוץ)
  if (tabbed) {
    const cur = list.find(p => p.id === tab) || list[0];
    return (
      <div className="rw-tabs">
        <div className="rw-tabbar" role="tablist">
          {list.map(p => {
            const n = p.badge?.();
            return (
              <button key={p.id} className={"rw-tab" + (cur.id === p.id ? " on" : "")} onClick={() => setTab(p.id)} title={p.label} role="tab" aria-selected={cur.id === p.id}>
                <span className="rw-tab-ic">{p.icon}</span>
                <span className="rw-tab-lb">{p.label}</span>
                {n ? <span className="rw-tab-badge">{n}</span> : null}
              </button>
            );
          })}
        </div>
        <div className="rw-tabbody">{cur.render(true)}</div>
      </div>
    );
  }

  return <>{list.map(p => <React.Fragment key={p.id}>{p.render(false)}</React.Fragment>)}</>;
}

// טאבי-השמאל (לשימוש המסילה — לפתיחה ישירה לטאב). חייב להתאים ל-context ids.
export const LEFT_TABS = [
  { id: "me", icon: "👤" }, { id: "active", icon: "🧠" }, { id: "saved", icon: "📂" }, { id: "roadmap", icon: "🗺️" },
];
