import React from "react";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { ENTITY_ICON } from "../lib/research/entity.js";

// פאנל בודד — מודול עצמאי (Panel Registry).
function Panel({ icon, title, extra, children }) {
  return (
    <div className="rw-panel">
      <div className="rw-ph"><span>{icon} {title}</span>{extra != null && <span className="rw-muted" style={{ fontWeight: 600 }}>{extra}</span>}</div>
      <div className="rw-pb">{children}</div>
    </div>
  );
}

// 🧠 ResearchCenter — מערכת פאנלים (registry). מוסיפים פאנל עתידי בשורה אחת,
// בלי לגעת בשלד. כל הפאנלים קוראים את אותו ResearchProvider (Event Bus + Context).
// variant: 'work' (אזור עבודה — ימין) · 'personal' (אזור אישי — שמאל) · undefined (הכל — מובייל)
export default function ResearchCenter({ variant }) {
  const { cart = [], saved = [], removeFromResearch } = useResearch();

  const PANELS = [
    { id: "me", render: () => (
      <Panel icon="👤" title="אני" extra="עובד מקומית">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="rw-av" style={{ width: 38, height: 38 }}>א</div>
          <div><div style={{ fontWeight: 800 }}>שלום, אורח</div><div className="rw-muted">ללא הרשמה · נשמר בדפדפן</div></div>
        </div>
      </Panel>
    ) },
    { id: "active", render: () => (
      <Panel icon="🧠" title="המחקר הפעיל" extra={cart.length || null}>
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
    { id: "saved", render: () => (
      <Panel icon="📂" title="שמורים" extra={saved.length || null}>
        {saved.length === 0
          ? <div className="rw-empty">השמורים שלך יופיעו כאן — לחצו ⭐ על כל ישות.</div>
          : saved.slice(0, 6).map(e => <div className="rw-savei" key={e.id}>{ENTITY_ICON[e.type] || "•"} <span>{e.title}</span></div>)}
      </Panel>
    ) },
    { id: "whatsnew", render: () => (
      <Panel icon="🔔" title="מה מחפשים עכשיו">
        <div className="rw-hot">🔥 הכי מחופש היום: 86</div>
      </Panel>
    ) },
    { id: "ai", render: () => (
      <Panel icon="🤖" title="AI">
        <div className="rw-muted">{cart.length ? `המשך מהמקום שעצרת — מחקר עם ${cart.length} פריטים.` : "התחילו מחקר, ואעזור לחבר את הקשרים."}</div>
      </Panel>
    ) },
  ];

  // שמאל=context (העולם שלי: אני·המחקר הפעיל·שמורים) · ימין=tools (מנועים: AI·מה חדש)
  const ids = variant === "tools" ? ["ai", "whatsnew"]
    : variant === "context" ? ["me", "active", "saved"]
    : PANELS.map(p => p.id);
  return <>{PANELS.filter(p => ids.includes(p.id)).map(p => <React.Fragment key={p.id}>{p.render()}</React.Fragment>)}</>;
}
