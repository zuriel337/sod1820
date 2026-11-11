import React, { useState, useSyncExternalStore } from "react";
import IconTile2029 from "./IconTile2029.jsx";
import ShareActions from "../ShareActions.jsx";
import { installMenuKind, requestInstall, subscribeInstallOffer, suppressInstallSuggestion, INSTALL_ACCEPTED_DAYS } from "../../lib/installOffer2029.js";
import "./morePanel2029.css";

// The body of the ONE bottom-bar "עוד" panel (SystemFrame2029 TRANSIENT.MORE). A projection over existing owners only: the frame's
// actions/tools/search/workspace openers, the existing ShareActions and installOffer2029. No new bar, personal centre, install system,
// store, tile family, icon or colour. It is built from the frame's existing pieces:
//   • the panel card of the same frame (sod29-workspace-mini-card / -home-card, myWorkspace2029.css) — here laid out as squares;
//   • the shared decorative icon tile IconTile2029, whose colours come only from the shared treatment resolver (paletteTokens2029);
//   • NavigationIcon2029 glyphs that already exist, UserAvatar2029 for the signed-in person, sod29-action buttons.
// Order: the context → actions, search, tools, personal → admin-only destinations → the app (only when installable) → share.

function MoreTile2029({ icon, art = null, title, hint = "", status = "", locked = false, lockTitle = "", onClick, testId }) {
  const hintId = hint ? `sod29-more-hint-${testId}` : undefined;
  return <button type="button" className={`sod29-workspace-mini-card sod29-more-tile ${locked ? "is-building" : "is-live"}`} data-more-tile={testId}
    onClick={locked ? undefined : onClick} disabled={locked} aria-describedby={hintId} title={lockTitle || undefined}>
    {art ? <span className="sod29-more-tile-person" aria-hidden="true">{art}</span>
      : <IconTile2029 name={icon} purpose="ordinary" state={locked ? "unavailable" : "active"} tile={48} size={24} />}
    <strong>{title}</strong>
    {hint ? <small id={hintId}>{hint}</small> : null}
    {status ? <b>{status}</b> : null}
  </button>;
}

const getServerKind = () => null;
// Shown only when the device can really install: the browser's own offer (Android), the manual steps (iOS), or a note inside
// the installed app. Desktop and browsers without an offer get nothing — never a dead button or an unsupported promise.
// The one bounded identity moment of the panel: the shared "identity" treatment (Crown sapphire/gold through the resolver).
export function MoreInstall2029() {
  const kind = useSyncExternalStore(subscribeInstallOffer, installMenuKind, getServerKind);
  const [outcome, setOutcome] = useState(null);
  const [steps, setSteps] = useState(false);
  if (!kind && !outcome) return null;
  const install = async () => {
    setOutcome("pending");
    const result = await requestInstall();
    if (result === "accepted") suppressInstallSuggestion(INSTALL_ACCEPTED_DAYS);
    setOutcome(result || "unavailable");
  };
  const status = { pending: "חלון ההתקנה של הדפדפן פתוח…", accepted: "האפליקציה הותקנה. אפשר לפתוח אותה ממסך הבית.",
    dismissed: "ההתקנה לא הושלמה. אפשר להתקין גם מתפריט הדפדפן.", unavailable: "הדפדפן לא מציע כרגע התקנה. אפשר להתקין מתפריט הדפדפן." }[outcome];
  const hint = kind === "installed" ? "האפליקציה מותקנת במכשיר הזה." : kind === "ios-manual" ? "הוספה למסך הבית ב־Safari" : "פתיחה מהירה ממסך הבית";
  return <section className="sod29-more-install" data-more-section="install" data-install-kind={kind || "done"} aria-label="אפליקציית סוד 1820">
    <div className="sod29-workspace-home-card sod29-more-app">
      <IconTile2029 name="add" purpose="identity" state={kind === "installed" ? "disabled" : "active"} tile={48} size={24} />
      <span><strong>אפליקציית סוד 1820</strong><small>{hint}</small></span>
      {kind === "native" && outcome !== "pending" ? <button className="sod29-action primary" type="button" onClick={install}>התקנה</button> : null}
      {kind === "ios-manual" ? <button className="sod29-action" type="button" onClick={() => setSteps(open => !open)} aria-expanded={steps}
        aria-controls="sod29-more-install-steps">{steps ? "סגירה" : "איך מתקינים"}</button> : null}
    </div>
    {status ? <p className="sod29-more-install-status" role="status">{status}</p> : null}
    {kind === "ios-manual" && steps ? <ol id="sod29-more-install-steps" className="sod29-more-install-steps">
      <li>לחצו על כפתור השיתוף בסרגל של Safari.</li>
      <li>גללו ובחרו «הוסף למסך הבית».</li>
      <li>אשרו ב«הוסף» — סוד 1820 יופיע במסך הבית.</li>
    </ol> : null}
  </section>;
}

export default function MorePanel2029({ shareOnly = false, context = "", onAction, onTools, onSearch, personal, onPersonal, toolsLocked = true,
  adminDestinations = [], onDestination, toolDockReturn = null, share = null }) {
  return <div className="sod29-more" data-more-panel={shareOnly ? "share" : "full"}>
    {!shareOnly ? <>
      {context ? <div className="sod29-selection-summary"><span>ההקשר לפעולות</span><strong dir="auto">{context}</strong></div> : null}
      <div className="sod29-more-tiles" role="group" aria-label="פעולות, חיפוש, כלים ואזור אישי">
        <MoreTile2029 icon="action" title="פעולות" hint={context ? "על מה שמוצג כאן" : "על העמוד הזה"} onClick={onAction} testId="actions" />
        <MoreTile2029 icon="search" title="חיפוש" hint="בכל האתר" onClick={onSearch} testId="search" />
        {/* Tools are under construction (ZURIEL 11.11.2026): closed to everyone but the administrator, the same way as "כאן". */}
        <MoreTile2029 icon="tools" title="כלים" hint="כלי המחקר לעמוד" status="בבנייה" locked={toolsLocked}
          lockTitle={toolsLocked ? "כלים בבנייה · למנהל בלבד" : "כלים בבנייה · גישת מנהל"} onClick={onTools} testId="tools" />
        <MoreTile2029 icon="personal" art={personal?.avatar || null} title={personal?.signedIn ? "האזור שלי" : "כניסה"}
          hint={personal?.signedIn ? (personal.name || "שמירות ומסע אישי") : "לאזור האישי"} onClick={onPersonal} testId="personal" />
      </div>
      {toolDockReturn ? <button className="sod29-action" type="button" onClick={toolDockReturn}>חזור לכלי הצופן</button> : null}
      {adminDestinations.length ? <section className="sod29-panel-admin-open" aria-label="פתוח למנהל בלבד" data-admin-open-destinations="true" data-more-section="admin">
        <h3>בבנייה · פתוח למנהל בלבד</h3>
        <div className="sod29-panel-actions-grid">
          {adminDestinations.map(item => <button key={item.id} className="sod29-action" type="button" onClick={() => onDestination(item)}>{item.label}</button>)}
        </div>
      </section> : null}
      <MoreInstall2029 />
    </> : null}
    {share?.href ? <section className="sod29-panel-share" aria-label="שיתוף העמוד" data-share-owner="ShareActions" data-more-section="share">
      <h3>שיתוף</h3>
      <ShareActions type={share.type} url={share.href} title={share.title} sourceSurface={share.surface} channels={["native", "whatsapp", "telegram", "facebook", "copy"]} style={{ flexWrap: "wrap", overflowX: "visible" }} force />
    </section> : <p className="sod29-more-note" data-more-section="share">אין קישור ציבורי לשיתוף מתוך העמוד האישי.</p>}
  </div>;
}
