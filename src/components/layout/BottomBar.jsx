import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { F } from "../../theme.js";
import { usePalette } from "../../lib/palette.js";
import { useAuth } from "../../lib/AuthContext.jsx";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import { makeEntity } from "../../lib/research/entity.js";
import { useUserCenter } from "../../lib/userCenter/UserCenterContext.jsx";
import { useNumberDrawer, toggleNumberDrawer } from "../../lib/numberDrawer.js";
import { useSiteUpdates, toggleSiteUpdates, isSiteUpdatesRoute } from "../../lib/siteUpdates.js";
import { isBottomBarRoute } from "../../lib/bottomBar.js";

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
  const { isAdmin } = useAuth();
  const research = useResearch();
  const { isOpen: userCenterOpen, open: openUserCenter } = useUserCenter();
  const { open: numberOpen } = useNumberDrawer();
  const { open: updatesOpen } = useSiteUpdates();
  const [panel, setPanel] = useState(null);

  if (!isBottomBarRoute(pathname)) return null;

  const dark = P.mode !== "light";
  const updatesMounted = isSiteUpdatesRoute(pathname);
  const ctx = contextFromLocation(pathname, search);
  const root = research.context?.subject || null;
  const activeLens = research.context?.lens || null;
  const returnTo = research.context?.returnTo || null;
  const selection = research.context?.selection || null;
  const currentRef = selection?.entityId || selection?.locator || null;
  const currentType = selection?.entityType || null;
  const rootLabel = root?.label || root?.id || null;
  const rootDiffers = Boolean(root?.href && root.href !== pathname && rootLabel && rootLabel !== ctx.label);
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
  const openNow = () => {
    closePanels();
    if (updatesMounted) toggleSiteUpdates();
    else navigate("/broadcasts");
  };
  const openMore = () => { closePanels(); openUserCenter(); };

  const items = [
    { id: "context", icon: "⌖", label: "כאן", active: panel === "context", onClick: () => setPanel(v => v === "context" ? null : "context") },
    { id: "number", icon: "123", label: "מספר", active: numberOpen, onClick: () => { closePanels(); toggleNumberDrawer(); } },
    { id: "now", icon: "●", label: "עכשיו", active: updatesOpen, onClick: openNow },
    { id: "raziel", icon: "✦", label: "רזיאל", active: panel === "raziel", onClick: () => setPanel(v => v === "raziel" ? null : "raziel") },
    { id: "more", icon: "•••", label: "עוד", active: userCenterOpen, onClick: openMore },
  ];

  return (
    <>
      {!userCenterOpen && panel === "context" && (
        <section className="sbb-sheet" dir="rtl" aria-label="פעולות על ההקשר הנוכחי">
          <div className="sbb-sheet-head"><span className="sbb-mark">⌖</span><div><small>{ctx.kind}</small><strong>{ctx.label}</strong></div><button type="button" onClick={closePanels}>×</button></div>
          <div className="sbb-actions">
            <button type="button" onClick={addCurrent} disabled={!currentEntity || alreadyInResearch}><b>{alreadyInResearch ? "✓" : "＋"}</b><span>{alreadyInResearch ? "במחקר" : "הוסף למחקר"}</span></button>
            <button type="button" disabled title="יחובר ליכולת הקשרים הקנונית"><b>◇</b><span>קשרים</span></button>
            {rootDiffers && <button type="button" onClick={goRoot}><b>↩</b><span>שורש המחקר</span></button>}
            {returnTo?.href && <button type="button" onClick={goReturn}><b>↩</b><span>חזרה</span></button>}
          </div>
          {!currentEntity && <p className="sbb-note">ההקשר מזוהה, אך אין עדיין Selection קנוני שאפשר להוסיף למחקר מהמסך הזה.</p>}
        </section>
      )}
      {isAdmin && !userCenterOpen && panel === "raziel" && (
        <section className="sbb-sheet sbb-raziel-sheet" dir="rtl" aria-label="רזיאל בהקשר הנוכחי">
          <div className="sbb-sheet-head"><span className="sbb-mark spark">✦</span><div><small>AI · רזיאל</small><strong>איתך ב־{ctx.label}</strong></div><button type="button" onClick={closePanels}>×</button></div>
          <p className="sbb-raziel-copy">רזיאל יקבל את אותו Research Context של המסך — לא צ׳אט מנותק ולא שכבת אמת מקבילה.</p>
          {rootLabel && <div className="sbb-context-chip">שורש: {rootLabel}{activeLens ? ` · עדשה: ${activeLens}` : ""}</div>}
          <button className="sbb-raziel-cta" type="button" disabled>שאל את רזיאל… <span>בקרוב בחיבור הקנוני</span></button>
        </section>
      )}
      <nav className="sod-bottombar" aria-label="סרגל תחתון" dir="rtl" style={{ opacity: userCenterOpen ? 0 : 1, pointerEvents: userCenterOpen ? "none" : "auto" }}>
        <style>{CSS(dark)}</style>
        {items.map(it => (
          <button key={it.id} type="button" className={"sbb-item sbb-" + it.id + (it.active ? " on" : "") + (it.id === "raziel" && !isAdmin ? " gated" : "")} aria-pressed={!!it.active} onClick={it.id === "raziel" && !isAdmin ? undefined : it.onClick} disabled={it.id === "raziel" && !isAdmin}>
            <span className={"sbb-i" + (it.id === "number" ? " numeric" : "")} aria-hidden>{it.icon}</span>
            <span className="sbb-l">{it.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}

const CSS = (dark) => `
.sod-bottombar{position:fixed;z-index:500;left:50%;transform:translateX(-50%);bottom:calc(5px + env(safe-area-inset-bottom,0px));width:min(540px,calc(100vw - 12px));display:grid;grid-template-columns:repeat(5,1fr);gap:3px;padding:4px 5px;background:${dark ? "linear-gradient(180deg,rgba(8,16,31,.96),rgba(4,9,19,.97))" : "linear-gradient(180deg,rgba(255,255,255,.98),rgba(248,246,240,.98))"};border:1px solid ${dark ? "rgba(207,169,92,.25)" : "rgba(120,90,20,.16)"};border-radius:17px;box-shadow:0 10px 34px rgba(0,0,0,${dark ? ".42" : ".14"}),inset 0 1px 0 rgba(255,255,255,.035);backdrop-filter:blur(20px);transition:opacity .18s ease}
.sbb-item{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-width:0;min-height:48px;padding:5px 3px;border:0;border-radius:12px;background:transparent;cursor:pointer;font-family:${F.ui};color:${dark ? "#93a2b7" : "#5b5142"};transition:background .16s,color .16s,transform .16s}.sbb-item:hover{background:${dark ? "rgba(218,180,86,.07)" : "rgba(154,120,24,.07)"};color:${dark ? "#e8d8ae" : "#302715"}}.sbb-item:active{transform:translateY(1px)}.sbb-item.on{background:${dark ? "linear-gradient(180deg,rgba(212,179,106,.14),rgba(212,179,106,.07))" : "rgba(154,120,24,.11)"};color:${dark ? "#f2dfa7" : "#342800"}}.sbb-item.gated{opacity:.38;cursor:default}.sbb-i{font-size:18px;line-height:1;color:${dark ? "#d4b36a" : "#6b5314"}}.sbb-i.numeric{font-family:${F.numeric};font-size:13px;font-weight:800;letter-spacing:-.03em}.sbb-now .sbb-i{font-size:9px;color:#78a9d8;text-shadow:0 0 9px rgba(120,169,216,.72)}.sbb-raziel .sbb-i{color:#e0bf72;text-shadow:0 0 11px rgba(224,191,114,.48)}.sbb-more .sbb-i{font-size:13px;letter-spacing:2px}.sbb-l{font-size:10px;font-weight:750;line-height:1}
.sbb-sheet{position:fixed;z-index:501;left:50%;transform:translateX(-50%);bottom:calc(66px + env(safe-area-inset-bottom,0px));width:min(440px,calc(100vw - 16px));padding:13px;border:1px solid ${dark ? "rgba(207,169,92,.26)" : "rgba(120,90,20,.18)"};border-radius:18px;background:${dark ? "linear-gradient(155deg,rgba(9,19,36,.99),rgba(5,11,22,.99))" : "rgba(255,255,255,.99)"};color:${dark ? "#f5efe3" : "#2d2618"};box-shadow:0 20px 60px rgba(0,0,0,.38);backdrop-filter:blur(22px);font-family:${F.ui}}
.sbb-sheet-head{display:flex;align-items:center;gap:9px;padding:1px 2px 11px}.sbb-mark{width:30px;height:30px;display:grid;place-items:center;border-radius:10px;background:${dark ? "rgba(212,179,106,.09)" : "rgba(154,120,24,.08)"};color:#d4b36a;font-size:17px}.sbb-mark.spark{text-shadow:0 0 12px rgba(224,191,114,.6)}.sbb-sheet-head div{display:flex;flex-direction:column;min-width:0}.sbb-sheet-head small{font-size:9px;letter-spacing:.06em;color:${dark ? "#bda46d" : "#7a621f"}}.sbb-sheet-head strong{font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sbb-sheet-head>button{margin-inline-start:auto;border:0;background:transparent;color:${dark ? "#77869b" : "#6b6254"};font-size:21px;cursor:pointer}.sbb-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.sbb-actions button{min-height:54px;border:1px solid ${dark ? "rgba(255,255,255,.065)" : "rgba(0,0,0,.065)"};border-radius:12px;background:${dark ? "rgba(255,255,255,.028)" : "rgba(0,0,0,.022)"};color:${dark ? "#aab7c9" : "#4d4538"};font-family:${F.ui};display:flex