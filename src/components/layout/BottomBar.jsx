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
  const { isOpen: userCenterOpen } = useUserCenter();
  const { open: numberOpen } = useNumberDrawer();
  const { open: updatesOpen } = useSiteUpdates();
  const [contextOpen, setContextOpen] = useState(false);

  if (!isBottomBarRoute(pathname)) return null;

  const dark = P.mode !== "light";
  const showUpdates = isSiteUpdatesRoute(pathname);
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
    type: currentType,
    title: ctx.label,
    ref: currentRef,
    link: `${pathname}${search || ""}`,
    metadata: {
      research_subject: (root && !rootDiffers) ? { id: root.id, type: root.type, label: rootLabel } : null,
      lens: activeLens,
    },
  }) : null;
  const alreadyInResearch = Boolean(currentEntity && (research.cart || []).some(item => item?.id === currentEntity.id));

  const addCurrent = () => {
    if (!currentEntity || alreadyInResearch) return;
    research.addToResearch?.(currentEntity);
  };
  const goRoot = () => {
    if (!root?.href) return;
    research.updateResearchContext?.({ selection: { entityId: root.id, entityType: root.type }, lens: lensForSubject(root), returnTo: null });
    setContextOpen(false);
    navigate(root.href);
  };
  const goReturn = () => {
    if (!returnTo?.href) return;
    const target = returnTo.subject || null;
    research.updateResearchContext?.({ selection: target ? { entityId: target.id, entityType: target.type } : null, lens: target ? lensForSubject(target) : activeLens, returnTo: null });
    setContextOpen(false);
    navigate(returnTo.href);
  };

  const items = [
    isAdmin && { id: "context", icon: "⌖", label: "כאן", active: contextOpen, onClick: () => setContextOpen(v => !v) },
    { id: "number", icon: "123", label: "מספר", active: numberOpen, onClick: () => toggleNumberDrawer() },
    showUpdates && { id: "updates", icon: "●", label: "עדכונים", active: updatesOpen, onClick: () => toggleSiteUpdates() },
  ].filter(Boolean);

  return (
    <>
      {isAdmin && contextOpen && !userCenterOpen && (
        <section className="sbb-context-panel" dir="rtl" aria-label="פעולות על ההקשר הנוכחי">
          <div className="sbb-context-head"><span>⌖</span><div><small>{ctx.kind}</small><strong>{ctx.label}</strong></div><button type="button" onClick={() => setContextOpen(false)}>×</button></div>
          <div className="sbb-context-actions">
            <button type="button" onClick={addCurrent} disabled={!currentEntity || alreadyInResearch}><b>{alreadyInResearch ? "✓" : "＋"}</b><span>{alreadyInResearch ? "במחקר" : "הוסף למחקר"}</span></button>
            {rootDiffers && <button type="button" onClick={goRoot}><b>↩</b><span>שורש המחקר</span></button>}
            {returnTo?.href && <button type="button" onClick={goReturn}><b>↩</b><span>חזרה</span></button>}
            <button type="button" disabled title="קשרים — יתחבר ליכולת הקנונית, לא נבנה כאן graph חדש"><b>◇</b><span>קשרים</span></button>
          </div>
        </section>
      )}
      <nav className="sod-bottombar" aria-label="סרגל תחתון" dir="rtl" style={{ opacity: userCenterOpen ? 0 : 1, pointerEvents: userCenterOpen ? "none" : "auto" }}>
        <style>{CSS(dark)}</style>
        {items.map(it => (
          <button key={it.id} type="button" className={"sbb-item" + (it.active ? " on" : "")} aria-pressed={!!it.active} onClick={it.onClick}>
            <span className={"sbb-i" + (it.id === "number" ? " numeric" : "")} aria-hidden>{it.icon}</span>
            <span className="sbb-l">{it.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}

const CSS = (dark) => `
.sod-bottombar{position:fixed;z-index:500;left:50%;transform:translateX(-50%);bottom:calc(4px + env(safe-area-inset-bottom,0px));width:min(520px,calc(100vw - 12px));display:flex;justify-content:center;gap:4px;padding:4px 6px;background:${dark ? "rgba(5,11,22,.94)" : "rgba(255,255,255,.96)"};border:1px solid ${dark ? "rgba(207,169,92,.25)" : "rgba(120,90,20,.16)"};border-radius:16px;box-shadow:0 8px 28px rgba(0,0,0,${dark ? ".36" : ".12"});backdrop-filter:blur(18px);transition:opacity .18s ease}
.sbb-item{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;flex:1 1 92px;min-width:64px;min-height:44px;padding:5px 10px;border:none;border-radius:11px;background:transparent;cursor:pointer;font-family:${F.ui};color:${dark ? "#aab7c9" : "#5b4a12"};transition:background .15s,color .15s}
.sbb-item:hover{background:${dark ? "rgba(218,180,86,.08)" : "rgba(154,120,24,.08)"}}
.sbb-item.on{background:${dark ? "rgba(218,180,86,.12)" : "rgba(154,120,24,.14)"};color:${dark ? "#f3dfa2" : "#3a2a00"}}
.sbb-i{font-size:18px;line-height:1;color:${dark ? "#d4b36a" : "#6b5314"}}.sbb-i.numeric{font-family:${F.numeric};font-size:13px;font-weight:800;letter-spacing:-.03em}.sbb-l{font-size:10.5px;font-weight:700}
.sbb-context-panel{position:fixed;z-index:501;left:50%;transform:translateX(-50%);bottom:calc(62px + env(safe-area-inset-bottom,0px));width:min(430px,calc(100vw - 16px));padding:12px;border:1px solid ${dark ? "rgba(207,169,92,.28)" : "rgba(120,90,20,.18)"};border-radius:16px;background:${dark ? "rgba(7,15,29,.985)" : "rgba(255,255,255,.985)"};color:${dark ? "#f5efe3" : "#2d2618"};box-shadow:0 18px 55px rgba(0,0,0,.34);backdrop-filter:blur(20px);font-family:${F.ui}}
.sbb-context-head{display:flex;align-items:center;gap:8px;padding:2px 2px 10px}.sbb-context-head>span{color:#d4b36a;font-size:18px}.sbb-context-head div{display:flex;flex-direction:column;min-width:0}.sbb-context-head small{font-size:9px;color:${dark ? "#c9a65c" : "#7a621f"}}.sbb-context-head strong{font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sbb-context-head>button{margin-inline-start:auto;border:0;background:transparent;color:${dark ? "#7e8da3" : "#6b6254"};font-size:20px;cursor:pointer}
.sbb-context-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}.sbb-context-actions button{min-height:48px;border:1px solid ${dark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.07)"};border-radius:10px;background:${dark ? "rgba(255,255,255,.035)" : "rgba(0,0,0,.025)"};color:${dark ? "#aab7c9" : "#4d4538"};font-family:${F.ui};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer}.sbb-context-actions button:disabled{opacity:.42;cursor:default}.sbb-context-actions b{color:#d4b36a;font-size:15px}.sbb-context-actions span{font-size:9.5px}
@media(max-width:380px){.sbb-item{min-width:0;padding-inline:5px}.sbb-context-actions{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(prefers-reduced-motion:reduce){.sod-bottombar{transition:none}}
`;