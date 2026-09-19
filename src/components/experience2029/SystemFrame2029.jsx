import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { F } from "../../theme.js";
import { usePalette } from "../../lib/palette.js";
import { LAYOUT, MOTION, RADIUS, RAZIEL_PRESENCE } from "../../lib/designTokens.js";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import { makeEntity } from "../../lib/research/entity.js";
import {
  CONTEXT_ACTION_KIND,
  resolveContextActions,
  resolveContextTools,
} from "../../lib/research/contextualCapabilities.js";
import ShareActions from "../ShareActions.jsx";
import CanonicalProgress from "../CanonicalProgress.jsx";
import NumberDrawer2029 from "../number2029/NumberDrawer2029.jsx";
import "./sod2029.css";
import "./sod2029-closed.css";
import "./systemFrame2029.css";

const TRANSIENT = Object.freeze({
  COMMAND: "command",
  ACTION: "action",
  CAPABILITY: "capability",
  INSPECT: "inspect",
  ATTENTION: "attention",
  TOOLS: "tools",
  RAZIEL: "raziel",
  WORKSPACE: "workspace",
});

const ShellContext = createContext({
  openCommand: () => {},
  openAction: () => {},
  openCapability: () => {},
  openInspect: () => {},
  openNumber: () => {},
  openAttention: () => {},
  openTools: () => {},
  openRaziel: () => {},
  closeRaziel: () => {},
  openWorkspace: () => {},
  closeWorkspace: () => {},
  closeTransient: () => {},
  go: () => {},
  returnExact: () => {},
});

export const use2029Shell = () => useContext(ShellContext);

const HOME_NAV = [
  { to: "/2029", label: "בית", icon: "⌂", exact: true },
  { to: "/world", label: "העולם", icon: "◌" },
  { to: "/heichal", label: "היכל", icon: "◇" },
  { label: "עדכונים / פוסטים", icon: "↟", status: "2029 renderer בהמשך" },
  { label: "ארכיון", icon: "⌁", status: "2029 renderer בהמשך" },
];

const DIRECT_NAV = [
  { label: "דף המספר", icon: "123", status: "Redesign follows Frame" },
  { to: "/books", label: "ספרים ומקורות", icon: "▤" },
  { to: "/els", label: "ELS", icon: "✦" },
];

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function activeClass({ isActive }) {
  return `sod29-nav-link${isActive ? " active" : ""}`;
}

function directionForLocale(locale) {
  return /^(he|ar|fa|ur)(-|$)/i.test(locale || "he") ? "rtl" : "ltr";
}

function normalizeTarget(input, source = "context") {
  if (!input) return null;
  const type = input.type || input.entityType || input.kind || null;
  const rawId = input.id ?? input.entityId ?? input.ref ?? input.locator ?? input.label ?? null;
  if (rawId == null || !type) return null;
  const id = String(rawId).trim();
  if (!id) return null;
  return {
    id,
    type: String(type),
    label: String(input.label || input.title || id),
    locator: input.locator || null,
    href: input.href || input.link || null,
    source: input.source || source,
  };
}

function targetFromContext(context) {
  const selection = normalizeTarget(context?.selection, "context-selection");
  if (selection) return selection;
  return normalizeTarget(context?.subject, "research-context");
}

function targetFromSelectedText(raw) {
  const text = String(raw || "").trim().replace(/\s+/g, " ");
  if (!text || text.length > 120) return null;
  const numeric = /^\d+$/.test(text);
  return {
    id: numeric ? String(Number(text)) : text,
    type: numeric ? "number" : "phrase",
    label: text,
    locator: null,
    href: null,
    source: "selection",
  };
}

export function FrameState({ kind = "empty", title, children, action = null, progress = null }) {
  if (kind === "loading") {
    return <CanonicalProgress
      title={title || "עובדים על זה"}
      detail={children}
      compact={progress?.compact ?? false}
      expectedLong={progress?.expectedLong ?? false}
      phase={progress?.phase || null}
      progress={progress?.progress ?? null}
      current={progress?.current ?? null}
      total={progress?.total ?? null}
      steps={progress?.steps || []}
      engagement={progress?.engagement || []}
      onCancel={progress?.onCancel || null}
      onMinimize={progress?.onMinimize || null}
      copy={progress?.copy || null}
    />;
  }
  return (
    <section className={`sod29-frame-state state-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <span className="sod29-frame-state-icon" aria-hidden="true">
        {kind === "error" ? "!" : kind === "gated" ? "◇" : kind === "unavailable" ? "—" : "○"}
      </span>
      <div>
        {title ? <strong>{title}</strong> : null}
        {children ? <div>{children}</div> : null}
      </div>
      {action}
    </section>
  );
}

function NavGroup({ title, items, preserveReturnFor, onNavigate }) {
  return (
    <div className="sod29-nav-group">
      <div className="sod29-nav-group-title">{title}</div>
      {items.map((item) => item.to ? (
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
    </div>
  );
}

function RazielOrb({ compact = false, active = false, onClick, title = "פתח את רזיאל" }) {
  return (
    <button
      type="button"
      className={`sod29-raziel-orb${compact ? " compact" : ""}${active ? " active" : ""}`}
      onClick={onClick}
      aria-label={title}
      aria-pressed={active}
    >
      <span className="sod29-raziel-orb-core" aria-hidden="true" />
      {!compact ? <span className="sod29-raziel-orb-label">רזיאל</span> : null}
    </button>
  );
}

function PanelShell({ panelRef, icon, kicker, title, children, onClose }) {
  return (
    <div className="sod29-frame-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside
        className="sod29-frame-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <header className="sod29-frame-panel-head">
          <div className="sod29-frame-panel-title">
            <span className="sod29-frame-panel-icon" aria-hidden="true">{icon}</span>
            <div><small>{kicker}</small><strong>{title}</strong></div>
          </div>
          <button type="button" onClick={onClose} aria-label="סגור">×</button>
        </header>
        <div className="sod29-frame-panel-body">{children}</div>
      </aside>
    </div>
  );
}

function CommandProjection({ query, setQuery, onSubmit, onClose }) {
  return (
    <>
      <div className="sod29-panel-lead">
        <div className="sod29-kicker">SEARCH / COMMAND ENTRY</div>
        <h3>פתח פוקוס בלי לעזוב את המקום.</h3>
        <p>ה־Command מתרגם כוונה ל־Capability בתוך אותו Frame. Number/Expression כבר נפתחים דרך ה־Capability Host; Resolver עתידי יוכל להרחיב intents בלי לשנות את ה־Context או ה־Panel.</p>
      </div>
      <form className="sod29-frame-command" onSubmit={onSubmit}>
        <input
          data-autofocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="358 · משיח · ביטוי למחקר"
          aria-label="חיפוש או פקודה"
        />
        <button className="sod29-action primary" type="submit">בדוק</button>
      </form>
      <div className="sod29-frame-hint"><kbd>⌘K</kbd><span>פתיחה מכל מקום</span><kbd>Esc</kbd><span>חזרה מדויקת למשטח</span></div>
      <button className="sod29-action" type="button" onClick={onClose}>סגור</button>
    </>
  );
}

function InspectProjection({ target, context, onSetFocus, onAddResearch, onDeepen }) {
  if (!target) {
    return <FrameState kind="empty" title="אין כרגע אובייקט לבדיקה">סמן ביטוי/מספר בטקסט, פתח Command או בחר ישות במשטח פעיל. ה־Frame לא ממציא עוגן.</FrameState>;
  }

  const numericFamily = target.type === "number" || target.type === "phrase";
  return (
    <>
      <section className="sod29-inspect-identity">
        <div className="sod29-kicker">{target.source === "selection" ? "TEMPORARY SELECTION" : "CURRENT SUBJECT"}</div>
        <strong>{target.label}</strong>
        <span>{target.type}</span>
      </section>

      {numericFamily ? (
        <FrameState title="Number / Expression · Quick Inspect">
          בדיקה שומרת את הזהות וה־Context. חישוב נפתח כ־Number capability באותו Panel Host — לא כמערכת חלוניות נפרדת ולא דרך ה־Legacy NumberDrawer.
        </FrameState>
      ) : (
        <FrameState title="Entity Quick Inspect">אותו Inspect מיועד גם לספר/מקור, אדם, Event, Finding וישויות נוספות כשה־owner שלהן מספק projection.</FrameState>
      )}

      <div className="sod29-panel-actions-grid">
        <button className="sod29-action primary" type="button" onClick={() => onSetFocus(target)}>⌖ קבע כפוקוס מחקר</button>
        <button className="sod29-action" type="button" onClick={() => onAddResearch(target)}>＋ הוסף למחקר</button>
        <button className="sod29-action" type="button" onClick={() => onDeepen(target)}>◇ העמק בהיכל</button>
        <button className="sod29-action" type="button" disabled title="Follow runtime נשאר ב־PR #486 עד release gate">♢ מעקב · runtime pending</button>
      </div>

      <div className="sod29-canonical-share" data-share-owner="ShareActions">
        <ShareActions
          type={target.type || "page"}
          title={`SOD1820 · ${target.label}`}
          channels={["native", "copy"]}
          compact
          force
          style={{ marginTop: 10 }}
        />
      </div>

      <div className="sod29-panel-context-card">
        <b>Research Context</b>
        <span>{context?.subject ? `${context.subject.type}:${context.subject.label || context.subject.id}` : "אין עוגן שמור"}</span>
        <small>Selection זמני ≠ Finding ≠ Claim ≠ Canonical.</small>
      </div>
    </>
  );
}

function ContextualActionButtons({ actions, target, onInspect, onCapability, onRaziel, onDeepen, go }) {
  return <div className="sod29-panel-actions-grid">{actions.map((action) => {
    const className = `sod29-action${action.primary ? " primary" : ""}`;
    if (action.kind === CONTEXT_ACTION_KIND.INSPECT) {
      return <button key={action.id} className={className} type="button" onClick={() => onInspect?.(target)}>{action.label}</button>;
    }
    if (action.kind === CONTEXT_ACTION_KIND.CAPABILITY) {
      return <button key={action.id} className={className} type="button" onClick={() => onCapability?.(action.capability, target)}>{action.label}</button>;
    }
    if (action.kind === CONTEXT_ACTION_KIND.RAZIEL) {
      return <button key={action.id} className={className} type="button" onClick={() => onRaziel?.()}>{action.label}</button>;
    }
    if (action.kind === CONTEXT_ACTION_KIND.DEEPEN) {
      return <button key={action.id} className={className} type="button" onClick={() => onDeepen?.(target)}>{action.label}</button>;
    }
    if (action.kind === CONTEXT_ACTION_KIND.ROUTE) {
      return <button key={action.id} className={className} type="button" onClick={() => go?.(action.href)}>{action.label}</button>;
    }
    return null;
  })}</div>;
}

function ActionProjection({
  surface,
  target,
  context,
  onInspect,
  onCapability,
  onRaziel,
  onDeepen,
  go,
}) {
  const actions = resolveContextActions({ surface, target });
  if (!target && !actions.length) {
    return <FrameState kind="empty" title="אין כרגע אובייקט לפעולה">סמן שורה, ביטוי, מספר או ישות. פעולה משתמשת ב־Selection כשיש בחירה, אחרת ב־Research Context הנוכחי.</FrameState>;
  }
  return (
    <>
      <div className="sod29-panel-lead">
        <div className="sod29-kicker">CONTEXT ACTIONS · {String(surface || "system").toUpperCase()}</div>
        <h3>{target ? "מה אפשר לעשות עם הבחירה הזאת?" : "מה אפשר לעשות במשטח הזה?"}</h3>
        <p>Surface + Subject + Selection מרכיבים את הפעולות הזמינות. אותה פעולה שומרת זהות סמנטית גם כשהמיקום והעדיפות משתנים.</p>
      </div>
      {target ? <div className="sod29-selection-summary">
        <span>{target.source === "selection" ? "בחירה" : "פוקוס"}</span>
        <strong>{target.label}</strong>
        <small>{target.type}</small>
      </div> : null}
      <ContextualActionButtons actions={actions} target={target} onInspect={onInspect} onCapability={onCapability} onRaziel={onRaziel} onDeepen={onDeepen} go={go} />
      <div className="sod29-panel-context-card">
        <b>One Context</b>
        <span>{context?.subject ? `Subject · ${context.subject.type}:${context.subject.label || context.subject.id}` : "Subject · לא נקבע"}</span>
        <small>Surface + Selection → Action → Capability → Panel → Heichal</small>
      </div>
    </>
  );
}

function AttentionProjection({ context, onWorkspace }) {
  return (
    <>
      <div className="sod29-panel-lead">
        <div className="sod29-kicker">NOW / ATTENTION</div>
        <h3>מה באמת דורש תשומת לב עכשיו?</h3>
        <p>Projection אחד מעל owners קיימים. אין כאן Notification store חדש ואין מספרים מומצאים.</p>
      </div>
      <div className="sod29-attention-projection">
        <FrameState kind="unavailable" title="האתר / זרם">adapter 2029 ל־site/content stream עדיין לא מחובר ל־Frame המבודד.</FrameState>
        <FrameState kind="unavailable" title="אני עוקב">Follow נשאר owner עצמאי; PR #486 אינו נעקף דרך UI מקומי.</FrameState>
        <FrameState kind="unavailable" title="הודעות / mentions">ה־Frame לא יורש את UserCenter/legacy notifications presentation.</FrameState>
        <FrameState kind="unavailable" title="Raziel Research Pulse">Silence Gate: בלי שינוי מחקרי מהותי ומוכח אין pulse.</FrameState>
      </div>
      {context?.subject ? <button className="sod29-action primary" type="button" onClick={onWorkspace}>◎ פתח רציפות אישית</button> : null}
    </>
  );
}

function ToolsProjection({ surface, target, onDeepen, go, onCapability }) {
  const tools = resolveContextTools({ surface, target });
  return (
    <>
      <div className="sod29-panel-lead">
        <div className="sod29-kicker">CONTEXTUAL TOOLS · {String(surface || "system").toUpperCase()}</div>
        <h3>הכלים מגיעים אל המחקר.</h3>
        <p>הסדר משתנה לפי המשטח והאובייקט הפעיל, אבל כל capability נשאר בבעלות המקורית שלו. אין רשימת כלים נפרדת לכל דף.</p>
      </div>
      {target ? <div className="sod29-selection-summary"><span>פוקוס</span><strong>{target.label}</strong><small>{target.type}</small></div> : null}
      <ContextualActionButtons actions={tools} target={target} onCapability={onCapability} onDeepen={onDeepen} go={go} />
    </>
  );
}

function RazielProjection({ target, context, onDeepen, numberCoreFocus = null, microIntent: transientMicroIntent = null }) {
  const label = target?.label || context?.subject?.label || context?.subject?.id || "המחקר הנוכחי";
  const numberFocus = numberCoreFocus || context?.dimensions?.numberCoreFocus || null;
  const microIntent = transientMicroIntent || context?.dimensions?.razielMicroIntent || null;
  const intentLabel = {
    explain_crossing: "הסבר את ההצלבה",
    explain_method: "הסבר את השיטה",
    compare_methods: "השווה שיטות",
    next_research_step: "מה כדאי לבדוק עכשיו?",
    explain_world: "הסבר את העולם",
    explain_world_context: "הסבר את מרכז העולמות",
    expand_panel: "המשך מה־Micro",
  }[microIntent] || null;
  const quickInsight = (() => {
    if (!numberFocus) return null;
    if (numberFocus.kind === "method") {
      const methodLabel = numberFocus.methodLabel || numberFocus.method || "השיטה הפעילה";
      return {
        title: `תגובה מהירה · ${methodLabel}`,
        text: `${methodLabel} מחושבת דרך המנוע הקנוני על ${numberFocus.expression || numberFocus.root}. התוצאה הפעילה היא ${numberFocus.resultValue ?? "—"}. פתח Trace כדי לראות את שלבי החישוב; השוואה לשיטה אחרת היא בדיקה נפרדת ולא משנה את זהות ה־Root.`,
        boundary: "חישוב = deterministic. משמעות/פרשנות נשארות שכבה נפרדת.",
      };
    }
    if (numberFocus.kind === "crossing") {
      const names = Array.isArray(numberFocus.methods) ? numberFocus.methods.map((item) => item?.methodLabel).filter(Boolean).join(" · ") : "";
      return {
        title: "תגובה מהירה · הצלבה",
        text: `${numberFocus.expression || numberFocus.root} והביטוי ${numberFocus.partner || numberFocus.crossingPartner || "המקביל"} נפגשים סביב ${numberFocus.root}${names ? ` דרך ${names}` : ""}. זו הצלבה חישובית; היא מעניינת למחקר אבל אינה מסקנה בפני עצמה.`,
        boundary: "שוויון מספרי ≠ הצלבה בלתי־תלויה ≠ התכנסות מחקרית.",
      };
    }
    if (numberFocus.kind === "world") {
      return {
        title: `תגובה מהירה · ${numberFocus.world || "עולם מחקר"}`,
        text: `העולם הזה מחובר כרגע ל־Root ${numberFocus.root} כהקשר מחקרי עם ${numberFocus.count ?? 0} פריטים. הוא לא תוצאה של שיטת גימטריה. אפשר לפתוח את העולם המלא כדי לראות את הקשרים והמקורות סביב העוגן.`,
        boundary: "World = context/projection, לא engine result.",
      };
    }
    if (numberFocus.kind === "world_hub") {
      const worldCount = Array.isArray(numberFocus.worlds) ? numberFocus.worlds.length : 0;
      const relatedCount = Array.isArray(numberFocus.relatedNumbers) ? numberFocus.relatedNumbers.length : 0;
      return {
        title: "תגובה מהירה · מרכז העולמות",
        text: `סביב ${numberFocus.root} מוצגים כרגע ${worldCount} עולמות ו־${relatedCount} מספרים קשורים בתצוגה המוגבלת. זהו מבט ניווטי; העולם המלא מחזיק את ההקשרים הרחבים יותר.`,
        boundary: "הצגה בולטת אינה דירוג אמת.",
      };
    }
    return {
      title: `תגובה מהירה · ${intentLabel || "המספר"}`,
      text: `רזיאל קיבל את ה־Root ${numberFocus.root}, הביטוי ${numberFocus.expression || numberFocus.root} והשיטה ${numberFocus.method || "הפעילה"}. אפשר להמשיך ל־Trace, להשוואה או למחקר עמוק בלי לאבד את ה־Context.`,
      boundary: "אותו Context, עומק שונה.",
    };
  })();
  return (
    <>
      <section className="sod29-raziel-native-hero">
        <RazielOrb />
        <div>
          <div className="sod29-kicker">ONE COMPANION · MICRO → PANEL → DEEP</div>
          <h3>{target || context?.subject ? `איתך על ${label}` : "מחכה לעוגן מחקר"}</h3>
          <p>זה אותו רזיאל שקיבל את ה־Micro מהחלונית. הרחבה משנה עומק וכלים — לא זהות, Context או אמת.</p>
        </div>
      </section>
      {numberFocus ? <section className="sod29-panel-context-card">
        <b>{intentLabel || "Number Core focus"}</b>
        <span>{numberFocus.expression || numberFocus.root}{numberFocus.method ? ` · ${numberFocus.method}` : ""}{numberFocus.resultValue != null ? ` → ${numberFocus.resultValue}` : ""}</span>
        {numberFocus.crossingPartner ? <small>הצלבה · {numberFocus.crossingPartner}</small> : null}
        {numberFocus.zeroScaleNext != null ? <small>Zero Scale · {numberFocus.root} → {numberFocus.zeroScaleNext}</small> : null}
      </section> : <FrameState title="Silence Gate">אין כרגע Focus מובנה שמצדיק synthesis. רזיאל לא ממציא pulse או מסלול.</FrameState>}
      {quickInsight ? <section className="sod29-panel-context-card sod29-raziel-quick-insight">
        <b>{quickInsight.title}</b>
        <span>{quickInsight.text}</span>
        <small>{quickInsight.boundary}</small>
      </section> : null}
      <div className="sod29-panel-context-card">
        <b>Research Context שניתן לרזיאל</b>
        <span>{context?.subject ? `${context.subject.type}:${context.subject.label || context.subject.id}` : "אין עוגן שמור"}</span>
        {target?.source === "selection" ? <small>בחירה זמנית: {target.label}</small> : null}
      </div>
      <div className="sod29-panel-actions-grid">
        <button className="sod29-action primary" type="button" disabled title="Native Raziel conversation adapter עדיין לא מחובר">✦ המשך שיחה · adapter pending</button>
        <button className="sod29-action" type="button" onClick={() => onDeepen(target)}>◇ פתח Deep Research</button>
      </div>
    </>
  );
}

function WorkspaceProjection({ context, go, onRaziel }) {
  const subject = normalizeTarget(context?.subject, "research-context");
  return (
    <>
      <div className="sod29-panel-lead">
        <div className="sod29-kicker">MY WORKSPACE · ONE RESEARCH OS</div>
        <h3>המרחב האישי שלי</h3>
        <p>Projection אחת למחקר, מסעות, Follow/Attention, חומר פרטי ורזיאל. לא UserCenter ישן ולא Store שני.</p>
      </div>
      {subject ? (
        <section className="sod29-workspace-resume-native">
          <span>Resume</span><strong>{subject.label}</strong><small>{subject.type}{context?.lens ? ` · ${context.lens}` : ""}</small>
          <div className="sod29-actions">
            {subject.href ? <button className="sod29-action primary" type="button" onClick={() => go(subject.href, { preserve: false })}>המשך בדיוק</button> : null}
            <button className="sod29-action" type="button" onClick={onRaziel}>✦ המשך עם רזיאל</button>
          </div>
        </section>
      ) : <FrameState kind="empty" title="אין מחקר פעיל">המערכת לא ממציאה Resume מטראפיק או משיחה.</FrameState>}
      <div className="sod29-attention-lanes native">
        <div className="sod29-attention-lane"><strong>אני עוקב</strong><small>בחירה מפורשת בלבד.</small></div>
        <div className="sod29-attention-lane"><strong>רלוונטי אליי</strong><small>Signal אישי, לא Follow.</small></div>
        <div className="sod29-attention-lane"><strong>רזיאל מציע</strong><small>Recommendation, לא אמת.</small></div>
      </div>
    </>
  );
}

export default function SystemFrame2029({
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
  const [navOpen, setNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [transient, setTransient] = useState(null);
  const [ephemeralSelection, setEphemeralSelection] = useState(null);
  const [commandQuery, setCommandQuery] = useState("");
  const panelRef = useRef(null);
  const navRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const returnFocusRef = useRef(null);
  const context = research.context || null;
  const currentHref = `${location.pathname}${location.search || ""}${location.hash || ""}`;
  const currentLabel = title || context?.subject?.label || "SOD1820";
  const locale = context?.locale || "he";
  const direction = directionForLocale(locale);

  const contextTarget = useMemo(() => targetFromContext(context), [context]);
  const activeTarget = ephemeralSelection || contextTarget;

  const preserveReturn = useCallback(() => {
    research.updateResearchContext?.({
      returnTo: {
        href: currentHref,
        label: currentLabel,
        subject: context?.subject || null,
        selection: context?.selection || null,
        lens: context?.lens || null,
        dimensions: context?.dimensions || {},
        journey: context?.journey || null,
      },
    });
  }, [research, currentHref, currentLabel, context]);

  const preserveReturnFor = useCallback((to) => {
    if (to && to !== currentHref) preserveReturn();
  }, [currentHref, preserveReturn]);

  const go = useCallback((to, { preserve = true } = {}) => {
    if (!to) return;
    if (preserve) preserveReturnFor(to);
    setTransient(null);
    navigate(to);
  }, [navigate, preserveReturnFor]);

  const returnExact = useCallback(() => {
    setTransient(null);
    const target = context?.returnTo || null;
    if (!target?.href) {
      navigate(-1);
      return;
    }
    research.updateResearchContext?.({
      subject: target.subject || null,
      selection: target.selection || null,
      lens: target.lens || null,
      dimensions: target.dimensions || null,
      journey: target.journey || null,
      returnTo: null,
    });
    navigate(target.href);
  }, [context?.returnTo, navigate, research]);

  const closeTransient = useCallback(() => {
    setTransient(null);
    requestAnimationFrame(() => returnFocusRef.current?.focus?.());
  }, []);

  const closeMobileNav = useCallback((restoreFocus = true) => {
    setNavOpen(false);
    if (restoreFocus) requestAnimationFrame(() => mobileMenuRef.current?.focus?.());
  }, []);

  const openTransient = useCallback((kind, payload = null) => {
    returnFocusRef.current = navOpen ? (mobileMenuRef.current || document.activeElement) : document.activeElement;
    setTransient({ kind, payload });
    setNavOpen(false);
  }, [navOpen]);

  const openCommand = useCallback(() => openTransient(TRANSIENT.COMMAND), [openTransient]);
  const openAction = useCallback((subject = null) => openTransient(TRANSIENT.ACTION, { subject: normalizeTarget(subject) }), [openTransient]);
  const openCapability = useCallback((capability, subject = null, payload = {}) => {
    const key = String(capability || "").trim();
    if (!key) return;
    openTransient(TRANSIENT.CAPABILITY, { ...payload, capability: key, subject: normalizeTarget(subject) });
  }, [openTransient]);
  const openInspect = useCallback((subject = null) => openTransient(TRANSIENT.INSPECT, { subject: normalizeTarget(subject) }), [openTransient]);
  const openNumber = useCallback((subject = null) => openCapability("number", subject), [openCapability]);
  const openAttention = useCallback(() => openTransient(TRANSIENT.ATTENTION), [openTransient]);
  const openTools = useCallback(() => openTransient(TRANSIENT.TOOLS), [openTransient]);
  const openRaziel = useCallback((payload = null) => {
    const boundedPayload = payload?.numberCoreFocus || payload?.razielMicroIntent ? payload : null;
    openTransient(TRANSIENT.RAZIEL, boundedPayload);
  }, [openTransient]);
  const openWorkspace = useCallback(() => openTransient(TRANSIENT.WORKSPACE), [openTransient]);
  const closeRaziel = useCallback(() => { if (transient?.kind === TRANSIENT.RAZIEL) closeTransient(); }, [transient?.kind, closeTransient]);
  const closeWorkspace = useCallback(() => { if (transient?.kind === TRANSIENT.WORKSPACE) closeTransient(); }, [transient?.kind, closeTransient]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openCommand();
      }
      if (event.key === "Escape") {
        if (transient) { event.preventDefault(); closeTransient(); }
        else if (navOpen) { event.preventDefault(); closeMobileNav(true); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openCommand, closeTransient, closeMobileNav, transient, navOpen]);

  useEffect(() => {
    if (!transient || !panelRef.current) return undefined;
    const panel = panelRef.current;
    const focusables = [...panel.querySelectorAll(FOCUSABLE)];
    const initial = panel.querySelector("[data-autofocus]") || focusables[0] || panel;
    requestAnimationFrame(() => initial.focus?.());
    const trap = (event) => {
      if (event.key !== "Tab") return;
      const current = [...panel.querySelectorAll(FOCUSABLE)];
      if (!current.length) { event.preventDefault(); panel.focus(); return; }
      const first = current[0];
      const last = current[current.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    panel.addEventListener("keydown", trap);
    return () => panel.removeEventListener("keydown", trap);
  }, [transient?.kind]);

  useEffect(() => {
    if (!navOpen || !navRef.current) return undefined;
    const nav = navRef.current;
    const focusables = [...nav.querySelectorAll(FOCUSABLE)];
    const initial = nav.querySelector("[data-autofocus]") || focusables[0] || nav;
    requestAnimationFrame(() => initial.focus?.());
    const trap = (event) => {
      if (event.key !== "Tab") return;
      const current = [...nav.querySelectorAll(FOCUSABLE)];
      if (!current.length) { event.preventDefault(); nav.focus(); return; }
      const first = current[0];
      const last = current[current.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    nav.addEventListener("keydown", trap);
    return () => nav.removeEventListener("keydown", trap);
  }, [navOpen]);

  useEffect(() => {
    const readSelection = () => {
      const selection = window.getSelection?.();
      const text = selection?.toString?.() || "";
      const node = selection?.anchorNode?.nodeType === 3 ? selection.anchorNode.parentElement : selection?.anchorNode;
      const insideMain = node?.closest?.(".sod29-main");
      const editing = node?.closest?.("input,textarea,[contenteditable='true']");
      if (!insideMain || editing) { setEphemeralSelection(null); return; }
      setEphemeralSelection(targetFromSelectedText(text));
    };
    document.addEventListener("selectionchange", readSelection);
    return () => document.removeEventListener("selectionchange", readSelection);
  }, []);

  useEffect(() => {
    setTransient(null);
    setNavOpen(false);
    setEphemeralSelection(null);
  }, [location.pathname, location.search]);

  const inspectTarget = useMemo(() => {
    const payloadTarget = normalizeTarget(transient?.payload?.subject, "requested");
    return payloadTarget || activeTarget;
  }, [transient?.payload?.subject, activeTarget]);

  const setResearchFocus = useCallback((target) => {
    const normalized = normalizeTarget(target);
    if (!normalized) return;
    research.setResearchContext?.({
      subject: {
        id: normalized.id,
        type: normalized.type,
        label: normalized.label,
        href: normalized.href || currentHref,
      },
      selection: {
        entityId: normalized.id,
        entityType: normalized.type,
        locator: normalized.locator || null,
      },
      lens: context?.lens || null,
      locale,
      returnTo: context?.returnTo || null,
    });
    setEphemeralSelection(null);
    closeTransient();
  }, [research, currentHref, context?.lens, context?.returnTo, locale, closeTransient]);

  const addToResearch = useCallback((target) => {
    const normalized = normalizeTarget(target);
    if (!normalized || !research.addToResearch) return;
    research.addToResearch(makeEntity({
      type: normalized.type,
      title: normalized.label,
      ref: normalized.id,
      link: normalized.href || currentHref,
      metadata: { source: "system-frame-2029", temporary_selection: normalized.source === "selection" },
    }));
  }, [research, currentHref]);

  const deepenToHeichal = useCallback((target) => {
    const normalized = normalizeTarget(target);
    const selectedHere = normalized && normalized.source === "selection";
    if (selectedHere) {
      research.setResearchContext?.({
        subject: { id: normalized.id, type: normalized.type, label: normalized.label, href: currentHref },
        selection: { entityId: normalized.id, entityType: normalized.type, locator: normalized.locator || null },
        lens: context?.lens || null,
        locale,
        returnTo: {
          href: currentHref,
          label: currentLabel,
          subject: context?.subject || null,
          selection: context?.selection || null,
          lens: context?.lens || null,
          dimensions: context?.dimensions || {},
          journey: context?.journey || null,
        },
      });
    }
    go("/heichal", { preserve: !selectedHere });
  }, [research, currentHref, currentLabel, context, locale, go]);

  const submitCommand = useCallback((event) => {
    event?.preventDefault?.();
    const target = targetFromSelectedText(commandQuery);
    if (!target) return;
    setEphemeralSelection(target);
    setCommandQuery("");
    openCapability("number", target, { source: "command" });
  }, [commandQuery, openCapability]);

  const shellApi = useMemo(() => ({
    openCommand,
    openAction,
    openCapability,
    openInspect,
    openNumber,
    openAttention,
    openTools,
    openRaziel,
    closeRaziel,
    openWorkspace,
    closeWorkspace,
    closeTransient,
    go,
    returnExact,
  }), [openCommand, openAction, openCapability, openInspect, openNumber, openAttention, openTools, openRaziel, closeRaziel, openWorkspace, closeWorkspace, closeTransient, go, returnExact]);

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
    "--s29-raziel-blue": RAZIEL_PRESENCE.blue,
    "--s29-raziel-indigo": RAZIEL_PRESENCE.indigo,
    "--s29-raziel-violet": RAZIEL_PRESENCE.violet,
    "--s29-raziel-glow": RAZIEL_PRESENCE.glow,
    "--s29-raziel-cycle": `${RAZIEL_PRESENCE.cycleMs}ms`,
    fontFamily: F.body,
  }), [palette]);

  const transientKind = transient?.kind || null;
  const renderTransient = () => {
    if (!transientKind) return null;
    const common = { panelRef, onClose: closeTransient };
    if (transientKind === TRANSIENT.COMMAND) return <PanelShell {...common} icon="⌘" kicker="SYSTEM FRAME" title="חיפוש / פקודה"><CommandProjection query={commandQuery} setQuery={setCommandQuery} onSubmit={submitCommand} onClose={closeTransient} /></PanelShell>;
    if (transientKind === TRANSIENT.ACTION) return <PanelShell {...common} icon="◎" kicker="ACTION / CONTEXT" title={`פעולה · ${inspectTarget?.label || context?.subject?.label || "ההקשר הנוכחי"}`}><ActionProjection surface={surface} target={inspectTarget} context={context} onInspect={openInspect} onCapability={openCapability} onRaziel={openRaziel} onDeepen={deepenToHeichal} go={go} /></PanelShell>;
    if (transientKind === TRANSIENT.CAPABILITY) {
      const capability = transient?.payload?.capability || null;
      if (capability === "number") return <PanelShell {...common} icon="123" kicker="CAPABILITY · NUMBER" title={inspectTarget?.label || context?.subject?.label || "מספר / ביטוי"}><NumberDrawer2029 target={inspectTarget} context={context} research={research} go={go} openRaziel={openRaziel} /></PanelShell>;
      return <PanelShell {...common} icon="◇" kicker="CAPABILITY" title={capability || "יכולת"}><FrameState kind="unavailable" title="ה־capability עדיין לא מחובר ל־Host">אותו Panel Host מוכן לקבל projections נוספים בלי לפתוח מערכת חלוניות מקבילה.</FrameState></PanelShell>;
    }
    if (transientKind === TRANSIENT.INSPECT) return <PanelShell {...common} icon={inspectTarget?.type === "number" ? "123" : "◎"} kicker="QUICK INSPECT" title={inspectTarget?.label || "בדיקה מהירה"}><InspectProjection target={inspectTarget} context={context} onSetFocus={setResearchFocus} onAddResearch={addToResearch} onDeepen={deepenToHeichal} /></PanelShell>;
    if (transientKind === TRANSIENT.ATTENTION) return <PanelShell {...common} icon="◉" kicker="ATTENTION" title="עכשיו"><AttentionProjection context={context} onWorkspace={() => openTransient(TRANSIENT.WORKSPACE)} /></PanelShell>;
    if (transientKind === TRANSIENT.TOOLS) return <PanelShell {...common} icon="◇" kicker="TOOLS / CAPABILITIES" title="כלים"><ToolsProjection surface={surface} target={activeTarget} onDeepen={deepenToHeichal} go={go} onCapability={openCapability} /></PanelShell>;
    if (transientKind === TRANSIENT.RAZIEL) return <PanelShell {...common} icon="●" kicker="RAZIEL" title="נוכחות מחקרית"><RazielProjection target={activeTarget} context={context} onDeepen={deepenToHeichal} numberCoreFocus={transient?.payload?.numberCoreFocus || null} microIntent={transient?.payload?.razielMicroIntent || null} /></PanelShell>;
    return <PanelShell {...common} icon="◎" kicker="PERSONAL" title="האזור האישי שלי"><WorkspaceProjection context={context} go={go} onRaziel={() => openTransient(TRANSIENT.RAZIEL)} /></PanelShell>;
  };

  return (
    <ShellContext.Provider value={shellApi}>
      <div className={`sod29-root closed-shell native-frame surface-${surface}${sidebarCollapsed ? " sidebar-collapsed" : ""}`} dir={direction} style={shellStyle}>
        <div className="sod29-ambient-field" aria-hidden="true"><i /><i /><i /></div>

        <aside className="sod29-sidebar" aria-label="ניווט SOD1820 2029">
          <Link to="/2029" className="sod29-brand" onClick={() => preserveReturnFor("/2029")}>
            <span><b>SOD 1820</b><small>One Reality · Research OS</small></span>
          </Link>
          <nav className="sod29-nav">
            <NavGroup title="בתים מרכזיים" items={HOME_NAV} preserveReturnFor={preserveReturnFor} />
            <NavGroup title="מחקר ישיר" items={DIRECT_NAV} preserveReturnFor={preserveReturnFor} />
          </nav>
          <button className="sod29-sidebar-workspace" type="button" onClick={openWorkspace}><span className="sod29-nav-icon">◎</span><span className="sod29-sidebar-workspace-copy">האזור האישי שלי</span></button>
          <button className="sod29-sidebar-toggle" type="button" onClick={() => setSidebarCollapsed((value) => !value)} aria-label={sidebarCollapsed ? "פתח סרגל" : "כווץ סרגל"}>{sidebarCollapsed ? "›" : "‹ כווץ"}</button>
          <div className="sod29-side-foot"><span className="sod29-live-dot" /> {status}<small>Frame אחד · Context אחד · בלי Legacy presentation fallback.</small></div>
        </aside>

        <div className="sod29-main">
          <header className="sod29-header closed-orientation">
            <div className="sod29-header-leading">
              <button ref={mobileMenuRef} className="sod29-mobile-menu-trigger" type="button" onClick={() => setNavOpen(true)} aria-label="פתח ניווט" aria-expanded={navOpen} aria-controls="sod29-mobile-navigation">☰</button>
              <div className="sod29-orientation" aria-label="איפה אני">
                <span>SOD1820</span><i>/</i><b>{title || "2029"}</b>
                {context?.subject ? <><i>/</i><span className="sod29-context-name">{context.subject.label || context.subject.id}</span></> : null}
              </div>
            </div>
            <div className="sod29-header-actions">
              <button className="sod29-header-search" type="button" onClick={openCommand}><span>⌘</span><span className="label">חיפוש / פקודה</span></button>
              <button type="button" onClick={returnExact} disabled={!context?.returnTo?.href} title={context?.returnTo?.label || "אין יעד חזרה שמור"}><span>↩</span><span className="return-label"> חזרה מדויקת</span></button>
              <button type="button" onClick={openWorkspace}>◎ <span className="workspace-label">האזור האישי שלי</span></button>
            </div>
          </header>

          <main className={`sod29-content${wide ? " wide" : ""}`}>
            {(eyebrow || title || description) ? (
              <section className="sod29-page-intro">
                <div className="sod29-hero-visual" aria-hidden="true"><i className="ring ring-a" /><i className="ring ring-b" /><i className="ring ring-c" /><span className="sod29-hero-symbol">{symbol}</span></div>
                <div className="sod29-hero-copy">
                  {eyebrow ? <div className="sod29-eyebrow">{eyebrow}</div> : null}
                  {title ? <h1 style={{ fontFamily: F.display }}>{title}</h1> : null}
                  {description ? <p>{description}</p> : null}
                  {context ? <div className="sod29-context-strip" aria-label="Research Context פעיל">
                    {context.subject ? <span>עוגן · {context.subject.label || context.subject.id}</span> : null}
                    {context.lens ? <span>עדשה · {context.lens}</span> : null}
                    {context.selection?.locator ? <span>מיקום · {context.selection.locator}</span> : null}
                    {context.journey?.position != null ? <span>מסע · {String(context.journey.position)}</span> : null}
                  </div> : null}
                </div>
              </section>
            ) : null}
            {children}
          </main>
        </div>

        {navOpen ? <>
          <div className="sod29-mobile-drawer-backdrop" onMouseDown={() => closeMobileNav(true)} />
          <aside
            id="sod29-mobile-navigation"
            className="sod29-mobile-drawer"
            ref={navRef}
            role="dialog"
            aria-modal="true"
            aria-label="ניווט SOD1820 2029"
            tabIndex={-1}
          >
            <div className="sod29-mobile-drawer-head"><b>לאן ממשיכים?</b><button data-autofocus type="button" onClick={() => closeMobileNav(true)} aria-label="סגור">×</button></div>
            <NavGroup title="בתים מרכזיים" items={HOME_NAV} preserveReturnFor={preserveReturnFor} onNavigate={() => closeMobileNav(false)} />
            <NavGroup title="מחקר ישיר" items={DIRECT_NAV} preserveReturnFor={preserveReturnFor} onNavigate={() => closeMobileNav(false)} />
            <button className="sod29-sidebar-workspace" type="button" onClick={openWorkspace}><span className="sod29-nav-icon">◎</span><span>האזור האישי שלי</span></button>
          </aside>
        </> : null}

        {ephemeralSelection ? <button className="sod29-selection-cue" type="button" onClick={() => openAction(ephemeralSelection)}><small>בחרת</small><strong>{ephemeralSelection.label}</strong><span>פעולה</span></button> : null}

        <div className="sod29-command-island" role="toolbar" aria-label="פעולות זמינות עכשיו" data-raziel-anchor="center">
          <button type="button" onClick={openCommand} aria-pressed={transientKind === TRANSIENT.COMMAND}><span>⌘</span><small>פקודה</small></button>
          <button type="button" onClick={() => openAction(activeTarget)} aria-pressed={transientKind === TRANSIENT.ACTION}><span>◎</span><small>פעולה</small></button>
          <RazielOrb compact active={transientKind === TRANSIENT.RAZIEL} onClick={openRaziel} />
          <button type="button" onClick={openAttention} aria-pressed={transientKind === TRANSIENT.ATTENTION}><span>◉</span><small>עכשיו</small></button>
          <button type="button" onClick={openTools} aria-pressed={transientKind === TRANSIENT.TOOLS}><span>◇</span><small>כלים</small></button>
        </div>

        {renderTransient()}
      </div>
    </ShellContext.Provider>
  );
}