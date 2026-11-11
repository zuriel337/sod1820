import React, { useState, useSyncExternalStore } from "react";
import RoyalTile2029, { RoyalTileGrid2029 } from "./RoyalTile2029.jsx";
import ShareActions from "../ShareActions.jsx";
import { BRAND_LOCKUP_NAV_2029 } from "../../lib/brandAssets2029.js";
import { installMenuKind, requestInstall, subscribeInstallOffer, suppressInstallSuggestion, INSTALL_ACCEPTED_DAYS } from "../../lib/installOffer2029.js";
import "./morePanel2029.css";

// The body of the ONE bottom-bar "עוד" panel (SystemFrame2029 TRANSIENT.MORE), in Royal Tiles 2029. A projection over existing
// owners only: the frame's actions/tools/search/workspace openers, the existing ShareActions and installOffer2029.
// No new bar, personal centre, install system or store. Order: here → tools & search → personal → the app (wide) → share.

// REVIEW ONLY (isolated branch, until ZURIEL picks the standard): the three visual candidates can be compared by setting
// localStorage "sod2029:royal-candidate-review" to palace | grid | glass. The default is the recommended candidate. This
// switch is removed before merge; it changes presentation only.
const REVIEW_KEY = "sod2029:royal-candidate-review";
const reviewCandidate = () => { try { const v = localStorage.getItem(REVIEW_KEY); return ["palace", "grid", "glass"].includes(v) ? v : "palace"; } catch { return "palace"; } };

const getServerKind = () => null;
// Shown only when the device can really install: the browser's own offer (Android), the manual steps (iOS), or a note inside
// the installed app. Desktop and browsers without an offer get no tile — never a dead button or an unsupported promise.
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
  const status = { pending: "חלון ההתקנה של הדפדפן פתוח…", accepted: "האפליקציה הותקנה. אפשר לפתוח אותה ממסך הבית.",
    dismissed: "ההתקנה לא הושלמה. אפשר להתקין גם מתפריט הדפדפן.", unavailable: "הדפדפן לא מציע כרגע התקנה. אפשר להתקין מתפריט הדפדפן." }[outcome];
  return <section className="sod29-more-section sod29-more-install sod29-royal-wide-wrap" data-more-section="install" data-install-kind={kind || "done"} aria-label="אפליקציית סוד 1820">
    {kind === "installed" ? <div className="sod29-royal-tile is-wide sod29-more-installed" data-royal-variant="wide">
      <span className="sod29-royal-tile-medal" aria-hidden="true">{art}</span>
      <span className="sod29-royal-tile-text"><strong>אפליקציית סוד 1820</strong><small>האפליקציה מותקנת במכשיר הזה.</small></span>
    </div> : null}
    {kind === "native" && outcome !== "pending" ? <RoyalTile2029 variant="wide" art={art} title="אפליקציית סוד 1820" hint="פתיחה מהירה ממסך הבית"
      action="התקנה" onClick={install} testId="install" /> : null}
    {kind === "ios-manual" ? <RoyalTile2029 variant="wide" art={art} title="אפליקציית סוד 1820" hint="הוספה למסך הבית ב־Safari"
      action={steps ? "סגירה" : "איך מתקינים"} onClick={() => setSteps(open => !open)} expanded={steps} controls="sod29-more-install-steps" testId="install-ios" /> : null}
    {status ? <p className="sod29-more-install-status" role="status">{status}</p> : null}
    {kind === "ios-manual" && steps ? <ol id="sod29-more-install-steps" className="sod29-more-install-steps">
      <li>לחצו על כפתור השיתוף <span aria-hidden="true">⬆︎</span> בסרגל של Safari.</li>
      <li>גללו ובחרו «הוסף למסך הבית».</li>
      <li>אשרו ב«הוסף» — סוד 1820 יופיע במסך הבית.</li>
    </ol> : null}
  </section>;
}

export default function MorePanel2029({ shareOnly = false, context = "", onAction, onTools, onSearch, personal, onPersonal,
  adminDestinations = [], onDestination, toolDockReturn = null, share = null }) {
  const [candidate] = useState(reviewCandidate);
  return <div className="sod29-more" data-more-panel={shareOnly ? "share" : "full"} data-royal-candidate={candidate}>
    {!shareOnly ? <>
      {context ? <p className="sod29-more-context"><small>ההקשר לפעולות</small><strong dir="auto">{context}</strong></p> : null}
      <section className="sod29-more-section" data-more-section="main" aria-label="פעולות, כלים ואזור אישי">
        <RoyalTileGrid2029 label="פעולות, כלים ואזור אישי" columns="4">
          <RoyalTile2029 icon="action" title="פעולות" hint={context ? "על מה שמוצג כאן" : "על העמוד הזה"} onClick={onAction} testId="actions" />
          <RoyalTile2029 icon="search" title="חיפוש" hint="בכל האתר" onClick={onSearch} testId="search" />
          <RoyalTile2029 icon="tools" title="כלים" hint="כלי המחקר לעמוד" onClick={onTools} testId="tools" />
          <RoyalTile2029 icon="personal" art={personal?.avatar || null} title={personal?.signedIn ? "האזור שלי" : "כניסה"}
            hint={personal?.signedIn ? (personal.name || "שמירות ומסע אישי") : "לאזור האישי"} onClick={onPersonal} testId="personal" />
          {toolDockReturn ? <RoyalTile2029 icon="cipher" title="כלי הצופן" hint="חזרה לכלי שהיה פתוח" onClick={toolDockReturn} testId="tool-return" /> : null}
        </RoyalTileGrid2029>
      </section>
      {adminDestinations.length ? <section className="sod29-more-section" data-more-section="admin" aria-labelledby="sod29-more-admin">
        <h3 id="sod29-more-admin">בבנייה · פתוח למנהל בלבד</h3>
        <RoyalTileGrid2029 label="בבנייה · פתוח למנהל בלבד" columns="2">
          {adminDestinations.map(item => <RoyalTile2029 key={item.id} variant="compact" icon="layers" title={item.label} onClick={() => onDestination(item)} testId={`admin-${item.id}`} />)}
        </RoyalTileGrid2029>
      </section> : null}
      <MoreInstall2029 />
    </> : null}
    {share?.href ? <section className="sod29-more-section sod29-panel-share" data-more-section="share" aria-labelledby="sod29-more-share" data-share-owner="ShareActions">
      <h3 id="sod29-more-share">שיתוף העמוד</h3>
      <ShareActions type={share.type} url={share.href} title={share.title} sourceSurface={share.surface} channels={["native", "whatsapp", "telegram", "facebook", "copy"]} style={{ flexWrap: "wrap", overflowX: "visible" }} force />
    </section> : <p className="sod29-more-note" data-more-section="share">אין קישור ציבורי לשיתוף מתוך העמוד האישי.</p>}
  </div>;
}
