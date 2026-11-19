import React, { useState, useSyncExternalStore } from "react";
import RoyalTile2029 from "./RoyalTile2029.jsx";
import ShareActions from "../ShareActions.jsx";
import RoyalRow2029 from "./RoyalRow2029.jsx";
import NavigationIcon2029 from "./NavigationIcon2029.jsx";
import "./royal2029.css";
import "./personalArea2029.css";
import { pageOwnShareTitle } from "../../lib/share.js";
import { BRAND_LOCKUP_NAV_2029 } from "../../lib/brandAssets2029.js";
import { requestInstall, subscribeInstallOffer, suppressInstallSuggestion, INSTALL_ACCEPTED_DAYS } from "../../lib/installOffer2029.js";
import { installBrowser, installManualSteps, installMenuKind } from "../../lib/installMenu2029.js";
import "./morePanel2029.css";

// «שתפו בקהילה» and the QR code: loaded with the share window only.
const ShareMore2029 = React.lazy(() => import("./ShareMore2029.jsx"));

// The body of the ONE bottom-bar "עוד" panel (SystemFrame2029 TRANSIENT.MORE), in Royal Tiles 2029. A projection over existing
// owners only: the frame's actions/tools/search/workspace openers, the existing ShareActions and installOffer2029.
// No new bar, personal centre, install system or store. Order: here → tools & search → personal → the app (wide) → share.

// REVIEW ONLY (isolated branch, until ZURIEL picks the standard): the three visual candidates can be compared by setting
// localStorage "sod2029:royal-candidate-review" to palace | grid | glass. The default is the recommended candidate. This
// switch is removed before merge; it changes presentation only.
const REVIEW_KEY = "sod2029:royal-candidate-review";
const reviewCandidate = () => { try { const v = localStorage.getItem(REVIEW_KEY); return ["palace", "grid", "glass"].includes(v) ? v : "palace"; } catch { return "palace"; } };

const getServerKind = () => null;
// Shown whenever the device can really install, and only then: the browser's own offer (it opens the browser's window), the real
// steps of this browser's menu (iPhone/iPad, Android without an offer, Samsung Internet, Firefox for Android, Chrome/Edge/Safari on a
// computer, or an in-app browser that must open the site in a browser first), or a note inside the installed app. A browser that
// cannot install gets no tile — never a dead button or an unsupported promise. The 14-day dismissal of the automatic suggestion does
// not hide this explicit entry.
export function MoreInstall2029() {
  const kind = useSyncExternalStore(subscribeInstallOffer, installMenuKind, getServerKind);
  const [outcome, setOutcome] = useState(null);
  const [steps, setSteps] = useState(false);
  if (!kind && !outcome) return null;
  const art = <img src={BRAND_LOCKUP_NAV_2029.src} alt="" width="56" height="56" />;
  const install = async () => {
    setOutcome("pending");
    const result = await requestInstall();
    if (result === "accepted") suppressInstallSuggestion(INSTALL_ACCEPTED_DAYS);
    setOutcome(result || "unavailable");
  };
  const manual = kind === "manual" || kind === "ios-manual";
  const stepsList = manual ? installManualSteps() : [];
  const browser = kind === "installed" ? null : installBrowser();
  const hint = browser === "android-inapp" ? "פתיחה בדפדפן והתקנה משם" : browser?.startsWith("desktop-") ? "התקנה כאפליקציה במחשב" : "הוספה למסך הבית";
  const status = { pending: "חלון ההתקנה של הדפדפן פתוח…", accepted: "האפליקציה הותקנה. אפשר לפתוח אותה ממסך הבית.",
    dismissed: "ההתקנה לא הושלמה. אפשר להתקין גם לפי ההוראות כאן.", unavailable: "הדפדפן לא פתח חלון התקנה. אפשר להתקין לפי ההוראות כאן." }[outcome];
  return <section className="sod29-more-section sod29-more-install sod29-royal-wide-wrap" data-more-section="install" data-install-kind={kind || "done"}
    data-install-browser={browser || undefined} aria-label="אפליקציית סוד 1820">
    {kind === "installed" ? <div className="sod29-royal-tile is-wide sod29-more-installed" data-royal-variant="wide">
      <span className="sod29-royal-tile-medal" aria-hidden="true">{art}</span>
      <span className="sod29-royal-tile-text"><strong>אפליקציית סוד 1820</strong><small>האפליקציה מותקנת במכשיר הזה.</small></span>
    </div> : null}
    {kind === "native" && outcome !== "pending" ? <RoyalTile2029 variant="wide" art={art} title="אפליקציית סוד 1820" hint={browser?.startsWith("desktop-") ? "התקנה כאפליקציה במחשב" : "פתיחה מהירה ממסך הבית"}
      action="התקנה" label="התקנה · אפליקציית סוד 1820" onClick={install} testId="install" /> : null}
    {manual && stepsList.length ? <RoyalTile2029 variant="wide" art={art} title="אפליקציית סוד 1820" hint={hint}
      action={steps ? "סגירה" : "איך מתקינים"} label={`${steps ? "סגירה" : "איך מתקינים"} · אפליקציית סוד 1820`} onClick={() => setSteps(open => !open)}
      expanded={steps} controls="sod29-more-install-steps" testId={kind === "ios-manual" ? "install-ios" : "install-manual"} /> : null}
    {status ? <p className="sod29-more-install-status" role="status">{status}</p> : null}
    {manual && steps && stepsList.length ? <ol id="sod29-more-install-steps" className="sod29-more-install-steps">
      {stepsList.map(step => <li key={step}>{step}</li>)}
    </ol> : null}
  </section>;
}

// The bar's own fields never reach ShareActions as props; everything else a page sent does.
function shareActionProps(share) {
  const { href, label, surface, disclosure: _d, note: _n, url: _url, variant: _variant, compact: _compact, ...rest } = share;
  return { ...rest, url: href, sourceSurface: share.sourceSurface || surface };
}

function shareSubjectPath(href) {
  try { const url = new URL(href); return decodeURIComponent(url.host + url.pathname).replace(/\/$/, ""); } catch { return ""; }
}

export default function MorePanel2029({ shareOnly = false, context = "", onAction, onTools, onSearch, personal, onPersonal,
  adminDestinations = [], onDestination, onNumber = null, numberLocked = false, toolDockReturn = null, share: given = null, actionsBuilding = false, toolsBuilding = false }) {
  // A page's own share item (barShare2029.js) names its link `url`; the bar's page link names it `href`.
  const share = given && { ...given, href: given.href || given.url };
  const [candidate] = useState(reviewCandidate);
  // Design V2 §14 (ZURIEL 19.11.2026, preview): the Personal Area's components (Royal 2029 layer) — centered section headings with the
  // diamond rule, the shared royal rows, royal-blue primary actions — and one ShareActions in its royal presentation.
  const heading = (id, text) => <h3 id={id} className="pa29-h is-centered"><span className="r29-rule" aria-hidden="true">◆</span>{text}<span className="r29-rule" aria-hidden="true">◆</span></h3>;
  return <div className="sod29-more pa29 r29" data-more-panel={shareOnly ? "share" : "full"} data-royal-candidate={candidate} data-r29-kind="site">
    {!shareOnly ? <>
      {context ? <p className="sod29-more-context"><small>ההקשר לפעולות</small><strong dir="auto">{context}</strong></p> : null}
      <section className="pa29-group" data-more-section="main" aria-labelledby="sod29-more-tools">
        {heading("sod29-more-tools", "כלים וחיפוש")}
        <div className="pa29-cards">
          {/* ZURIEL 19.11.2026: gimatria is a direct shortcut here (it left the bar for "שיתוף"); its own lock_number state, never "כלים". */}
          {onNumber ? <RoyalRow2029 icon="number" title="גימטריה" hint="מספר, ביטוי ושיטות חישוב" state={numberLocked ? "locked" : "live"} reason="נעולה כרגע" kind="site" onPress={onNumber} data={{ "data-royal-tile": "number" }} /> : null}
          <RoyalRow2029 icon="search" title="חיפוש" hint="בכל האתר" kind="site" onPress={onSearch} data={{ "data-royal-tile": "search" }} />
          {/* Closed · בבנייה comes from the frame's useFeatureState (site_flags), never from a local flag; the row opens the closed notice. */}
          <RoyalRow2029 icon="action" title="פעולות" hint={actionsBuilding ? "סגור · בבנייה" : context ? "על מה שמוצג כאן" : "על העמוד הזה"} kind="site" onPress={onAction} data={{ "data-royal-tile": "actions" }} />
          <RoyalRow2029 icon="tools" title="כלים" hint={toolsBuilding ? "סגור · בבנייה" : "כלי המחקר לעמוד"} kind="site" onPress={onTools} data={{ "data-royal-tile": "tools" }} />
          {toolDockReturn ? <RoyalRow2029 icon="cipher" title="חזור לכלי הצופן" hint="חזרה לכלי שהיה פתוח" kind="site" onPress={toolDockReturn} data={{ "data-royal-tile": "tool-return" }} /> : null}
        </div>
      </section>
      <section className="pa29-group" data-more-section="personal" aria-labelledby="sod29-more-me">
        {heading("sod29-more-me", "האזור האישי")}
        <div className="pa29-cards">
          <RoyalRow2029 icon="personal" title={personal?.signedIn ? "האזור שלי" : "כניסה"} hint={personal?.signedIn ? (personal.name || "שמירות ומסע אישי") : "שמירות, מחקר והמשך מהמקום שעצרתם"}
            kind="site" onPress={onPersonal} data={{ "data-royal-tile": "personal" }} />
        </div>
      </section>
      {adminDestinations.length ? <section className="pa29-group" data-more-section="admin" aria-labelledby="sod29-more-admin">
        {heading("sod29-more-admin", "בבנייה · פתוח למנהל בלבד")}
        <div className="pa29-cards">
          {adminDestinations.map(item => <RoyalRow2029 key={item.id} icon="layers" title={item.label} hint="יעד סגור לציבור" kind="site" onPress={() => onDestination(item)} data={{ "data-royal-tile": `admin-${item.id}` }} />)}
        </div>
      </section> : null}
      <MoreInstall2029 />
    </> : null}
    {/* ZURIEL 19.11.2026 (one expanding bar): sharing has its own bar button, so the full "עוד" no longer repeats it.
        The cipher tool bar reaches the same global bar through "מערכת". */}
    {!shareOnly ? null : share?.href ? <section className="sod29-more-section sod29-panel-share" data-more-section="share"
      aria-label="שיתוף העמוד" data-share-owner="ShareActions">
      {/* the panel's own title already says "שיתוף העמוד"; the subject names exactly what is shared (the words ShareActions sends) */}
      <div className="sod29-more-share-subject pa29-hall r29-hall is-feature" data-share-subject="true" data-r29-kind="site">
        <span className="r29-medal" aria-hidden="true"><NavigationIcon2029 name="share" size={20} /></span>
        <small>{share.label ? `משתפים את ${share.label}` : "משתפים את"}</small>
        <strong dir="auto">{share.title || pageOwnShareTitle(typeof window === "undefined" ? null : window.location)}</strong>
        <span dir="ltr">{shareSubjectPath(share.href)}</span>
      </div>
      {/* What a page sends (its card and "מה יישלח") folds into one line, so the share buttons stay in view (ZURIEL 19.11.2026). */}
      {(share.image && share.label) || share.disclosure?.length ? <details className="sod29-more-share-what">
        <summary>{share.image && share.label ? "מה יישלח · תמונה ופרטים" : "מה יישלח"}</summary>
        {share.image && share.label ? <img className="sod29-more-share-card" src={share.image} alt={`תמונת השיתוף של ${share.label}`} width="600" height="315" loading="lazy" decoding="async" /> : null}
        {Array.isArray(share.disclosure) && share.disclosure.length ? <dl className="sod29-more-share-sent" aria-label="מה יישלח">
          {share.disclosure.map(([key, value]) => <div key={key}><dt>{key}</dt><dd dir="auto">{value}</dd></div>)}
        </dl> : null}
      </details> : null}
      {/* A page's own share button sends its ShareActions props through the bar (barShare2029.js): same component, channels and telemetry. */}
      <ShareActions channels={["native", "whatsapp", "telegram", "facebook", "copy"]} force {...shareActionProps(share)} variant="royal" />
      {share.note ? <p className="sod29-more-share-note">{share.note}</p> : null}
      <React.Suspense fallback={null}><ShareMore2029 href={share.href} title={share.title || ""} label={share.label || ""} type={share.type || "page"} /></React.Suspense>
    </section> : <p className="sod29-more-note" data-more-section="share">אין קישור ציבורי לשיתוף מתוך העמוד האישי.</p>}
  </div>;
}
