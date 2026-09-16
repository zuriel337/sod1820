import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { F } from "../../theme.js";
import SpaceBackground from "../layout/SpaceBackground.jsx";
import AskRaziel from "../AskRaziel.jsx";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import { useUserCenter } from "../../lib/userCenter/UserCenterContext.jsx";
import "./sod2029.css";

const ShellContext = createContext({
  openRaziel: () => {},
  closeRaziel: () => {},
  go: () => {},
  returnExact: () => {},
});

export const use2029Shell = () => useContext(ShellContext);

const NAV = [
  { to: "/2029", label: "בית", icon: "⌂", exact: true },
  { to: "/world", label: "העולם", icon: "◌" },
  { to: "/number", label: "דף המספר", icon: "123" },
  { to: "/books", label: "ספרים ומקורות", icon: "▤" },
  { to: "/lab/els", label: "ELS", icon: "✦" },
  { to: "/heichal", label: "היכל", icon: "◇" },
];

const RAZIEL_PALETTE = {
  card: "rgba(12,10,18,.96)",
  cardSoft: "rgba(255,255,255,.035)",
  cardGrad: "linear-gradient(160deg,rgba(18,17,28,.98),rgba(8,10,17,.98))",
  border: "rgba(216,184,98,.23)",
  accent: "#d8b862",
  accentText: "#f0d98e",
  accentDim: "#a8a9b3",
  glow: "rgba(216,184,98,.09)",
  ink: "#f4f0e6",
};

function activeClass({ isActive }) {
  return `sod29-nav-link${isActive ? " active" : ""}`;
}

export default function Sod2029Shell({ title, eyebrow, description, children, status = "2029 · G3", wide = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const research = useResearch();
  const userCenter = useUserCenter();
  const [razielOpen, setRazielOpen] = useState(false);
  const context = research.context || null;

  const currentHref = `${location.pathname}${location.search || ""}${location.hash || ""}`;
  const currentLabel = title || context?.subject?.label || "SOD1820";

  const preserveReturn = useCallback(() => {
    research.updateResearchContext?.({
      returnTo: {
        href: currentHref,
        label: currentLabel,
        subject: context?.subject || null,
      },
    });
  }, [research, currentHref, currentLabel, context?.subject]);

  const go = useCallback((to, { preserve = true } = {}) => {
    if (!to) return;
    if (preserve && to !== currentHref) preserveReturn();
    navigate(to);
  }, [navigate, preserveReturn, currentHref]);

  const returnExact = useCallback(() => {
    const href = context?.returnTo?.href;
    if (href) navigate(href);
    else navigate(-1);
  }, [context?.returnTo?.href, navigate]);

  const shellApi = useMemo(() => ({
    openRaziel: () => setRazielOpen(true),
    closeRaziel: () => setRazielOpen(false),
    go,
    returnExact,
  }), [go, returnExact]);

  const razielSubject = context?.subject?.label || title || "המחקר הנוכחי";
  const razielContext = [
    context?.subject ? `עוגן: ${context.subject.type}:${context.subject.label || context.subject.id}` : null,
    context?.lens ? `עדשה: ${context.lens}` : null,
    context?.selection?.sourceRef ? `מקור: ${context.selection.sourceRef}` : null,
    `משטח: ${location.pathname}`,
  ].filter(Boolean).join(" · ");

  return (
    <ShellContext.Provider value={shellApi}>
      <div className="sod29-root" dir="rtl" style={{ fontFamily: F.body }}>
        <SpaceBackground />
        <aside className="sod29-sidebar" aria-label="ניווט 2029">
          <Link to="/2029" className="sod29-brand">
            <span className="sod29-brand-mark">ס</span>
            <span><b>SOD 1820</b><small>Research OS · 2029</small></span>
          </Link>
          <nav className="sod29-nav">
            {NAV.map(item => (
              <NavLink key={item.to} to={item.to} end={item.exact} className={activeClass}>
                <span className="sod29-nav-icon">{item.icon}</span><span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <button className="sod29-nav-link sod29-workspace" onClick={() => userCenter.open?.()}>
            <span className="sod29-nav-icon">◎</span><span>המחקר שלי</span>
          </button>
          <div className="sod29-side-foot">
            <span className="sod29-live-dot" /> {status}
            <small>האתר הישן נשאר production עד Cutover מפורש.</small>
          </div>
        </aside>

        <div className="sod29-main">
          <header className="sod29-header">
            <div className="sod29-orientation">
              <span>SOD1820</span><i>/</i><b>{title || "2029"}</b>
              {context?.subject ? <><i>/</i><span className="sod29-context-name">{context.subject.label || context.subject.id}</span></> : null}
            </div>
            <div className="sod29-header-actions">
              <button onClick={returnExact} disabled={!context?.returnTo?.href} title={context?.returnTo?.label || "אין יעד חזרה שמור"}>↩ חזרה מדויקת</button>
              <button className="primary" onClick={() => setRazielOpen(true)}>✦ רזיאל</button>
              <button onClick={() => userCenter.open?.()}>◎ המחקר שלי</button>
            </div>
          </header>

          <main className={`sod29-content${wide ? " wide" : ""}`}>
            {(eyebrow || title || description) ? (
              <section className="sod29-page-intro">
                {eyebrow ? <div className="sod29-eyebrow">{eyebrow}</div> : null}
                {title ? <h1>{title}</h1> : null}
                {description ? <p>{description}</p> : null}
                {context ? (
                  <div className="sod29-context-strip" aria-label="Research Context פעיל">
                    {context.subject ? <span>עוגן · {context.subject.label || context.subject.id}</span> : null}
                    {context.lens ? <span>עדשה · {context.lens}</span> : null}
                    {context.selection?.locator ? <span>מיקום · {context.selection.locator}</span> : null}
                    {context.journey?.position != null ? <span>מסע · {String(context.journey.position)}</span> : null}
                  </div>
                ) : null}
              </section>
            ) : null}
            {children}
          </main>
        </div>

        <nav className="sod29-mobile-nav" aria-label="ניווט מהיר 2029">
          {NAV.slice(0, 5).map(item => <NavLink key={item.to} to={item.to} end={item.exact} className={activeClass}><span>{item.icon}</span><small>{item.label}</small></NavLink>)}
          <button onClick={() => setRazielOpen(true)}><span>✦</span><small>רזיאל</small></button>
        </nav>

        {razielOpen ? (
          <div className="sod29-raziel-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setRazielOpen(false); }}>
            <aside className="sod29-raziel-panel" aria-label="רזיאל — סוכן המחקר">
              <div className="sod29-panel-head"><div><b>✦ רזיאל</b><small>אותו Research Context, מכל משטח</small></div><button onClick={() => setRazielOpen(false)} aria-label="סגור">×</button></div>
              <AskRaziel
                subject={razielSubject}
                context={razielContext}
                greeting={context?.subject ? `אני איתך בתוך המחקר על ${razielSubject}. אפשר להעמיק בלי לאבד את המקום.` : "אין כרגע עוגן מחקר פעיל. אפשר להתחיל מכאן ולבנות הקשר."}
                title="רזיאל · שכבת המחקר"
                subtitle="הקשר מהעמוד · עובדות מהמנועים · פרשנות מסומנת בנפרד"
                palette={RAZIEL_PALETTE}
                metatron
                cta={false}
              />
              <div className="sod29-panel-context">
                <b>Research Context</b>
                <code>{razielContext || "אין הקשר פעיל"}</code>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </ShellContext.Provider>
  );
}
