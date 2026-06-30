import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { ENTITY_ICON } from "../lib/research/entity.js";

// 📝 פנקס-מחקר — משטח כתיבה חופשי, נשמר מסשן-לסשן (localStorage) + הדפסה/PDF.
// אנונימי = נשמר בדפדפן; סנכרון-ענן למחוברים = שדרוג עתידי (research_items).
function NotesPanel() {
  const [text, setText] = useState(() => { try { return localStorage.getItem("sod_notes_v1") || ""; } catch { return ""; } });
  const [saved, setSaved] = useState(true);
  useEffect(() => {
    setSaved(false);
    const t = setTimeout(() => { try { localStorage.setItem("sod_notes_v1", text); setSaved(true); } catch { /* noop */ } }, 500);
    return () => clearTimeout(t);
  }, [text]);
  const printNotes = () => {
    const w = window.open("", "_blank", "width=720,height=900");
    if (!w) return;
    const esc = s => s.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    w.document.write(`<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>פנקס המחקר · סוד 1820</title><style>body{font-family:'Heebo',Arial,sans-serif;padding:34px;line-height:1.85;color:#1b1d22;white-space:pre-wrap;font-size:15px}h1{font-size:18px;color:#9a7818;margin:0 0 16px}</style></head><body><h1>📝 פנקס המחקר · סוד 1820</h1>${esc(text) || "<i style='color:#999'>(ריק)</i>"}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 250);
  };
  return (
    <div>
      <textarea className="rw-notes" dir="rtl" value={text} onChange={e => setText(e.target.value)}
        placeholder="כתוב כאן מחשבות · רמזים · חישובים · שאלות מחקר… נשמר אוטומטית מסשן לסשן." />
      <div className="rw-notes-bar">
        <span className="rw-muted" style={{ fontSize: 11.5 }}>{saved ? "✓ נשמר" : "שומר…"} · {text.trim().length} תווים</span>
        <button className="rw-notes-print" onClick={printNotes} title="הדפס / שמור PDF">🖨 הדפס</button>
      </div>
    </div>
  );
}

// פריט-ישות לחיץ — מנווט ליעד (e.link) אם קיים; אחרת צ'יפ פשוט. כפתור-פעולה בצד.
function EntityRow({ e, onRemove, removeIcon = "✕" }) {
  const label = <>{ENTITY_ICON[e.type] || "•"} <span className="rw-er-t">{e.title}</span></>;
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
  const { cart = [], saved = [], pinned = [], removeFromResearch, removeSaved, togglePin } = useResearch();
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
    { id: "notes", icon: "📝", label: "פנקס", render: bare => (
      <Panel icon="📝" title="פנקס מחקר" bare={bare}>
        <NotesPanel />
      </Panel>
    ) },
    { id: "active", icon: "🧠", label: "מחקר", badge: () => cart.length + pinned.length, render: bare => (
      <Panel icon="🧠" title="המחקר הפעיל" extra={(cart.length + pinned.length) || null} bare={bare}>
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
      <Panel icon="📂" title="שמורים" extra={saved.length || null} bare={bare}>
        {saved.length === 0
          ? <div className="rw-empty">השמורים שלך יופיעו כאן — לחצו ⭐ על כל ישות.</div>
          : saved.slice(0, 12).map(e => <EntityRow key={e.id} e={e} onRemove={x => removeSaved?.(x.id)} />)}
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
    : variant === "context" ? ["me", "notes", "active", "saved", "roadmap"]
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
  { id: "me", icon: "👤" }, { id: "notes", icon: "📝" }, { id: "active", icon: "🧠" }, { id: "saved", icon: "📂" }, { id: "roadmap", icon: "🗺️" },
];
