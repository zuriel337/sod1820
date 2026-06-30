import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import Ico, { PANEL_ICON, ENTITY_GLYPH } from "../lib/research/icons.jsx";

// פריט-ישות לחיץ — מנווט ליעד (e.link) אם קיים; אחרת צ'יפ פשוט. כפתור-פעולה בצד.
function EntityRow({ e, onRemove, removeIcon = "✕" }) {
  const label = <><Ico name={ENTITY_GLYPH[e.type] || "dot"} size={16} /> <span className="rw-er-t">{e.title}</span></>;
  return (
    <div className="rw-er">
      {e.link ? <Link to={e.link} className="rw-er-lk">{label}</Link> : <span className="rw-er-lk">{label}</span>}
      {onRemove && <button className="rw-er-x" title="הסר" onClick={() => onRemove(e)}>{removeIcon}</button>}
    </div>
  );
}

// פאנל בודד — מודול עצמאי (Panel Registry).
function Panel({ icon, title, extra, children, bare }) {
  if (bare) return <div className="rw-pb bare">{children}</div>;
  return (
    <div className="rw-panel">
      <div className="rw-ph"><span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>{icon} {title}</span>{extra != null && <span className="rw-muted" style={{ fontWeight: 600 }}>{extra}</span>}</div>
      <div className="rw-pb">{children}</div>
    </div>
  );
}

// 🧠 ResearchCenter — מערכת פאנלים (registry). מוסיפים פאנל עתידי בשורה אחת.
// variant: 'tools' (ימין) · 'context' (שמאל) · undefined (הכל — מובייל)
// tabbed: השמאל כטאבים — פשוט וברור (טאב אחד פעיל) אך משוכלל (badge · נשמר · נפתח לטאב מהמסילה).
// כשטאבים — activeTab/onTab מנוהלים מבחוץ (השלד) כדי שהמסילה תפתח ישר לטאב.
export default function ResearchCenter({ variant, tabbed, activeTab, onTab }) {
  const { cart = [], saved = [], pinned = [], removeFromResearch, removeSaved, togglePin } = useResearch();
  const [localTab, setLocalTab] = useState("me");
  const tab = activeTab ?? localTab;
  const setTab = onTab ?? setLocalTab;

  const PANELS = [
    { id: "me", icon: "👤", label: "אני", render: bare => (
      <Panel icon={<Ico name="user" size={17} />} title="אני" extra="עובד מקומית" bare={bare}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="rw-av" style={{ width: 38, height: 38 }}>א</div>
          <div><div style={{ fontWeight: 800 }}>שלום, אורח</div><div className="rw-muted">ללא הרשמה · נשמר בדפדפן</div></div>
        </div>
      </Panel>
    ) },
    { id: "active", icon: "🧠", label: "מחקר", badge: () => cart.length + pinned.length, render: bare => (
      <Panel icon={<Ico name="flask" size={17} />} title="המחקר הפעיל" extra={(cart.length + pinned.length) || null} bare={bare}>
        {cart.length === 0 && pinned.length === 0
          ? <div className="rw-empty">לחצו «➕ הוסף למחקר» או «📌 הצמד» על מספר · ביטוי · פוסט — והם יצטברו כאן, ויישארו גם כשתעברו כלי.</div>
          : <>
              {pinned.length > 0 && <>
                <div className="rw-sec-t">📌 מוצמדים</div>
                {pinned.map(e => <EntityRow key={e.id} e={e} onRemove={x => togglePin?.(x)} removeIcon="📌" />)}
              </>}
              {cart.length > 0 && <>
                <div className="rw-sec-t" style={{ marginTop: pinned.length ? 10 : 0 }}>🔬 במחקר עכשיו</div>
                {cart.map(e => <EntityRow key={e.id} e={e} onRemove={x => removeFromResearch?.(x.id)} />)}
              </>}
              <div className="rw-cta"><button className="b1">🤖 נתח</button><button className="b2">✦ הצלב</button></div>
            </>}
      </Panel>
    ) },
    { id: "saved", icon: "📂", label: "שמורים", badge: () => saved.length, render: bare => (
      <Panel icon={<Ico name="folder" size={17} />} title="שמורים" extra={saved.length || null} bare={bare}>
        {saved.length === 0
          ? <div className="rw-empty">השמורים שלך יופיעו כאן — לחצו ⭐ על כל ישות.</div>
          : saved.slice(0, 12).map(e => <EntityRow key={e.id} e={e} onRemove={x => removeSaved?.(x.id)} />)}
      </Panel>
    ) },
    { id: "whatsnew", icon: "🔔", label: "חדש", render: bare => (
      <Panel icon={<Ico name="bell" size={17} />} title="מה מחפשים עכשיו" bare={bare}>
        <div className="rw-hot">🔥 הכי מחופש היום: 86</div>
      </Panel>
    ) },
    { id: "ai", icon: "🤖", label: "AI", render: bare => (
      <Panel icon={<Ico name="bot" size={17} />} title="AI" bare={bare}>
        <div className="rw-muted">{cart.length ? `המשך מהמקום שעצרת — מחקר עם ${cart.length} פריטים.` : "התחילו מחקר, ואעזור לחבר את הקשרים."}</div>
      </Panel>
    ) },
    { id: "roadmap", icon: "🗺️", label: "מפה", render: bare => (
      <Panel icon={<Ico name="map" size={17} />} title="לאן אפשר להגיע" bare={bare}>
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
                <span className="rw-tab-ic"><Ico name={PANEL_ICON[p.id] || "dot"} size={19} /></span>
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
