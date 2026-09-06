import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { F } from "../../theme.js";
import { usePalette } from "../../lib/palette.js";
import { useAuth } from "../../lib/AuthContext.jsx";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import { makeEntity } from "../../lib/research/entity.js";
import { useUserCenter } from "../../lib/userCenter/UserCenterContext.jsx";
import { getUnreadCount } from "../../lib/notifications.js";
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
function lensForSubject(subject) { if (!subject) return null; if (subject.type === "number" || subject.type === "phrase") return "number"; if (subject.type === "topic" || subject.type === "convergence") return "topic"; if (subject.type === "els" || subject.type === "code") return "els"; if (subject.type === "book" || subject.type === "source") return "book"; if (subject.type === "person" || subject.type === "name") return "person"; return subject.type || null; }

export default function BottomBar() {
  const { pathname, search } = useLocation(); const navigate = useNavigate(); const P = usePalette();
  const { user, isAdmin } = useAuth(); const research = useResearch();
  const { isOpen: userCenterOpen, open: openUserCenter } = useUserCenter();
  const { open: numberOpen } = useNumberDrawer(); const { open: updatesOpen, unseen } = useSiteUpdates();
  const [panel, setPanel] = useState(null); const [personalUnread, setPersonalUnread] = useState(0);
  useEffect(() => { if (!user) { setPersonalUnread(0); return; } let alive = true; const load = () => getUnreadCount().then(n => { if (alive) setPersonalUnread(Math.max(0, Number(n) || 0)); }).catch(() => {}); load(); const id = setInterval(load, 60000); return () => { alive = false; clearInterval(id); }; }, [user?.id]);
  if (!isBottomBarRoute(pathname)) return null;
  const dark = P.mode !== "light", updatesMounted = isSiteUpdatesRoute(pathname), ctx = contextFromLocation(pathname, search);
  const root = research.context?.subject || null, activeLens = research.context?.lens || null, returnTo = research.context?.returnTo || null, selection = research.context?.selection || null;
  const currentRef = selection?.entityId || selection?.locator || null, currentType = selection?.entityType || null, rootLabel = root?.label || root?.id || null;
  const rootDiffers = Boolean(root?.href && root.href !== pathname && rootLabel && rootLabel !== ctx.label), contextActive = Boolean(root || selection || activeLens || returnTo);
  const currentEntity = currentType && currentRef ? makeEntity({ type: currentType, title: ctx.label, ref: currentRef, link: `${pathname}${search || ""}`, metadata: { research_subject: (root && !rootDiffers) ? { id: root.id, type: root.type, label: rootLabel } : null, lens: activeLens } }) : null;
  const alreadyInResearch = Boolean(currentEntity && (research.cart || []).some(item => item?.id === currentEntity.id));
  const closePanels = () => setPanel(null);
  const addCurrent = () => { if (currentEntity && !alreadyInResearch) research.addToResearch?.(currentEntity); };
  const goRoot = () => { if (!root?.href) return; research.updateResearchContext?.({ selection: { entityId: root.id, entityType: root.type }, lens: lensForSubject(root), returnTo: null }); closePanels(); navigate(root.href); };
  const goReturn = () => { if (!returnTo?.href) return; const target = returnTo.subject || null; research.updateResearchContext?.({ selection: target ? { entityId: target.id, entityType: target.type } : null, lens: target ? lensForSubject(target) : activeLens, returnTo: null }); closePanels(); navigate(returnTo.href); };
  const openNow = () => { closePanels(); if (updatesMounted) toggleSiteUpdates(); else navigate("/broadcasts"); };
  const enterUserCenter = (id = null) => { closePanels(); openUserCenter(id); };
  const go = to => { closePanels(); navigate(to); };
  const items = [
    { id: "context", icon: "⌖", label: "כאן", active: panel === "context", signal: contextActive, onClick: () => setPanel(v => v === "context" ? null : "context") },
    { id: "number", icon: "123", label: "מספר", active: numberOpen, onClick: () => { closePanels(); toggleNumberDrawer(); } },
    { id: "now", icon: "●", label: "עכשיו", active: updatesOpen, signal: updatesMounted, badge: unseen || 0, onClick: openNow },
    { id: "raziel", icon: "✦", label: "רזיאל", active: panel === "raziel", gated: !isAdmin, onClick: () => setPanel(v => v === "raziel" ? null : "raziel") },
    { id: "more", icon: "•••", label: "עוד", active: panel === "more", badge: personalUnread, onClick: () => setPanel(v => v === "more" ? null : "more") },
  ];
  return <>
    {!userCenterOpen && panel === "context" && <section className="sbb-sheet" dir="rtl"><div className="sbb-head"><span>⌖</span><div><small>{ctx.kind}</small><strong>{ctx.label}</strong></div><button onClick={closePanels}>×</button></div><div className="sbb-actions"><button onClick={addCurrent} disabled={!currentEntity || alreadyInResearch}><b>{alreadyInResearch ? "✓" : "＋"}</b><span>{alreadyInResearch ? "במחקר" : "הוסף למחקר"}</span></button><button disabled><b>◇</b><span>קשרים</span></button>{rootDiffers && <button onClick={goRoot}><b>↩</b><span>שורש המחקר</span></button>}{returnTo?.href && <button onClick={goReturn}><b>↩</b><span>חזרה</span></button>}</div></section>}
    {isAdmin && !userCenterOpen && panel === "raziel" && <section className="sbb-sheet" dir="rtl"><div className="sbb-head"><span>✦</span><div><small>AI · רזיאל</small><strong>איתך ב־{ctx.label}</strong></div><button onClick={closePanels}>×</button></div><p className="sbb-note">רזיאל יחובר לאותו Research Context — בלי שכבת אמת מקבילה.</p></section>}
    {!userCenterOpen && panel === "more" && <section className="sbb-sheet sbb-more-sheet" dir="rtl"><div className="sbb-head"><span>•••</span><div><small>המשך מכאן</small><strong>המרחב שלך ב־SOD1820</strong></div><button onClick={closePanels}>×</button></div><div className="sbb-more-grid"><button className="primary" onClick={() => enterUserCenter()}><b>◉</b><span>אזור אישי</span>{personalUnread > 0 && <em>{personalUnread > 99 ? "99+" : personalUnread}</em>}</button><button onClick={() => go("/research")}><b>⌁</b><span>המחקר שלי</span></button><button onClick={() => enterUserCenter("saved")}><b>◇</b><span>האוסף שלי</span></button><button onClick={() => go("/archive")}><b>↗</b><span>המשך</span></button></div></section>}
    <nav className="sod-bottombar" aria-label="סרגל תחתון" dir="rtl" style={{ opacity: userCenterOpen ? 0 : 1, pointerEvents: userCenterOpen ? "none" : "auto" }}><style>{CSS(dark)}</style>{items.map(it => <button key={it.id} type="button" disabled={it.gated} className={`sbb-item sbb-${it.id}${it.active ? " on" : ""}${it.gated ? " gated" : ""}`} aria-pressed={!!it.active} onClick={it.gated ? undefined : it.onClick}><span className={`sbb-i${it.id === "number" ? " numeric" : ""}`}>{it.icon}</span><span className="sbb-l">{it.label}</span>{it.signal && !it.badge && <i className="sbb-signal" />}{it.badge > 0 && <em className="sbb-badge">{it.badge > 99 ? "99+" : it.badge}</em>}</button>)}</nav>
  </>;
}

const CSS = dark => `
.sod-bottombar{position:fixed;z-index:500;left:50%;transform:translateX(-50%);bottom:calc(5px + env(safe-area-inset-bottom,0px));width:min(540px,calc(100vw - 12px));display:grid;grid-template-columns:repeat(5,1fr);gap:3px;padding:4px 5px;background:${dark ? "rgba(5,11,22,.96)" : "rgba(255,255,255,.97)"};border:1px solid ${dark ? "rgba(207,169,92,.25)" : "rgba(120,90,20,.16)"};border-radius:17px;box-shadow:0 10px 34px rgba(0,0,0,${dark ? ".42" : ".14"});backdrop-filter:blur(20px)}
.sbb-item{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-width:0;min-height:48px;padding:5px 3px;border:0;border-radius:12px;background:transparent;cursor:pointer;font-family:${F.ui};color:${dark ? "#93a2b7" : "#5b5142"}}.sbb-item.on{background:${dark ? "rgba(212,179,106,.12)" : "rgba(154,120,24,.11)"};color:${dark ? "#f2dfa7" : "#342800"}}.sbb-item.gated{opacity:.38}.sbb-i{font-size:18px;line-height:1;color:${dark ? "#d4b36a" : "#6b5314"}}.sbb-i.numeric{font-family:${F.numeric};font-size:13px;font-weight:800}.sbb-now .sbb-i{font-size:9px;color:#78a9d8}.sbb-l{font-size:10px;font-weight:750}.sbb-signal{position:absolute;top:5px;inset-inline-end:12px;width:5px;height:5px;border-radius:50%;background:${dark ? "#d4b36a" : "#8a6d1c"};box-shadow:0 0 7px currentColor}.sbb-now .sbb-signal{background:#78a9d8}.sbb-badge{position:absolute;top:2px;inset-inline-end:7px;min-width:16px;height:16px;padding:0 4px;border-radius:999px;background:#c8102e;color:#fff;font:700 9px/16px ${F.ui};font-style:normal;text-align:center}
.sbb-sheet{position:fixed;z-index:501;left:50%;transform:translateX(-50%);bottom:calc(66px + env(safe-area-inset-bottom,0px));width:min(440px,calc(100vw - 16px));padding:13px;border:1px solid ${dark ? "rgba(207,169,92,.26)" : "rgba(120,90,20,.18)"};border-radius:18px;background:${dark ? "rgba(7,15,29,.99)" : "rgba(255,255,255,.99)"};color:${dark ? "#f5efe3" : "#2d2618"};box-shadow:0 20px 60px rgba(0,0,0,.38);font-family:${F.ui}}.sbb-head{display:flex;align-items:center;gap:9px}.sbb-head>span{color:#d4b36a;font-size:18px}.sbb-head div{display:flex;flex-direction:column}.sbb-head small{font-size:9px;color:${dark ? "#bda46d" : "#7a621f"}}.sbb-head strong{font-size:13px}.sbb-head>button{margin-inline-start:auto;border:0;background:transparent;color:inherit;font-size:20px;cursor:pointer}.sbb-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:10px}.sbb-actions button{min-height:50px;border:1px solid ${dark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.07)"};border-radius:11px;background:transparent;color:inherit;font-family:${F.ui};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px}.sbb-actions b{color:#d4b36a}.sbb-actions span{font-size:9.5px}.sbb-note{font-size:12px;line-height:1.6;color:${dark ? "#aab7c9" : "#5b5142"}}
.sbb-more-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:12px}.sbb-more-grid button{position:relative;min-height:62px;border:1px solid ${dark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.07)"};border-radius:13px;background:${dark ? "rgba(255,255,255,.025)" : "rgba(0,0,0,.02)"};color:inherit;font-family:${F.ui};display:flex;align-items:center;gap:9px;padding:10px 12px;cursor:pointer;text-align:right}.sbb-more-grid button.primary{grid-column:1/-1;background:${dark ? "rgba(212,179,106,.08)" : "rgba(154,120,24,.08)"};border-color:${dark ? "rgba(212,179,106,.2)" : "rgba(154,120,24,.16)"}}.sbb-more-grid b{width:28px;height:28px;border-radius:9px;display:grid;place-items:center