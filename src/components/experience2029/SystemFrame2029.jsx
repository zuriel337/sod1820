import { buildRazielSurfaceContext } from "../../lib/research/razielSurfaceContext.js";
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
import { PaletteProvider, use2029Palette } from "../../lib/palette.js";
import { setThemePreset, useThemePreset } from "../../lib/themeMode.js";
import { timeAgoHe } from "../../lib/format.js";
import { BRAND_LOCKUP_2029 } from "../../lib/brandAssets2029.js";
import { LAYOUT, RADIUS, RAZIEL_PRESENCE, TYPEFACE, TYPE_SCALE_V2 } from "../../lib/designTokens.js";
import { resolveExperienceContext } from "../../lib/experienceContext.js";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import { useAuth } from "../../lib/AuthContext.jsx";
import { requestEmailOtp, verifyEmailOtp } from "../../lib/auth.js";
import { EMAIL_OTP_MAX_LENGTH, isValidEmailOtp, sanitizeEmailOtp } from "../../lib/emailOtp.js";
import { makeEntity } from "../../lib/research/entity.js";
import { askRaziel, getNotificationPrefs } from "../../lib/supabase.js";
import { getMyNotifications, getUnreadCount, markNotificationRead, topicLabel } from "../../lib/notifications.js";
import { getMyProfile, watchToggle } from "../../lib/commandCenter.js";
import { getVisitorId } from "../../lib/tracking.js";
import { isRazielNextAction } from "../../lib/research/razielActionContract.js";
import {
  CONTEXT_ACTION_KIND,
  resolveContextActions,
  resolveContextTools,
} from "../../lib/research/contextualCapabilities.js";
import ShareActions from "../ShareActions.jsx";
import CanonicalProgress from "../CanonicalProgress.jsx";
import ContactGateway from "../ContactGateway.jsx";
import NumberDrawer2029 from "../number2029/NumberDrawer2029.jsx";
import SurfaceContextRail2029 from "./SurfaceContextRail2029.jsx";
import LearnMark2029 from "./LearnMark2029.jsx";
import {
  buildLearnHelpSeed,
  classifyEntryArrival,
  emitEntryLearn,
  getConceptFamiliarity,
  getLearnFragment,
  getSurfaceFamiliarity,
  isEntryLearnSurfaceActive,
  LEARN_LAYER,
  LEARN_SCOPE,
  markConceptFamiliarity,
  markSurfaceFamiliarity,
  resolveEntryOrientation,
} from "../../lib/entryLearn2029.js";
import { buildElsRazielGuidance } from "../../lib/research/elsRazielContext.js";
import "./sod2029.css";
import "./sod2029-closed.css";
import "./systemFrame2029.css";
import "./myWorkspace2029.css";

const TRANSIENT = Object.freeze({
  COMMAND: "command",
  ACTION: "action",
  CAPABILITY: "capability",
  INSPECT: "inspect",
  ATTENTION: "attention",
  TOOLS: "tools",
  RAZIEL: "raziel",
  WORKSPACE: "workspace",
  ISSUE: "issue",
  CONTEXT: "context",
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
  openIssueReport: () => {},
  closeWorkspace: () => {},
  closeTransient: () => {},
  go: () => {},
  returnExact: () => {},
  experience: null,
});

export const use2029Shell = () => useContext(ShellContext);

const HOME_NAV = [
  { to: "/2029", label: "בית", icon: "⌂", exact: true },
  { to: "/world", label: "העולם", icon: "◌" },
  { to: "/heichal", label: "היכל", icon: "◇" },
  { to: "/2029/posts", label: "פוסטים", icon: "↟" },
  { label: "מסעות", icon: "↝", status: "בקרוב" },
  { label: "קהילה", icon: "◎", status: "בקרוב" },
];

const DIRECT_NAV = [
  { label: "דף המספר", icon: "123", action: "number" },
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
  const resultValue = Number(input.resultValue ?? input.number);
  return {
    id,
    type: String(type),
    label: String(input.label || input.title || id),
    locator: input.locator || null,
    href: input.href || input.link || null,
    source: input.source || source,
    expression: input.expression || null,
    method: input.method || input.methodKey || null,
    resultValue: Number.isSafeInteger(resultValue) ? resultValue : null,
    number: Number.isSafeInteger(Number(input.number)) ? Number(input.number) : null,
    sectionLabel: input.sectionLabel || null,
    sourceLabel: input.sourceLabel || null,
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

function BrandLockup2029({ className = "" }) {
  return (
    <img
      className={`sod29-brand-lockup${className ? ` ${className}` : ""}`}
      src={BRAND_LOCKUP_2029.src}
      width={BRAND_LOCKUP_2029.width}
      height={BRAND_LOCKUP_2029.height}
      alt={BRAND_LOCKUP_2029.alt}
      loading="eager"
      decoding="async"
      draggable="false"
      data-brand-asset-state={BRAND_LOCKUP_2029.state}
    />
  );
}

const THEME_PRESET_OPTIONS = Object.freeze([
  { id: "light", label: "יום", icon: "☀" },
  { id: "parchment", label: "קלף", icon: "▤" },
  { id: "dark", label: "לילה", icon: "☾" },
]);

function ThemePresetControl2029({ compact = false }) {
  const preset = useThemePreset();
  return (
    <div className={`sod29-theme-presets${compact ? " is-compact" : ""}`} role="group" aria-label="ערכת צבעים">
      {THEME_PRESET_OPTIONS.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={preset === item.id}
          className={preset === item.id ? "is-active" : ""}
          onClick={() => setThemePreset(item.id)}
          title={item.label}
        >
          <span aria-hidden="true">{item.icon}</span>
          <b>{item.label}</b>
        </button>
      ))}
    </div>
  );
}

function UserAvatar2029({ user, profile, size = "normal" }) {
  const src = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const name = String(profile?.display_name || profile?.full_name || user?.user_metadata?.full_name || user?.email || "אישי").trim();
  const fallback = Array.from(name).find((ch) => /[\p{L}\p{N}]/u.test(ch)) || "•";
  return (
    <span className={`sod29-user-avatar is-${size}`} aria-hidden="true">
      {src ? <img src={src} alt="" referrerPolicy="no-referrer" /> : <b>{fallback}</b>}
    </span>
  );
}

function NavGroup({ title, items, preserveReturnFor, onNavigate, onAction }) {
  return (
    <div className="sod29-nav-group">
      <div className="sod29-nav-group-title">{title}</div>
      {items.map((item) => item.to ? (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.exact}
          className={activeClass}
          state={{ sodEntryArrival: "internal" }}
          onClick={() => { preserveReturnFor(item.to); onNavigate?.(); }}
        >
          <span className="sod29-nav-icon">{item.icon}</span>
          <span className="sod29-nav-copy">{item.label}</span>
        </NavLink>
      ) : item.action ? (
        <button className="sod29-nav-link" key={item.label} type="button" onClick={() => { onAction?.(item.action); onNavigate?.(); }}>
          <span className="sod29-nav-icon">{item.icon}</span>
          <span className="sod29-nav-copy">{item.label}</span>
        </button>
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
        data-experience-capability="contextual-sidecar"
        data-desktop-projection="left-context-sidecar"
        data-mobile-projection="bottom-context-sheet"
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
        <div className="sod29-kicker">חיפוש מכל מקום</div>
        <h3>פתח מספר, ביטוי או חיבור בלי לאבד את המקום.</h3>
        <p>כתוב מה מסקרן אותך. המערכת תפתח את הכלי המתאים ותשמור מאיפה הגעת.</p>
      </div>
      <form className="sod29-frame-command" onSubmit={onSubmit}>
        <input
          data-autofocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="358 · משיח · ביטוי לבדיקה"
          aria-label="חיפוש"
        />
        <button className="sod29-action primary" type="submit">בדוק</button>
      </form>
      <div className="sod29-frame-hint"><kbd>⌘K</kbd><span>פתיחה מכל מקום</span><kbd>Esc</kbd><span>חזרה בדיוק למקום</span></div>
      <button className="sod29-action" type="button" onClick={onClose}>סגור</button>
    </>
  );
}

function InspectProjection({ target, context, surface = "system", onSetFocus, onSave, onAddResearch, isSaved = false, inResearch = false, onOpenNumber, onNeedHelp }) {
  const [commitState, setCommitState] = useState(null);
  const numericFamily = target?.type === "number" || target?.type === "phrase";
  const hasMethodContext = Boolean(target?.expression && target?.method && Number.isSafeInteger(Number(target?.resultValue)));
  const conceptKey = hasMethodContext ? "method" : numericFamily ? "anchor" : null;
  const fragment = conceptKey && isEntryLearnSurfaceActive(surface) ? getLearnFragment(conceptKey) : null;
  const [conceptFamiliarity, setConceptFamiliarity] = useState(() => conceptKey ? getConceptFamiliarity(conceptKey) : null);

  useEffect(() => {
    setConceptFamiliarity(conceptKey ? getConceptFamiliarity(conceptKey) : null);
  }, [conceptKey]);

  if (!target) {
    return <FrameState kind="empty" title="אין כרגע משהו לבדוק">סמן ביטוי או מספר בטקסט, חפש משהו או בחר פריט. המערכת לא ממציאה חיבור שלא קיים.</FrameState>;
  }

  const openLearn = () => {
    if (!conceptKey || !fragment) return;
    const familiarity = markConceptFamiliarity(conceptKey, "seen", fragment.version);
    setConceptFamiliarity(familiarity);
    emitEntryLearn("learn_opened", {
      entrySurface: surface,
      conceptKey,
      layer: LEARN_LAYER.SEE,
      manifestVersion: fragment.version,
    });
    emitEntryLearn("learn_layer", {
      entrySurface: surface,
      conceptKey,
      layer: LEARN_LAYER.EXPLAIN,
      manifestVersion: fragment.version,
    });
  };

  const askForLearnHelp = () => {
    if (!conceptKey || !fragment) return;
    const tried = conceptFamiliarity?.stage === "tried";
    const learnStage = tried ? LEARN_LAYER.TRY : LEARN_LAYER.EXPLAIN;
    const actionTried = tried && numericFamily ? "open_number" : null;
    emitEntryLearn("learn_help_requested", {
      entrySurface: surface,
      conceptKey,
      layer: learnStage,
      actionId: actionTried,
      manifestVersion: fragment.version,
    });
    onNeedHelp?.({
      initialText: buildLearnHelpSeed(conceptKey),
      capability: numericFamily ? "number" : null,
      concept: conceptKey,
      learnStage,
      actionTried,
    });
  };

  const tryLearn = () => {
    if (!conceptKey || !fragment || !numericFamily) return;
    const familiarity = markConceptFamiliarity(conceptKey, hasMethodContext ? "tried" : "seen", fragment.version);
    setConceptFamiliarity(familiarity);
    emitEntryLearn(hasMethodContext ? "method_tried" : "example_tried", {
      entrySurface: surface,
      conceptKey,
      layer: LEARN_LAYER.TRY,
      actionId: "open_number",
      targetSurface: "number",
      manifestVersion: fragment.version,
    });
    emitEntryLearn("continued_to_research", {
      entrySurface: surface,
      conceptKey,
      layer: LEARN_LAYER.EXPLORE,
      actionId: "open_number",
      targetSurface: "number",
      manifestVersion: fragment.version,
    });
    onOpenNumber?.(target);
  };

  return (
    <>
      <section className="sod29-inspect-identity">
        <div className="sod29-kicker">{target.source === "selection" ? "בחירה זמנית" : "מוקד נוכחי"}</div>
        <strong>{target.label}</strong>
        <span>{target.type}</span>
      </section>

      {hasMethodContext ? <div className="sod29-surface-context-expression"><span>{target.expression}</span><small>{target.methodLabel || target.method}</small><b>{Number(target.resultValue)}</b></div> : null}

      {numericFamily ? (
        <FrameState title="מספר / ביטוי · בדיקה מהירה">
          הבדיקה שומרת את המקום וההקשר. אפשר לפתוח את החישוב בלי לצאת למסך אחר ובלי לאבד את הדרך חזרה.
        </FrameState>
      ) : (
        <FrameState title="בדיקה מהירה">אותה בדיקה יכולה להיפתח גם על ספר, מקור, אדם, אירוע או גילוי כשהחיבור קיים במערכת.</FrameState>
      )}

      {fragment ? <LearnMark2029
        scope={LEARN_SCOPE.CONCEPT}
        label={fragment.label}
        compact={Number(conceptFamiliarity?.v) === Number(fragment.version)}
        onOpen={openLearn}
        onStillUnclear={askForLearnHelp}
        actions={numericFamily ? <button type="button" onClick={tryLearn}>{hasMethodContext ? "ראה את החישוב" : "פתח בדף המספר"}</button> : null}
      >
        <p>{fragment.explain}</p>
        {hasMethodContext ? <p><strong>{target.expression}</strong> מוצג במוקד הפעיל בשיטה <strong>{target.method}</strong> עם תוצאה <strong>{target.resultValue}</strong>. ההסבר אינו מקור חישוב נוסף.</p> : null}
      </LearnMark2029> : null}

      <div className="sod29-panel-actions-grid">
        <button className="sod29-action primary" type="button" onClick={() => onSetFocus(target)}>⌖ התמקד בזה</button>
        <button className="sod29-action" type="button" data-inspect-action="save" aria-pressed={isSaved} onClick={() => setCommitState({ kind: "save", ok: Boolean(onSave?.(target)) })}>{isSaved ? "✓ שמור" : "＋ שמור"}</button>
        <button className="sod29-action" type="button" data-inspect-action="research" aria-pressed={inResearch} onClick={() => setCommitState({ kind: "research", ok: Boolean(onAddResearch?.(target)) })}>{inResearch ? "✓ במחקר" : "◎ למחקר"}</button>
        <button className="sod29-action" type="button" disabled title="המעקב המלא יחובר בהמשך">♢ עקוב</button>
      </div>

      {commitState && !commitState.ok ? <FrameState kind="error" title="הפעולה לא נשמרה">{commitState.kind === "save" ? "השמירה לא הושלמה" : "ההוספה למחקר לא הושלמה"} — נסה שוב.</FrameState> : null}

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
        <b>ההקשר שלך</b>
        <span>{context?.subject ? `${context.subject.type}:${context.subject.label || context.subject.id}` : "אין מוקד פעיל"}</span>
        <small>בחירה זמנית אינה הופכת חיבור לעובדה.</small>
      </div>
    </>
  );
}
function ContextualActionButtons({ actions, target, onInspect, onCapability, onRaziel, go }) {
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
  go,
}) {
  const actions = resolveContextActions({ surface, target });
  if (!target && !actions.length) {
    return <FrameState kind="empty" title="אין כרגע משהו לפעול עליו">סמן שורה, ביטוי, מספר או פריט. הפעולות יתאימו את עצמן למה שבחרת או למה שאתה רואה עכשיו.</FrameState>;
  }
  return (
    <>
      <div className="sod29-panel-lead">
        <div className="sod29-kicker">מה אפשר לעשות כאן</div>
        <h3>{target ? "מה אפשר לעשות עם הבחירה הזאת?" : "מה אפשר לעשות במשטח הזה?"}</h3>
        <p>הפעולות משתנות לפי המקום והדבר שבחרת, בלי לאבד את ההקשר.</p>
      </div>
      {target ? <div className="sod29-selection-summary">
        <span>{target.source === "selection" ? "בחירה" : "פוקוס"}</span>
        <strong>{target.label}</strong>
        <small>{target.type}</small>
      </div> : null}
      <ContextualActionButtons actions={actions} target={target} onInspect={onInspect} onCapability={onCapability} onRaziel={onRaziel} go={go} />
      <div className="sod29-panel-context-card">
        <b>אותו הקשר</b>
        <span>{context?.subject ? `Subject · ${context.subject.type}:${context.subject.label || context.subject.id}` : "אין מוקד פעיל"}</span>
        <small>מה שבחרת נשאר איתך כשנפתח כלי או עולם.</small>
      </div>
    </>
  );
}

function AttentionProjection({ context, onWorkspace, onOpen }) {
  const [arrivals, setArrivals] = useState({ loading: true, items: [], error: false, partial: false });

  // SAME owner/reader as /world. Loaded only on opening the bottom attention sheet;
  // never copy a private/admin research bundle into global Context or local storage.
  useEffect(() => {
    let live = true;
    import("../../lib/research/worldDiscoveryStream.js")
      .then(({ fetchWorldDiscoveryStream }) => fetchWorldDiscoveryStream({ limit: 10, includeResearch: false }))
      .then((result) => {
        if (live) setArrivals({
          loading: false,
          items: result.items || [],
          error: false,
          partial: (result.unavailableSources || []).length > 0,
        });
      })
      .catch(() => { if (live) setArrivals({ loading: false, items: [], error: true, partial: false }); });
    return () => { live = false; };
  }, []);

  return (
    <>
      <div className="sod29-panel-lead">
        <div className="sod29-kicker">העולם חי</div>
        <h3>מה חדש בעולם</h3>
        <p>מקורות שהתעדכנו באתר והתכנסויות מאושרות, לפי זמן. חדש אינו בהכרח ממצא מחקר מאומת.</p>
      </div>
      <div className="sod29-attention-projection" aria-label="מה חדש בעולם">
        {arrivals.loading ? <FrameState kind="loading" title="טוען חידושים">קורא עדכונים ציבוריים.</FrameState> : null}
        {arrivals.error ? <FrameState kind="unavailable" title="העדכונים אינם זמינים">אפשר להמשיך ישירות אל העולם.</FrameState> : null}
        {!arrivals.loading && !arrivals.error && !arrivals.items.length ? <FrameState kind="empty" title="אין כרגע חידושים להצגה">העולם עדיין זמין לקריאה.</FrameState> : null}
        {arrivals.partial ? <small>חלק ממקורות העדכון אינם זמינים כרגע.</small> : null}
        {arrivals.items.slice(0, 8).map((item) => {
          const href = item.kind === "source"
            ? item.href
            : item.kind === "convergence" && item.slug
              ? `/topic/${encodeURIComponent(item.slug)}`
              : null;
          return <button
            type="button"
            key={item.id}
            className="sod29-action"
            disabled={!href}
            onClick={() => onOpen?.(href)}
            style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%", textAlign: "start", minHeight: 44, gap: 4 }}
          >
            <small>{item.kind === "source" ? "כתב מקור" : "התכנסות"} · {item.creator} · {timeAgoHe(item.at) || "זמן לא צוין"}</small>
            <strong>{item.label}</strong>
            {item.summary ? <small>{item.summary}</small> : null}
            {item.kind === "source" && item.researchCount > 0 ? <small>מחקר קשור זמין בהעמקה</small> : null}
          </button>;
        })}
        <button className="sod29-action primary" type="button" onClick={() => onOpen?.("/world")}>פתח את כל החידושים בעולם</button>
        <details><summary>עוד התראות אישיות</summary>
          <FrameState kind="unavailable" title="אני עוקב">פריטים שבחרת לעקוב אחריהם יופיעו כאן כשהחיבור יושלם.</FrameState>
          <FrameState kind="unavailable" title="הודעות">הודעות אישיות יופיעו כאן דרך המערכת החדשה.</FrameState>
        </details>
      </div>
      {context?.subject ? <button className="sod29-action primary" type="button" onClick={onWorkspace}>◎ פתח את האזור שלי</button> : null}
    </>
  );
}

function ToolsProjection({ surface, target, go, onCapability }) {
  const tools = resolveContextTools({ surface, target });
  return (
    <>
      <div className="sod29-panel-lead">
        <div className="sod29-kicker">כלים שמתאימים לכאן</div>
        <h3>הכלים מגיעים למה שאתה רואה.</h3>
        <p>הכלים משתנים לפי המקום והדבר שבחרת. אין צורך לחפש אותם במסך אחר.</p>
      </div>
      {target ? <div className="sod29-selection-summary"><span>פוקוס</span><strong>{target.label}</strong><small>{target.type}</small></div> : null}
      <ContextualActionButtons actions={tools} target={target} onCapability={onCapability} go={go} />
    </>
  );
}

const RAZIEL_LEVEL_LABEL = { deterministic: "דטרמיניסטי", fast: "מהיר", deep: "עמוק" };

// שיחה מקומית קומפקטית עם רזיאל — אותו transport קיים (askRaziel → ai-analyze persona=raziel).
// אפס קריאה בפתיחה/רינדור; ברירת-מחדל = מהיר; "העמק" = פעולה מפורשת על אותה שאלה+הקשר (אין הסלמה אוטומטית).
// מצב-השיחה = state מקומי של הקומפוננטה בלבד (אין store גלובלי).
function RazielNativeChat({ context, label, numberFocus, readingFocus, elsFocus = null, primary = false }) {
  const [text, setText] = useState("");
  const [thread, setThread] = useState([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const subjectRef = context?.subject ? `${context.subject.type}:${context.subject.label || context.subject.id}` : "";
  // תמלול מקומי חסום — משקף את חסם RazielChat הישן: 2 תורות אחרונים, ~200 תווים לתור, ≤500 סה"כ.
  // רק state הקומפוננטה; בלי store חדש. כל ההקשר ≤600 — חוזה rCtxHint הקיים בשרת (לא מורחב).
  const buildTranscript = (turns) => turns.slice(-2)
    .map((m) => `${m.role === "user" ? "משתמש" : "רזיאל"}: ${String(m.text || "").replace(/\s+/g, " ").slice(0, 200)}`)
    .join("\n").slice(0, 500);
  const buildContext = (transcript) => {
    const block = transcript ? `שיחה אחרונה:\n${transcript}` : "";
    const head = [subjectRef && `הקשר פעיל: ${subjectRef}`, label && `מוקד: ${label}`].filter(Boolean).join(" | ");
    const room = Math.max(0, 600 - block.length - (block && head ? 1 : 0));
    return [head.slice(0, room), block].filter(Boolean).join("\n").slice(0, 600) || null;
  };
  const buildFacts = () => [
    numberFocus?.root != null ? `שורש עמוד: ${numberFocus.root}` : "",
    numberFocus ? `מוקד מספר: ${numberFocus.expression || numberFocus.root}${numberFocus.method ? ` · ${numberFocus.method}` : ""}${numberFocus.resultValue != null ? ` → ${numberFocus.resultValue}` : ""}` : "",
    readingFocus ? `קוראים עכשיו: ${readingFocus.label || ""} ${readingFocus.primary || ""}`.trim() : "",
  ].filter(Boolean).join("\n").slice(0, 1200);
  // מתאר-משטח סמנטי חסום מתוך הקשר סמנטי קיים בלבד: זהות+מוקד, בלי HTML ובלי טקסט-דף.
  const buildSurfaceSemantic = () => {
    const cap = (v, n) => (v == null ? "" : String(v).replace(/\s+/g, " ").trim().slice(0, n));
    const out = { surface: cap(context?.surface || context?.subject?.type || "frame", 40) };
    if (context?.subject) out.subject = { type: cap(context.subject.type, 30), id: cap(context.subject.id, 80), label: cap(context.subject.label, 80) };
    if (numberFocus) out.number = { expression: cap(numberFocus.expression || numberFocus.root, 60), method: cap(numberFocus.method, 40), result: cap(numberFocus.resultValue, 30) };
    if (readingFocus) out.reading = { label: cap(readingFocus.label, 80), primary: cap(readingFocus.primary, 80) };
    if (elsFocus?.occurrence) out.els = { occurrence: cap(elsFocus.occurrence.occurrenceRef, 80), term: cap(elsFocus.occurrence.term || elsFocus.term, 60) };
    const surfaceContext = buildRazielSurfaceContext(context);
    if (surfaceContext) out.context = surfaceContext;
    return out;
  };
  const send = async (question, level, again = false) => {
    const q = String(question || "").trim();
    if (!q || busy) return;
    setBusy(true); setNote("");
    // תמלול = התורות שלפני השאלה הנוכחית (שאלת העמקה: בלי התשובה המהירה של אותה שאלה עצמה).
    const prior = again ? thread.slice(0, Math.max(0, thread.length - 1)) : thread;
    if (!again) setThread((t) => [...t, { role: "user", text: q }]);
    const transcript = buildTranscript(prior);
    const res = await askRaziel({
      subject: q.slice(0, 300), // השאלה עצמה בלבד — שורש/שיטה רק ב-facts/context (קידומת מזהמת חילוץ נושא דטרמיניסטי)
      facts: buildFacts(),
      context: buildContext(transcript),
      again,
      intelligenceLevel: level,
      surfaceSemantic: buildSurfaceSemantic(),
    });
    setBusy(false);
    if (!res) { setNote("רזיאל לא הצליח לענות כרגע (או שהמכסה להיום הסתיימה). אפשר לנסות שוב."); return; }
    setThread((t) => [...t, { role: "raziel", text: res.answer || "", level: res.deterministic ? "deterministic" : (res.intelligence_level || level), question: q }]);
    if (!again) setText("");
  };
  const lastRaziel = [...thread].reverse().find((m) => m.role === "raziel");
  return (
    <section className="sod29-panel-context-card sod29-raziel-chat" data-raziel-native-chat="true">
      <b>✦ המשך עם רזיאל</b>
      {thread.map((m, i) => (
        <div key={i} className={m.role === "user" ? "sod29-raziel-chat-user" : "sod29-raziel-chat-raziel"}>
          <span>{m.text}</span>
          {m.role === "raziel" ? <small data-raziel-level={m.level}>{RAZIEL_LEVEL_LABEL[m.level] || ""}</small> : null}
        </div>
      ))}
      {note ? <small role="status">{note}</small> : null}
      <form onSubmit={(e) => { e.preventDefault(); send(text, "fast"); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="שאל את רזיאל על מה שמולך" maxLength={300} aria-label="שאלה לרזיאל" disabled={busy} />
        <button className={primary ? "sod29-action primary" : "sod29-action"} type="submit" disabled={busy || !text.trim()}>{busy ? "חושב…" : "שלח"}</button>
        {lastRaziel && lastRaziel.level === "fast" ? <button className="sod29-action" type="button" disabled={busy} data-raziel-deepen="true" onClick={() => send(lastRaziel.question, "deep", true)}>העמק</button> : null}
      </form>
    </section>
  );
}

function RazielProjection({ target, context, numberCoreFocus = null, microIntent: transientMicroIntent = null, readingFocus: transientReadingFocus = null, elsSurfaceContext = null, razielRouteAction = null }) {
  const label = target?.label || context?.subject?.label || context?.subject?.id || "מה שאתה רואה עכשיו";
  const numberFocus = numberCoreFocus || context?.dimensions?.numberCoreFocus || null;
  const readingFocus = transientReadingFocus || context?.dimensions?.readingFocus || null;
  const routeActionValid = isRazielNextAction(razielRouteAction);
  const routeHomeLabel = routeActionValid ? ({
    current: "כאן",
    world: "בעולם",
    heichal: "בהיכל",
    journey: "במסע",
  }[razielRouteAction.preferred_home] || null) : null;
  const elsFocus = elsSurfaceContext?.surface === "els"
    && elsSurfaceContext?.occurrence?.occurrenceRef
    && elsSurfaceContext?.result?.contract === "els_2029_projection_v1"
    && elsSurfaceContext?.result?.status === "OK"
    && elsSurfaceContext?.result?.presentationPolicy === "exact_replay_v1"
    ? elsSurfaceContext
    : null;
  const elsGuide = elsFocus ? buildElsRazielGuidance(elsFocus) : null;
  const microIntent = transientMicroIntent || context?.dimensions?.razielMicroIntent || null;
  const intentLabel = {
    explain_crossing: "הסבר את ההצלבה",
    explain_method: "הסבר את השיטה",
    compare_methods: "השווה שיטות",
    next_research_step: "מה כדאי לבדוק עכשיו?",
    explain_world: "הסבר את העולם",
    explain_world_context: "הסבר את מרכז העולמות",
    expand_panel: "המשך מה־Micro",
    explain_reading_focus: "הסבר את החלק שאני קורא",
    explain_els_occurrence: "הסבר את מופע ה־ELS",
  }[microIntent] || null;
  const quickInsight = (() => {
    if (!numberFocus) return null;
    if (numberFocus.kind === "method") {
      const methodLabel = numberFocus.methodLabel || numberFocus.method || "השיטה הפעילה";
      return {
        title: `תגובה מהירה · ${methodLabel}`,
        text: `${methodLabel} מחושבת באמצעות החישוב המאומת של האתר על ${numberFocus.expression || numberFocus.root}. התוצאה הפעילה היא ${numberFocus.resultValue ?? "—"}. פתח את החישוב כדי לראות את השלבים; השוואה לשיטה אחרת היא בדיקה נפרדת ולא משנה את הביטוי שבחרת.`,
        boundary: "החישוב מאומת בנפרד; המשמעות נשארת פרשנות.",
      };
    }
    if (numberFocus.kind === "crossing") {
      const names = Array.isArray(numberFocus.methods) ? numberFocus.methods.map((item) => item?.methodLabel).filter(Boolean).join(" · ") : "";
      return {
        title: "תגובה מהירה · הצלבה",
        text: `${numberFocus.expression || numberFocus.root} והביטוי ${numberFocus.partner || numberFocus.crossingPartner || "המקביל"} נפגשים סביב ${numberFocus.root}${names ? ` דרך ${names}` : ""}. זו הצלבה חישובית; היא פותחת חיבור לבדיקה אבל אינה מסקנה בפני עצמה.`,
        boundary: "שוויון מספרי לבדו אינו הוכחה למשמעות.",
      };
    }
    if (numberFocus.kind === "world") {
      return {
        title: `תגובה מהירה · ${numberFocus.world || "עולם"}`,
        text: `העולם הזה מחובר כרגע ל־Root ${numberFocus.root} כהקשר עם ${numberFocus.count ?? 0} פריטים. הוא לא תוצאה של שיטת גימטריה. אפשר לפתוח את העולם המלא כדי לראות את הקשרים והמקורות סביב העוגן.`,
        boundary: "העולם מציג הקשר; הוא לא תוצאת חישוב.",
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
      text: `רזיאל קיבל את ה־Root ${numberFocus.root}, הביטוי ${numberFocus.expression || numberFocus.root} והשיטה ${numberFocus.method || "הפעילה"}. אפשר להמשיך לחישוב, להשוואה או לעומק בלי לאבד את המקום.`,
      boundary: "אותו הקשר, עומק שונה.",
    };
  })();
  return (
    <>
      <section className="sod29-raziel-native-hero">
        <RazielOrb />
        <div>
          <div className="sod29-kicker">רזיאל · איתך כאן</div>
          <h3>{target || context?.subject ? `איתך על ${label}` : "מחכה למה שמסקרן אותך"}</h3>
          <p>זה אותו רזיאל בכל האתר. הוא יודע איפה אתה ומה פתחת, והעמקה לא מאבדת את ההקשר.</p>
        </div>
      </section>
      {readingFocus ? <section className="sod29-panel-context-card" data-reading-focus-card="true">
        <b>{`קוראים עכשיו · ${readingFocus.label || "המקור"}`}</b>
        <span>{readingFocus.primary || readingFocus.label || "החלק הפעיל"}</span>
        {readingFocus.sourceLabel ? <small>מקור · {readingFocus.sourceLabel}</small> : null}
        {readingFocus.signals?.length ? <small>{readingFocus.signals.slice(0, 3).join(" · ")}</small> : null}
      </section> : null}
      {elsFocus ? <section className="sod29-panel-context-card" data-raziel-els-context="true">
        <b>{intentLabel || "ELS · occurrence context"}</b>
        <span>מופע מאומת · {elsFocus.occurrence.corpusId || "corpus"} · skip {elsFocus.occurrence.skip ?? "—"} · dir {elsFocus.occurrence.dir ?? "—"}</span>
        <small>start {elsFocus.occurrence.start ?? "—"} → end {elsFocus.occurrence.end ?? "—"} · {elsFocus.occurrence.positions?.length ?? 0} positions</small>
        {elsFocus.occurrence.dependencyRef ? <small>dependency ref · {elsFocus.occurrence.dependencyRef}</small> : null}
        <small>Context בלבד · הצגה/קרבה חזותית אינה חוזק ראיה.</small>
      </section> : null}
      {elsGuide ? <section className="sod29-panel-context-card sod29-raziel-els-guide" data-raziel-els-guide={elsGuide.contract}>
        <b>{elsGuide.title}</b>
        <span>{elsGuide.lead}</span>
        <small>{elsGuide.boundary}</small>
        <small>{elsGuide.inactive}</small>
        <span>{elsGuide.question}</span>
      </section> : null}
      {numberFocus ? <section className="sod29-panel-context-card">
        <b>{intentLabel || "Number Core focus"}</b>
        <span>{numberFocus.expression || numberFocus.root}{numberFocus.method ? ` · ${numberFocus.method}` : ""}{numberFocus.resultValue != null ? ` → ${numberFocus.resultValue}` : ""}</span>
        {numberFocus.crossingPartner ? <small>הצלבה · {numberFocus.crossingPartner}</small> : null}
        {numberFocus.zeroScaleNext != null ? <small>Zero Scale · {numberFocus.root} → {numberFocus.zeroScaleNext}</small> : null}
      </section> : !readingFocus && !elsFocus && !routeActionValid ? <FrameState title="Silence Gate">אין כרגע Focus מובנה שמצדיק synthesis. רזיאל לא ממציא pulse או מסלול.</FrameState> : null}
      {quickInsight ? <section className="sod29-panel-context-card sod29-raziel-quick-insight">
        <b>{quickInsight.title}</b>
        <span>{quickInsight.text}</span>
        <small>{quickInsight.boundary}</small>
      </section> : null}
      <div className="sod29-panel-context-card">
        <b>מה רזיאל רואה עכשיו</b>
        <span>{context?.subject ? `${context.subject.type}:${context.subject.label || context.subject.id}` : "אין מוקד פעיל"}</span>
        {target?.source === "selection" ? <small>בחירה זמנית: {target.label}</small> : null}
      </div>
      <div className="sod29-panel-actions-grid">
        {routeActionValid ? <button
          className="sod29-action primary"
          type="button"
          disabled
          data-raziel-route-action={razielRouteAction.route_action}
          data-raziel-route-home={razielRouteAction.preferred_home}
          title="הפעולה מוכנה בהקשר הזה, אבל עדיין אינה פעילה"
        >◌ {razielRouteAction.label}{routeHomeLabel ? ` · ${routeHomeLabel}` : ""}</button> : null}
      </div>
      <RazielNativeChat context={context} label={label} numberFocus={numberFocus} readingFocus={readingFocus} elsFocus={elsFocus} primary={!routeActionValid} />
    </>
  );
}

const RESEARCH_SECTIONS = [
  { key: "saved", title: "שמורים", remove: "removeSaved" },
  { key: "cart", title: "במחקר עכשיו", remove: "removeFromResearch" },
  { key: "pinned", title: "מוצמדים", remove: "togglePin", removeWithEntity: true },
  { key: "history", title: "אחרונים", limit: 8 },
];

function ResearchStateSections({ research, go, onInspect, onOpenNumber }) {
  const syncStatus = research?.syncStatus || "local_only";
  const syncLabel = syncStatus === "synced" ? "מסונכרן לחשבון" : syncStatus === "local_only" ? "מקומי בדפדפן הזה — לא מסונכרן" : syncStatus === "auth_loading" ? "בודק חשבון" : "בסנכרון עם החשבון";
  const rowTarget = (e) => ({ id: e.id, type: e.type, label: e.title, href: e.link || null, number: e.type === "number" ? e.ref : null });
  const openRow = (e) => {
    const m = /^\/number\/(\d+)\/?$/.exec(e.link || "");
    if (m) return go(`/2029/number/${m[1]}`);
    if (e.link) return go(e.link);
    if (e.type === "number" || e.type === "phrase") return onOpenNumber?.(rowTarget(e));
    return onInspect?.(rowTarget(e));
  };
  const collections = Array.isArray(research?.collections) ? research.collections : [];
  const saved = Array.isArray(research?.saved) ? research.saved : [];
  return (
    <div className="sod29-workspace-research-state" data-research-state-source="ResearchProvider" data-research-sync={syncStatus}>
      <div className="sod29-workspace-pulse-stats" aria-label="המחקר שלי במספרים">
        {RESEARCH_SECTIONS.map((sec) => <span key={sec.key} data-count-for={sec.key}><b>{(research?.[sec.key] || []).length}</b><small>{sec.title}</small></span>)}
        <span data-count-for="collections"><b>{collections.length}</b><small>אוספים</small></span>
      </div>
      <small className="sod29-workspace-sync-note">{syncLabel}</small>
      {RESEARCH_SECTIONS.map((sec) => {
        const all = Array.isArray(research?.[sec.key]) ? research[sec.key] : [];
        const rows = sec.limit ? all.slice(0, sec.limit) : all;
        return (
          <section key={sec.key} className="sod29-workspace-research-bucket" data-research-bucket={sec.key}>
            <div className="sod29-workspace-section-head"><strong>{sec.title}</strong><small>{all.length}</small>
              {sec.key === "history" && all.length ? <button type="button" className="sod29-workspace-unfollow" onClick={() => research?.clearHistory?.()}>נקה</button> : null}
            </div>
            {rows.length ? <ul className="sod29-workspace-list">
              {rows.map((e) => (
                <li key={`${sec.key}:${e.id}`} className="sod29-workspace-follow-row">
                  <button type="button" className="sod29-workspace-follow-open" onClick={() => openRow(e)}><strong>{e.title || e.id}</strong><small>{e.type}</small></button>
                  {sec.remove ? <button type="button" className="sod29-workspace-unfollow" aria-label={`הסר: ${e.title || e.id}`} onClick={() => research?.[sec.remove]?.(sec.removeWithEntity ? e : e.id)}>הסר</button> : null}
                </li>
              ))}
            </ul> : <FrameState kind="empty" title="ריק">{sec.key === "saved" ? "לחץ ＋ שמור בבדיקה מהירה כדי לשמור פריט לספרייה." : "אין כאן עדיין פריטים."}</FrameState>}
          </section>
        );
      })}
      <section className="sod29-workspace-research-bucket" data-research-bucket="collections">
        <div className="sod29-workspace-section-head"><strong>אוספים</strong><small>{collections.length}</small></div>
        {collections.length ? <ul className="sod29-workspace-list">
          {collections.map((c) => <li key={c.id}><span className="sod29-workspace-collection"><strong>{c.name}</strong><small>{saved.filter((e) => e.coll === c.id).length} שמורים</small></span></li>)}
        </ul> : <FrameState kind="empty" title="אין אוספים">אוספים מוצגים כאן כשהם קיימים.</FrameState>}
      </section>
    </div>
  );
}

function AccountConnection2029({ user, profile, signOut }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const displayName = String(profile?.display_name || profile?.full_name || user?.user_metadata?.full_name || user?.email || "").trim();

  useEffect(() => {
    if (!user?.id) return;
    setStep("email");
    setCode("");
    setMessage({ kind: "success", text: "החשבון מחובר. השמירות והמחקר יכולים להמשיך עם אותה זהות." });
  }, [user?.id]);

  const sendCode = async (event) => {
    event.preventDefault();
    const value = email.trim().toLowerCase();
    setMessage(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      setMessage({ kind: "error", text: "כתובת המייל לא נראית תקינה." });
      return;
    }
    setBusy(true);
    try {
      await requestEmailOtp(value);
      setEmail(value);
      setStep("code");
      setMessage({ kind: "info", text: "שלחנו קוד כניסה למייל. משתמש חדש ייפתח באותו חשבון SOD1820." });
    } catch (error) {
      setMessage({ kind: "error", text: error?.message || "לא הצלחנו לשלוח קוד כרגע." });
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    setMessage(null);
    if (!isValidEmailOtp(code)) {
      setMessage({ kind: "error", text: "הזינו את הקוד המלא שקיבלתם במייל." });
      return;
    }
    setBusy(true);
    try {
      await verifyEmailOtp(email, code);
      setMessage({ kind: "success", text: "מחובר. אפשר להמשיך מאותו מקום." });
    } catch (error) {
      setMessage({ kind: "error", text: error?.message || "הקוד שגוי או שפג תוקפו." });
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!signOut || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await signOut();
      setEmail("");
      setCode("");
      setStep("email");
      setMessage({ kind: "info", text: "התנתקת מהחשבון. אפשר להמשיך כאורח." });
    } catch (error) {
      setMessage({ kind: "error", text: error?.message || "ההתנתקות לא הושלמה." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="sod29-workspace-account" data-workspace-section="account" aria-label="חיבור לחשבון">
      <div className="sod29-workspace-section-head">
        <strong>החשבון שלי</strong>
        <small>אותו חשבון SOD1820 · בתוך 2029</small>
      </div>

      {user?.id ? (
        <div className="sod29-workspace-account-connected">
          <UserAvatar2029 user={user} profile={profile} size="normal" />
          <div>
            <strong>{displayName || "מחובר"}</strong>
            <small dir="ltr">{user.email || ""}</small>
            <p>הזהות מחוברת. המחקר, השמירות, ההודעות וההתקדמות משתמשים באותו חשבון קנוני.</p>
          </div>
          <button className="sod29-action" type="button" onClick={disconnect} disabled={busy}>התנתקות</button>
        </div>
      ) : step === "code" ? (
        <form className="sod29-workspace-auth-form" onSubmit={verifyCode}>
          <div className="sod29-workspace-auth-copy">
            <strong>הזינו את הקוד מהמייל</strong>
            <small>נשלח אל <b dir="ltr">{email}</b>. אחרי האימות תישארו בדיוק באזור האישי.</small>
          </div>
          <input
            data-autofocus
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={EMAIL_OTP_MAX_LENGTH}
            value={code}
            onChange={(event) => { setCode(sanitizeEmailOtp(event.target.value)); setMessage(null); }}
            placeholder="קוד כניסה"
            aria-label="קוד כניסה מהמייל"
            dir="ltr"
          />
          <div className="sod29-actions">
            <button className="sod29-action primary" type="submit" disabled={busy}>{busy ? "מאמת…" : "כניסה / הרשמה"}</button>
            <button className="sod29-action" type="button" disabled={busy} onClick={() => { setStep("email"); setCode(""); setMessage(null); }}>שינוי מייל</button>
          </div>
        </form>
      ) : (
        <form className="sod29-workspace-auth-form" onSubmit={sendCode}>
          <div className="sod29-workspace-auth-copy">
            <strong>התחברו כדי לקחת את המחקר איתכם</strong>
            <small>אותו חשבון עובד במחשבון, במסעות, בשמירות ובהודעות. אין חשבון 2029 נפרד.</small>
          </div>
          <input
            data-autofocus
            type="email"
            value={email}
            onChange={(event) => { setEmail(event.target.value); setMessage(null); }}
            placeholder="you@example.com"
            aria-label="מייל לכניסה או הרשמה"
            autoComplete="email"
            dir="ltr"
          />
          <button className="sod29-action primary" type="submit" disabled={busy}>{busy ? "שולח…" : "שלחו לי קוד כניסה"}</button>
        </form>
      )}

      {message ? <div className={`sod29-workspace-auth-message is-${message.kind}`} role={message.kind === "error" ? "alert" : "status"}>{message.text}</div> : null}
    </section>
  );
}

function WorkspaceProjection({ context, go, onRaziel, research, onInspect, onOpenNumber, pathResume, onSavePath, onResumePath }) {
  const subject = normalizeTarget(context?.subject, "research-context");
  const savedContext = pathResume?.latest?.representation?.context || null;
  const savedSubject = normalizeTarget(savedContext?.subject, "saved-research-path");
  const [actionState, setActionState] = useState(null);
  const { user, profile, signOut } = useAuth();
  const userId = user?.id || null;
  const [follows, setFollows] = useState({ status: "loading", topics: [] });
  const [inbox, setInbox] = useState({ status: "loading", items: [], unread: 0 });
  const [stats, setStats] = useState(null);

  // Follow = canonical notification_prefs seam (user or approved guest getter); no new store.
  useEffect(() => {
    let alive = true;
    setFollows({ status: "loading", topics: [] });
    const idObj = userId ? { userId } : { visitorId: getVisitorId() };
    getNotificationPrefs(idObj)
      .then((row) => { if (alive) setFollows({ status: "ready", topics: Array.isArray(row?.topics) ? row.topics : [] }); })
      .catch(() => { if (alive) setFollows({ status: "error", topics: [] }); });
    return () => { alive = false; };
  }, [userId]);

  // Notifications / profile are RLS-scoped to the signed-in user only.
  useEffect(() => {
    let alive = true;
    if (!userId) { setInbox({ status: "signed-out", items: [], unread: 0 }); setStats(null); return () => { alive = false; }; }
    setInbox({ status: "loading", items: [], unread: 0 });
    Promise.all([getMyNotifications(4), getUnreadCount(), getMyProfile()])
      .then(([items, unread, prof]) => {
        if (!alive) return;
        setInbox({ status: "ready", items: items || [], unread: unread || 0 });
        setStats(prof || null);
      })
      .catch(() => { if (alive) setInbox({ status: "error", items: [], unread: 0 }); });
    return () => { alive = false; };
  }, [userId]);

  const workspaceHref = (link) => {
    if (!link) return null;
    const m = /^\/number\/(\d+)\/?$/.exec(link);
    return m ? `/2029/number/${m[1]}` : link;
  };

  const unfollow = async (topic) => {
    const before = follows.topics;
    setFollows((f) => ({ ...f, topics: f.topics.filter((t) => t !== topic) }));
    const res = await watchToggle(topic, "workspace-2029", false, userId ? null : getVisitorId());
    if (res == null) setFollows((f) => ({ ...f, topics: before }));
  };

  const openNotification = async (n) => {
    if (!n.read_at) {
      await markNotificationRead(n.id);
      setInbox((i) => ({ ...i, unread: Math.max(0, i.unread - 1), items: i.items.map((x) => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x) }));
    }
    const href = workspaceHref(n.link);
    if (href) go(href, { preserve: false });
  };

  const displayName = String(profile?.display_name || profile?.full_name || user?.user_metadata?.full_name || user?.email || "").trim();

  const savePath = async () => {
    if (!onSavePath || pathResume?.loading) return;
    setActionState({ kind: "saving" });
    const result = await onSavePath();
    setActionState(result?.ok
      ? { kind: "saved", revision: result.revision_no }
      : { kind: "error", message: result?.error || "save_failed" });
  };

  const resumePath = async () => {
    if (!onResumePath || pathResume?.loading || !pathResume?.latest?.path_id) return;
    setActionState({ kind: "resuming" });
    const result = await onResumePath(pathResume.latest.path_id);
    if (!result?.ok) {
      setActionState({ kind: "error", message: result?.error || "resume_failed" });
      return;
    }
    setActionState({ kind: "resumed", revision: result.revision_no });
    if (result.href) go(result.href, { preserve: false });
  };

  const openResearch = () => {
    document.querySelector('[data-workspace-section="research"]')?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  const openAccount = () => {
    document.querySelector('[data-workspace-section="account"]')?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  const core = [
    { id: "account", icon: "👤", title: "החשבון שלי", sub: userId ? (displayName || "מחובר") : "כניסה / הרשמה ושמירה בין מכשירים", state: "live", onClick: openAccount },
    { id: "public-page", icon: "👑", title: "הדף שלי", sub: "הדף הפומבי שלי — צפייה ועריכה", state: "building" },
    { id: "research", icon: "🧠", title: "המחקר שלי", sub: "המסלולים, השמורים וההמשך שלי", state: "live", onClick: openResearch },
    { id: "progress", icon: "📈", title: "ההתקדמות שלי", sub: stats ? [stats.level != null && `דרגה ${stats.level}`, stats.xp != null && `${stats.xp} XP`, stats.streak ? `רצף ${stats.streak}` : null, stats.tier].filter(Boolean).join(" · ") || "אין עדיין פעילות" : "דרגה, XP ופעילות", state: stats ? "live" : "building", readOnly: true },
  ];

  const personal = [
    { id: "life-journey", icon: "✦", title: "מסע החיים שלי", sub: "שם, תאריך ומשפחה — פרטי", state: "live", onClick: () => go("/2029/journey") },
    { id: "hints", icon: "🧩", title: "הרמזים שלי", sub: "מה ששמרתי אצלי", state: "building" },
    { id: "contributions", icon: "🤝", title: "התרומות שלי", sub: "מה ששלחתי לקהילה ולבדיקה", state: "building" },
    { id: "credits", icon: "◆", title: "הקרדיטים שלי", sub: stats?.credits != null ? `יתרה: ${stats.credits}` : "יתרה והיסטוריה", state: stats?.credits != null ? "live" : "building", readOnly: true },
    { id: "codes", icon: "⌁", title: "הצפנים שלי", sub: "צפנים ששמרתי ויצרתי", state: "building" },
    { id: "raziel", icon: "✦", title: "החיבור לרזיאל", sub: "המשך עם אותו הקשר אישי", state: "live", onClick: onRaziel },
  ];

  return (
    <>
      <div className="sod29-panel-lead">
        <div className="sod29-kicker">האזור שלי · המשכיות</div>
        <h3>המרחב האישי שלי</h3>
        <p>לא עוד לוח־בקרה נפרד: מקום אחד שמחזיר אותך למה ששמרת, למסע שלך, למחקר שלך ולדברים שדורשים את תשומת הלב שלך.</p>
      </div>

      <section className="sod29-workspace-pulse" aria-label="תמונת מצב אישית" data-workspace-section="pulse">
        <UserAvatar2029 user={user} profile={profile} size="header" />
        <div className="sod29-workspace-pulse-id">
          <strong>{userId ? (displayName || "אני") : "אורח"}</strong>
          <small>{userId ? "מחובר" : "לא מחובר — ההודעות וההתקדמות זמינות אחרי התחברות"}</small>
        </div>
        <div className="sod29-workspace-pulse-stats">
          <span><b>{follows.status === "ready" ? follows.topics.length : "–"}</b><small>עוקב</small></span>
          <span><b>{inbox.status === "ready" ? inbox.unread : "–"}</b><small>חדשות</small></span>
          {stats?.level != null ? <span><b>{stats.level}</b><small>דרגה</small></span> : null}
          {stats?.credits != null ? <span><b>{stats.credits}</b><small>קרדיטים</small></span> : null}
        </div>
      </section>

      <AccountConnection2029 user={user} profile={profile} signOut={signOut} />

      <section className="sod29-workspace-home" aria-label="הדברים שלי">
        <div className="sod29-workspace-section-head"><strong>הדברים שלי</strong><small>אותם owners · תצוגת 2029 אחת</small></div>
        <div className="sod29-workspace-core-grid">
          {core.map((item) => item.readOnly && item.state === "live" ? (
            <div key={item.id} className="sod29-workspace-home-card is-live is-readonly" data-workspace-card={item.id}>
              <span className="icon" aria-hidden="true">{item.icon}</span>
              <span><strong>{item.title}</strong><small>{item.sub}</small></span>
            </div>
          ) : item.onClick ? (
            <button key={item.id} type="button" className="sod29-workspace-home-card is-live" onClick={item.onClick}>
              <span className="icon" aria-hidden="true">{item.icon}</span>
              <span><strong>{item.title}</strong><small>{item.sub}</small></span>
              <b>פתח</b>
            </button>
          ) : (
            <div key={item.id} className="sod29-workspace-home-card is-building" aria-disabled="true">
              <span className="icon" aria-hidden="true">{item.icon}</span>
              <span><strong>{item.title}</strong><small>{item.sub}</small></span>
              <b>בבנייה</b>
            </div>
          ))}
        </div>
      </section>

      <section className="sod29-workspace-attention" aria-label="הודעות ועדכונים" data-workspace-section="notifications">
        <div className="sod29-workspace-attention-head"><span aria-hidden="true">🔔</span><strong>הודעות ועדכונים</strong>{inbox.status === "ready" && inbox.unread ? <b className="sod29-workspace-badge">{inbox.unread} חדשות</b> : null}</div>
        {inbox.status === "loading" ? <small>טוען הודעות…</small> : null}
        {inbox.status === "signed-out" ? <small>התחברות נדרשת כדי לראות הודעות אישיות.</small> : null}
        {inbox.status === "error" ? <small>לא הצלחתי לטעון הודעות כרגע.</small> : null}
        {inbox.status === "ready" && !inbox.items.length ? <small>אין הודעות חדשות.</small> : null}
        {inbox.items.length ? <ul className="sod29-workspace-list">
          {inbox.items.map((n) => (
            <li key={n.id}><button type="button" className={n.read_at ? "" : "is-unread"} onClick={() => openNotification(n)}><strong>{n.title || "הודעה"}</strong>{n.body ? <small>{n.body}</small> : null}</button></li>
          ))}
        </ul> : null}
      </section>

      <section className="sod29-workspace-home" aria-label="המשכיות אישית">
        <div className="sod29-workspace-section-head"><strong>המשכיות אישית</strong><small>לא עוד מערכות נפרדות</small></div>
        <div className="sod29-workspace-secondary-grid">
          {personal.map((item) => item.readOnly && item.state === "live" ? (
            <div key={item.id} className="sod29-workspace-mini-card is-live is-readonly" data-workspace-card={item.id}>
              <span aria-hidden="true">{item.icon}</span><strong>{item.title}</strong><small>{item.sub}</small>
            </div>
          ) : item.onClick ? (
            <button key={item.id} type="button" className="sod29-workspace-mini-card is-live" onClick={item.onClick}>
              <span aria-hidden="true">{item.icon}</span><strong>{item.title}</strong><small>{item.sub}</small><b>פתח</b>
            </button>
          ) : (
            <div key={item.id} className="sod29-workspace-mini-card is-building" aria-disabled="true">
              <span aria-hidden="true">{item.icon}</span><strong>{item.title}</strong><small>{item.sub}</small><b>בבנייה</b>
            </div>
          ))}
        </div>
      </section>

      <section data-workspace-section="research" className="sod29-workspace-research-section">
        <div className="sod29-workspace-section-head"><strong>המחקר שלי</strong><small>שמירה · חזרה מדויקת</small></div>

        {subject ? (
          <section className="sod29-workspace-resume-native">
            <span>איפה אני עכשיו</span><strong>{subject.label}</strong><small>{subject.type}{context?.lens ? ` · ${context.lens}` : ""}</small>
            <div className="sod29-actions">
              {subject.href ? <button className="sod29-action primary" type="button" onClick={() => go(subject.href, { preserve: false })}>המשך בדיוק</button> : null}
              <button className="sod29-action" type="button" onClick={savePath} disabled={pathResume?.loading}>שמור מסלול</button>
              <button className="sod29-action" type="button" onClick={onRaziel}>✦ המשך עם רזיאל</button>
            </div>
          </section>
        ) : null}

        {savedSubject ? (
          <section className="sod29-workspace-resume-native" data-research-path-resume="available">
            <span>מסלול שמור (נפרד מפריטים שמורים)</span>
            <strong>{savedSubject.label}</strong>
            <small>
              {savedSubject.type}
              {pathResume?.latest?.revision_no ? ` · revision ${pathResume.latest.revision_no}` : ""}
              {" · נשמר פרטי; התוכן נבדק מחדש כשפותחים אותו"}
            </small>
            <div className="sod29-actions">
              <button className="sod29-action primary" type="button" onClick={resumePath} disabled={pathResume?.loading}>המשך מהמסלול השמור</button>
            </div>
          </section>
        ) : null}

        {!subject && !savedSubject && !pathResume?.loading ? (
          <FrameState kind="empty" title="אין כרגע מסלול פעיל">פתח גילוי, מספר, מקור או עולם — ומשם אפשר לשמור ולהמשיך.</FrameState>
        ) : null}
        <ResearchStateSections research={research} go={go} onInspect={onInspect} onOpenNumber={onOpenNumber} />
        {pathResume?.loading ? <FrameState kind="loading" title="מסנכרן את המסלול">המקום שבו אתה נמצא נשמר בזמן הסנכרון.</FrameState> : null}
        {actionState?.kind === "saved" ? <FrameState title="המסלול נשמר">המסלול נשמר פרטי. המקור והפרסום לא משתנים.</FrameState> : null}
        {actionState?.kind === "error" ? <FrameState kind="error" title="המסלול לא עודכן">{actionState.message}</FrameState> : null}
      </section>

      <section className="sod29-workspace-follow" aria-label="אחרי מה אני עוקב" data-workspace-section="follow">
        <div className="sod29-workspace-section-head"><strong>🔔 אחרי מה אני עוקב</strong><small>{follows.status === "ready" ? `${follows.topics.length} מעקבים · בחירה מפורשת בלבד` : "בחירה מפורשת בלבד"}</small></div>
        {follows.status === "loading" ? <FrameState kind="loading" title="טוען מעקבים">קורא את ההעדפות שלך.</FrameState> : null}
        {follows.status === "error" ? <FrameState kind="error" title="המעקבים לא נטענו">נסה שוב מאוחר יותר.</FrameState> : null}
        {follows.status === "ready" && !follows.topics.length ? <FrameState kind="empty" title="אין עדיין מעקבים">לחץ 🔔 על מספר, קטגוריה או ערוץ כדי לעקוב.</FrameState> : null}
        {follows.topics.length ? <ul className="sod29-workspace-list">
          {follows.topics.map((topic) => {
            const t = topicLabel(topic);
            if (!t) return null;
            const href = workspaceHref(t.link);
            return (
              <li key={topic} className="sod29-workspace-follow-row">
                <button type="button" className="sod29-workspace-follow-open" disabled={!href} onClick={() => href && go(href, { preserve: false })}>
                  <span aria-hidden="true">{t.icon}</span><strong>{t.label}</strong>{t.kind ? <small>{t.kind}</small> : null}
                </button>
                <button type="button" className="sod29-workspace-unfollow" aria-label={`הפסק לעקוב: ${t.label}`} onClick={() => unfollow(topic)}>הפסק</button>
              </li>
            );
          })}
        </ul> : null}
        <div className="sod29-attention-lanes native">
          <div className="sod29-attention-lane"><strong>רלוונטי אליי</strong><small>Signal אישי, לא Follow — בקרוב.</small></div>
          <div className="sod29-attention-lane"><strong>רזיאל מציע</strong><small>Recommendation, לא אמת — בקרוב.</small></div>
        </div>
      </section>

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
  surface = "home",
  symbol = "✦",
  introVariant = "hero",
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const research = useResearch();
  const { user, profile } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("sod-global-rail") === "collapsed"; } catch { return false; }
  });
  const [transient, setTransient] = useState(null);
  const [ephemeralSelection, setEphemeralSelection] = useState(null);
  const [commandQuery, setCommandQuery] = useState("");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [surfaceFamiliarity, setSurfaceFamiliarity] = useState(() => getSurfaceFamiliarity(surface));
  const panelRef = useRef(null);
  const navRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const returnFocusRef = useRef(null);
  const context = research.context || null;
  const currentHref = `${location.pathname}${location.search || ""}${location.hash || ""}`;
  const currentLabel = title || context?.subject?.label || "SOD1820";
  const locale = context?.locale || "he";
  const direction = directionForLocale(locale);
  const experience = useMemo(() => resolveExperienceContext({
    surface,
    locale,
    lens: context?.lens || "kingdom",
    reducedMotion,
  }), [surface, locale, context?.lens, reducedMotion]);

  const historyIndex = (() => {
    try {
      const value = Number(window?.history?.state?.idx);
      return Number.isInteger(value) ? value : null;
    } catch {
      return null;
    }
  })();
  const arrival = useMemo(() => classifyEntryArrival({
    locationState: location.state,
    historyIndex,
    locationKey: location.key,
  }), [location.key, location.state, historyIndex]);
  const orientation = useMemo(() => resolveEntryOrientation({
    surface,
    arrival,
    familiarity: surfaceFamiliarity,
  }), [surface, arrival, surfaceFamiliarity]);

  useEffect(() => {
    setSurfaceFamiliarity(getSurfaceFamiliarity(surface));
  }, [surface, location.pathname]);

  useEffect(() => {
    try { localStorage.setItem("sod-global-rail", sidebarCollapsed ? "collapsed" : "expanded"); } catch { /* ignore */ }
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (orientation.mode !== "prominent" || !orientation.manifest) return;
    emitEntryLearn("orientation_shown", {
      entrySurface: surface,
      arrival,
      mode: orientation.mode,
      manifestVersion: orientation.manifest.version,
    }, { dedupe: true });
  }, [surface, arrival, orientation.mode, orientation.manifest]);

  const palette = use2029Palette(experience?.experience?.environmentRole || null);

  const contextTarget = useMemo(() => targetFromContext(context), [context]);
  const activeTarget = ephemeralSelection || contextTarget;

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(Boolean(query.matches));
    sync();
    query.addEventListener?.("change", sync);
    return () => query.removeEventListener?.("change", sync);
  }, []);

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

  const completeSurfaceEntry = useCallback((actionId, targetSurface = null) => {
    const manifest = orientation.manifest;
    if (!manifest || orientation.mode === "hidden" || !isEntryLearnSurfaceActive(surface) || actionId !== manifest.firstAction) return false;
    const familiarity = markSurfaceFamiliarity(surface, "complete", manifest.version);
    setSurfaceFamiliarity(familiarity);
    emitEntryLearn("first_action", {
      entrySurface: surface,
      arrival,
      actionId,
      targetSurface,
      mode: orientation.mode,
      manifestVersion: manifest.version,
    }, { dedupe: true });
    return true;
  }, [surface, arrival, orientation]);

  const expandOrientation = useCallback(() => {
    if (!orientation.manifest) return;
    emitEntryLearn("orientation_expanded", {
      entrySurface: surface,
      arrival,
      mode: orientation.mode,
      manifestVersion: orientation.manifest.version,
    });
  }, [surface, arrival, orientation]);

  const dismissOrientation = useCallback(() => {
    if (!orientation.manifest) return;
    const familiarity = markSurfaceFamiliarity(surface, "dismissed", orientation.manifest.version);
    setSurfaceFamiliarity(familiarity);
    emitEntryLearn("orientation_dismissed", {
      entrySurface: surface,
      arrival,
      mode: "compact",
      manifestVersion: orientation.manifest.version,
    });
  }, [surface, arrival, orientation]);

  const go = useCallback((to, { preserve = true } = {}) => {
    if (!to) return;
    if (preserve) preserveReturnFor(to);
    completeSurfaceEntry("route");
    setTransient(null);
    navigate(to, { state: { sodEntryArrival: "internal" } });
  }, [navigate, preserveReturnFor, completeSurfaceEntry]);

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
    emitEntryLearn("exact_return", {
      entrySurface: surface,
      arrival: "exact_return",
      actionId: "return_exact",
    });
    navigate(target.href, { state: { sodEntryArrival: "exact_return" } });
  }, [context?.returnTo, navigate, research, surface]);

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
    if ([TRANSIENT.COMMAND, TRANSIENT.ACTION, TRANSIENT.CAPABILITY, TRANSIENT.INSPECT, TRANSIENT.CONTEXT, TRANSIENT.TOOLS, TRANSIENT.RAZIEL].includes(kind)) {
      completeSurfaceEntry(kind === TRANSIENT.CAPABILITY ? (payload?.capability || "capability") : kind);
    }
    setTransient({ kind, payload });
    setNavOpen(false);
  }, [navOpen, completeSurfaceEntry]);

  const openCommand = useCallback(() => openTransient(TRANSIENT.COMMAND), [openTransient]);
  const handleGlobalNavAction = useCallback((action) => {
    if (action === "number") {
      setCommandQuery("");
      openCommand();
    }
  }, [openCommand]);

  const openAction = useCallback((subject = null) => openTransient(TRANSIENT.ACTION, { subject: normalizeTarget(subject) }), [openTransient]);
  const openCapability = useCallback((capability, subject = null, payload = {}) => {
    const key = String(capability || "").trim();
    if (!key) return;
    openTransient(TRANSIENT.CAPABILITY, { ...payload, capability: key, subject: normalizeTarget(subject) });
  }, [openTransient]);
  const openInspect = useCallback((subject = null) => openTransient(TRANSIENT.INSPECT, { subject: normalizeTarget(subject) }), [openTransient]);
  const openNumber = useCallback((subject = null) => {
    const normalized = normalizeTarget(subject);
    if (
      normalized?.expression
      && normalized?.method
      && Number.isSafeInteger(Number(normalized?.resultValue))
    ) {
      const resultValue = Number(normalized.resultValue);
      const currentSelection = context?.selection || null;
      const sameSelection = Boolean(
        currentSelection?.entityId
        && String(currentSelection?.expression || "").trim() === normalized.expression
        && String(currentSelection?.method || "").trim() === normalized.method
        && Number(currentSelection?.resultValue) === resultValue
        && (!normalized.locator || currentSelection?.locator === normalized.locator)
      );
      research.updateResearchContext?.({
        subject: {
          id: String(resultValue),
          type: "number",
          label: String(resultValue),
          href: `/2029/number/${resultValue}`,
        },
        selection: {
          entityId: sameSelection ? currentSelection.entityId : normalized.id,
          entityType: sameSelection ? (currentSelection.entityType || "gematria_expression") : "gematria_expression",
          locator: normalized.locator || currentSelection?.locator || null,
          expression: normalized.expression,
          method: normalized.method,
          resultValue,
        },
        lens: "gematria",
      });
    }
    openCapability("number", normalized || subject);
  }, [openCapability, research, context?.selection]);
  const openAttention = useCallback(() => openTransient(TRANSIENT.ATTENTION), [openTransient]);
  const openTools = useCallback(() => openTransient(TRANSIENT.TOOLS), [openTransient]);
  const openRaziel = useCallback((payload = null) => {
    const boundedPayload = payload?.numberCoreFocus || payload?.razielMicroIntent || payload?.readingFocus || payload?.elsSurfaceContext || payload?.razielRouteAction
      ? payload
      : null;
    openTransient(TRANSIENT.RAZIEL, boundedPayload);
  }, [openTransient]);
  const openWorkspace = useCallback(() => openTransient(TRANSIENT.WORKSPACE), [openTransient]);
  const openIssueReport = useCallback((payload = null) => openTransient(TRANSIENT.ISSUE, payload), [openTransient]);
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

  const entityFromTarget = useCallback((target) => {
    const normalized = normalizeTarget(target);
    if (!normalized) return null;
    return makeEntity({
      type: normalized.type,
      title: normalized.label,
      ref: normalized.id,
      link: normalized.href || currentHref,
      metadata: { source: "system-frame-2029", temporary_selection: normalized.source === "selection" },
    });
  }, [currentHref]);

  // Explicit capabilities, honest result: the boolean is the provider's own commit result.
  const addToResearch = useCallback((target) => {
    const entity = entityFromTarget(target);
    return entity && research.addToResearch ? Boolean(research.addToResearch(entity)) : false;
  }, [research, entityFromTarget]);

  const saveToLibrary = useCallback((target) => {
    const entity = entityFromTarget(target);
    return entity && research.saveItem ? Boolean(research.saveItem(entity)) : false;
  }, [research, entityFromTarget]);

  const submitCommand = useCallback((event) => {
    event?.preventDefault?.();
    const target = targetFromSelectedText(commandQuery);
    if (!target) return;
    setEphemeralSelection(target);
    setCommandQuery("");
    openCapability("number", target, { source: "command" });
  }, [commandQuery, openCapability]);

  const shellApi = useMemo(() => ({
    experience,
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
    openIssueReport,
    closeWorkspace,
    closeTransient,
    go,
    returnExact,
  }), [experience, openCommand, openAction, openCapability, openInspect, openNumber, openAttention, openTools, openRaziel, closeRaziel, openWorkspace, openIssueReport, closeWorkspace, closeTransient, go, returnExact]);

  const shellStyle = useMemo(() => ({
    "--s29-page": palette.pageBg,
    "--s29-panel": palette.card,
    "--s29-panel-soft": palette.cardSoft,
    "--s29-panel-grad": palette.cardGrad,
    "--s29-line": palette.border,
    "--s29-line-strong": palette.borderStrong,
    "--s29-accent": palette.accent,
    "--s29-accent-text": palette.accentText,
    "--s29-accent-secondary": palette.accentSecondary,
    "--s29-discovery": palette.accentDiscovery,
    "--s29-focus-ring": palette.focusRing,
    "--s29-warm-accent": palette.warmAccent,
    "--s29-brand-sapphire": palette.brandSapphire,
    "--s29-brand-gold": palette.brandGold,
    "--s29-brand-glow": palette.brandGlow,
    "--s29-hero": palette.heroNum,
    "--s29-ink": palette.ink,
    "--s29-muted": palette.inkSoft,
    "--s29-glow": palette.glow,
    "--s29-on-accent": palette.onAccent,
    "--s29-accent-btn": palette.accentBtn,
    "--s29-radius": `${RADIUS.xl}px`,
    "--s29-control-min": `${LAYOUT.controlMinHeight}px`,
    "--s29-header-height": `${LAYOUT.headerHeight}px`,
    "--s29-surface-map-gap": `${LAYOUT.surfaceMapGap}px`,
    "--s29-surface-map-top": `${LAYOUT.headerHeight + LAYOUT.surfaceMapGap}px`,
    "--s29-surface-map-clearance": `${LAYOUT.headerHeight + LAYOUT.surfaceMapGap + LAYOUT.surfaceMapEstimatedHeight + 12}px`,
    "--s29-font-ui": TYPEFACE.ui,
    "--s29-font-body": TYPEFACE.body,
    "--s29-font-display": TYPEFACE.display,
    "--s29-font-numeric": TYPEFACE.numeric,
    "--s29-type-micro": `${TYPE_SCALE_V2.micro.fontSize}px`,
    "--s29-type-ui": `${TYPE_SCALE_V2.ui.fontSize}px`,
    "--s29-type-small": `${TYPE_SCALE_V2.small.fontSize}px`,
    "--s29-type-body": `${TYPE_SCALE_V2.body.fontSize}px`,
    "--s29-type-lead": `${TYPE_SCALE_V2.lead.fontSize}px`,
    "--s29-type-title": `${TYPE_SCALE_V2.title.fontSize}px`,
    "--s29-type-display": `${TYPE_SCALE_V2.display.fontSize}px`,
    "--s29-motion": `${typeof experience.motion.timing.duration === "number" ? experience.motion.timing.duration : experience.motion.timing.duration.normal}ms`,
    "--s29-raziel-blue": RAZIEL_PRESENCE.blue,
    "--s29-raziel-indigo": RAZIEL_PRESENCE.indigo,
    "--s29-raziel-violet": RAZIEL_PRESENCE.violet,
    "--s29-raziel-glow": RAZIEL_PRESENCE.glow,
    "--s29-raziel-cycle": `${RAZIEL_PRESENCE.cycleMs}ms`,
    fontFamily: TYPEFACE.body,
  }), [palette, experience.motion.timing.duration]);

  const transientKind = transient?.kind || null;
  const numberPageRoute = surface === "number" && /^\/2029\/number\/[^/]+\/?$/.test(location.pathname);
  const subjectHref = context?.subject?.href || "";
  const postTrail = surface === "post"
    && context?.subject?.type === "post"
    && subjectHref
    && subjectHref.split("#")[0] === location.pathname
    && Array.isArray(context?.dimensions?.bottomTrail)
      ? context.dimensions.bottomTrail.filter((item) => item?.label).slice(-6)
      : [];
  const configuredTrail = Array.isArray(context?.dimensions?.bottomTrail)
    ? context.dimensions.bottomTrail.filter((item) => item?.label).slice(-6)
    : [];
  const surfaceFocus = context?.dimensions?.surfaceFocus || null;
  const fallbackTrail = [
    context?.subject ? { id: "subject", label: context.subject.label || context.subject.id } : null,
    surfaceFocus?.sectionLabel ? { id: "section", label: surfaceFocus.sectionLabel } : null,
    surfaceFocus?.number != null ? { id: "number", label: String(surfaceFocus.number), active: true } : null,
  ].filter(Boolean);
  // Preserve the closed Number 2029 command-island behavior. Post keeps its stale-context
  // guard; World/Topic may project the active Research Path when the surface supplies one.
  const bottomTrail = surface === "post"
    ? postTrail
    : (surface === "world" || surface === "topic")
      ? (configuredTrail.length ? configuredTrail : fallbackTrail)
      : [];
  const showContextRail = surface !== "control"
    && Boolean(activeTarget || context?.subject);
  const renderTransient = () => {
    if (!transientKind) return null;
    const common = { panelRef, onClose: closeTransient };
    if (transientKind === TRANSIENT.COMMAND) return <PanelShell {...common} icon="⌘" kicker="חיפוש" title="חיפוש"><CommandProjection query={commandQuery} setQuery={setCommandQuery} onSubmit={submitCommand} onClose={closeTransient} /></PanelShell>;
    if (transientKind === TRANSIENT.ACTION) return <PanelShell {...common} icon="◎" kicker="פעולות" title={`פעולה · ${inspectTarget?.label || context?.subject?.label || "ההקשר הנוכחי"}`}><ActionProjection surface={surface} target={inspectTarget} context={context} onInspect={openInspect} onCapability={openCapability} onRaziel={openRaziel} go={go} /></PanelShell>;
    if (transientKind === TRANSIENT.CAPABILITY) {
      const capability = transient?.payload?.capability || null;
      if (capability === "number") return <PanelShell {...common} icon="123" kicker="מספר / גימטריה" title="מספר / ביטוי"><NumberDrawer2029 target={inspectTarget} context={context} research={research} go={go} openRaziel={openRaziel} /></PanelShell>;
      return <PanelShell {...common} icon="◇" kicker="כלי" title={capability || "יכולת"}><FrameState kind="unavailable" title="הכלי עדיין לא מחובר כאן">כשהחיבור יהיה מוכן הוא ייפתח באותה חלונית, בלי להעביר אותך למערכת אחרת.</FrameState></PanelShell>;
    }
    if (transientKind === TRANSIENT.INSPECT) return <PanelShell {...common} icon={inspectTarget?.type === "number" ? "123" : "◎"} kicker="בדיקה" title={inspectTarget?.label || "בדיקה מהירה"}><InspectProjection target={inspectTarget} context={context} surface={surface} onSetFocus={setResearchFocus} onSave={saveToLibrary} onAddResearch={addToResearch} isSaved={Boolean(inspectTarget && (research.saved || []).some((e) => e.id === inspectTarget.id || e.id === `${inspectTarget.type}:${inspectTarget.id}`))} inResearch={Boolean(inspectTarget && (research.cart || []).some((e) => e.id === inspectTarget.id || e.id === `${inspectTarget.type}:${inspectTarget.id}`))} onOpenNumber={openNumber} onNeedHelp={openIssueReport} /></PanelShell>;
    if (transientKind === TRANSIENT.CONTEXT) return <PanelShell {...common} icon="✦" kicker="הקשר" title="ההקשר הפעיל"><SurfaceContextRail2029
      sheet
      surface={surface}
      context={context}
      focus={surfaceFocus || activeTarget}
      onOpenNumber={(target) => openNumber(target || activeTarget)}
      onAskRaziel={() => openRaziel(surfaceFocus?.readingFocus ? { readingFocus: surfaceFocus.readingFocus } : null)}
      onOpenContext={() => openInspect(surfaceFocus || activeTarget)}
      onNavigate={closeTransient}
      onNeedHelp={openIssueReport}
    /></PanelShell>;
    if (transientKind === TRANSIENT.ATTENTION) return <PanelShell {...common} icon="◉" kicker="עכשיו" title="מה חדש בעולם"><AttentionProjection context={context} onWorkspace={() => openTransient(TRANSIENT.WORKSPACE)} onOpen={go} /></PanelShell>;
    if (transientKind === TRANSIENT.TOOLS) return <PanelShell {...common} icon="◇" kicker="כלים" title="כלים"><ToolsProjection surface={surface} target={activeTarget} go={go} onCapability={openCapability} /></PanelShell>;
    if (transientKind === TRANSIENT.RAZIEL) return <PanelShell {...common} icon="●" kicker="רזיאל" title="רזיאל"><RazielProjection target={activeTarget} context={context} numberCoreFocus={transient?.payload?.numberCoreFocus || null} microIntent={transient?.payload?.razielMicroIntent || null} readingFocus={transient?.payload?.readingFocus || null} elsSurfaceContext={transient?.payload?.elsSurfaceContext || null} razielRouteAction={transient?.payload?.razielRouteAction || null} /></PanelShell>;
    if (transientKind === TRANSIENT.ISSUE) return <PanelShell {...common} icon="!" kicker="דיווח / קשר" title="דווחו על בעיה"><ContactGateway
      pathname={location.pathname}
      surface={surface}
      capability={transient?.payload?.capability || null}
      concept={transient?.payload?.concept || null}
      learnStage={transient?.payload?.learnStage || null}
      actionTried={transient?.payload?.actionTried || null}
      initialText={transient?.payload?.initialText || ""}
      locale={locale}
      onDone={closeTransient}
    /></PanelShell>;
    return <PanelShell {...common} icon="◎" kicker="אישי" title="האזור האישי שלי"><WorkspaceProjection
      context={context}
      go={go}
      onRaziel={() => openTransient(TRANSIENT.RAZIEL)}
      research={research}
      onInspect={openInspect}
      onOpenNumber={openNumber}
      pathResume={research.pathResume}
      onSavePath={() => research.saveCurrentResearchPath?.({ href: currentHref, label: currentLabel, surface })}
      onResumePath={(pathId) => research.resumeResearchPath?.(pathId)}
    /></PanelShell>;
  };

  const frame = (
    <ShellContext.Provider value={shellApi}>
      <div
        className={`sod29-root closed-shell native-frame surface-${surface}${numberPageRoute ? " number-page-route" : ""}${sidebarCollapsed ? " sidebar-collapsed" : ""}`}
        dir={direction}
        style={shellStyle}
        data-experience-context={experience.version}
        data-frame-experience-surface={experience.surface}
        data-frame-experience-question={experience.experience.question}
        data-frame-experience-environment={experience.experience.environmentRole}
        data-frame-experience-spatial={experience.spatial.effectiveLevel}
        data-frame-experience-locale={experience.locale}
        data-frame-reduced-motion={String(experience.motion.reduced)}
        data-frame-theme-mode={palette.mode}
        data-frame-theme-preset={palette.preset || palette.mode}
      >
        <div className="sod29-ambient-field" aria-hidden="true"><i /><i /><i /></div>

        <aside className="sod29-sidebar" aria-label="ניווט SOD1820 2029">
          <Link to="/2029" state={{ sodEntryArrival: "internal" }} className="sod29-rail-identity" onClick={() => preserveReturnFor("/2029")} aria-label="SOD1820 · בית">
            <span className="sod29-rail-home" aria-hidden="true">⌂</span>
            <span className="sod29-rail-identity-copy"><b>ניווט ראשי</b><small>SOD1820</small></span>
          </Link>
          <nav className="sod29-nav">
            <NavGroup title="בתים מרכזיים" items={HOME_NAV} preserveReturnFor={preserveReturnFor} onAction={handleGlobalNavAction} />
            <NavGroup title="גילוי וכלים" items={DIRECT_NAV} preserveReturnFor={preserveReturnFor} onAction={handleGlobalNavAction} />
          </nav>
          <div className="sod29-sidebar-theme"><small>מראה</small><ThemePresetControl2029 compact /></div>
          <button className="sod29-sidebar-workspace" type="button" onClick={openWorkspace}><UserAvatar2029 user={user} profile={profile} size="rail" /><span className="sod29-sidebar-workspace-copy">האזור האישי שלי</span></button>
          <button className="sod29-sidebar-toggle" type="button" onClick={() => setSidebarCollapsed((value) => !value)} aria-label={sidebarCollapsed ? "פתח תפריט" : "כווץ תפריט"} aria-expanded={!sidebarCollapsed}>
            <span aria-hidden="true">{sidebarCollapsed ? "‹" : "›"}</span><b>{sidebarCollapsed ? "" : "כווץ"}</b>
          </button>
          <div className="sod29-side-foot"><span className="sod29-live-dot" /> {status}<small>{experience.brand.identity} · {experience.experience.question} · הקשר אחד.</small></div>
        </aside>

        <div className="sod29-main">
          <header className="sod29-header closed-orientation">
            <div className="sod29-header-leading">
              <button ref={mobileMenuRef} className="sod29-mobile-menu-trigger" type="button" onClick={() => setNavOpen(true)} aria-label="פתח ניווט" aria-expanded={navOpen} aria-controls="sod29-mobile-navigation">☰</button>
              <Link className="sod29-header-brand" to="/2029" state={{ sodEntryArrival: "internal" }} onClick={() => preserveReturnFor("/2029")} aria-label="SOD1820 · בית">
                <BrandLockup2029 className="is-header" />
              </Link>
              <div className="sod29-orientation" aria-label="איפה אני">
                <span>SOD1820</span><i>/</i><b>{title || "2029"}</b>
                {context?.subject ? <span className="sod29-orientation-context"><i>/</i><span className="sod29-context-name">{context.subject.label || context.subject.id}</span></span> : null}
              </div>
            </div>
            <button className="sod29-header-search" type="button" onClick={openCommand} aria-label="חיפוש">
              <span className="sod29-search-mobile-icon" aria-hidden="true">⌕</span>
              <span className="sod29-search-pill-icon" aria-hidden="true">⌕</span>
              <span className="label">חיפוש</span>
              <kbd>⌘K</kbd>
            </button>
            <div className="sod29-header-actions">
              <button className="sod29-header-return" type="button" onClick={returnExact} disabled={!context?.returnTo?.href} aria-label="חזרה מדויקת" title={context?.returnTo?.label || "אין יעד חזרה שמור"}><span aria-hidden="true">↩</span><span className="return-label"> חזרה מדויקת</span></button>
              <button type="button" className="sod29-header-issue" onClick={openIssueReport} aria-label="דווח על בעיה"><span aria-hidden="true">!</span><span className="issue-label"> דווח על בעיה</span></button>
              <button type="button" className="sod29-header-workspace" onClick={openWorkspace} aria-label="האזור האישי שלי"><UserAvatar2029 user={user} profile={profile} size="header" /><span className="workspace-label">האזור האישי שלי</span></button>
            </div>
          </header>

          {orientation.mode !== "hidden" && orientation.manifest ? <div className="sod29-entry-orientation-slot">
            <LearnMark2029
              scope={LEARN_SCOPE.SURFACE}
              label={orientation.manifest.label}
              compact={orientation.mode === "compact"}
              prominent={orientation.mode === "prominent"}
              onOpen={expandOrientation}
              onDismiss={orientation.mode === "prominent" ? dismissOrientation : null}
            >
              <p>{orientation.manifest.body}</p>
              <p><strong>{experience.experience.question}</strong></p>
            </LearnMark2029>
          </div> : null}

          <div className={`sod29-main-stage${showContextRail ? ` has-context-rail${numberPageRoute ? " number-context-only" : ""}` : ""}`}>
            <main className={`sod29-content${wide ? " wide" : ""}`}>
              {introVariant !== "none" && (eyebrow || title || description) ? (
                <section className={`sod29-page-intro${introVariant === "compact" ? " is-compact" : ""}`} data-intro-variant={introVariant}>
                  <div className="sod29-hero-visual" aria-hidden="true"><i className="ring ring-a" /><i className="ring ring-b" /><i className="ring ring-c" /><span className="sod29-hero-symbol">{symbol}</span></div>
                  <div className="sod29-hero-copy">
                    {eyebrow ? <div className="sod29-eyebrow">{eyebrow}</div> : null}
                    {title ? <h1 style={{ fontFamily: TYPEFACE.display }}>{title}</h1> : null}
                    {description ? <p>{description}</p> : null}
                    {context && surface !== "number" ? <div className="sod29-context-strip" aria-label="ההקשר שלך פעיל">
                      {context.subject ? <span>מוקד · {context.subject.label || context.subject.id}</span> : null}
                      {context.lens ? <span>מבט · {context.lens}</span> : null}
                      {context.selection?.locator ? <span>מיקום · {context.selection.locator}</span> : null}
                      {context.journey?.position != null ? <span>מסע · {String(context.journey.position)}</span> : null}
                    </div> : null}
                  </div>
                </section>
              ) : null}
              {children}
            </main>
            {showContextRail ? <SurfaceContextRail2029
              surface={surface}
              context={context}
              focus={surfaceFocus || activeTarget}
              onOpenNumber={(target) => openNumber(target || activeTarget)}
              onAskRaziel={() => openRaziel(surfaceFocus?.readingFocus ? { readingFocus: surfaceFocus.readingFocus } : null)}
              onOpenContext={() => openInspect(surfaceFocus || activeTarget)}
              onOpenSheet={() => openTransient(TRANSIENT.CONTEXT)}
              onNeedHelp={openIssueReport}
              suppressLearn={Boolean(transientKind)}
            /> : null}
          </div>
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
            <div className="sod29-mobile-drawer-head">
              <div className="sod29-mobile-drawer-identity"><small>SOD1820</small><strong>{title || "2029"}</strong></div>
              <button data-autofocus type="button" onClick={() => closeMobileNav(true)} aria-label="סגור">×</button>
            </div>
            <Link className="sod29-mobile-brand-lockup" to="/2029" state={{ sodEntryArrival: "internal" }} onClick={() => { preserveReturnFor("/2029"); closeMobileNav(false); }} aria-label="SOD1820 · בית">
              <BrandLockup2029 />
            </Link>
            <NavGroup title="בתים מרכזיים" items={HOME_NAV} preserveReturnFor={preserveReturnFor} onNavigate={() => closeMobileNav(false)} onAction={handleGlobalNavAction} />
            <NavGroup title="גילוי וכלים" items={DIRECT_NAV} preserveReturnFor={preserveReturnFor} onNavigate={() => closeMobileNav(false)} onAction={handleGlobalNavAction} />
            <section className="sod29-mobile-theme-section" aria-label="בחירת מראה">
              <small>מראה</small>
              <ThemePresetControl2029 />
            </section>
            <div className="sod29-mobile-drawer-utilities" aria-label="פעולות כלליות">
              <button className="sod29-sidebar-workspace" type="button" disabled={!context?.returnTo?.href} onClick={() => { closeMobileNav(false); returnExact(); }}><span className="sod29-nav-icon">↩</span><span>חזרה מדויקת</span></button>
              <button className="sod29-sidebar-workspace" type="button" onClick={() => { closeMobileNav(false); openWorkspace(); }}><UserAvatar2029 user={user} profile={profile} size="rail" /><span>האזור האישי שלי</span></button>
              <button className="sod29-sidebar-workspace" type="button" onClick={() => { closeMobileNav(false); openIssueReport(); }}><span className="sod29-nav-icon">!</span><span>דווח על בעיה</span></button>
            </div>
          </aside>
        </> : null}

        {ephemeralSelection ? <button className="sod29-selection-cue" type="button" onClick={() => openAction(ephemeralSelection)}><small>בחרת</small><strong>{ephemeralSelection.label}</strong><span>פעולה</span></button> : null}

        <div className={`sod29-command-island${bottomTrail.length ? " has-context-trail" : ""}${numberPageRoute && bottomTrail.length ? " number-context-trail" : ""}`} role="toolbar" aria-label="מסלול המחקר והפעולות הזמינות עכשיו" data-raziel-anchor="center">
          {bottomTrail.length ? <nav className="sod29-command-trail" aria-label="מסלול המחקר הנוכחי">
            {bottomTrail.map((item, index) => <React.Fragment key={item.id || `trail-${index}`}>
              {index ? <span className="sod29-command-trail-separator" aria-hidden="true">‹</span> : null}
              {numberPageRoute ? <button
                type="button"
                className="sod29-command-trail-item"
                aria-current={item.active ? "page" : undefined}
                onClick={() => {
                  if (item.number != null) {
                    openNumber({ id: String(item.number), type: "number", label: String(item.number), href: `/2029/number/${item.number}` });
                    return;
                  }
                  if (item.targetId) {
                    document.getElementById(item.targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    return;
                  }
                  if (item.href) go(item.href);
                }}
                disabled={!item.number && !item.targetId && !item.href}
              >{item.label}</button> : <span className="sod29-command-trail-item" aria-current={item.active ? "page" : undefined}>{item.label}</span>}
            </React.Fragment>)}
          </nav> : <>
            <button type="button" onClick={openCommand} aria-pressed={transientKind === TRANSIENT.COMMAND}><span>⌘</span><small>{surface === "heichal" ? "פקודה" : "חיפוש"}</small></button>
            <button type="button" onClick={() => openAction(activeTarget)} aria-pressed={transientKind === TRANSIENT.ACTION}><span>◎</span><small>פעולה</small></button>
          </>}
          <RazielOrb compact active={transientKind === TRANSIENT.RAZIEL} onClick={openRaziel} />
          {bottomTrail.length ? <>
            {surface === "number" ? <button
              className="sod29-number-island-action"
              type="button"
              onClick={() => openAction(activeTarget)}
              aria-pressed={transientKind === TRANSIENT.ACTION}
            ><span>◎</span><small>פעולה</small></button> : null}
            <div className="sod29-command-actions">
              <button type="button" onClick={openCommand} aria-pressed={transientKind === TRANSIENT.COMMAND}><span>⌘</span><small>{surface === "heichal" ? "פקודה" : "חיפוש"}</small></button>
              {!numberPageRoute ? <button type="button" onClick={() => openAction(activeTarget)} aria-pressed={transientKind === TRANSIENT.ACTION}><span>◎</span><small>פעולה</small></button> : null}
              <button type="button" onClick={openAttention} aria-pressed={transientKind === TRANSIENT.ATTENTION}><span>◉</span><small>חדש בעולם</small></button>
              <button type="button" onClick={openTools} aria-pressed={transientKind === TRANSIENT.TOOLS}><span>◇</span><small>כלים</small></button>
              <button type="button" className="sod29-island-personal" onClick={openWorkspace} aria-pressed={transientKind === TRANSIENT.WORKSPACE} aria-label="האזור האישי שלי"><UserAvatar2029 user={user} profile={profile} size="rail" /><small>אישי</small></button>
            </div>
          </> : <>
            <button type="button" onClick={openAttention} aria-pressed={transientKind === TRANSIENT.ATTENTION}><span>◉</span><small>חדש בעולם</small></button>
            <button type="button" onClick={openTools} aria-pressed={transientKind === TRANSIENT.TOOLS}><span>◇</span><small>כלים</small></button>
            <button type="button" className="sod29-island-personal" onClick={openWorkspace} aria-pressed={transientKind === TRANSIENT.WORKSPACE} aria-label="האזור האישי שלי"><UserAvatar2029 user={user} profile={profile} size="rail" /><small>אישי</small></button>
          </>}
        </div>

        {renderTransient()}
      </div>
    </ShellContext.Provider>
  );
  return surface === "heichal" ? <PaletteProvider value={palette}>{frame}</PaletteProvider> : frame;
}