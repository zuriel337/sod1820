import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { F, LOGO_URL } from "../../theme.js";
import { usePalette } from "../../lib/palette.js";
import { LAYOUT, MOTION, RADIUS } from "../../lib/designTokens.js";
import SpaceBackground from "../layout/SpaceBackground.jsx";
import AskRaziel from "../AskRaziel.jsx";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import "./sod2029.css";
import "./sod2029-closed.css";

const ShellContext = createContext({
  openRaziel: () => {},
  closeRaziel: () => {},
  openWorkspace: () => {},
  closeWorkspace: () => {},
  go: () => {},
  returnExact: () => {},
});

export const use2029Shell = () => useContext(ShellContext);

// Human-Gate closed hierarchy: stable product homes are separated from direct research products.
// Exact final grouping of still-unbuilt renderers remains open, so those destinations are visible but not faked.
const HOME_NAV = [
  { to: "/2029", label: "בית", icon: "⌂", exact: true },
  { to: "/world", label: "העולם", icon: "◌" },
  { to: "/heichal", label: "היכל", icon: "◇" },
  { label: "עדכונים / פוסטים", icon: "↟", status: "2029 renderer בהמשך" },
  { label: "ארכיון", icon: "⌁", status: "2029 renderer בהמשך" },
];

const DIRECT_NAV = [
  { label: "דף המספר", icon: "123", status: "Golden integration" },
  { to: "/books", label: "ספרים ומקורות", icon: "▤" },
  { to: "/els", label: "ELS", icon: "✦" },
];

function activeClass({ isActive }) {
  return `sod29-nav-link${isActive ? " active" : ""}`;
}

function NavGroup({ title, items, preserveReturnFor, onNavigate }) {
  return <div className="sod29-nav-group">
    <div className="sod29-nav-group-title">{title}</div>
    {items.map(item => item.to ? (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.exact}
        className={activeClass}
        onClick={() => { preserveReturnFor(item.to); onNavigate?.(); }}
      >
        <span className="sod29-nav-icon">{item.icon}</span>
        <span className="sod29-nav-copy">{item.label}</span>
      </NavLink>
    ) : (
      <button className="sod29-nav-link is-pending" key={item.label} type="button" disabled title={item.status}>
        <span className="sod29-nav-icon">{item.icon}</span>
        <span className="sod29-nav-copy">{item.label}</span>
        <span className="sod29-nav-status">{item.status}</span>
      </button>
    ))}
  </div>;
}

function WorkspaceProjection({ context, go, close, openRaziel }) {
  const subject = context?.subject || null;
  const resumeTarget = subject?.href || "/world";
  return <div className="sod29-workspace-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
    <section className="sod29-workspace-panel" aria-label="האזור האישי שלי">
      <div className="sod29-workspace-head">
        <div>
          <div className="sod29-kicker">MY PERSONAL AREA · ONE RESEARCH OS</div>
          <h2>האזור האישי שלי</h2>
          <div className="sod29-muted">מקום אישי אחד למחקרים, מסעות, תשומת־לב, חומר פרטי ורזיאל. לא UserCenter ישן ולא מערכת מחקר שנייה.</div>
        </div>
        <button type="button" onClick={close} aria-label="סגור">×</button>
      </div>

      <div className="sod29-workspace-grid">
        <article className="sod29-workspace-card wide">
          <div className="sod29-kicker">RESUME</div>
          <h3>להמשיך בדיוק מהמקום האחרון</h3>
          {subject ? <>
            <div className="sod29-muted">{subject.label || subject.id} · {subject.type}{context?.lens ? ` · ${context.lens}` : ""}</div>
            <div className="sod29-actions">
              <button className="sod29-action primary" type="button" onClick={() => { close(); go(resumeTarget, { preserve: false }); }}>המשך מחקר</button>
              <button className="sod29-action" type="button" onClick={() => { close(); openRaziel(); }}>המשך עם רזיאל</button>
            </div>
          </> : <div className="sod29-state">אין כרגע Research Context פעיל. המערכת לא ממציאה מסע כדי למלא את האזור האישי.</div>}
        </article>

        <article className="sod29-workspace-card">
          <div className="sod29-kicker">WHAT CHANGED</div>
          <h3>מה השתנה בשבילי</h3>
          <div className="sod29-muted">רק שינוי מחקרי מהותי. עד שמחובר governed delta adapter, Silence Gate נשמר ואין “עדכון” מומצא.</div>
        </article>

        <article className="sod29-workspace-card">
          <div className="sod29-kicker">NEXT BEST ACTION</div>
          <h3>הפעולה המחקרית הבאה</h3>
          <div className="sod29-muted">תגיע מ־Research Plan / Raziel לפי Information Gain. Engagement לבדו לא יוצר המלצה.</div>
        </article>

        <article className="sod29-workspace-card">
          <div className="sod29-kicker">PERSONAL RADAR</div>
          <h3>מסע אישי / רדאר</h3>
          <div className="sod29-muted">אותו Research OS, עם פרטיות והרשאה. מידע אישי אינו הופך לאמת ציבורית.</div>
        </article>

        <article className="sod29-workspace-card full">
          <div className="sod29-kicker">PERSONAL ATTENTION</div>
          <h3>תשומת־הלב שלי</h3>
          <div className="sod29-attention-lanes">
            <div className="sod29-attention-lane"><strong>אני עוקב</strong><small>Follow מפורש שבחרתי. לא Save ולא Relevance.</small></div>
            <div className="sod29-attention-lane"><strong>רלוונטי אליי</strong><small>התאמה מותרת לפי הקשר — אינה הרשמת Follow.</small></div>
            <div className="sod29-attention-lane"><strong>רזיאל מציע</strong><small>המלצה בלבד. רזיאל לא יוצר Follow או הסכמה לערוץ.</small></div>
          </div>
        </article>

        <article className="sod29-workspace-card wide">
          <div className="sod29-kicker">MY MATERIAL</div>
          <h3>החומר שלי</h3>
          <div className="sod29-muted">כניסה אחת לחומר פרטי: ספר/PDF, תמונה, טקסט, URL, שם, תאריך ועוד — דרך Universal Intake. Private storage/RLS עדיין אינו מחובר כאן ולכן לא מזייפים העלאה.</div>
          <div className="sod29-actions"><button className="sod29-action" type="button" disabled>＋ הוסף חומר · runtime pending</button></div>
        </article>

        <article className="sod29-workspace-card">
          <div className="sod29-kicker">ACCOUNT / ACCESS</div>
          <h3>חשבון, פרטיות וגישה</h3>
          <div className="sod29-muted">גישה מסחרית/אישית משפיעה על עומק והרשאות — לעולם לא על אמת מתמטית או מחקרית.</div>
        </article>
      </div>
    </section>
  </div>;
}

export default function Sod2029Shell({
  title,
  eyebrow,
  description,
  children,
  status = "2029 · BUILD",
  wide = false,
  surface = "system",
  symbol = "✦",
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const research = useResearch();
  const palette = usePalette();
  const [razielOpen, setRazielOpen] = useState(false);
  const [razielChatOpen, setRazielChatOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  const preserveReturnFor = useCallback((to) => {
    if (to && to !== currentHref) preserveReturn();
  }, [currentHref, preserveReturn]);

  const go = useCallback((to, { preserve = true } = {}) => {
    if (!to) return;
    if (preserve) preserveReturnFor(to);
    navigate(to);
  }, [navigate, preserveReturnFor]);

  const returnExact = useCallback(() => {
    const href = context?.returnTo?.href;
    if (href) navigate(href);
    else navigate(-1);
  }, [context?.returnTo?.href, navigate]);

  const openRaziel = useCallback(() => setRazielOpen(true), []);
  const closeRaziel = useCallback(() => setRazielOpen(false), []);
  const openWorkspace = useCallback(() => setWorkspaceOpen(true), []);
  const closeWorkspace = useCallback(() => setWorkspaceOpen(false), []);

  const shellApi = useMemo(() => ({
    openRaziel,
    closeRaziel,
    openWorkspace,
    closeWorkspace,
    go,
    returnExact,
  }), [openRaziel, closeRaziel, openWorkspace, closeWorkspace, go, returnExact]);

  const shellStyle = useMemo(() => ({
    "--s29-page": palette.pageBg,
    "--s29-panel": palette.card,
    "--s29-panel-soft": palette.cardSoft,
    "--s29-panel-grad": palette.cardGrad,
    "--s29-line": palette.border,
    "--s29-line-strong": palette.borderStrong,
    "--s29-accent": palette.accent,
    "--s29-accent-text": palette.accentText,
    "--s29-hero": palette.heroNum,
    "--s29-ink": palette.ink,
    "--s29-muted": palette.inkSoft,
    "--s29-glow": palette.glow,
    "--s29-on-accent": palette.onAccent,
    "--s29-accent-btn": palette.accentBtn,
    "--s29-radius": `${RADIUS.xl}px`,
    "--s29-control-min": `${LAYOUT.controlMinHeight}px`,
    "--s29-motion": `${MOTION.duration.normal}ms`,
    fontFamily: F.body,
  }), [palette]);

  const razielPalette = useMemo(() => ({
    card: palette.card,
    cardSoft: palette.cardSoft,
    cardGrad: palette.cardGrad,
    border: palette.border,
    accent: palette.accent,
    accentText: palette.accentText,
    accentDim: palette.inkSoft,
    glow: palette.glow,
    ink: palette.ink,
  }), [palette]);

  const razielSubject = context?.subject?.label || title || "המחקר הנוכחי";
  const razielContext = [
    context?.subject ? `עוגן: ${context.subject.type}:${context.subject.label || context.subject.id}` : null,
    context?.lens ? `עדשה: ${context.lens}` : null,
    context?.selection?.sourceRef ? `מקור: ${context.selection.sourceRef}` : null,
    `משטח: ${location.pathname}`,
  ].filter(Boolean).join(" · ");

  const contextualPrimary = useMemo(() => {
    if (location.pathname === "/2029") return { label: "⌕ פתח מחקר", action: () => go("/2029#universal-entry", { preserve: false }) };
    if (location.pathname === "/heichal" || location.pathname === "/היכל") return { label: "◌ פתח בעולם", action: () => go("/world") };
    return { label: "◇ העמק בהיכל", action: () => go("/heichal") };
  }, [location.pathname, go]);

  return (
    <ShellContext.Provider value={shellApi}>
      <div className={`sod29-root closed-shell surface-${surface}${sidebarCollapsed ? " sidebar-collapsed" : ""}`} dir="rtl" style={shellStyle}>
        <SpaceBackground />
        <div className="sod29-ambient-field" aria-hidden="true"><i /><i /><i /></div>

        <aside className="sod29-sidebar" aria-label="ניווט SOD1820 2029">
          <Link to="/2029" className="sod29-brand" onClick={() => preserveReturnFor("/2029")}>
            <span className="sod29-brand-mark"><img src={LOGO_URL} alt="" /></span>
            <span><b>SOD 1820</b><small>One Reality · Research OS</small></span>
          </Link>

          <nav className="sod29-nav">
            <NavGroup title="בתים מרכזיים" items={HOME_NAV} preserveReturnFor={preserveReturnFor} />
            <NavGroup title="מחקר ישיר" items={DIRECT_NAV} preserveReturnFor={preserveReturnFor} />
          </nav>

          <button className="sod29-sidebar-workspace" type="button" onClick={openWorkspace}>
            <span className="sod29-nav-icon">◎</span><span className="sod29-sidebar-workspace-copy">האזור האישי שלי</span>
          </button>
          <button className="sod29-sidebar-toggle" type="button" onClick={() => setSidebarCollapsed(v => !v)} aria-label={sidebarCollapsed ? "פתח סרגל" : "כווץ סרגל"}>{sidebarCollapsed ? "›" : "‹ כווץ"}</button>

          <div className="sod29-side-foot">
            <span className="sod29-live-dot" /> {status}
            <small>הישן הוא runtime מעבר בלבד. ה־2029 צורך owners ויכולות, לא את ה־IA הישן.</small>
          </div>
        </aside>

        <div className="sod29-main">
          <header className="sod29-header closed-orientation">
            <div className="sod29-header-leading">
              <button className="sod29-mobile-menu-trigger" type="button" onClick={() => setNavOpen(true)} aria-label="פתח ניווט">☰</button>
              <div className="sod29-orientation" aria-label="איפה אני">
                <span>SOD1820</span><i>/</i><b>{title || "2029"}</b>
                {context?.subject ? <><i>/</i><span className="sod29-context-name">{context.subject.label || context.subject.id}</span></> : null}
              </div>
            </div>

            <div className="sod29-header-actions">
              <button className="sod29-header-search" type="button" onClick={() => go("/2029#universal-entry", { preserve: false })}><span>⌕</span><span className="label">חיפוש / פקודה</span></button>
              <button type="button" onClick={returnExact} disabled={!context?.returnTo?.href} title={context?.returnTo?.label || "אין יעד חזרה שמור"}><span>↩</span><span className="return-label"> חזרה מדויקת</span></button>
              <button className="primary sod29-raziel-presence-button" type="button" onClick={openRaziel}>✦ רזיאל</button>
              <button type="button" onClick={openWorkspace}>◎ <span className="workspace-label">האזור האישי שלי</span></button>
            </div>
          </header>

          <main className={`sod29-content${wide ? " wide" : ""}`}>
            {(eyebrow || title || description) ? (
              <section className="sod29-page-intro">
                <div className="sod29-hero-visual" aria-hidden="true">
                  <i className="ring ring-a" /><i className="ring ring-b" /><i className="ring ring-c" />
                  <span className="sod29-hero-symbol">{symbol}</span>
                </div>
                <div className="sod29-hero-copy">
                  {eyebrow ? <div className="sod29-eyebrow">{eyebrow}</div> : null}
                  {title ? <h1 style={{ fontFamily: F.display }}>{title}</h1> : null}
                  {description ? <p>{description}</p> : null}
                  {context ? (
                    <div className="sod29-context-strip" aria-label="Research Context פעיל">
                      {context.subject ? <span>עוגן · {context.subject.label || context.subject.id}</span> : null}
                      {context.lens ? <span>עדשה · {context.lens}</span> : null}
                      {context.selection?.locator ? <span>מיקום · {context.selection.locator}</span> : null}
                      {context.journey?.position != null ? <span>מסע · {String(context.journey.position)}</span> : null}
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}
            {children}
          </main>
        </div>

        {navOpen ? <>
          <div className="sod29-mobile-drawer-backdrop" onMouseDown={() => setNavOpen(false)} />
          <aside className="sod29-mobile-drawer" aria-label="ניווט">
            <div className="sod29-mobile-drawer-head"><b>לאן ממשיכים?</b><button type="button" onClick={() => setNavOpen(false)} aria-label="סגור">×</button></div>
            <NavGroup title="בתים מרכזיים" items={HOME_NAV} preserveReturnFor={preserveReturnFor} onNavigate={() => setNavOpen(false)} />
            <NavGroup title="מחקר ישיר" items={DIRECT_NAV} preserveReturnFor={preserveReturnFor} onNavigate={() => setNavOpen(false)} />
            <button className="sod29-sidebar-workspace" type="button" onClick={() => { setNavOpen(false); openWorkspace(); }}><span className="sod29-nav-icon">◎</span><span>האזור האישי שלי</span></button>
          </aside>
        </> : null}

        <div className="sod29-command-surface" aria-label="פעולות רלוונטיות עכשיו">
          <button className="primary" type="button" onClick={contextualPrimary.action}>{contextualPrimary.label}</button>
          <button type="button" onClick={openRaziel}>✦ רזיאל</button>
          {context?.returnTo?.href ? <button type="button" onClick={returnExact}>↩ חזרה</button> : <button type="button" onClick={openWorkspace}>◎ האזור שלי</button>}
        </div>

        {razielOpen ? (
          <div className="sod29-raziel-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) closeRaziel(); }}>
            <aside className="sod29-raziel-panel" aria-label="רזיאל — נוכחות מחקרית">
              <div className="sod29-panel-head"><div><b>✦ רזיאל</b><small>אותו companion · אותו Research Context</small></div><button type="button" onClick={closeRaziel} aria-label="סגור">×</button></div>
              <div className="sod29-raziel-presence">
                <section className="sod29-raziel-presence-hero">
                  <span className="sod29-presence-state">נוכחות מחקרית פעילה</span>
                  <h3>{context?.subject ? `איתך על ${razielSubject}` : "מחכה לעוגן מחקר"}</h3>
                  <div className="sod29-muted">רזיאל אינו מערכת צ׳אט נפרדת. הוא צורך את אותו Context, עובדות מהמנועים, מקורות, מסע ו־return_exact.</div>
                </section>

                <section className="sod29-raziel-silence">
                  <b>Silence Gate</b><br />אין כרגע adapter שמוכיח שינוי החלטתי חדש, ולכן רזיאל לא ממציא “מה חדש”. Resume ושאלה ישירה עדיין זמינים.
                </section>

                <div className="sod29-panel-context">
                  <b>Research Context</b>
                  <code>{razielContext || "אין הקשר פעיל"}</code>
                </div>

                <div className="sod29-actions">
                  {context?.subject && location.pathname !== "/heichal" ? <button className="sod29-action primary" type="button" onClick={() => { closeRaziel(); go("/heichal"); }}>◇ העמק באותו מחקר</button> : null}
                  <button className="sod29-action" type="button" onClick={() => setRazielChatOpen(v => !v)}>{razielChatOpen ? "סגור שיחה" : "פתח שיחה ישירה"}</button>
                </div>

                {razielChatOpen ? <div className="sod29-raziel-chat-stage">
                  <AskRaziel
                    subject={razielSubject}
                    context={razielContext}
                    greeting={context?.subject ? `אני איתך בתוך המחקר על ${razielSubject}. אפשר להעמיק בלי לאבד את המקום.` : "אין כרגע עוגן מחקר פעיל. אפשר להתחיל מכאן ולבנות הקשר."}
                    title="שיחה עם רזיאל"
                    subtitle="השיחה היא projection של אותו companion — לא הזיכרון או האמת עצמם"
                    palette={razielPalette}
                    metatron
                    cta={false}
                  />
                </div> : null}
              </div>
            </aside>
          </div>
        ) : null}

        {workspaceOpen ? <WorkspaceProjection context={context} go={go} close={closeWorkspace} openRaziel={openRaziel} /> : null}
      </div>
    </ShellContext.Provider>
  );
}
