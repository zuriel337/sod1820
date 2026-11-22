import NavigationIcon2029 from "./NavigationIcon2029.jsx";
import { createPortal } from "react-dom";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Palette2029Provider, use2029Palette } from "../../lib/palette2029.js";
import { setThemePreset, useThemePreset } from "../../lib/themePreset2029.js";
import { BRAND_LOCKUP_2029, BRAND_LOCKUP_NAV_2029 } from "../../lib/brandAssets2029.js";
import { LAYOUT, RADIUS, RAZIEL_PRESENCE, TYPEFACE, TYPE_SCALE_V2 } from "../../lib/designTokens.js";
import { resolveExperienceContext } from "../../lib/experienceContext.js";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import { buildExactReturnPatch, researchContextNumber } from "../../lib/research/researchContext.js";
import { useAuth } from "../../lib/AuthContext.jsx";

import { useFeatureState } from "../MaintenanceLock.jsx";
import FeatureClosedNotice2029 from "./FeatureClosedNotice2029.jsx";
import { PUBLIC_READING_RELEASE, publicReadingPath } from "../../lib/publicReadingRelease2029.js";
import { adminOpenClosedDestinations } from "./adminOpenDestinations2029.js";
import { CORE_PUBLIC_LAUNCH_2029 } from "../../lib/publicLaunch2029.js";
import { NUMBER_PAGE_BASE, isNumberPagePath } from "../../lib/research/numberPageAddress.js";
import { makeEntity } from "../../lib/research/entity.js";

import {
  CONTEXT_ACTION_KIND,
  resolveContextActions,
  resolveContextTools,
} from "../../lib/research/contextualCapabilities.js";
import CanonicalProgress from "../CanonicalProgress.jsx";
import ContactGateway from "./ContactGatewayOnDemand2029.jsx";
import SurfaceContextRail2029 from "./SurfaceContextRail2029.jsx";
// Preview-only (ZURIEL 12.11.2026): the left Companion returns on a series Post of the protected preview build. Elsewhere it stays unmounted.
// Shell weight 3/8 (SHELL_WEIGHT_REDUCTION_20261118): parts of the frame that are not needed to draw a page load on demand, each
// with its own empty Suspense so nothing else waits for it. The footer (with its newsletter form) is requested with the frame and drawn
// when it arrives, hidden while the route shows only its loading placeholder (footer2029.css), as before; drawing it only after the
// content measured a later largest paint on desktop (its styles and render landed in that window). The account-link offer only for a signed-in account (it was always empty for a visitor and appears only
// after its own read); the share row with the inspect panel that shows it; the living ribbon (hidden) and its detail when opened.
const RoyalIntro2029 = React.lazy(() => import("./RoyalIntro2029.jsx"));
const Footer2029 = React.lazy(() => import("./Footer2029.jsx"));
const AccountLinkOffer2029 = React.lazy(() => import("./AccountLinkOffer2029.jsx"));
const InspectProjection = React.lazy(() => import("./InspectProjection2029.jsx"));
const SelectedRoyalItem2029 = React.lazy(() => import("./SelectedRoyalItem2029.jsx"));
const GlobalLivingRibbon2029 = React.lazy(() => import("./GlobalLivingRibbon2029.jsx"));
const LivingRibbonDetail2029 = React.lazy(() => import("./GlobalLivingRibbon2029.jsx").then((module) => ({ default: module.LivingRibbonDetail2029 })));
// ZURIEL 12.11.2026: the header verse line («הנה אנכי שולח לכם את אליה הנביא…») is hidden on every page. One switch: set true to show it again.
const LIVING_RIBBON_VISIBLE_2029 = false;
import RazielSessionMount2029, { useOptionalRazielSession2029 } from "./RazielSessionMount2029.jsx";
const NowPublications2029 = React.lazy(() => import("./NowPublications2029.jsx"));
// The research indicator loads only while a research operation exists. LAB_SIMULATED_RESEARCH is set only in a lab build
// (VITE_LAB_SIMULATED_RESEARCH=1) to show a marked, simulated operation; a normal build drops it entirely.
const ResearchActivity2029 = React.lazy(() => import("./ResearchActivity2029.jsx"));
const LAB_SIMULATED_RESEARCH = import.meta.env.VITE_LAB_SIMULATED_RESEARCH === "1";
const MorePanel2029 = React.lazy(() => import("./MorePanel2029.jsx"));
import { publicContextLabel, contextDisplayTitle, contextNavigationItems2029, surfaceContextForRoute2029, entityTypeNounHe } from "./razielSessionSeam2029.js";

import { publicPageShareUrl, postAddressSlug } from "../../lib/publicPostUrls.js";
import { contactSourceHref } from "./contactSource2029.js";
import { useSystemFeed2029 } from "./useSystemFeed2029.js";
import { SystemFeedContext2029 } from "./systemFeedContext2029.js";

import LearnMark2029 from "./LearnMark2029.jsx";
import DiscoveryGateMark2029 from "./DiscoveryGateMark2029.jsx";
import {
  classifyEntryArrival,
  emitEntryLearn,
  getSurfaceFamiliarity,
  isEntryLearnSurfaceActive,
  LEARN_LAYER,
  LEARN_SCOPE,
  markSurfaceFamiliarity,
  resolveEntryOrientation,
} from "../../lib/entryLearn2029.js";

import { SystemToolDockContext2029, SystemToolDockActions2029 } from "./SystemToolDock2029.jsx";
import "./sod2029.css";
import "./sod2029-closed.css";
import "./systemFrame2029.css";
import "./myWorkspace2029.css";
import "./discoveryGate2029.css";
import "./systemToolDock2029.css";
import "./systemFrame2029-unified-bar.css";
import "./systemFrame2029-topbar-crown.css";
import "./googleEntry2029.css";

const NumberDrawer2029 = React.lazy(() => import("../number2029/NumberDrawer2029.jsx"));
const SiteSearch2029 = React.lazy(() => import("./SiteSearch2029.jsx"));
// The invitation's code and stylesheet are fetched before it opens, so the panel appears at its final size (CLS, 18.11.2026:
// it opened with the frame panel's size and moved when its own stylesheet arrived).
// React.lazy still shows its fallback for one render after the code has arrived, so the loaded component is kept and used directly.
let guestNewsletterInviteLoaded2029 = null;
const loadGuestNewsletterInvite2029 = () => import("./GuestNewsletterInvite2029.jsx").then((module) => { guestNewsletterInviteLoaded2029 = module.default; return module; });
const GuestNewsletterInviteLazy2029 = React.lazy(loadGuestNewsletterInvite2029);
const GuestNewsletterInvite2029 = (props) => { const Loaded = guestNewsletterInviteLoaded2029; return Loaded ? <Loaded {...props} /> : <GuestNewsletterInviteLazy2029 {...props} />; };
import { dismissGuestNewsletterInvite2029, guestNewsletterRoute2029, useGuestNewsletterInvite2029 } from "./useGuestNewsletterInvite2029.js";

const TRANSIENT = Object.freeze({
  COMMAND: "command",
  SEARCH: "site-search",
  ACTION: "action",
  CAPABILITY: "capability",
  INSPECT: "inspect",
  ATTENTION: "attention",
  TOOLS: "tools",
  MORE: "more",
  RAZIEL: "raziel",
  RAZIEL_LOCKED: "raziel_locked",
  WORKSPACE: "workspace",
  ISSUE: "issue",
  CONTEXT: "context",
  NEWSLETTER: "newsletter-invite",
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
  razielLocked: true,
  closeRaziel: () => {},
  openWorkspace: () => {},
  openIssueReport: () => {},
  closeWorkspace: () => {},
  closeTransient: () => {},
  go: () => {},
  returnExact: () => {},
  registerOrientationHost: () => {},
  registerSelectedItemActions: () => () => {},
  experience: null,
});

export const use2029Shell = () => useContext(ShellContext);

// The current route is authoritative during navigation; a previous page's SEO
// effect must never make the global share sheet target a stale document.
export function framePublicShareHref(location, canonicalHref = null) {
  let path;
  try { path = decodeURIComponent(location?.pathname || "/"); } catch { return null; }
  if (/^\/(?:auth|login|join|welcome|unsubscribe|updates|credits|buy|admin|profile|journey|raziel|community\/researcher\/me|2029\/(?:me|control|journey|raziel))(?:\/|$)/.test(path)) return null;
  const params = new URLSearchParams(location?.search || "");
  if (params.has("claim") || params.has("dm")) return null;
  params.delete("returnTo"); params.delete("back");
  let canonical = null;
  try {
    const url = new URL(canonicalHref);
    const currentSlug = postAddressSlug(location?.pathname);
    if (url.pathname === location?.pathname || currentSlug && currentSlug === postAddressSlug(url.pathname)) canonical = url.href;
  } catch { /* A missing or stale canonical falls back to this exact route. */ }
  return publicPageShareUrl({ pathname: location?.pathname || "/", search: params.toString(), hash: location?.hash || "" }, canonical);
}

const publicFoundationPreview = (import.meta.env.VITE_PUBLIC_FOUNDATION_PREVIEW === "true" || import.meta.env.VITE_PUBLIC_READING_RELEASE === "public-reading-20261101");
// Every destination names its own picture from the NavigationIcon2029 catalogue in `symbol`. The old text glyph (`icon`) no longer
// picks it: "123" was shared by the calculator and the Number page, "▤" by Books and Beit Midrash, "◌" by the World and the site map,
// and "◉" / "✉" / "◇" fell back to the generic tools grid. test/navigation-symbols-distinct-2029.test.mjs reads these four lists
// from this file, renders each item through the real component and fails on a missing, uncatalogued, shared or fallback symbol.
// Only the public-reading router serves all four destinations. Both rail variants use the same entries.
const archiveAndGalleryNav = PUBLIC_READING_RELEASE ? [
  { to: "/archive", label: "ארכיון לפי שנה ונושא", symbol: "journal" },
  { to: "/gallery", label: "גלריות ותמונות", symbol: "gallery" },
] : [];
const cipherLibraryNav = PUBLIC_READING_RELEASE ? [
  { to: "/codes", label: "ספריית הצפנים", symbol: "layers" },
] : [];
const communityCalculatorNav = PUBLIC_READING_RELEASE ? [
  { to: "/community/calculator", label: "מחשבון הקהילה לשמות", symbol: "letters" },
] : [];

const HOME_NAV = [
  { to: publicFoundationPreview ? "/" : "/2029", label: "בית", symbol: "home", exact: true },
  { to: "/world", label: "העולם", symbol: "world", building: true },
  { to: "/heichal", label: "היכל", symbol: "heichal" },
  { to: publicFoundationPreview ? "/post" : "/2029/posts", label: "פוסטים", symbol: "posts" },
  ...archiveAndGalleryNav,
  { to: "/2029/journey", label: "מסע החיים", symbol: "journey" },
  { to: "/community/chat", label: "קהילה", symbol: "community" },
];

const DIRECT_NAV = [
  { to: "/gematria", label: "מחשבון גימטריה מקצועי", symbol: "calculator" },
  ...communityCalculatorNav,
  { action: "number-search", label: "דף המספר", symbol: "number" },
  { to: "/books", label: "ספרים ומקורות", symbol: "books" },
  { to: "/beit-midrash", label: "בית המדרש", symbol: "study" },
  ...cipherLibraryNav,
  { to: "/els", label: "כלי הצופן התנ״כי", symbol: "els", building: true },
  // Site map, email updates and privacy are not rows of the navigation rail (ZURIEL 19.11.2026): they live in the footer ("מידע",
  // and the updates signup) and in their own pages; the rail keeps destinations only.
];

const CORE_HOME_NAV = [
  { to: publicFoundationPreview ? "/" : "/2029", label: "בית", symbol: "home", exact: true },
  { to: publicFoundationPreview ? "/post" : "/2029/posts", label: "פוסטים", symbol: "posts" },
  ...archiveAndGalleryNav,
  { to: "/community/chat", label: "קהילה", symbol: "community" },
  HOME_NAV[1],
  { to: "/heichal", label: "היכל", symbol: "heichal" },
  { to: "/2029/journey", label: "מסע החיים", symbol: "journey" },
];

const CORE_DIRECT_NAV = [
  ...cipherLibraryNav,
  { to: "/code", label: "כלי הצופן התנ״כי", symbol: "els", building: true },
  { to: "/gematria", label: "מחשבון גימטריה מקצועי", symbol: "calculator" },
  ...communityCalculatorNav,
  { action: "number-search", label: "דף המספר", symbol: "number" },
  { to: "/books", label: "ספרים ומקורות", symbol: "books" },
  { to: "/beit-midrash", label: "בית המדרש", symbol: "study" },
];

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

// בית המדרש is a visible menu destination (ZURIEL 5.11.2026). Open to the public since 5.11.2026; if the router ever closes it again it appears
// with its true "בבנייה" state instead of a link that leads nowhere.
export function beitMidrashNavItem(item, isAdmin = false) {
  const state = publicReadingPath(item.to, { isAdmin: isAdmin === true });
  return state === "closed" || state === "missing" ? { label: item.label, symbol: item.symbol, status: "בבנייה" } : item;
}

function activeClass({ isActive }) {
  return `sod29-nav-link${isActive ? " active" : ""}`;
}

function directionForLocale(locale) {
  return /^(he|ar|fa|ur)(-|$)/i.test(locale || "he") ? "rtl" : "ltr";
}

export function normalizeTarget(input, source = "context") {
  if (!input) return null;
  const type = input.type || input.entityType || input.kind || null;
  const rawId = input.id ?? input.entityId ?? input.ref ?? input.locator ?? input.label ?? null;
  if (rawId == null || !type) return null;
  const id = String(rawId).trim();
  if (!id) return null;
  const resultValue = researchContextNumber(input.resultValue ?? input.number);
  const number = researchContextNumber(input.number);
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
    number: Number.isSafeInteger(number) ? number : null,
    sectionLabel: input.sectionLabel || null,
    sourceLabel: input.sourceLabel || null,
    // Optional body of a public source message (already redacted by its reader). Absent for every other target.
    ...(typeof input.excerpt === "string" && input.excerpt.trim() ? {
      excerpt: input.excerpt.trim().slice(0, 1200),
      attribution: input.attribution ? String(input.attribution) : null,
      stateLabel: input.stateLabel ? String(input.stateLabel) : null,
    } : {}),
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

function ThemePresetControl2029({ compact = false, header = false }) {
  const preset = useThemePreset();
  const [chooserOpen, setChooserOpen] = useState(false);
  const controlRef = useRef(null);
  const triggerRef = useRef(null);
  const optionsId = useId();
  const active = THEME_PRESET_OPTIONS.find((item) => item.id === preset) || THEME_PRESET_OPTIONS[2];
  useEffect(() => {
    if (!header || !chooserOpen) return undefined;
    const closeOutside = (event) => {
      if (!controlRef.current?.contains(event.target)) setChooserOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [header, chooserOpen]);
  return (
    <div ref={controlRef} className={`sod29-theme-presets${compact ? " is-compact" : ""}${header ? " is-header-control" : ""}${chooserOpen ? " is-open" : ""}`} role="group" aria-label="ערכת צבעים" onBlur={(event) => {
      if (header && !event.currentTarget.contains(event.relatedTarget)) setChooserOpen(false);
    }} onKeyDown={(event) => {
      if (header && chooserOpen && event.key === "Escape") {
        event.preventDefault(); event.stopPropagation(); setChooserOpen(false); triggerRef.current?.focus();
      }
    }}>
      {header ? <button ref={triggerRef} className="sod29-theme-trigger" type="button" onClick={() => setChooserOpen((value) => !value)} aria-expanded={chooserOpen} aria-controls={optionsId} aria-label={`מראה: ${active.label}. בחר יום, קלף או לילה`} title={`מראה: ${active.label}`}>
        <span aria-hidden="true">{active.icon}</span><b>{active.label}</b>
      </button> : null}
      <div id={optionsId} className="sod29-theme-options">
      {THEME_PRESET_OPTIONS.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={preset === item.id}
          className={preset === item.id ? "is-active" : ""}
          onClick={() => { setThemePreset(item.id); setChooserOpen(false); if (header && chooserOpen) triggerRef.current?.focus(); }}
          title={item.label}
        >
          <span aria-hidden="true">{item.icon}</span>
          <b>{item.label}</b>
        </button>
      ))}
      </div>
    </div>
  );
}

function accountShortName(user, profile) {
  const full = String(profile?.display_name || profile?.full_name || user?.user_metadata?.full_name || "").trim();
  return full.split(/\s+/)[0] || "האזור שלי";
}

export function UserAvatar2029({ user, profile, size = "normal" }) {
  const src = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const name = String(profile?.display_name || profile?.full_name || user?.user_metadata?.full_name || user?.email || "אישי").trim();
  const fallback = Array.from(name).find((ch) => /[\p{L}\p{N}]/u.test(ch)) || "•";
  const signedOut = !user && !profile;
  return (
    <span className={`sod29-user-avatar is-${size}`} aria-hidden="true">
      {src ? <img src={src} alt="" referrerPolicy="no-referrer" /> : signedOut ? <NavigationIcon2029 name="personal" /> : <b>{fallback}</b>}
    </span>
  );
}

function NavGroup({ title, items, preserveReturnFor, onNavigate, onAction }) {
  return (
    <div className="sod29-nav-group">
      <div className="sod29-nav-group-title">{title}</div>
      {items.map((item) => item.locked ? (
        <button className="sod29-nav-link is-gated" key={item.label} type="button" disabled aria-label={`${item.label} · נעול`} title={`${item.label} · נעול`}>
          <span className="sod29-nav-icon" aria-hidden="true"><NavigationIcon2029 name={item.symbol} /></span>
          <span className="sod29-nav-copy">{item.label} · נעול</span>
        </button>
      ) : item.to ? (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.exact}
          aria-label={item.building ? `${item.label} · בבנייה` : item.label}
          title={item.building ? `${item.label} · בבנייה` : item.label}
          className={activeClass}
          state={{ sodEntryArrival: "internal" }}
          onClick={() => { preserveReturnFor(item.to); onNavigate?.(); }}
        >
          <span className="sod29-nav-icon" aria-hidden="true"><NavigationIcon2029 name={item.symbol} /></span>
          <span className="sod29-nav-copy">{item.label}</span>
          {/* Open, and marked as still being built (ZURIEL 18.11.2026: the World and the cipher). */}
          {item.building ? <span className="sod29-nav-building">בבנייה</span> : null}
        </NavLink>
      ) : item.action ? (
        <button className="sod29-nav-link" key={item.label} aria-label={item.label} title={item.label} type="button" onClick={() => { onAction?.(item.action); onNavigate?.(); }}>
          <span className="sod29-nav-icon" aria-hidden="true"><NavigationIcon2029 name={item.symbol} /></span>
          <span className="sod29-nav-copy">{item.label}</span>
        </button>
      ) : (
        <button className="sod29-nav-link is-pending" key={item.label} type="button" disabled aria-label={`${item.label} · ${item.status}`} title={`${item.label} · ${item.status}`}>
          <span className="sod29-nav-icon" aria-hidden="true"><NavigationIcon2029 name={item.symbol} /></span>
          <span className="sod29-nav-copy">{item.label}</span>
          <span className="sod29-nav-status">{item.status}</span>
        </button>
      ))}
    </div>
  );
}

// Typed "Now": what is happening in the world, for me, and what Raziel can continue.
// Each tab opens an existing frame surface; no data is invented here.
function NowTabs2029({ activeKind, onWorld, onMe, onRaziel, razielLocked = false }) {
  const task = useResearch().elsResearchOperation?.task;
  const tabs = [
    { id: "world", label: "בעולם", hint: "מה חדש בעולם", on: onWorld, pressed: activeKind === TRANSIENT.ATTENTION },
    { id: "me", label: task ? task.status === "RUNNING" ? "סורק" : "תוצאות" : "בשבילי", hint: task ? `${task.phase} · ${task.origin.term}` : "העדכונים והמסלול שלי", on: onMe, pressed: activeKind === TRANSIENT.WORKSPACE },
    { id: "rz", label: razielLocked ? "רזיאל · נעול" : "רזיאל מציע", hint: razielLocked ? "רזיאל נעול זמנית" : "המשך עם רזיאל", on: onRaziel, pressed: activeKind === TRANSIENT.RAZIEL, disabled: razielLocked },
  ];
  return <div className="sod29-now" role="group" aria-label="עכשיו">
    {tabs.map((tab) => <button key={tab.id} type="button" className={`sod29-now-tab is-${tab.id}`} aria-pressed={tab.pressed} aria-label={`עכשיו · ${tab.label}`} title={tab.hint} onClick={tab.on} disabled={tab.disabled}>
      <span className="sod29-now-dot" aria-hidden="true" /><span className="sod29-now-label">{tab.label}</span>
    </button>)}
  </div>;
}

// The ELS reading line of the orb title is read from its module once Raziel is open to this viewer (today the administrator);
// a visitor's locked orb never loads it (shell weight 3/8). Until it arrives the orb shows its plain title, as with no reading.
let selectElsMatrixReadingActivity2029 = null;
function useElsReadingSelector2029(active) {
  const [select, setSelect] = useState(() => selectElsMatrixReadingActivity2029);
  useEffect(() => {
    if (!active || select) return undefined;
    let alive = true;
    import("../../lib/research/elsMatrixReadingActivity.js")
      .then((module) => { selectElsMatrixReadingActivity2029 = module.selectElsMatrixReadingActivity; if (alive) setSelect(() => selectElsMatrixReadingActivity2029); })
      .catch(() => {});
    return () => { alive = false; };
  }, [active, select]);
  return select;
}

export function RazielOrb({ compact = false, active = false, onClick, title = "פתח את רזיאל", locked = false }) {
  const session = useOptionalRazielSession2029();
  const selectReading = useElsReadingSelector2029(!locked);
  const reading = locked || !selectReading ? null : selectReading(session);
  const readingTitle = reading ? `${reading.label} · ${reading.axis.term} · פתח את רזיאל` : title;
  return (
    <button
      type="button"
      className={`sod29-raziel-orb${compact ? " compact" : ""}${active ? " active" : ""}${locked ? " is-locked" : ""}`}
      onClick={onClick}
      aria-label={locked ? "רזיאל · בבנייה · למנהל בלבד" : readingTitle}
      title={locked ? "רזיאל בבנייה · למנהל בלבד" : `${readingTitle} · גישת מנהל`}
      data-matrix-reading-status={reading?.phase}
      aria-pressed={active}
      disabled={locked}
    >
      <span className="sod29-raziel-orb-core" aria-hidden="true" />
      {compact ? <span className="sod29-construction-badge" aria-hidden="true">בבנייה</span> : null}
      {reading ? <span className="sod29-raziel-reading-badge" aria-hidden="true">{reading.active ? "סורק" : "סריקה"}</span> : null}
      {!compact ? <span className="sod29-raziel-orb-label">רזיאל</span> : null}
    </button>
  );
}

export function PreviewTransportDisclosure2029() {
  // The static review builder owns the mock marker. Ordinary app documents do
  // not contain it and never gain a Preview label from this projection.
  if (typeof document === "undefined" || !document.querySelector('[data-raziel-preview-transport="mock-only"]')) return null;
  return <p role="note" data-raziel-preview-disclosure="mock-only">תצוגת בדיקה · תשובות רזיאל הן תשובות דמה בלבד, ללא קריאת מודל או כתיבה חיה.</p>;
}

function PanelShell({ panelRef, icon, kicker, title, children, onClose, panelKind = null, expansion = null, activity = null }) {
  return (
    <div className={`sod29-frame-backdrop${expansion ? " is-bar-expansion" : ""}`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside
        className="sod29-frame-panel"
        ref={panelRef}
        role="dialog"
        aria-modal={panelKind === "newsletter" ? "true" : "false"}
        aria-label={title}
        data-experience-capability="contextual-sidecar"
        data-desktop-projection="left-context-sidecar"
        data-mobile-projection="bottom-context-sheet"
        data-panel-kind={panelKind || undefined}
        data-bar-expansion={expansion || undefined}
        tabIndex={-1}
      >
        <header className="sod29-frame-panel-head">
          <div className="sod29-frame-panel-title">
            <span className="sod29-frame-panel-icon" aria-hidden="true">{icon}</span>
            <div><small>{kicker}</small><strong>{title}</strong></div>
          </div>
          <button type="button" onClick={onClose} aria-label="סגור">×</button>
        </header>
        <div className="sod29-frame-panel-body">{activity}<PreviewTransportDisclosure2029 /><React.Suspense fallback={<div role="status">טוען…</div>}>{children}</React.Suspense></div>
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
      <div className="sod29-frame-hint"><span>מספרים, ביטויים ושיטות חישוב</span><kbd>Esc</kbd><span>חזרה בדיוק למקום</span></div>
      <button className="sod29-action" type="button" onClick={onClose}>סגור</button>
    </>
  );
}

function ContextualActionButtons({ actions, target, onInspect, onCapability, onRaziel, razielLocked, go }) {
  const elsState = useFeatureState("lock_els");
  return <div className="sod29-panel-actions-grid">{actions.map((action) => {
    const className = `sod29-action${action.primary ? " primary" : ""}`;
    if (action.kind === CONTEXT_ACTION_KIND.INSPECT) {
      return <button key={action.id} className={className} type="button" onClick={() => onInspect?.(target)}>{action.label}</button>;
    }
    if (action.kind === CONTEXT_ACTION_KIND.CAPABILITY) {
      return <button key={action.id} className={className} type="button" onClick={() => onCapability?.(action.capability, target)}>{action.label}</button>;
    }
    if (action.kind === CONTEXT_ACTION_KIND.RAZIEL) {
      return <button key={action.id} className={className} type="button" onClick={() => onRaziel?.()} disabled={razielLocked} data-capability-state={razielLocked ? "locked" : undefined}>{razielLocked ? `${action.label} · נעול` : action.label}</button>;
    }
    if (action.kind === CONTEXT_ACTION_KIND.ROUTE) {
      const locked = ["/els", "/code"].includes(action.href) && (elsState.loading || elsState.blocked);
      return <button key={action.id} className={className} type="button" disabled={locked} data-capability-state={locked ? "locked" : undefined} onClick={() => go?.(target && action.href === "/world" ? "/world?focus=context" : action.href, { state: { sodResearchIntent: target ? "continue" : null } })}>{action.label}{locked ? " · למנהל בלבד" : ""}</button>;
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
  razielLocked,
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
        <strong>{publicContextLabel(target.label) || entityTypeNounHe(target.type)}</strong>
        <small>{entityTypeNounHe(target.type)}</small>
      </div> : null}
      <ContextualActionButtons actions={actions} target={target} onInspect={onInspect} onCapability={onCapability} onRaziel={onRaziel} razielLocked={razielLocked} go={go} />
      <div className="sod29-panel-context-card">
        <b>אותו הקשר</b>
        <span>{context?.subject ? contextDisplayTitle(context) || "ההקשר הנוכחי" : "אין מוקד פעיל"}</span>
        <small>מה שבחרת נשאר איתך כשנפתח כלי או עולם.</small>
      </div>
    </>
  );
}

function AttentionProjection({ context, onWorkspace, onOpen, feed, timeMode }) {
  // The mobile Now sheet and left Companion show the SAME authorized public rows.
  // SystemFrame owns one useSystemFeed2029 watcher; the publications window creates no polling,
  // independent ordering, research read or seen-state cache (see NowPublications2029).
  return (
    <>
      <NowPublications2029 feed={feed} onOpen={onOpen} timeMode={timeMode} compact />
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
      {target ? <div className="sod29-selection-summary"><span>פוקוס</span><strong>{publicContextLabel(target.label) || entityTypeNounHe(target.type)}</strong><small>{entityTypeNounHe(target.type)}</small></div> : null}
      <ContextualActionButtons actions={tools} target={target} onCapability={onCapability} go={go} />
    </>
  );
}

// The Raziel conversation panel (RazielNativeChat + RazielProjection) loads when the Raziel panel opens, not with the frame on every
// page (SHELL_WEIGHT_REDUCTION_20261118): for every viewer Raziel is locked for (the public release) it never renders at all.
// The panel already renders inside PanelShell's Suspense, which shows the live loading state while it arrives.
const RazielProjection = React.lazy(() => import("./RazielPanel2029.jsx"));

import useKeyboardClearance2029 from "./useKeyboardClearance2029.js";
// The personal workspace panel loads when it opens (WorkspaceProjection2029.jsx), not with the frame on every page (shell budget, ZURIEL 16.11.2026).
// While it arrives the panel shows a live loading state (Operation Visibility Law); `key` still remounts it per account exactly as before.
// The panel always renders the (already lazy) personal home; both are requested together so the first open is one round trip, not two.
const WorkspaceProjectionPanel2029 = React.lazy(() => { void import("./PersonalHome2029.jsx").catch(() => {}); return import("./WorkspaceProjection2029.jsx"); });
const WorkspaceProjection = (props) => <React.Suspense fallback={<FrameState kind="loading" title="פותח את האזור האישי">טוען את האזור האישי.</FrameState>}><WorkspaceProjectionPanel2029 {...props} /></React.Suspense>;
function IntroResearchContext2029({ context, currentHref, pageTitle, onReturnExact }) {
  const items=contextNavigationItems2029(context,{currentHref,pageTitle}).filter(item => item.key !== "page");
  if (!items.length) return null;
  const strip = <nav className="sod29-context-strip" aria-label="ההקשר שלך פעיל">
    {items.map(item=>item.href?(item.key==='return'
      ?<button key={item.key} className="r29-btn is-quiet" type="button" data-context-role={item.key} onClick={onReturnExact}>{item.prefix} · {item.label}</button>
      :<Link key={item.key} className="r29-btn is-quiet" data-context-role={item.key} to={item.href}>{item.prefix} · {item.label}</Link>)
      :<span key={item.key} data-context-role={item.key}>{item.prefix} · {item.label}</span>)}
  </nav>;
  const review = import.meta.env.VITE_INTEGRATED_PREVIEW === "true";
  if (!review) return strip;
  const arrivingWithContext = Boolean(context.selection?.locator || context.journey || context.returnTo?.href);
  const arrivalKey = [context.subject?.id, context.selection?.locator, context.journey?.position, context.returnTo?.href].join("|");
  return <details className="sod29-review-context" key={arrivalKey} open={arrivingWithContext}>
    <summary>ההקשר המחקרי</summary>
    {strip}
  </details>;
}

// App2029 owns the single session above Routes. A frame hosted by another entry point receives
// the same bounded mount locally instead of falling back to a second chat implementation.
export default function SystemFrame2029(props) {
  return useOptionalRazielSession2029()
    ? <SystemFrame2029Body {...props} />
    : <RazielSessionMount2029><SystemFrame2029Body {...props} /></RazielSessionMount2029>;
}

function SystemFrame2029Body({
  title,
  eyebrow,
  description,
  children,
  status = "2029 · BUILD",
  wide = false,
  surface = "home",
  orientationCopy = null,
  calmBottomChrome = false,
  symbol = "✦",
  introVariant = "hero",
}) {
  useKeyboardClearance2029();   // the bottom bar steps aside while the on-screen keyboard is open
  const location = useLocation();
  const recordTimeMode = surface === "home" ? "relative" : "bilingual";
  const navigate = useNavigate();
  const research = useResearch();
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const corePublicViewer = CORE_PUBLIC_LAUNCH_2029 && !isAdmin;
  const worldFeature = useFeatureState("lock_world");
  const heichalFeature = useFeatureState("lock_heichal", { requireFlag: true });
  const razielFeature = useFeatureState("lock_raziel_site", { requireFlag: true });
  const journeyFeature = useFeatureState("lock_life_journey", { requireFlag: true });
  const booksFeature = useFeatureState("lock_books", { requireFlag: true });
  const numberFeature = useFeatureState("lock_number", { requireFlag: true });
  const elsFeature = useFeatureState("lock_els");
  // "פעולות" and "כלים" (ZURIEL 11.11.2026: closed · בבנייה): availability comes ONLY from site_flags through the canonical hook. requireFlag fails
  // closed when the row is missing; the administrator keeps the existing admin bypass. A closed panel renders the notice only (no projection, no read).
  const actionsFeature = useFeatureState("lock_context_actions", { requireFlag: true });
  const toolsFeature = useFeatureState("lock_context_tools", { requireFlag: true });
  const heichalLocked = heichalFeature.loading || heichalFeature.blocked;
  const contextLocked = authLoading || isAdmin !== true;
  const razielLocked = contextLocked || razielFeature.loading || razielFeature.blocked;
  const journeyLocked = journeyFeature.loading || journeyFeature.blocked;
  const booksLocked = booksFeature.loading || booksFeature.blocked;
  const numberLocked = numberFeature.loading || numberFeature.blocked;
  const worldLocked = worldFeature.loading || worldFeature.blocked;
  const homeNav = (corePublicViewer ? CORE_HOME_NAV : HOME_NAV).map((item) => item.to === "/heichal" ? (PUBLIC_READING_RELEASE ? { ...item, to: "/findings", label: "ממצאים שפורסמו" } : { ...item, locked: heichalLocked && !heichalFeature.adminViewAllowed }) : item.to === "/2029/journey" ? { ...item, locked: journeyLocked && !journeyFeature.adminViewAllowed } : item.label === "העולם" ? { ...item, locked: worldLocked, building: !PUBLIC_READING_RELEASE } : item);
  const directNav = (corePublicViewer ? CORE_DIRECT_NAV : DIRECT_NAV).map((item) => (item.to === "/els" || item.to === "/code") ? { ...item, locked: elsFeature.loading || (elsFeature.blocked && !elsFeature.adminViewAllowed), building: !PUBLIC_READING_RELEASE } : item.to === "/books" ? { ...item, locked: booksLocked && !booksFeature.adminViewAllowed } : item.to === "/beit-midrash" ? beitMidrashNavItem(item, isAdmin) : item.action === "number-search" || isNumberPagePath(item.to) ? { ...item, locked: numberLocked } : item);
  const [navOpen, setNavOpen] = useState(false);

  // The crown settles into the bar once the page is scrolled, and the bar's line fills with how much of the page was read.
  // One passive, capture-phase scroll listener (it also hears a page that scrolls inside its own region); one rAF per frame; attributes and one variable on <html>.
  useEffect(() => {
    const html = document.documentElement;
    let frame = 0;
    let scrolled = false;
    let reading = null;
    let lastTarget = null;
    const metrics = (el) => {
      if (!el) {
        const doc = document.scrollingElement || html;
        return { top: window.scrollY || doc.scrollTop || 0, room: Math.max(0, doc.scrollHeight - window.innerHeight) };
      }
      return { top: el.scrollTop, room: Math.max(0, el.scrollHeight - el.clientHeight) };
    };
    const regionOf = (target) => {
      // The page scrolls with the window; if it does not, the region that holds the page content does (never a dialog or a small list).
      const doc = document.scrollingElement || html;
      if (doc.scrollHeight - window.innerHeight > 40) return null;
      if (!(target instanceof Element) || target.closest('[role="dialog"], .sod29-frame-panel, .sod29-mobile-drawer')) return reading;
      return target.clientHeight >= window.innerHeight * 0.5 ? target : reading;
    };
    const update = () => {
      frame = 0;
      reading = regionOf(lastTarget);
      const { top, room } = metrics(reading);
      const next = scrolled ? top > 10 : top > 48;
      if (next !== scrolled) { scrolled = next; html.setAttribute("data-crown-scrolled", String(next)); }
      const ratio = room > 40 ? Math.min(1, Math.max(0, top / room)) : 0;
      html.style.setProperty("--s29-read", ratio.toFixed(3));
      html.setAttribute("data-crown-read-mid", String(ratio >= 0.5));
    };
    const onScroll = (event) => {
      lastTarget = event.target === document || event.target === window ? null : event.target;
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      ["data-crown-scrolled", "data-crown-read-mid"].forEach((name) => html.removeAttribute(name));
      html.style.removeProperty("--s29-read");
    };
  }, [location.pathname]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("sod-global-rail") !== "expanded"; } catch { return true; }
  });
  // ZURIEL 1.11: Companion is temporarily unmounted on every 2029 surface.
  // Keep its component/preferences intact; no source-shortcut reader is imported.
  // This single feed still serves the Now sheet; the static header notice does not own it.
  const [transient, setTransient] = useState(null);
  const feed = useSystemFeed2029({ enabled: surface !== "control", nowOpen: transient?.kind === TRANSIENT.ATTENTION, homeStrip: surface === "home" && !(corePublicViewer && worldLocked), afterContent: surface !== "home" });
  // The logo opens and closes the navigation rail (click, Enter or Space). Hover only highlights; nothing moves.
  const [toolDock, setToolDock] = useState(null);
  const [systemDockMode, setSystemDockMode] = useState(false);
  const registerToolDock = useCallback((projection) => {
    const lease = Symbol("tool-dock");
    setToolDock({ ...projection, lease });
    return () => setToolDock((current) => current?.lease === lease ? null : current);
  }, []);
  // Owners supply a validated target and their existing action renderer. No capability logic here.
  const [selectedItemActions, setSelectedItemActions] = useState(null);
  const registerSelectedItemActions = useCallback((projection) => {
    const lease = Symbol("selected-item-actions");
    setSelectedItemActions({ ...projection, lease, route: location.key });
    return () => setSelectedItemActions(current => current?.lease === lease ? null : current);
  }, [location.key]);
  const selectedItem = selectedItemActions?.route === location.key ? selectedItemActions : null;
  const selectedRoyal = (placement) => selectedItem ? <React.Suspense fallback={null}><SelectedRoyalItem2029 projection={selectedItem} placement={placement} /></React.Suspense> : null;
  const activeToolDock = toolDock?.surface === surface ? toolDock : null;
  const toolMode = Boolean(activeToolDock && !systemDockMode);
  useEffect(() => { if (!activeToolDock) setSystemDockMode(false); }, [activeToolDock]);
  const [ephemeralSelection, setEphemeralSelection] = useState(null);
  const [introHelpRoute, setIntroHelpRoute] = useState(null);
  const introHelpOpened = introHelpRoute === location.key;
  useEffect(() => setIntroHelpRoute(null), [location.key]);
  const [commandQuery, setCommandQuery] = useState("");
  const [siteSearchQuery, setSiteSearchQuery] = useState("");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [surfaceFamiliarity, setSurfaceFamiliarity] = useState(() => getSurfaceFamiliarity(surface));
  const panelRef = useRef(null);
  const navRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const returnFocusRef = useRef(null);
  const context = research.context || null;
  const currentHref = `${location.pathname}${location.search || ""}${location.hash || ""}`;
  const pageContext = useMemo(() => surfaceContextForRoute2029(context, { surface, pathname: location.pathname, search: location.search, intent: location.state?.sodResearchIntent }), [context, surface, location.pathname, location.search, location.state?.sodResearchIntent]);
  // The scope the top bar names: the Post, and the ACTIVE unit inside it when the Post holds units (one identity: post > unit > item). It exists only for the route of that Post;
  // a unit left over from another Post is never shown. "כל הפוסט" returns to the Post's own scope from its top (no unit parameter).
  const activeUnitScope = useMemo(() => {
    const dims = context?.dimensions || {};
    const contextPath = typeof dims.surfaceContextHref === "string" ? dims.surfaceContextHref.split(/[?#]/)[0] : "";
    if (context?.subject?.type !== "post" || !contextPath || contextPath !== location.pathname || !dims.activeUnitRef || !dims.activeUnitLabel) return null;
    return { id: String(dims.activeUnitRef), label: String(dims.activeUnitLabel), href: contextPath };
  }, [context, location.pathname]);
  const backToPostScope = () => {
    if (!activeUnitScope) return;
    navigate(activeUnitScope.href, { state: { puWhole: true } });
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" }));
  };
  const currentLabel = title || context?.subject?.label || "SOD1820";
  const locale = context?.locale || "he";
  const direction = directionForLocale(locale);
  const experience = useMemo(() => resolveExperienceContext({
    // The existing operational frame reuses the approved inspection projection.
    // Keep its raw "control" mode for the feed/context guards below.
    surface: surface === "control" ? "heichal" : surface,
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
  // A surface may host the orientation pill inside its own compact header (Post): same LearnMark, one owner, no extra bar.
  const [orientationHost, setOrientationHost] = useState(null);
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
  // Hover opens the slim rail over the page, as in Google Analytics (ZURIEL 18.11.2026): a short delay on the way in and out so a passing
  // pointer does not flash it; keyboard focus opens it too; the pin (the rail button) keeps it open as before.
  const [railPeek, setRailPeek] = useState(false);
  const railPeekTimer = useRef(0);
  // Closed by hand (ZURIEL 19.11.2026: the close button looked broken): hover does not reopen the rail until the pointer has left it.
  const railHold = useRef(false);
  const peekRail = (open, delay) => {
    clearTimeout(railPeekTimer.current);
    if (open && (railHold.current || !sidebarCollapsed || !window.matchMedia?.("(hover: hover) and (min-width: 981px)").matches)) return;
    railPeekTimer.current = setTimeout(() => setRailPeek(open), delay);
  };
  const closeRail = () => {
    // Released once the pointer leaves the column the OPEN rail covered (the close button above it is in that column too).
    const r = document.getElementById("sod29-desktop-navigation")?.getBoundingClientRect();
    clearTimeout(railPeekTimer.current); railHold.current = true; setRailPeek(false); setSidebarCollapsed(true);
    const release = (event) => { if (!r || event.clientX < r.left - 8 || event.clientX > r.right + 8) { railHold.current = false; document.removeEventListener("pointermove", release); } };
    document.addEventListener("pointermove", release);
  };
  const toggleRail = () => { if (sidebarCollapsed) { setRailPeek(false); setSidebarCollapsed(false); } else closeRail(); };

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

  const contextTarget = useMemo(() => targetFromContext(pageContext), [pageContext]);
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

  const go = useCallback((to, { preserve = true, state = null } = {}) => {
    if (!to) return;
    if (preserve) preserveReturnFor(to);
    completeSurfaceEntry("route");
    setTransient(null);
    navigate(to, { state: { sodEntryArrival: "internal", ...(state || {}) } });
  }, [navigate, preserveReturnFor, completeSurfaceEntry]);

  useEffect(() => {
    // The Companion's existing public source shortcuts can arrive before the
    // lazy World source section mounts. Finish that same anchor navigation once.
    if (surface !== "world" || location.hash !== "#world-public-content-map") return undefined;
    let frame;
    let observer;
    const revealSourceSection = () => {
      const section = document.getElementById("world-public-content-map");
      if (!section || !section.getClientRects().length) return false;
      observer?.disconnect();
      frame = window.requestAnimationFrame(() => section.scrollIntoView({ block: "start", behavior: "instant" }));
      return true;
    };
    if (!revealSourceSection()) {
      observer = new MutationObserver(revealSourceSection);
      observer.observe(document.body, { childList: true, subtree: true });
    }
    const timeout = window.setTimeout(() => observer?.disconnect(), 5000);
    return () => {
      observer?.disconnect();
      window.clearTimeout(timeout);
      if (frame != null) window.cancelAnimationFrame(frame);
    };
  }, [surface, location.hash, location.key]);

  const returnExact = useCallback(() => {
    setTransient(null);
    const target = context?.returnTo || null;
    if (!target?.href) {
      navigate(-1);
      return;
    }
    research.updateResearchContext?.((current) => buildExactReturnPatch(current, target));
    emitEntryLearn("exact_return", {
      entrySurface: surface,
      arrival: "exact_return",
      actionId: "return_exact",
    });
    navigate(target.href, { state: { sodEntryArrival: "exact_return" } });
  }, [context?.returnTo, navigate, research, surface]);

  const closeTransient = useCallback(() => {
    if (transient?.kind === TRANSIENT.NEWSLETTER) dismissGuestNewsletterInvite2029();
    // A report opened from "האזור האישי שלי" returns to it when it closes (ZURIEL 11.11), the same panel, not the page behind it.
    setTransient(transient?.kind === TRANSIENT.ISSUE && transient.payload?.returnToWorkspace === true ? { kind: TRANSIENT.WORKSPACE, payload: null } : null);
    requestAnimationFrame(() => returnFocusRef.current?.focus?.());
  }, [transient?.kind]);

  const closeMobileNav = useCallback((restoreFocus = true) => {
    setNavOpen(false);
    if (restoreFocus) requestAnimationFrame(() => mobileMenuRef.current?.focus?.());
  }, []);

  const openTransient = useCallback((kind, payload = null) => {
    if (kind === TRANSIENT.CONTEXT && contextLocked) return;
    // Switching an existing sheet must keep its persistent entry as the return
    // target; an inner tab/search button disappears when that sheet changes.
    if (!document.activeElement?.closest?.(".sod29-frame-panel")) {
      returnFocusRef.current = navOpen ? (mobileMenuRef.current || document.activeElement) : document.activeElement;
    }
    if ([TRANSIENT.COMMAND, TRANSIENT.SEARCH, TRANSIENT.ACTION, TRANSIENT.CAPABILITY, TRANSIENT.INSPECT, TRANSIENT.CONTEXT, TRANSIENT.MORE, TRANSIENT.TOOLS, TRANSIENT.RAZIEL, TRANSIENT.RAZIEL_LOCKED].includes(kind)) {
      completeSurfaceEntry(kind === TRANSIENT.CAPABILITY ? (payload?.capability || "capability") : kind);
    }
    setTransient({ kind, payload });
    setNavOpen(false);
  }, [navOpen, completeSurfaceEntry, contextLocked]);

  // ZURIEL 15.11: restore the existing guest invitation (22s or 450px scroll).
  // Original WordPress addresses qualify only after their public Post has rendered.
  useGuestNewsletterInvite2029({
    eligible: !authLoading && !user && (guestNewsletterRoute2029(location.pathname) || surface === "post"),
    blocked: Boolean(transient) || navOpen,
    routeKey: location.pathname,
    requireResolvedPost: surface === "post",
    onOpen: () => { loadGuestNewsletterInvite2029().then(() => openTransient(TRANSIENT.NEWSLETTER), () => openTransient(TRANSIENT.NEWSLETTER)); },
  });
  useEffect(() => {
    if (authLoading || user) setTransient(current => current?.kind === TRANSIENT.NEWSLETTER ? null : current);
  }, [authLoading, user?.id]);

  const openCommand = useCallback(() => openTransient(TRANSIENT.COMMAND), [openTransient]);
  // Keep the existing numeric entry used by World/menu callers; only global
  // site search and its keyboard shortcut use the new content projection.
  const openSiteSearch = useCallback(() => openTransient(TRANSIENT.SEARCH), [openTransient]);
  const handleGlobalNavAction = useCallback((action) => {
    if (action === "workspace") openTransient(TRANSIENT.WORKSPACE);
    if (action === "number-search") openCommand();
  }, [openTransient, openCommand]);

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
      && Number.isSafeInteger(normalized?.resultValue)
    ) {
      const resultValue = normalized.resultValue;
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
          href: `${NUMBER_PAGE_BASE}/${resultValue}`,
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
  const openTools = useCallback(() => openTransient(TRANSIENT.TOOLS, { subject: normalizeTarget(activeTarget) }), [openTransient, activeTarget]);
  const openMore = useCallback(() => openTransient(TRANSIENT.MORE, { subject: normalizeTarget(activeTarget) }), [openTransient, activeTarget]);
  const openShare = useCallback(() => openTransient(TRANSIENT.MORE, { shareOnly: true }), [openTransient]);
  // One share window (ZURIEL 19.11.2026): a page's share button sends what it shares ("sod29:share", src/lib/share/barShare2029.js) and the bar opens it.
  useEffect(() => {
    const take = (event) => { if (!event.detail?.url) return; event.preventDefault(); openTransient(TRANSIENT.MORE, { shareOnly: true, item: event.detail }); };
    const mark = (on) => document.documentElement.toggleAttribute("data-share-bar", on); // ShareActions watches this attribute
    window.addEventListener("sod29:share", take); mark(true);
    return () => { window.removeEventListener("sod29:share", take); mark(false); };
  }, [openTransient]);
  const openGimatria = () => {
    setTransient(null);
    if (activeTarget?.expression && activeTarget?.method && Number.isSafeInteger(activeTarget?.resultValue)) { openNumber(activeTarget); return; }
    const value = researchContextNumber(surfaceFocus?.number ?? (activeTarget?.type === "number" ? activeTarget.id : null));
    openNumber(value != null ? { id: String(value), type: "number", label: String(value) } : activeTarget);
  };
  const openRaziel = useCallback((payload = null) => {
    if (razielLocked) {
      openTransient(TRANSIENT.RAZIEL_LOCKED);
      return;
    }
    const boundedPayload = payload?.numberCoreFocus || payload?.razielMicroIntent || payload?.readingFocus || payload?.elsSurfaceContext || payload?.razielRouteAction
      ? payload
      : null;
    openTransient(TRANSIENT.RAZIEL, boundedPayload);
  }, [openTransient, razielLocked]);
  const openWorkspace = useCallback(() => openTransient(TRANSIENT.WORKSPACE), [openTransient]);
  const openPrivateHints = useCallback(() => {
    if (!user) { openWorkspace(); return; }
    if (journeyLocked) return;
    const params = new URLSearchParams({ focus: "hints" });
    go(`/2029/journey?${params.toString()}`, {
      preserve: false,
      state: { sodReturnTo2029: currentHref },
    });
  }, [currentHref, go, journeyLocked, openWorkspace, user]);
  const openIssueReport = useCallback((payload = null) => openTransient(TRANSIENT.ISSUE, {
    capability: payload?.capability || null, concept: payload?.concept || null,
    learnStage: payload?.learnStage || null, actionTried: payload?.actionTried || null,
    initialText: typeof payload?.initialText === "string" ? payload.initialText : "",
    returnToWorkspace: payload?.returnToWorkspace === true,
    sourceHref: contactSourceHref(location),
  }), [openTransient, location.pathname, location.search]);
  const closeRaziel = useCallback(() => { if ([TRANSIENT.RAZIEL, TRANSIENT.RAZIEL_LOCKED].includes(transient?.kind)) closeTransient(); }, [transient?.kind, closeTransient]);
  const closeWorkspace = useCallback(() => { if (transient?.kind === TRANSIENT.WORKSPACE) closeTransient(); }, [transient?.kind, closeTransient]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSiteSearch();
      }
      if (event.key === "Escape") {
        if (transient) { event.preventDefault(); closeTransient(); }
        else if (navOpen) { event.preventDefault(); closeMobileNav(true); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openSiteSearch, closeTransient, closeMobileNav, transient, navOpen]);

  useEffect(() => {
    if (!transient || !panelRef.current) return undefined;
    const panel = panelRef.current;
    // A contextual sidecar and its canonical dock form one keyboard scope.
    // Background page controls stay outside; global actions remain usable.
    const dock = transient?.kind === TRANSIENT.NEWSLETTER ? null : panel.closest(".sod29-root")?.querySelector(".sod29-command-island") || document.querySelector(".sod29-command-island");
    const panelControls = () => [...panel.querySelectorAll(`${FOCUSABLE},summary`)].filter(node => node.getClientRects().length && !node.matches('[role="option"][tabindex="-1"]'));
    const focusables = panelControls();
    const initial = panel.querySelector("[data-autofocus]") || focusables[0] || panel;
    requestAnimationFrame(() => initial.focus?.());
    const trap = (event) => {
      if (event.key !== "Tab") return;
      const current = [...panelControls(), ...(dock ? [...dock.querySelectorAll(FOCUSABLE)].filter(node => node.getClientRects().length) : [])];
      if (!current.length) { event.preventDefault(); panel.focus(); return; }
      event.preventDefault();
      const index = current.indexOf(document.activeElement);
      current[(index + (event.shiftKey ? -1 : 1) + current.length) % current.length].focus();
    };
    panel.addEventListener("keydown", trap);
    if (dock && !panel.contains(dock)) dock.addEventListener("keydown", trap);
    return () => { panel.removeEventListener("keydown", trap);dock?.removeEventListener("keydown", trap); };
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
    razielLocked,
    closeRaziel,
    openWorkspace,
    openIssueReport,
    closeWorkspace,
    closeTransient,
    go,
    returnExact,
    registerOrientationHost: setOrientationHost,
    registerSelectedItemActions,
  }), [registerSelectedItemActions, experience, openCommand, openAction, openCapability, openInspect, openNumber, openAttention, openTools, openRaziel, razielLocked, closeRaziel, openWorkspace, openIssueReport, closeWorkspace, closeTransient, go, returnExact]);

  const shellStyle = useMemo(() => ({
    "--s29-page": palette.pageBg,
    "--s29-panel": palette.card,
    "--s29-panel-soft": palette.cardSoft,
    "--s29-panel-grad": palette.cardGrad,
    "--s29-frame": palette.frame || palette.card,
    "--s29-frame-soft": palette.frameSoft || palette.cardSoft,
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
  useEffect(() => {
    if ((razielLocked && transientKind === TRANSIENT.RAZIEL) || (contextLocked && transientKind === TRANSIENT.CONTEXT)) setTransient(null);
  }, [razielLocked, contextLocked, transientKind]);
  const numberPageRoute = surface === "number" && /^\/(?:2029\/)?number\/[^/]+\/?$/.test(location.pathname);
  const subjectHref = pageContext?.subject?.href || "";
  const postTrail = surface === "post"
    && pageContext?.subject?.type === "post"
    && subjectHref
    && (subjectHref.split("#")[0] === location.pathname || pageContext?.dimensions?.surfaceContextHref === location.pathname + location.search)
    && Array.isArray(pageContext?.dimensions?.bottomTrail)
      ? pageContext.dimensions.bottomTrail.filter((item) => item?.label).slice(-6)
      : [];
  const configuredTrail = Array.isArray(pageContext?.dimensions?.bottomTrail)
    ? pageContext.dimensions.bottomTrail.filter((item) => item?.label).slice(-6)
    : [];
  const surfaceFocus = pageContext?.dimensions?.surfaceFocus || null;
  const fallbackTrail = [
    pageContext?.subject ? { id: "subject", label: pageContext.subject.label || pageContext.subject.id } : null,
    surfaceFocus?.sectionLabel ? { id: "section", label: surfaceFocus.sectionLabel } : null,
    surfaceFocus?.number != null ? { id: "number", label: String(surfaceFocus.number), active: true } : null,
  ].filter(Boolean);
  // Preserve the closed Number 2029 command-island behavior. Post keeps its stale-pageContext
  // guard; World/Topic may project the active Research Path when the surface supplies one.
  const bottomTrail = surface === "post"
    ? postTrail
    : (surface === "world" || surface === "topic")
      ? (configuredTrail.length ? configuredTrail : fallbackTrail)
      : [];
  const unifiedGlobalDock = !toolMode;
  // One expanding bar (preview): "עוד", "שיתוף" and "כאן" open an expansion attached to the bar, one at a time.
  // "עכשיו" and the personal area it holds open from the same bar too (ZURIEL 19.11.2026).
  const barExpansion = transientKind === TRANSIENT.MORE ? (transient?.payload?.shareOnly ? "share" : "more") : transientKind === TRANSIENT.CONTEXT ? "here" : transientKind === TRANSIENT.ATTENTION || transientKind === TRANSIENT.WORKSPACE ? "now" : null;
  const readingSession = useOptionalRazielSession2029();
  const researchTask = research.elsResearchOperation?.task || null;
  const hasActivity = researchTask || readingSession?.currentTurn?.kind === "els_matrix_reading" || readingSession?.thread?.some(row => row.elsMatrixReading) || LAB_SIMULATED_RESEARCH;
  const openActivity = kind => kind === "els_matrix_reading" ? openRaziel() : openWorkspace();
  const expansionActivity = hasActivity ? <React.Suspense fallback={null}><ResearchActivity2029 placement="panel" task={researchTask} lab={LAB_SIMULATED_RESEARCH} onOpen={openActivity} /></React.Suspense> : null;
  const showBottomTrail = !toolMode && !activeToolDock && bottomTrail.length > 0;
  // Thin reading progress: only from real surfaceSections + activeSectionId on Post/Topic (no percent, no invented marks).
  const progressSections = (surface === "post" || surface === "topic") && Array.isArray(pageContext?.dimensions?.surfaceSections)
    ? pageContext.dimensions.surfaceSections.filter((item) => item?.id && item?.label) : [];
  const progressIndex = progressSections.findIndex((item) => item.id === pageContext?.dimensions?.activeSectionId);
  const readingProgress = showBottomTrail && progressSections.length >= 2 && progressIndex >= 0
    ? { ids: progressSections.map((item) => item.id), index: progressIndex + 1, total: progressSections.length, label: progressSections[progressIndex].label }
    : null;
  // ELS owns its on-demand matrix inspector; avoid a second permanent pageContext column.
  const showContextRail = surface !== "home" && surface !== "control" && surface !== "els" && surface !== "community"
    && Boolean(activeTarget || pageContext?.subject);
  const shareHref = framePublicShareHref(location, typeof document === "undefined" ? null : document.querySelector('link[rel="canonical"]')?.href);
  const followContextConnection = (event, finding) => {
    if (!finding?.href?.startsWith("/") || finding.href.startsWith("//") || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const locator = pageContext?.selection?.locator || pageContext?.dimensions?.surfaceFocus?.locator || pageContext?.dimensions?.readingFocus?.locator;
    const href = location.pathname + location.search + (locator?.startsWith("#") ? locator : location.hash);
    research.updateResearchContext?.(current => ({
      returnTo: { href, label: currentLabel, subject: current?.subject || null, selection: current?.selection || null, lens: current?.lens || null, dimensions: current?.dimensions || {}, journey: current?.journey || null },
      dimensions: { surfaceContextHref: null, surfaceFocus: null, readingFocus: null, surfaceFindings: [], surfaceSections: [], bottomTrail: [], activeSectionId: null },
    }));
    go(finding.href === "/world" ? "/world?focus=context" : finding.href, { preserve: false, state: { sodResearchIntent: "continue" } });
  };
  const renderTransient = () => {
    if (!transientKind) return null;
    const common = { panelRef, onClose: closeTransient };
    if (transientKind === TRANSIENT.NEWSLETTER) return <PanelShell {...common} panelKind="newsletter" icon="✉" kicker="עדכוני האתר" title="עולם חדש של גילוי נבנה עכשיו"><GuestNewsletterInvite2029 onClose={closeTransient} /></PanelShell>;
    if (transientKind === TRANSIENT.SEARCH) return <PanelShell {...common} icon="⌕" kicker="תוכן האתר" title="חיפוש באתר"><SiteSearch2029 query={siteSearchQuery} setQuery={setSiteSearchQuery} go={go} /></PanelShell>;
    if (transientKind === TRANSIENT.COMMAND) return <PanelShell {...common} icon="123" kicker="גימטריה" title="מספר / ביטוי"><CommandProjection query={commandQuery} setQuery={setCommandQuery} onSubmit={submitCommand} onClose={closeTransient} /></PanelShell>;
    if (transientKind === TRANSIENT.ACTION && actionsFeature.blocked) return <PanelShell {...common} icon="◎" kicker="פעולות" title="פעולות"><button className="sod29-action" type="button" onClick={openMore}>חזרה לעוד</button><FeatureClosedNotice2029 state={actionsFeature} title="פעולות" compact /></PanelShell>;
    if (transientKind === TRANSIENT.ACTION) return <PanelShell {...common} icon="◎" kicker="פעולות" title={`פעולה · ${contextDisplayTitle(pageContext, inspectTarget) || "ההקשר הנוכחי"}`}><button className="sod29-action" type="button" onClick={openMore}>חזרה לעוד</button><ActionProjection surface={surface} target={inspectTarget} context={pageContext} onInspect={openInspect} onCapability={openCapability} onRaziel={openRaziel} razielLocked={razielLocked} go={go} /></PanelShell>;
    if (transientKind === TRANSIENT.CAPABILITY) {
      const capability = transient?.payload?.capability || null;
      if (capability === "number" && numberLocked) return <PanelShell {...common} icon="123" kicker="מספר" title="כלי המספר"><FrameState kind="gated" title="כלי המספר נעול כרגע">המספר והמקור נשארים בעמוד; הכלי ייפתח כשיהיה זמין.</FrameState></PanelShell>;
      if (capability === "number") return <PanelShell {...common} icon="123" kicker="מספר / גימטריה" title="מספר / ביטוי"><React.Suspense fallback={<div role="status">טוען כלי מספרים…</div>}><NumberDrawer2029 target={inspectTarget} context={pageContext} research={research} go={go} openRaziel={openRaziel} /></React.Suspense></PanelShell>;
      return <PanelShell {...common} icon="◇" kicker="כלי" title={capability || "יכולת"}><FrameState kind="unavailable" title="הכלי עדיין לא מחובר כאן">כשהחיבור יהיה מוכן הוא ייפתח באותה חלונית, בלי להעביר אותך למערכת אחרת.</FrameState></PanelShell>;
    }
    if (transientKind === TRANSIENT.INSPECT) return <PanelShell {...common} icon={inspectTarget?.type === "number" ? "123" : "◎"} kicker="בדיקה" title={contextDisplayTitle(pageContext, inspectTarget) || "בדיקה מהירה"}><React.Suspense fallback={<div role="status">טוען פריט…</div>}><InspectProjection target={inspectTarget} context={pageContext} surface={surface} onSetFocus={setResearchFocus} onSave={saveToLibrary} onAddResearch={addToResearch} isSaved={Boolean(inspectTarget && (research.saved || []).some((e) => e.id === inspectTarget.id || e.id === `${inspectTarget.type}:${inspectTarget.id}`))} inResearch={Boolean(inspectTarget && (research.cart || []).some((e) => e.id === inspectTarget.id || e.id === `${inspectTarget.type}:${inspectTarget.id}`))} onOpenNumber={openNumber} onNeedHelp={openIssueReport} shareHref={shareHref} /></React.Suspense></PanelShell>;
    if (transientKind === TRANSIENT.CONTEXT) return contextLocked ? null : <PanelShell {...common} activity={expansionActivity} expansion="here" icon="✦" kicker="הקשר" title="כאן · מפת העמוד וההקשר">{selectedRoyal("here")}{bottomTrail.length ? <nav className="sod29-sheet-trail" aria-label="מסלול המחקר הנוכחי">{bottomTrail.filter(item => publicContextLabel(item.label)).map((item, i) => <span key={item.id || i}>{i ? " ‹ " : ""}{publicContextLabel(item.label)}</span>)}</nav> : null}<SurfaceContextRail2029
      sheet
      surface={surface}
      context={pageContext}
      onFollowConnection={followContextConnection}
      focus={surfaceFocus || activeTarget}
      onOpenNumber={(target) => openNumber(target || activeTarget)}
      onAskRaziel={razielLocked ? null : () => openRaziel(surfaceFocus?.readingFocus ? { readingFocus: surfaceFocus.readingFocus } : null)}
      onOpenContext={() => openInspect(surfaceFocus || activeTarget)}
      onNavigate={closeTransient}
      onNeedHelp={openIssueReport}
    /></PanelShell>;
    if (transientKind === TRANSIENT.ATTENTION) return <PanelShell {...common} activity={expansionActivity} panelKind="now" expansion="now" icon="◉" kicker="פרסומי האתר" title="עכשיו"><NowTabs2029 activeKind={transientKind} onWorld={openAttention} onMe={openWorkspace} onRaziel={() => openRaziel()} razielLocked={razielLocked} />{transient?.payload?.ribbonDetail ? <LivingRibbonDetail2029 detail={transient.payload.ribbonDetail} onOpen={go} feed={feed} /> : corePublicViewer ? worldLocked
      ? <FrameState kind="gated" title="העולם ייפתח בהמשך">כעת אפשר לקרוא פוסטים, לחקור ELS ולהשתמש במחשבון הגימטריה.</FrameState>
      : <FrameState title="העולם פתוח"><Link to="/world" onClick={closeTransient}>למקורות ולחיבורים בעולם ←</Link></FrameState>
      : <AttentionProjection context={pageContext} onWorkspace={() => openTransient(TRANSIENT.WORKSPACE)} onOpen={go} feed={feed} timeMode={recordTimeMode} />}</PanelShell>;
    if (transientKind === TRANSIENT.MORE) {
      const shareOnly = Boolean(transient?.payload?.shareOnly);
      const contextTitle = inspectTarget ? (contextDisplayTitle(pageContext, inspectTarget) || publicContextLabel(inspectTarget.label) || entityTypeNounHe(inspectTarget.type)) : "";
      return <PanelShell {...common} activity={expansionActivity} panelKind="more" expansion={shareOnly ? "share" : "more"} icon={<NavigationIcon2029 name={shareOnly ? "share" : "kingdom"} />} kicker="סוד 1820" title={shareOnly ? `שיתוף ${transient?.payload?.item?.label || "העמוד"}` : "עוד"}>
        <MorePanel2029 shareOnly={shareOnly} context={contextTitle}
          onAction={() => openAction(inspectTarget)} onTools={openTools} onSearch={openSiteSearch}
          actionsBuilding={actionsFeature.blocked} toolsBuilding={toolsFeature.blocked}
          personal={{ signedIn: Boolean(user), name: profile?.display_name || profile?.full_name || user?.user_metadata?.full_name || "", avatar: user ? <UserAvatar2029 user={user} profile={profile} /> : null }}
          onPersonal={openWorkspace}
          onNumber={openGimatria} numberLocked={numberLocked}
          adminDestinations={adminOpenClosedDestinations(isAdmin)} onDestination={(item) => { setTransient(null); go(item.href); }}
          toolDockReturn={activeToolDock ? () => { setTransient(null); setSystemDockMode(false); } : null}
          share={transient?.payload?.item || (shareHref ? { href: shareHref, type: surface === "post" ? "post" : "page", surface } : null)} />
      </PanelShell>;
    }
    if (transientKind === TRANSIENT.TOOLS && toolsFeature.blocked) return <PanelShell {...common} icon="◇" kicker="כלים" title="כלים"><button className="sod29-action" type="button" onClick={openMore}>חזרה לעוד</button><FeatureClosedNotice2029 state={toolsFeature} title="כלים" compact /></PanelShell>;
    if (transientKind === TRANSIENT.TOOLS) return <PanelShell {...common} icon="◇" kicker="כלים" title="כלים"><button className="sod29-action" type="button" onClick={openMore}>חזרה לעוד</button><button className="sod29-action" type="button" onClick={openSiteSearch}>חיפוש באתר</button><ToolsProjection surface={surface} target={inspectTarget} go={go} onCapability={openCapability} /></PanelShell>;
    if (transientKind === TRANSIENT.RAZIEL_LOCKED) return <PanelShell {...common} icon="◇" kicker="רזיאל" title="רזיאל נעול"><FrameState kind="gated" title="רזיאל נעול זמנית">החיבור לרזיאל ייפתח לאחר השלמת ההגדרה והאימות שלו.</FrameState></PanelShell>;
    if (transientKind === TRANSIENT.RAZIEL) return razielLocked ? null : <PanelShell {...common} panelKind="raziel" icon="●" kicker="רזיאל" title="רזיאל"><RazielProjection target={activeTarget} context={pageContext} numberCoreFocus={transient?.payload?.numberCoreFocus || null} microIntent={transient?.payload?.razielMicroIntent || null} readingFocus={transient?.payload?.readingFocus || null} elsSurfaceContext={transient?.payload?.elsSurfaceContext || null} razielRouteAction={transient?.payload?.razielRouteAction || null} onSignup={openWorkspace} /></PanelShell>;
    if (transientKind === TRANSIENT.ISSUE) return <PanelShell {...common} icon="!" kicker="דיווח / קשר" title="דווחו על בעיה"><ContactGateway
      pathname={location.pathname}
      sourceHref={transient?.payload?.sourceHref || null}
      surface={surface}
      capability={transient?.payload?.capability || null}
      concept={transient?.payload?.concept || null}
      learnStage={transient?.payload?.learnStage || null}
      actionTried={transient?.payload?.actionTried || null}
      initialText={transient?.payload?.initialText || ""}
      locale={locale}
      onDone={closeTransient}
      onOpenPrivateHints={journeyLocked ? null : openPrivateHints}
    /></PanelShell>;
    return <PanelShell {...common} activity={expansionActivity} panelKind="workspace" expansion="now" icon="◎" kicker="אישי" title="האזור האישי שלי"><WorkspaceProjection key={authLoading ? "auth-loading" : user?.id || "guest"}
      context={context}
      go={go}
      onRaziel={openRaziel}
      onOpenPrivateHints={openPrivateHints}
      journeyLocked={journeyLocked}
      elsLocked={elsFeature.loading || elsFeature.blocked}
      razielLocked={razielLocked}
      research={research}
      onInspect={openInspect}
      onOpenNumber={openNumber}
      pathResume={research.pathResume}
      onSavePath={() => research.saveCurrentResearchPath?.({ href: currentHref, label: currentLabel, surface })}
      onResumePath={(pathId) => research.resumeResearchPath?.(pathId)}
    /></PanelShell>;
  };

  const resolvedIntroVariant = introVariant === "none" ? "none" : introVariant === "full" ? "full" : "compact";
  const hasRoyalIntro = resolvedIntroVariant !== "none" && Boolean(eyebrow || title || description);
  const introHelpTrigger = <button type="button" className="sod29-action" style={{ position: "absolute", top: 14, insetInlineEnd: 16, zIndex: 5, background: "none", border: 0, boxShadow: "none", padding: "0 6px", fontSize: "var(--s29-type-micro,14px)", minHeight: 44 }} disabled={introHelpOpened} aria-expanded="false" onClick={() => setIntroHelpRoute(location.key)}>{introHelpOpened ? "טוען הסבר…" : "? מה זה?"}</button>;
  const introIcon = { world: "world", heichal: "heichal", topic: "graph", books: "books", els: "els", calculator: "calculator", journey: "journey", number: "number", control: "tools" }[surface];
  const frame = (
    <ShellContext.Provider value={shellApi}>
    <SystemFeedContext2029.Provider value={feed}>
    <SystemToolDockContext2029.Provider value={registerToolDock}>
      <div
        className={`sod29-root closed-shell native-frame surface-${surface}${calmBottomChrome ? " calm-bottom-chrome" : ""}${numberPageRoute ? " number-page-route" : ""}${sidebarCollapsed && !railPeek ? " sidebar-collapsed" : ""}${railPeek ? " rail-peek" : ""}${activeToolDock ? " has-tool-dock" : ""}`}
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

        <button className="sod29-logo-toggle" type="button" onClick={toggleRail} aria-expanded={!sidebarCollapsed} aria-controls="sod29-desktop-navigation" aria-label={sidebarCollapsed ? "פתח את סרגל הניווט" : "סגור את סרגל הניווט"} title={sidebarCollapsed ? "פתח את סרגל הניווט" : "סגור את סרגל הניווט"}>
          <DiscoveryGateMark2029 open={!sidebarCollapsed} />
        </button>

        <aside id="sod29-desktop-navigation" className="sod29-sidebar" aria-label="ניווט SOD1820" data-rail-state={railPeek ? "peek" : sidebarCollapsed ? "slim" : "open"}
          onMouseEnter={() => peekRail(true, 180)} onMouseLeave={() => peekRail(false, 260)} onFocus={() => peekRail(true, 0)}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) peekRail(false, 0); }} onKeyDown={(event) => { if (event.key === "Escape") peekRail(false, 0); }}>
          <nav className="sod29-nav" aria-label="יעדים וכלי מחקר">
            <NavGroup title="בתים מרכזיים" items={homeNav} preserveReturnFor={preserveReturnFor} onAction={handleGlobalNavAction} />
            <NavGroup title="גילוי וכלים" items={directNav} preserveReturnFor={preserveReturnFor} onAction={handleGlobalNavAction} />
          </nav>
          <div className="sod29-rail-foot">
          <div className="sod29-rail-utilities" aria-label="פעולות נוספות">
            <button type="button" onClick={returnExact} disabled={!context?.returnTo?.href} aria-label="חזרה מדויקת" title={context?.returnTo?.label || "אין יעד חזרה שמור"}><span aria-hidden="true"><NavigationIcon2029 name="back" /></span><span className="sod29-nav-copy">חזרה מדויקת</span></button>
            <button type="button" onClick={openIssueReport} aria-label="דווח על בעיה" title="דווח על בעיה"><span aria-hidden="true"><NavigationIcon2029 name="issue" /></span><span className="sod29-nav-copy">דווח על בעיה</span></button>
          </div>
          <button className="sod29-sidebar-workspace" type="button" onClick={openWorkspace} aria-label="האזור האישי שלי" title="האזור האישי שלי"><UserAvatar2029 user={user} profile={profile} size="rail" /><span className="sod29-sidebar-workspace-copy">האזור האישי שלי</span></button>
          <button className="sod29-rail-toggle" type="button" onClick={toggleRail} aria-expanded={!sidebarCollapsed} aria-controls="sod29-desktop-navigation" aria-label={sidebarCollapsed ? "נעץ את סרגל הניווט פתוח" : "צמצם את סרגל הניווט"} title={sidebarCollapsed ? "נעץ את סרגל הניווט פתוח" : "צמצם את סרגל הניווט"}>
            <span aria-hidden="true">{sidebarCollapsed ? "›" : "‹"}</span><b>{sidebarCollapsed ? "נעץ" : "צמצם"}</b>
          </button>
          </div>
        </aside>

        <div className="sod29-main" data-royal-intro={hasRoyalIntro || undefined}>
          <div className="sod29-living-header-stack">
          <header className="sod29-header closed-orientation">
            <div className="sod29-header-leading">
              <button ref={mobileMenuRef} className="sod29-mobile-menu-trigger sod29-gate-trigger" type="button" onClick={() => navOpen ? closeMobileNav(true) : setNavOpen(true)} aria-label={navOpen ? "סגור ניווט" : "פתח ניווט"} aria-expanded={navOpen} aria-controls="sod29-mobile-navigation">
                <DiscoveryGateMark2029 open={navOpen} />
              </button>
              <div className="sod29-orientation" aria-label="איפה אני" title={title || BRAND_LOCKUP_2029.alt}>
                <span>SOD1820</span><i>/</i><b>{title || BRAND_LOCKUP_2029.alt}</b>
                {pageContext?.subject ? <span className="sod29-orientation-context"><i>/</i><span className="sod29-context-name">{contextDisplayTitle(pageContext) || "ההקשר הנוכחי"}</span></span> : null}
                {activeUnitScope ? <span className="sod29-orientation-unit" data-active-unit={activeUnitScope.id}><i>/</i><span className="sod29-orientation-unit-name">{activeUnitScope.label}</span>
                  <button type="button" className="sod29-orientation-back" onClick={backToPostScope} aria-label="חזרה להיקף הפוסט כולו">← כל הפוסט</button></span> : null}
              </div>
              <i className="sod29-header-rail" aria-hidden="true" />
            </div>
            <Link to="/2029" state={{ sodEntryArrival: "internal" }} className="sod29-header-crown" onClick={() => preserveReturnFor("/2029")} aria-label="SOD1820 · בית">
              <svg className="sod29-crown-dip" viewBox="0 0 320 64" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                <path className="dip-line" d="M0 0C44 0 70 62 160 62S276 0 320 0" />
              </svg>
              <img
                src={BRAND_LOCKUP_NAV_2029.src}
                width={BRAND_LOCKUP_NAV_2029.width}
                height={BRAND_LOCKUP_NAV_2029.height}
                alt=""
                decoding="async"
                draggable="false"
                data-brand-asset-state={BRAND_LOCKUP_NAV_2029.state}
              />
            </Link>
            <div className="sod29-header-end">
            <i className="sod29-header-rail" aria-hidden="true" />
            <button className="sod29-header-search" type="button" onClick={openSiteSearch} aria-label="חיפוש באתר" aria-haspopup="dialog" aria-expanded={transientKind === TRANSIENT.SEARCH}>
              <span className="sod29-search-mobile-icon" aria-hidden="true">⌕</span>
              <span className="sod29-search-pill-icon" aria-hidden="true">⌕</span>
              <span className="label">חיפוש</span>
              <kbd>⌘K</kbd>
            </button>
            <div className="sod29-header-actions">
              <button className="sod29-header-return" type="button" onClick={returnExact} disabled={!context?.returnTo?.href} aria-label="חזרה מדויקת" title={context?.returnTo?.label || "אין יעד חזרה שמור"}><span aria-hidden="true"><NavigationIcon2029 name="back" /></span><span className="return-label"> חזרה מדויקת</span></button>
              <button type="button" className="sod29-header-issue" onClick={openIssueReport} aria-label="דווח על בעיה"><span aria-hidden="true"><NavigationIcon2029 name="issue" /></span><span className="issue-label"> דווח על בעיה</span></button>
              <ThemePresetControl2029 compact header />
              <button type="button" className={`sod29-header-workspace${user ? "" : " is-signed-out"}`} onClick={openWorkspace} aria-label={user ? "האזור האישי שלי" : "התחברות לאזור האישי"} title={user ? "האזור האישי שלי" : "התחברות או הרשמה"}><UserAvatar2029 user={user} profile={profile} size="header" /><span className="workspace-label">{user ? accountShortName(user, profile) : "התחברות"}</span></button>
            </div>
            </div>
          </header>
          {LIVING_RIBBON_VISIBLE_2029 ? <React.Suspense fallback={null}><GlobalLivingRibbon2029 /></React.Suspense> : null}
          </div>

          {(resolvedIntroVariant === "none" || !(eyebrow || title || description)) && orientation.mode !== "hidden" && orientation.manifest ? (() => {
            const mark = <LearnMark2029
              scope={LEARN_SCOPE.SURFACE}
              label={orientationCopy?.label || orientation.manifest.label}
              compact={orientation.mode === "compact"}
              prominent={orientation.mode === "prominent"}
              onOpen={expandOrientation}
              onDismiss={orientation.mode === "prominent" ? dismissOrientation : null}
            >
              <p>{orientationCopy?.body || orientation.manifest.body}</p>
              <p><strong>{experience.experience.question}</strong></p>
            </LearnMark2029>;
            return orientationHost && surface === "post"
              ? createPortal(<span className="sod29-entry-orientation-slot is-in-header">{mark}</span>, orientationHost)
              : <div className="sod29-entry-orientation-slot">{mark}</div>;
          })() : null}

          {user?.id ? <React.Suspense fallback={null}><AccountLinkOffer2029 /></React.Suspense> : null}
          <div className={`sod29-main-stage${showContextRail ? ` has-context-rail${numberPageRoute ? " number-context-only" : ""}` : ""}`}>
            <main className={`sod29-content${wide ? " wide" : ""}`}>
              {hasRoyalIntro ? (
                <section className="sod29-page-intro r29 r29-hall" data-intro-variant={resolvedIntroVariant}>
                  {!introHelpOpened ? introHelpTrigger : <React.Suspense fallback={introHelpTrigger}><RoyalIntro2029 key={currentHref} initialOpen surface={surface} title={title} description={description} orientationCopy={orientationCopy} /></React.Suspense>}
                  <div className="sod29-hero-visual" aria-hidden="true"><span className="sod29-hero-symbol r29-medal">{React.isValidElement(symbol) ? symbol : <NavigationIcon2029 name={introIcon || "home"} />}</span></div>
                  <div className="sod29-hero-copy">
                    {eyebrow && eyebrow !== title ? <div className="sod29-eyebrow">{eyebrow}</div> : null}
                    {title ? <h1 style={{ fontFamily: TYPEFACE.display }}>{title}</h1> : null}
                    {description ? <p>{description}</p> : null}
                    <IntroResearchContext2029 context={pageContext || {}} currentHref={currentHref} pageTitle={currentLabel} onReturnExact={returnExact} />
                  </div>
                </section>
              ) : null}
              {surface === "world" ? selectedRoyal("card") : null}
              {children}
            </main>
            {showContextRail ? <SurfaceContextRail2029
              surface={surface}
              context={pageContext}
              onFollowConnection={followContextConnection}
              focus={surfaceFocus || activeTarget}
              onOpenNumber={(target) => openNumber(target || activeTarget)}
              onAskRaziel={razielLocked ? null : () => openRaziel(surfaceFocus?.readingFocus ? { readingFocus: surfaceFocus.readingFocus } : null)}
              onOpenContext={() => openInspect(surfaceFocus || activeTarget)}
              onOpenSheet={() => openTransient(TRANSIENT.CONTEXT)}
              onNeedHelp={openIssueReport}
              suppressLearn={Boolean(transientKind)}
            /> : null}
          </div>
          <React.Suspense fallback={null}><Footer2029 /></React.Suspense>
        </div>

        {navOpen ? <>
          <div className="sod29-mobile-drawer-backdrop" onMouseDown={() => closeMobileNav(true)} />
          <aside
            id="sod29-mobile-navigation"
            className="sod29-mobile-drawer"
            ref={navRef}
            role="dialog"
            aria-modal="true"
            aria-label="ניווט SOD1820"
            tabIndex={-1}
          >
            <div className="sod29-mobile-drawer-head">
              <div className="sod29-mobile-drawer-identity"><small>SOD1820</small><strong>{title || "2029"}</strong></div>
              <button className="sod29-mobile-close" data-autofocus type="button" onClick={() => closeMobileNav(true)} aria-label="סגור ניווט">
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <PreviewTransportDisclosure2029 />
            <NavGroup title="בתים מרכזיים" items={homeNav} preserveReturnFor={preserveReturnFor} onNavigate={() => closeMobileNav(false)} onAction={handleGlobalNavAction} />
            <NavGroup title="גילוי וכלים" items={directNav} preserveReturnFor={preserveReturnFor} onNavigate={() => closeMobileNav(false)} onAction={handleGlobalNavAction} />
            <section className="sod29-mobile-theme-section" aria-label="בחירת מראה">
              <small>מראה</small>
              <ThemePresetControl2029 />
            </section>
            <div className="sod29-mobile-drawer-utilities" aria-label="פעולות כלליות">
              <button className="sod29-sidebar-workspace" type="button" disabled={!context?.returnTo?.href} onClick={() => { closeMobileNav(false); returnExact(); }}><span className="sod29-nav-icon"><NavigationIcon2029 name="back" /></span><span>חזרה מדויקת</span></button>
              <button className="sod29-sidebar-workspace" type="button" onClick={() => { closeMobileNav(false); openWorkspace(); }}><UserAvatar2029 user={user} profile={profile} size="rail" /><span>האזור האישי שלי</span></button>
              <button className="sod29-sidebar-workspace" type="button" onClick={() => { closeMobileNav(false); openIssueReport(); }}><span className="sod29-nav-icon"><NavigationIcon2029 name="issue" /></span><span>דווח על בעיה</span></button>
            </div>
          </aside>
        </> : null}

        {ephemeralSelection && !unifiedGlobalDock ? <button className="sod29-selection-cue" type="button" onClick={() => openAction(ephemeralSelection)}><small>בחרת</small><strong>{ephemeralSelection.label}</strong><span>פעולה</span></button> : null}

        {unifiedGlobalDock ? <div className="sod29-command-island is-unified-bar is-single-command-bar" role="toolbar" aria-label="מסלול המחקר והפעולות הזמינות עכשיו" data-raziel-anchor="center" data-command-mode="global" data-bar-expansion={barExpansion || undefined}>
          {hasActivity && !barExpansion ? <React.Suspense fallback={null}><ResearchActivity2029 task={researchTask} lab={LAB_SIMULATED_RESEARCH} onOpen={openActivity} /></React.Suspense> : null}
          <button type="button" className="sod29-dock-here" disabled={contextLocked} title={contextLocked ? "כאן בבנייה · למנהל בלבד" : "כאן בבנייה · גישת מנהל"} onClick={() => openTransient(TRANSIENT.CONTEXT)} aria-expanded={barExpansion === "here"} aria-label={contextLocked ? "כאן · בבנייה · למנהל בלבד" : readingProgress ? `כאן · מפת העמוד: חלק ${readingProgress.index} מתוך ${readingProgress.total}` : "כאן · מפת העמוד וההקשר"} aria-haspopup="dialog" aria-expanded={transientKind === TRANSIENT.CONTEXT} data-reading-progress={readingProgress ? `${readingProgress.index}/${readingProgress.total}` : undefined}>
            <NavigationIcon2029 name="layers" /><small>כאן</small><span className="sod29-construction-badge" aria-hidden="true">בבנייה</span>
            {!contextLocked && readingProgress ? <span className="sod29-dock-progress" aria-hidden="true">{readingProgress.ids.map((id,i) => <i key={id} className={i < readingProgress.index ? "is-read" : ""} />)}</span> : null}
          </button>
          {/* ZURIEL 19.11.2026 (preview of the one expanding bar): "שיתוף" takes the gimatria place; gimatria is a direct tile in "עוד". */}
          <button type="button" className="sod29-dock-share" onClick={openShare} aria-label="שיתוף · מה מוצג כאן" aria-haspopup="dialog"
            aria-expanded={barExpansion === "share"}><NavigationIcon2029 name="share" /><small>שיתוף</small></button>
          <RazielOrb compact active={!razielLocked && transientKind === TRANSIENT.RAZIEL} onClick={openRaziel} locked={razielLocked} />
          <button type="button" onClick={research.elsResearchOperation?.task ? openWorkspace : openAttention} aria-label={research.elsResearchOperation?.task ? `עכשיו · ${research.elsResearchOperation.task.status === "RUNNING" ? "סורק" : "תוצאות"}` : feed.newCount > 0 ? `עכשיו · ${feed.newCount} חדשים` : "עכשיו"} aria-haspopup="dialog" aria-expanded={transientKind === (research.elsResearchOperation?.task ? TRANSIENT.WORKSPACE : TRANSIENT.ATTENTION)}><NavigationIcon2029 name="now" /><small>{research.elsResearchOperation?.task ? research.elsResearchOperation.task.status === "RUNNING" ? "סורק" : "תוצאות" : "עכשיו"}</small>{feed.newCount > 0 ? <span className="sod29-dock-unread" aria-hidden="true">{feed.newCount}</span> : null}</button>
          <button type="button" onClick={openMore} title="עוד · פעולות, כלים, חיפוש ואזור אישי" aria-label="עוד · פעולות, כלים, חיפוש ואזור אישי" aria-haspopup="dialog" aria-expanded={barExpansion === "more"}><NavigationIcon2029 name="tools" /><small>עוד</small></button>
        </div> : <div className="sod29-command-island is-unified-bar" role="toolbar" aria-label="מסלול המחקר והפעולות הזמינות עכשיו" data-raziel-anchor="center" data-command-mode="tool" data-tool-owner={activeToolDock?.surface}>
          {hasActivity && !barExpansion ? <React.Suspense fallback={null}><ResearchActivity2029 task={researchTask} lab={LAB_SIMULATED_RESEARCH} onOpen={openActivity} /></React.Suspense> : null}
          <div className="sod29-bar-zone is-context"><SystemToolDockActions2029 actions={activeToolDock.actions.slice(0, 2)} onInvoke={(action, trigger) => { setTransient(null); action.onSelect(trigger); }} /></div>
          <RazielOrb compact active={!razielLocked && transientKind === TRANSIENT.RAZIEL} onClick={openRaziel} locked={razielLocked} />
          <div className="sod29-bar-zone is-actions"><SystemToolDockActions2029 actions={activeToolDock.actions.slice(2, 4)} onInvoke={(action, trigger) => { setTransient(null); action.onSelect(trigger); }} />
            <button type="button" onClick={() => { if (research.elsResearchOperation?.task) openTransient(TRANSIENT.WORKSPACE); else { setTransient(null); setSystemDockMode(true); } }} aria-label={research.elsResearchOperation?.task ? "פתח מעקב מחקר" : "פעולות המערכת"}><NavigationIcon2029 name="tools" /><small>{research.elsResearchOperation?.task ? research.elsResearchOperation.task.status === "RUNNING" ? "סורק" : "תוצאות" : "מערכת"}</small>{feed.newCount > 0 ? <span className="sod29-dock-unread" aria-hidden="true">{feed.newCount}</span> : null}</button>
          </div>
        </div>}

        {renderTransient()}
      </div>
    </SystemToolDockContext2029.Provider>
    </SystemFeedContext2029.Provider>
    </ShellContext.Provider>
  );
  return <Palette2029Provider value={palette}>{frame}</Palette2029Provider>;
}
