import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import { makeEntity } from "../../lib/research/entity.js";
import { F } from "../../theme.js";
import "./RoyalContextBar.css";

function contextFromLocation(pathname, search = "") {
  const parts = pathname.split("/").filter(Boolean);
  const qs = new URLSearchParams(search || "");
  if (parts[0] === "number" && parts[1]) return { kind: "מספר", label: decodeURIComponent(parts.slice(1).join("/")) };
  if (parts[0] === "topic" && parts[1]) return { kind: "נושא", label: decodeURIComponent(parts.slice(1).join("/")) };
  if (parts[0] === "journey" || parts[0] === "מסע") return { kind: "מסע", label: "המסע הנוכחי" };
  if ((parts[0] === "lab" && parts[1] === "els") || (parts[0] === "research" && qs.get("tool") === "els")) return { kind: "ELS", label: "מרחב הצופן" };
  if (parts[0] === "book") return { kind: "ספר", label: qs.get("book") || parts[1] || "מרחב הספר" };
  if (parts[0] === "heichal" || parts[0] === "היכל") return { kind: "היכל", label: "היכל" };
  if (parts.length === 1 && !["admin","login","profile","credits","buy","research"].includes(parts[0])) return { kind: "פוסט", label: decodeURIComponent(parts[0]) };
  return { kind: "SOD1820", label: "מרחב המחקר" };
}

function lensLabel(lens) {
  const labels = {
    number: "מספר",
    topic: "נושא",
    post: "פוסט",
    els: "ELS",
    book: "ספר",
    source: "מקור",
    person: "אדם",
    name: "שם",
    journey: "מסע",
    graph: "קשרים",
  };
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

function shortLabel(value, max = 16) {
  const s = String(value || "");
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export default function RoyalContextBar() {
  const { isAdmin, loading } = useAuth();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const research = useResearch();
  const [razielOpen, setRazielOpen] = useState(false);
  const [pulseOpen, setPulseOpen] = useState(false);

  if (loading || !isAdmin || /^\/(admin|login|profile|credits|buy)(\/|$)/.test(pathname)) return null;

  const ctx = contextFromLocation(pathname, search);
  const root = research.context?.subject || null;
  const rootLabel = root?.label || root?.id || null;
  const activeLens = research.context?.lens || null;
  const returnTo = research.context?.returnTo || null;
  const selection = research.context?.selection || null;
  const currentRef = selection?.entityId || selection?.locator || null;
  const currentType = selection?.entityType || null;
  const rootDiffers = Boolean(root?.href && root.href !== pathname && rootLabel && rootLabel !== ctx.label);

  const currentEntity = currentType && currentRef ? makeEntity({
    type: currentType,
    title: ctx.label,
    ref: currentRef,
    link: `${pathname}${search || ""}`,
    metadata: {
      research_subject: root ? { id: root.id, type: root.type, label: rootLabel } : null,
      lens: activeLens,
    },
  }) : null;

  const alreadyInResearch = Boolean(currentEntity && (research.cart || []).some(item => item?.id === currentEntity.id));

  const goRoot = () => {
    if (!root?.href) return;
    research.updateResearchContext?.({
      selection: { entityId: root.id, entityType: root.type },
      lens: lensForSubject(root),
      returnTo: null,
    });
    navigate(root.href);
  };

  const goReturn = () => {
    if (!returnTo?.href) return;
    const target = returnTo.subject || null;
    research.updateResearchContext?.({
      selection: target ? { entityId: target.id, entityType: target.type } : null,
      lens: target ? lensForSubject(target) : activeLens,
      returnTo: null,
    });
    navigate(returnTo.href);
  };

  const addCurrent = () => {
    if (!currentEntity || alreadyInResearch) return;
    research.addToResearch?.(currentEntity);
  };

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
    setRazielOpen(false);
    setPulseOpen(false);
  };

  return <aside className="rcb-wrap" dir="rtl" aria-label="סרגל הקשר — תצוגת מנהל" style={{ fontFamily: F.ui }}>
    {pulseOpen && <section className="rcb-pulse-panel"><div className="rcb-raziel-head"><span className="rcb-pulse-dot">●</span><strong>דופק האתר</strong><button onClick={() => setPulseOpen(false)}>×</button></div><p>מה חדש עכשיו במערכת — גימטריות, התכנסויות, מחקר ומסעות.</p><p className="rcb-muted">בשלב הבא הדופק יתחבר למקור העדכונים הקיים; כרגע זו מעטפת הניווט החדשה.</p></section>}
    {razielOpen && <section className="rcb-raziel-panel"><div className="rcb-raziel-head"><span className="rcb-spark">✦</span><strong>רזיאל</strong><button onClick={() => setRazielOpen(false)}>×</button></div><p>אני איתך ב־<b>{ctx.label}</b>.</p>{rootLabel && <p className="rcb-muted">שורש המחקר: <b>{rootLabel}</b> · עדשה פעילה: {lensLabel(activeLens)}</p>}<p className="rcb-muted">רזיאל יקבל את אותו Research Context — לא צ׳אט מנותק ולא אמת מקבילה.</p><button className="rcb-ask">שאל את רזיאל…</button><button className="rcb-ask" onClick={startNewResearchHere} style={{ marginTop: 8 }}>＋ התחל מכאן מחקר חדש</button></section>}
    <div className="rcb-islands">
      <button className="rcb-island rcb-context" onClick={root?.href ? goRoot : undefined} title={rootDiffers ? `חזרה לשורש המחקר: ${rootLabel}` : "ההקשר הנוכחי"}>
        <span className="rcb-kicker">{rootDiffers ? `מחקר · ${shortLabel(rootLabel)}` : ctx.kind}</span><strong>{ctx.label}</strong><span className="rcb-chevron">{rootDiffers ? "↩" : "‹"}</span>
      </button>
      <div className="rcb-island rcb-tools">
        <button title={`עדשה פעילה: ${lensLabel(activeLens)}`}><span>◇</span><span>{lensLabel(activeLens)}</span></button>
        <button onClick={addCurrent} disabled={!currentEntity || alreadyInResearch} title={alreadyInResearch ? "כבר נמצא במחקר הפעיל" : "הוסף את המשטח הנוכחי למחקר הפעיל"}><span>{alreadyInResearch ? "✓" : "＋"}</span><span>{alreadyInResearch ? "במחקר" : "לחקירה"}</span></button>
        {returnTo?.href && <button onClick={goReturn} title={`חזרה ל־${returnTo.label || "המקום הקודם"}`}><span>↩</span><span>חזרה</span></button>}
      </div>
      <button className={"rcb-island rcb-pulse" + (pulseOpen ? " is-open" : "")} onClick={() => { setPulseOpen(v => !v); setRazielOpen(false); }}><span className="rcb-pulse-dot">●</span><span>דופק</span></button>
      <button className={"rcb-island rcb-raziel" + (razielOpen ? " is-open" : "")} onClick={() => { setRazielOpen(v => !v); setPulseOpen(false); }}><span className="rcb-spark">✦</span><span>רזיאל</span><i /></button>
    </div>
  </aside>;
}
