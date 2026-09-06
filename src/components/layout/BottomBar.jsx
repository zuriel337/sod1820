import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { F } from "../../theme.js";
import { usePalette } from "../../lib/palette.js";
import { useAuth } from "../../lib/AuthContext.jsx";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import { makeEntity } from "../../lib/research/entity.js";
import { useUserCenter } from "../../lib/userCenter/UserCenterContext.jsx";
import { getUnreadCount } from "../../lib/notifications.js";
import { dmUnreadCount } from "../../lib/commandCenter.js";
import { useNumberDrawer, toggleNumberDrawer, closeNumberDrawer } from "../../lib/numberDrawer.js";
import { useSiteUpdates, toggleSiteUpdates, closeSiteUpdates, isSiteUpdatesRoute } from "../../lib/siteUpdates.js";
import { isBottomBarRoute } from "../../lib/bottomBar.js";

// 🧭 Bottom Bar — Experience Shell קבוע (SOD1820 BOTTOM BAR — FINAL RECONCILIATION V1).
// חשוב: launcher-shell בלבד — לא engine/store/ניווט מקביל, לא יכולת-ידע חדשה, לא AI flow חדש.
// כל slot קורא ליכולת קיימת בדיוק: Research Context (useResearch, אותו קוד כמו RoyalContextBar
// הישן) · NumberDrawer · siteUpdates/LiveChannelFeed · הניתוב הציבורי הקיים ל-RazielChat תחת
// /research · UserCenter (getUnreadCount/dmUnreadCount + open/setActive הקיימים).
// היסטוריה: מחליף גם את PR #344 (BottomBar V1, 2-slots) וגם את RoyalContextBar (הסרגל השחור,
// admin-only) — פירוט מלא/capability-parity ב-work_log task=BOTTOM_BAR_FINAL_RECONCILIATION_V1.

function contextFromLocation(pathname, search = "") {
  const parts = pathname.split("/").filter(Boolean);
  const qs = new URLSearchParams(search || "");
  if (parts[0] === "number" && parts[1]) return { kind: "מספר", label: decodeURIComponent(parts.slice(1).join("/")) };
  if (parts[0] === "topic" && parts[1]) return { kind: "נושא", label: decodeURIComponent(parts.slice(1).join("/")) };
  if (parts[0] === "journey" || parts[0] === "מסע") return { kind: "מסע", label: "המסע הנוכחי" };
  if ((parts[0] === "lab" && parts[1] === "els") || (parts[0] === "research" && qs.get("tool") === "els")) return { kind: "ELS", label: "מרחב הצופן" };
  if (parts[0] === "book") return { kind: "ספר", label: qs.get("book") || parts[1] || "מרחב הספר" };
  if (parts[0] === "heichal" || parts[0] === "היכל") return { kind: "היכל", label: "היכל" };
  if (parts.length === 1 && !["admin", "login", "profile", "credits", "buy", "research"].includes(parts[0])) return { kind: "פוסט", label: decodeURIComponent(parts[0]) };
  return { kind: "SOD1820", label: "מרחב המחקר" };
}
function lensLabel(lens) {
  const labels = { number: "מספר", topic: "נושא", post: "פוסט", els: "ELS", book: "ספר", source: "מקור", person: "אדם", name: "שם", journey: "מסע", graph: "קשרים" };
  return labels[lens] || lens || "הקשר";
}
function lensForSubject(subject) {
  if (!subject) return null;
  if (subject.type === "number" || subject.type === "phrase") return "number";
  if (subject.type === "topic" || subject.type === "convergence") return "topic";
  if (subject.type === "els" || subject.type === "code") return "els";
  if (subject.type === "book" || subject.type === "source") return "book";
  if (subject.type === "person" || subject.type === "name") return "person";
  return subject.type || null;
}

export default function BottomBar() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const P = usePalette();
  const { user } = useAuth();
  const research = useResearch();
  const { isOpen: userCenterOpen, open: openUserCenter } = useUserCenter();
  const { open: numberOpen } = useNumberDrawer();
  const { open: updatesOpen, unseen } = useSiteUpdates();
  const [panel, setPanel] = useState(null); // null | "context" | "raziel" | "more"
  const [personalUnread, setPersonalUnread] = useState(0);

  // 📛 בדג' אישי אמיתי בלבד — אותו סכום-קנוני כמו InboxAttentionCard ב-UserCenter.jsx
  // (getUnreadCount + dmUnreadCount), לא מספר-שרירותי/מומצא.
  useEffect(() => {
    if (!user) { setPersonalUnread(0); return; }
    let alive = true;
    const load = () => Promise.all([getUnreadCount(), dmUnreadCount()])
      .then(([a, b]) => { if (alive) setPersonalUnread(Math.max(0, (Number(a) || 0) + (Number(b) || 0))); })
      .catch(() => {});
    load();
    const id = setInterval(load, 60000);
    return () => { alive = false; clearInterval(id); };
  }, [user?.id]);

  if (!isBottomBarRoute(pathname)) return null;

  const dark = P.mode !== "light";
  const updatesMounted = isSiteUpdatesRoute(pathname);
  const ctx = contextFromLocation(pathname, search);

  // ⌖ כאן — אותה קריאה בדיוק ל-Research Context הקיים כמו RoyalContextBar (root/lens/selection/return).
  const root = research.context?.subject || null;
  const activeLens = research.context?.lens || null;
  const returnTo = research.context?.returnTo || null;
  const selection = research.context?.selection || null;
  const currentRef = selection?.entityId || selection?.locator || null;
  const currentType = selection?.entityType || null;
  const rootLabel = root?.label || root?.id || null;
  const rootDiffers = Boolean(root?.href && root.href !== pathname && rootLabel && rootLabel !== ctx.label);
  const contextActive = Boolean(root || selection || activeLens || returnTo);
  const currentEntity = currentType && currentRef ? makeEntity({
    type: currentType, title: ctx.label, ref: currentRef, link: `${pathname}${search || ""}`,
    metadata: { research_subject: (root && !rootDiffers) ? { id: root.id, type: root.type, label: rootLabel } : null, lens: activeLens },
  }) : null;
  const alreadyInResearch = Boolean(currentEntity && (research.cart || []).some(item => item?.id === currentEntity.id));

  const closePanels = () => setPanel(null);
  const addCurrent = () => { if (currentEntity && !alreadyInResearch) research.addToResearch?.(currentEntity); };
  const goRoot = () => {
    if (!root?.href) return;
    research.updateResearchContext?.({ selection: { entityId: root.id, entityType: root.type }, lens: lensForSubject(root), returnTo: null });
    closePanels(); navigate(root.href);
  };
  const goReturn = () => {
    if (!returnTo?.href) return;
    const target = returnTo.subject || null;
    research.updateResearchContext?.({ selection: target ? { entityId: target.id, entityType: target.type } : null, lens: target ? lensForSubject(target) : activeLens, returnTo: null });
    closePanels(); navigate(returnTo.href);
  };
  // ✦ "התחל מכאן מחקר חדש" — יכולת אמיתית מ-RoyalContextBar (startNewResearchHere), שוחזרה כאן
  // תחת כאן (שם היא שייכת מבחינה-מושגית) במקום מתחת לרזיאל כמו במקור.
  const startNewResearchHere = () => {
    if (currentType && currentRef) {
      research.setResearchContext?.({
        subject: { id: String(currentRef), type: currentType, label: ctx.label, href: `${pathname}${search || ""}` },
        selection: { entityId: selection?.entityId || null, entityType: currentType, locator: selection?.locator || null },
        lens: activeLens || lensForSubject({ type: currentType }),
        returnTo: null,
      });
    } else {
      research.clearResearchContext?.();
    }
    closePanels();
  };

  // 🧭 NumberDrawer ו-LiveChannelFeed הם overlay מלא-גובה זה-לצד-זה במובייל — מוצגים כ-mutually
  // exclusive דרך ה-owners הקיימים עצמם (close/toggle), בלי Overlay Manager חדש.
  const openNumber = () => { closePanels(); if (!numberOpen) closeSiteUpdates(); toggleNumberDrawer(); };
  const openNow = () => { closePanels(); if (updatesMounted) { if (!updatesOpen) closeNumberDrawer(); toggleSiteUpdates(); } else navigate("/broadcasts"); };
  // ✦ רזיאל — אין כאן קריאת-AI חדשה: מנווטים ל-/research הציבורי, שם RazielChat כבר חי ועובד
  // (ResearchCenter.jsx דרך ResearchShell.jsx), עם ה-Research Context המלא שכבר קיים שם.
  const openRaziel = () => { closePanels(); navigate("/research"); };
  // עוד → UserCenter הקיים בלבד. "האוסף שלי" משתמש באותו side-flag בדיוק כמו ה-"שמורים" הקיים
  // ב-UserCenter.jsx (rw_left_tab2="saved" + setActive("research")) — אין module id בשם "saved".
  const openPersonalArea = () => { closePanels(); openUserCenter(); };
  const openMyResearch = () => { closePanels(); openUserCenter("research"); };
  const openMyCollection = () => { closePanels(); try { localStorage.setItem("rw_left_tab2", "saved"); } catch { /* noop */ } openUserCenter("research"); };
  const openContinue = () => { closePanels(); navigate("/research"); };

  const items = [
    { id: "context", icon: "⌖", label: "כאן", active: panel === "context", signal: contextActive, onClick: () => setPanel(v => v === "context" ? null : "context") },
    { id: "number", icon: "123", label: "מספר", numeric: true, active: numberOpen, onClick: openNumber },
    { id: "now", icon: "◉", label: "עכשיו", active: updatesOpen, badge: unseen || 0, onClick: openNow },
    { id: "raziel", icon: "✦", label: "רזיאל", active: panel === "raziel", onClick: () => setPanel(v => v === "raziel" ? null : "raziel") },
    { id: "more", icon: "⋯", label: "עוד", active: panel === "more", badge: personalUnread, onClick: () => setPanel(v => v === "more" ? null : "more") },
  ];

  return (
    <>
      <style>{CSS(dark)}</style>
      {!userCenterOpen && panel === "context" && (
        <section className="sbb-sheet" dir="rtl">
          <div className="sbb-head"><span>⌖</span><div><small>{ctx.kind}{activeLens ? ` · עדשה: ${lensLabel(activeLens)}` : ""}</small><strong>{ctx.label}</strong></div><button onClick={closePanels} aria-label="סגור">×</button></div>
          <div className="sbb-actions">
            <button onClick={addCurrent} disabled={!currentEntity || alreadyInResearch}><b>{alreadyInResearch ? "✓" : "＋"}</b><span>{alreadyInResearch ? "במחקר" : "הוסף למחקר"}</span></button>
            <button disabled title="בקרוב"><b>◇</b><span>קשרים</span></button>
            {rootDiffers && <button onClick={goRoot}><b>↩</b><span>שורש המחקר</span></button>}
            {returnTo?.href && <button onClick={goReturn}><b>↩</b><span>חזרה</span></button>}
            <button onClick={startNewResearchHere}><b>✦</b><span>מחקר חדש מכאן</span></button>
          </div>
        </section>
      )}
      {!userCenterOpen && panel === "raziel" && (
        <section className="sbb-sheet" dir="rtl">
          <div className="sbb-head"><span>✦</span><div><small>AI · רזיאל</small><strong>איתך ב־{ctx.label}</strong></div><button onClick={closePanels} aria-label="סגור">×</button></div>
          <p className="sbb-note">רזיאל מחובר לאותו Research Context שלך — לא צ׳אט מנותק ולא שכבת-אמת מקבילה.</p>
          <button className="sbb-cta" onClick={openRaziel}>שוחח עם רזיאל ←</button>
        </section>
      )}
      {!userCenterOpen && panel === "more" && (
        <section className="sbb-sheet sbb-more-sheet" dir="rtl">
          <div className="sbb-head"><span>⋯</span><div><small>עוד</small><strong>המרחב שלך ב-SOD1820</strong></div><button onClick={closePanels} aria-label="סגור">×</button></div>
          <div className="sbb-more-grid">
            <button className="primary" onClick={openPersonalArea}><b>◉</b><span>אזור אישי</span>{personalUnread > 0 && <em>{personalUnread > 99 ? "99+" : personalUnread}</em>}</button>
            <button onClick={openMyResearch}><b>⌁</b><span>המחקר שלי</span></button>
            <button onClick={openMyCollection}><b>◇</b><span>האוסף שלי</span></button>
            <button onClick={openContinue}><b>↗</b><span>המשך</span></button>
          </div>
        </section>
      )}
      <nav className="sod-bottombar" aria-label="סרגל תחתון" dir="rtl" style={{ opacity: userCenterOpen ? 0 : 1, pointerEvents: userCenterOpen ? "none" : "auto" }}>
        {items.map(it => (
          <button key={it.id} type="button" className={"sbb-item" + (it.active ? " on" : "")} aria-pressed={!!it.active} onClick={it.onClick}>
            <span className={"sbb-i" + (it.numeric ? " numeric" : "")}>{it.icon}</span>
            <span className="sbb-l">{it.label}</span>
            {it.signal && !it.badge && <i className="sbb-signal" aria-hidden />}
            {it.badge > 0 && <em className="sbb-badge">{it.badge > 99 ? "99+" : it.badge}</em>}
          </button>
        ))}
      </nav>
    </>
  );
}

const CSS = (dark) => `
.sod-bottombar{position:fixed;z-index:500;left:50%;transform:translateX(-50%);
  bottom:calc(8px + env(safe-area-inset-bottom, 0px));width:min(540px,calc(100vw - 12px));
  display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:3px;padding:5px 6px;
  background:${dark ? "rgba(12,8,18,0.94)" : "rgba(255,255,255,0.96)"};
  border:1px solid ${dark ? "rgba(212,175,55,0.22)" : "rgba(120,90,20,0.16)"};
  border-radius:18px;box-shadow:0 10px 32px rgba(0,0,0,${dark ? ".42" : ".14"});backdrop-filter:blur(14px);
  transition:opacity .18s ease}
.sbb-item{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
  min-width:0;min-height:48px;padding:5px 3px;border:none;border-radius:12px;box-sizing:border-box;
  background:transparent;cursor:pointer;font-family:${F.ui};color:${dark ? "#cbb98a" : "#5b4a12"};
  transition:background .15s,color .15s}
.sbb-item:hover{background:${dark ? "rgba(212,175,55,0.10)" : "rgba(154,120,24,0.08)"}}
.sbb-item.on{background:${dark ? "rgba(212,175,55,0.18)" : "rgba(154,120,24,0.14)"};color:${dark ? "#f6e27a" : "#3a2a00"}}
.sbb-i{font-size:18px;line-height:1}
.sbb-i.numeric{font-family:${F.numeric};font-size:13px;font-weight:800}
.sbb-l{font-size:10.5px;font-weight:750;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.sbb-signal{position:absolute;top:5px;inset-inline-end:14px;width:5px;height:5px;border-radius:50%;
  background:${dark ? "#d4b36a" : "#8a6d1c"};box-shadow:0 0 6px currentColor}
.sbb-badge{position:absolute;top:2px;inset-inline-end:8px;min-width:16px;height:16px;padding:0 4px;
  border-radius:999px;background:#c8102e;color:#fff;font:700 9px/16px ${F.ui};text-align:center}
@media (prefers-reduced-motion:reduce){.sod-bottombar{transition:none}}
.sbb-sheet{position:fixed;z-index:501;left:50%;transform:translateX(-50%);
  bottom:calc(68px + env(safe-area-inset-bottom, 0px));width:min(440px,calc(100vw - 16px));
  padding:13px;border-radius:18px;box-sizing:border-box;font-family:${F.ui};
  border:1px solid ${dark ? "rgba(212,175,55,0.24)" : "rgba(120,90,20,0.18)"};
  background:${dark ? "rgba(9,6,14,0.98)" : "rgba(255,255,255,0.98)"};
  color:${dark ? "#f2e9d6" : "#2d2618"};box-shadow:0 18px 54px rgba(0,0,0,.36)}
.sbb-head{display:flex;align-items:center;gap:9px}
.sbb-head>span{color:#d4af37;font-size:18px}
.sbb-head div{display:flex;flex-direction:column;min-width:0}
.sbb-head small{font-size:9.5px;color:${dark ? "#bda46d" : "#7a621f"}}
.sbb-head strong{font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sbb-head>button{margin-inline-start:auto;border:none;background:transparent;color:inherit;font-size:20px;cursor:pointer;flex:0 0 auto}
.sbb-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:10px}
.sbb-actions button{min-height:46px;border:1px solid ${dark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.08)"};
  border-radius:11px;background:transparent;color:inherit;font-family:${F.ui};cursor:pointer;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
.sbb-actions button:disabled{opacity:.4;cursor:default}
.sbb-actions b{color:#d4af37;font-size:14px}
.sbb-actions span{font-size:10px}
.sbb-note{font-size:12.5px;line-height:1.6;color:${dark ? "#c9bfa8" : "#5b5142"};margin:10px 0 0}
.sbb-cta{width:100%;margin-top:10px;min-height:44px;border:none;border-radius:11px;cursor:pointer;
  font-family:${F.ui};font-weight:700;font-size:13px;color:${dark ? "#241a02" : "#241a02"};
  background:linear-gradient(135deg,#e3c259,#c9a227)}
.sbb-more-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:12px}
.sbb-more-grid button{position:relative;min-height:58px;border:1px solid ${dark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.08)"};
  border-radius:13px;background:${dark ? "rgba(255,255,255,.03)" : "rgba(0,0,0,.02)"};color:inherit;
  font-family:${F.ui};cursor:pointer;display:flex;align-items:center;gap:9px;padding:9px 11px;text-align:right}
.sbb-more-grid button.primary{grid-column:1 / -1;background:${dark ? "rgba(212,175,55,.10)" : "rgba(154,120,24,.08)"};
  border-color:${dark ? "rgba(212,175,55,.24)" : "rgba(154,120,24,.18)"}}
.sbb-more-grid b{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;flex:0 0 auto;color:#d4af37}
.sbb-more-grid span{font-size:12px}
.sbb-more-grid em{margin-inline-start:auto;min-width:18px;height:18px;padding:0 5px;border-radius:999px;
  background:#c8102e;color:#fff;font:700 10px/18px ${F.ui};text-align:center;font-style:normal}
@media (max-width:340px){.sbb-l{font-size:9.5px}}
`;
