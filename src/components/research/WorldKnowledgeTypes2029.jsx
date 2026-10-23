import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import CanonicalMediaFigure2029 from "../experience2029/CanonicalMediaFigure2029.jsx";
import ConstantDiagram2029 from "./ConstantDiagram2029.jsx";
import SpatialDiagram2029 from "./SpatialDiagram2029.jsx";
import { getMatrixLibraryPage } from "../../lib/elsMatrices.js";
import { fetchCurationCatalog2029 } from "../../lib/research/curationProjection2029.js";
import { fetchPublicWorldMediaPage } from "../../lib/research/entityHubProjection.js";
import { fetchExplorerFacetPage } from "../../lib/research/explorerFacets.js";
import { WORLD_KNOWLEDGE_KIND } from "../../lib/research/worldLandingNavigation.js";

export const WORLD_KNOWLEDGE_OPTIONS = Object.freeze([
  { key: WORLD_KNOWLEDGE_KIND.NUMBERS, label: "מספרים ומילים", description: "מספרים, מילים וביטויים" },
  { key: WORLD_KNOWLEDGE_KIND.LANGUAGES, label: "שפות וגשרים", description: "עברית, מילים לועזיות וקשרים מאושרים" },
  { key: WORLD_KNOWLEDGE_KIND.CIPHERS, label: "צפנים", description: "צפני ELS שפורסמו" },
  { key: WORLD_KNOWLEDGE_KIND.MEDIA, label: "תמונות ומדיה", description: "חומר חזותי ציבורי ומקורו" },
  { key: WORLD_KNOWLEDGE_KIND.TIME, label: "אירועים וזמן", description: "אירועים ושנים כצמתי ידע" },
  { key: WORLD_KNOWLEDGE_KIND.BOOKS, label: "ספרים ומקורות", description: "זהויות ספר ומקורות פעילים" },
  { key: WORLD_KNOWLEDGE_KIND.SPATIAL, label: "מבנים מרחביים", description: "גימטריה, מבנה וצורה — בשכבות נפרדות" },
]);

const FACETS = Object.freeze({
  [WORLD_KNOWLEDGE_KIND.NUMBERS]: [
    {
      key: "number",
      label: "נוספו לאחרונה",
      description: "המספרים הפעילים החדשים ביותר בעולם, לפי מועד הוספתם.",
    },
    { key: "word", label: "מילים" },
    { key: "phrase", label: "ביטויים" },
  ],
  [WORLD_KNOWLEDGE_KIND.LANGUAGES]: [
    { key: "language_bridge", label: "גשרי שפה" },
    { key: "foreign_word", label: "מילים לועזיות" },
  ],
  [WORLD_KNOWLEDGE_KIND.TIME]: [
    { key: "event", label: "אירועים" },
    { key: "year", label: "שנים" },
  ],
  [WORLD_KNOWLEDGE_KIND.BOOKS]: [{ key: "book", label: "ספרים" }],
});
const KIND_REQUEST_CACHE = new Map();
const SpatialStructure3D = React.lazy(() => import("./SpatialStructure3D.jsx"));
const SPATIAL_PAGE_SIZE = 6;
const SEQUENCES_LESSON_HREF = "/beit-midrash?section=numbers&concept=sequences#number-concept-sequences";

function publicationStateLabel(value) {
  if (value === "approved") return "מאושר";
  if (value === "candidate") return "מועמד";
  if (value === "published") return "פורסם";
  return value || "אין נתון";
}

function cardHref(card) {
  return card.facet === "number" ? `/2029/number/${encodeURIComponent(card.refId)}` : card.href;
}

function selectedNumberCard(item) {
  return {
    id: item.id,
    facet: "number",
    label: item.label,
    sub: item.reason,
    refId: item.value ?? item.label,
    kicker: item.kind === "crown_anchor" ? "עוגן כתר" : "עוגן זהב",
  };
}

async function fetchKind(kind, { isAdmin = false } = {}) {
  if (kind === WORLD_KNOWLEDGE_KIND.SPATIAL) {
    const { fetchZviSpatialWorldProjection } = await import("../../lib/research/zviSpatialWorldProjection.js");
    const spatial = await fetchZviSpatialWorldProjection({ includeAdmin: isAdmin });
    return { sections: [], ciphers: [], media: [], spatial, hasMore: false };
  }
  if (kind === WORLD_KNOWLEDGE_KIND.CIPHERS) {
    const page = await getMatrixLibraryPage({ view: "public", pageSize: 12 });
    return { sections: [], ciphers: page.rows || [], media: [], hasMore: Boolean(page.more) };
  }
  if (kind === WORLD_KNOWLEDGE_KIND.MEDIA) {
    const page = await fetchPublicWorldMediaPage({ limit: 12 });
    return { sections: [], ciphers: [], media: page.items || [], hasMore: Boolean(page.hasMore), access: page.access };
  }
  const specs = FACETS[kind] || FACETS[WORLD_KNOWLEDGE_KIND.NUMBERS];
  const [pages, curationCatalog, multiValue, constants] = await Promise.all([
    Promise.all(specs.map(async (spec) => ({
      ...spec,
      page: await fetchExplorerFacetPage(spec.key, { limit: 8 }),
    }))),
    kind === WORLD_KNOWLEDGE_KIND.NUMBERS ? fetchCurationCatalog2029() : Promise.resolve(null),
    kind === WORLD_KNOWLEDGE_KIND.NUMBERS
      ? import("../../lib/research/zviMultiValueWorldProjection.js").then(({ fetchZviMultiValueWorldProjection }) => fetchZviMultiValueWorldProjection())
      : Promise.resolve(null),
    kind === WORLD_KNOWLEDGE_KIND.NUMBERS
      ? import("../../lib/research/zviConstantsWorldProjection.js").then(({ fetchZviConstantsWorldProjection }) => fetchZviConstantsWorldProjection({ includeAdmin: isAdmin }))
      : Promise.resolve(null),
  ]);
  const sections = pages.map(({ key, label, description, page }) => ({
    key,
    label,
    description: description || null,
    cards: page?.cards || [],
    hasMore: Boolean(page?.hasMore),
  }));
  if (kind === WORLD_KNOWLEDGE_KIND.NUMBERS) {
    sections.unshift({
      key: "selected-numbers",
      label: "מספרים נבחרים",
      description: "עוגני כתר וזהב פעילים שנבחרו בשער האנושי. הבחירה היא אוצרות, לא ציון אמת.",
      cards: (curationCatalog?.anchors || []).slice(0, 8).map(selectedNumberCard),
      hasMore: (curationCatalog?.anchors || []).length > 8,
    });
  }
  return {
    sections,
    ciphers: [],
    media: [],
    multiValue,
    constants,
    hasMore: pages.some(({ page }) => page?.hasMore),
  };
}

function ZviMultiValueShelf({ projection }) {
  if (projection?.access?.available === false) {
    return <section className="sod29-world-kind-section" aria-label="ממצאי צבי רב ערכיים">
      <header><div><h3>{projection.title}</h3><p>{projection.description}</p></div></header>
      <p role="status">האשכולות הציבוריים אינם זמינים כרגע. זה אינו אומר שאין כאלה.</p>
    </section>;
  }
  return <section className="sod29-world-kind-section sod29-world-multi-value-shelf" aria-label="ממצאי צבי רב ערכיים">
    <header><div><h3>{projection.title}</h3><p>{projection.description}</p></div>
      <span>{projection.counts.findings} ממצאים · {projection.counts.exactSourceOccurrences} הופעות מקור</span></header>
    <p className="sod29-world-spatial-rule">הופעה היא מיקום מדויק בקורפוס, לא מקור עצמאי נוסף. הרשומות נשארות חזקות, אך מסומנות לבדיקה עד לפיצול או ליצירת יעד מבוסס.</p>
    <div className="sod29-world-kind-card-grid">{projection.cards.map((card) => <article key={card.id} className="sod29-world-kind-card sod29-world-multi-value-card">
      <small>מיקום בדוח #{card.rank} · חוזק: {card.review.connectionStrength} · {card.review.recommendation}</small>
      <strong>{card.title}</strong>
      <p>{card.statement}</p>
      <div className="sod29-world-spatial-status" aria-label="מצב הממצא">
        <span>ראיות: {card.review.evidenceQuality}</span>
        <span>סטטוס רשומה: {publicationStateLabel(card.review.publicationState)}</span>
        <span>גישה: ציבורי</span>
        <span>מקורות עצמאיים: אין נתון</span>
      </div>
      <p><b>למה עדיין לא חובר:</b> {card.review.reason}</p>
      <div className="sod29-actions">
        {card.targets.map((target) => <Link key={target.value} className="sod29-action" to={target.href}>לערך {target.value}</Link>)}
        {card.values.filter((value) => !card.targets.some((target) => target.value === value)).map((value) => <span key={value} className="sod29-action" aria-disabled="true">{value} · יעד חסר</span>)}
        <Link className="sod29-action primary" to={card.source.href}>להופעת המקור בספריית צבי</Link>
      </div>
      <details><summary>מזהה ומיקום מדויק</summary><p><code dir="ltr">{card.id}</code></p><p><code dir="ltr">{card.source.ref}</code></p></details>
    </article>)}</div>
  </section>;
}

function formatConstant(value, digits = 12) {
  return Number.isFinite(value) ? Number(value).toPrecision(digits).replace(/0+$/, "").replace(/\.$/, "") : "אין נתון";
}

function ConstantVisualDeck({ card, priority = false }) {
  const [layer, setLayer] = useState("diagram");
  return <div className="sod29-world-constant-visual" data-layer={layer}>
    <nav className="sod29-world-spatial-visual-tabs" aria-label={`שכבות חזותיות: ${card.title}`}>
      <button type="button" aria-pressed={layer === "diagram"} onClick={() => setLayer("diagram")}>חישוב</button>
      {card.image ? <button type="button" aria-pressed={layer === "source"} onClick={() => setLayer("source")}>מקור</button> : null}
    </nav>
    {layer === "diagram" ? <ConstantDiagram2029
      diagramKind={card.diagramKind}
      title={card.title}
      expression={card.expression}
      actual={card.verification.actual}
      comparison={card.verification.comparison}
      absoluteError={card.verification.absoluteError}
      relation={card.verification.relation}
    /> : null}
    {layer === "source" && card.image ? <figure className="sod29-world-spatial-source-image">
      <img src={card.image} width="640" height="360" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" alt={`תמונת המקור: ${card.title}`} />
      <figcaption><span>תמונת מקור</span><small>ראיה חזותית מן הקורפוס</small></figcaption>
    </figure> : null}
  </div>;
}

function ConstantReadingGuide() {
  return <aside className="sod29-world-constant-guide" aria-labelledby="constant-reading-guide-title">
    <header><div><small>איך קוראים את זה?</small><h4 id="constant-reading-guide-title">ארבעה דברים שכדאי לדעת לפני שמתחילים</h4></div>
      <Link className="sod29-action" to={SEQUENCES_LESSON_HREF}>לשיעור המלא בבית המדרש</Link></header>
    <dl>
      <div><dt>קבוע</dt><dd>מספר מוגדר כמו π או e. הוא אינו גימטריה ואינו פירוש.</dd></div>
      <div><dt>רצף</dt><dd>סדרה שבה גם המיקום והכלל חשובים; הופעה ברצף אינה יוצרת משמעות לבדה.</dd></div>
      <div><dt>≈</dt><dd>קרוב, אבל לא שווה. הספרות והפער חייבים להישאר גלויים.</dd></div>
      <div><dt>מאומת</dt><dd>החישוב חזר נכון במנוע. הקישור הרעיוני נבדק ומדורג בנפרד.</dd></div>
    </dl>
  </aside>;
}

function ConstantAdminQueue({ rows = [], access }) {
  return <section className="sod29-world-constant-admin-queue" aria-label="תור קידום קבועים למנהל">
    <header><div><small>למנהל בלבד</small><h4>מה אפשר לקדם ומה נשאר לבדיקה</h4>
      <p>המלצה אינה שינוי סטטוס. החישוב, ניסוח המקור והפרשנות נבדקים בשלושה מסלולים נפרדים.</p></div><span>{access === "unavailable" ? "התור אינו זמין" : `${rows.length} אשכולות`}</span></header>
    {access === "unavailable" ? <p role="status">הקורא המנהלי לא החזיר נתונים. אין להסיק שאין מועמדים.</p> : null}
    {access !== "unavailable" && !rows.length ? <p className="sod29-muted">אין כרגע מועמדים זמינים דרך הקורא המורשה.</p> : null}
    <div className="sod29-world-constant-admin-grid">{rows.map((row) => <article key={row.id} className="sod29-world-constant-admin-card" data-promotion-state={row.promotionState}>
      <small>{row.promotionState === "hold" ? "עצירה לבדיקה" : "מועמד לקידום כחישוב בלבד"}</small>
      <strong>{row.title}</strong>
      <p className="sod29-world-constant-expression" dir="ltr">{row.expression} = {formatConstant(row.actual)}</p>
      <dl>
        <div><dt>טענת המקור</dt><dd dir="ltr">{row.claimedValue}</dd></div>
        <div><dt>בעיגול רגיל</dt><dd dir="ltr">{row.displayedValue}</dd></div>
        <div><dt>בדיקת החישוב</dt><dd>{row.calculationState}</dd></div>
        <div><dt>סטטוס הרשומות</dt><dd>{publicationStateLabel(row.publicationState)}</dd></div>
        <div><dt>אימות מנוע ברשומות</dt><dd>{row.engineVerifiedRows} עברו · {row.engineFailedRows} נכשלו · {Math.max(0, row.findingRows - row.engineVerifiedRows - row.engineFailedRows)} טרם דורגו</dd></div>
        <div><dt>הופעות באשכול</dt><dd>{row.occurrenceCount}{row.duplicateOccurrenceCount ? ` · ${row.duplicateOccurrenceCount} חזרות` : ""}</dd></div>
        <div><dt>מקורות עצמאיים</dt><dd>אין נתון</dd></div>
      </dl>
      <p><b>המלצה:</b> {row.recommendation}</p>
      <p><b>מה לא הוכח:</b> {row.interpretationBoundary}</p>
      <details><summary>נוסח ומיקומי המקור</summary><p>{row.statement}</p><div className="sod29-actions">{row.locators.map((locator, index) => <Link key={locator.ref} className="sod29-action" to={locator.href}>הופעה {index + 1}</Link>)}</div></details>
    </article>)}</div>
  </section>;
}

function ZviConstantsShelf({ projection, isAdmin = false }) {
  if (projection?.access?.available === false) return <section className="sod29-world-kind-section" aria-label="פאי וקבועים">
    <header><div><h3>{projection.title}</h3><p>{projection.description}</p></div></header>
    <p role="status">סדרת הקבועים הציבורית אינה זמינה כרגע. לא מוצג ערך חלופי.</p>
  </section>;
  return <section className="sod29-world-kind-section sod29-world-constants-shelf" aria-label="פאי וקבועים">
    <header><div><h3>{projection.title}</h3><p>{projection.description}</p></div><span>{projection.counts.cases} מקרים · {projection.counts.approximations} קירובים</span></header>
    <p className="sod29-world-spatial-rule">הסדרה שייכת למספרים ורצפים. קירוב אינו שוויון, וחזרה על אותו מקור אינה ראיה עצמאית. אין כאן קישור למרחבים משום שבמקרים האלה לא הוכח קשר גיאומטרי.</p>
    <ConstantReadingGuide />
    <div className="sod29-world-kind-card-grid">{projection.cards.map((card, index) => <article key={card.id} id={`constant-${card.id.split(":").pop()}`} className="sod29-world-kind-card sod29-world-constant-card">
      <small>{card.verification.label} · חוזק: {card.review.connectionStrength}</small>
      <strong dir="auto">{card.title}</strong>
      <ConstantVisualDeck card={card} priority={index === 0} />
      <p className="sod29-world-constant-expression" dir="ltr">{card.expression}</p>
      <dl><div><dt>תוצאה</dt><dd dir="ltr">{formatConstant(card.verification.actual)}</dd></div>
        <div><dt>ערך השוואה</dt><dd dir="ltr">{formatConstant(card.verification.comparison)}</dd></div>
        <div><dt>שגיאה מוחלטת</dt><dd dir="ltr">{formatConstant(card.verification.absoluteError)}</dd></div></dl>
      <div className="sod29-world-spatial-status"><span>ראיות: {card.review.evidenceQuality}</span><span>פרסום: {publicationStateLabel(card.review.publicationState)}</span><span>מקורות עצמאיים: אין נתון</span></div>
      <details><summary>טענת המקור מול האימות</summary><p>{card.statement}</p><p><b>פרשנות נפרדת:</b> {card.interpretation}</p></details>
      <div className="sod29-actions"><Link className="sod29-action primary" to={card.source.href}>להופעה המדויקת בספריית צבי</Link></div>
    </article>)}</div>
    {isAdmin ? <ConstantAdminQueue rows={projection.adminQueue || []} access={projection.access?.adminQueue} /> : null}
  </section>;
}

function SpatialVisualDeck({ card, priority = false }) {
  const has3d = card.dimension === "3d" || card.dimension === "mixed";
  const [layer, setLayer] = useState("diagram");
  return <div className="sod29-world-spatial-visual" data-layer={layer}>
    <nav className="sod29-world-spatial-visual-tabs" aria-label={`שכבות חזותיות: ${card.title}`}>
      <button type="button" aria-pressed={layer === "diagram"} onClick={() => setLayer("diagram")}>שרטוט</button>
      {card.image ? <button type="button" aria-pressed={layer === "source"} onClick={() => setLayer("source")}>מקור</button> : null}
      {has3d ? <button type="button" aria-pressed={layer === "3d"} onClick={() => setLayer("3d")}>תלת־ממד</button> : null}
    </nav>
    {layer === "diagram" ? <SpatialDiagram2029
      shapeIdentity={card.shapeIdentity} value={card.value} form={card.form} title={card.title}
      operation={card.verification.operations[0]?.expression}
    /> : null}
    {layer === "source" && card.image ? <figure className="sod29-world-spatial-source-image">
      <img src={card.image} width="640" height="360" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" alt={`תמונת המקור: ${card.title}`} />
      <figcaption><span>תמונת מקור</span><small>ראיה חזותית מן הקורפוס</small></figcaption>
    </figure> : null}
    {layer === "3d" && has3d ? <React.Suspense fallback={<p role="status" className="sod29-world-spatial-3d-state">טוען המחשה תלת־ממדית…</p>}>
      <SpatialStructure3D shapeIdentity={card.shapeIdentity} title={card.title} />
    </React.Suspense> : null}
  </div>;
}

function SpatialCard({ card, projection, isAdmin, priority = false }) {
  return <article id={`spatial-${card.slug}`} className="sod29-world-spatial-card">
    <SpatialVisualDeck card={card} priority={priority} />
    <div className="sod29-world-spatial-body">
      <header><small>{card.form} · {card.verification.operations.length} {card.verification.operations.length === 1 ? "פעולה" : "פעולות"}</small><h4>{card.title}</h4>{card.subtitle ? <p>{card.subtitle}</p> : null}</header>
      <div className="sod29-world-spatial-status" aria-label="מצב המודל">
        <span>חוזק: {card.review.connectionStrength || projection.rules.missingStrengthLabel}</span>
        <span>ראיות: {card.review.evidenceQuality}</span>
        <span>אימות: {card.review.calculationState}</span>
        <span>פרסום: {publicationStateLabel(card.review.publicationState)}</span>
        <span>מקורות עצמאיים: אין נתון</span>
      </div>
      <p className="sod29-world-spatial-ranking"><b>למה כאן:</b> {card.review.whyRanked}</p>
      <ol className="sod29-world-spatial-layers">
        <li><strong>טענת מקור</strong><span>{card.sourceClaims.join(" · ") || "אין נתון"}</span></li>
        <li><strong>חישוב</strong><span>{card.verification.gematria.map((item) => `${item.term} = ${item.actual}${item.verified ? " ✓" : " — לבדיקה"}`).join(" · ")}</span></li>
        <li><strong>פעולות</strong><span>{card.verification.operations.map((item) => `${item.expression} = ${item.actual}${item.verified ? " ✓" : " ≠ " + item.result}`).join(" · ")}</span></li>
        <li><strong>מבנה</strong><span>{card.geometry.map((item) => `${item.key}: ${item.value}`).join(" · ") || "אין נתון"}</span></li>
        <li><strong>צורה</strong><span>{card.form}{card.dimension ? ` · ${card.dimension}` : ""}</span></li>
        <li><strong>המחשה</strong><span>{card.image ? "תמונת מקור מקושרת" : "חלופה דו־ממדית; תמונת מקור טרם קושרה"}</span></li>
      </ol>
      <details><summary>נוסח המקור והפרשנות הנפרדת</summary><p>{card.live.representativeStatement || "נוסח המקור אינו זמין בקורא הציבורי."}</p>{card.interpretation ? <p><b>פרשנות רוחנית:</b> {card.interpretation}</p> : null}</details>
      <details><summary>הופעות מקור מדויקות · {card.source.occurrenceCount}</summary><ul>{card.source.locators.map((item) => <li key={item.ref}><Link to={item.href}>{item.exact ? "פתח את ההופעה בספריית צבי" : "פתח את ספריית צבי"}</Link> · <code dir="ltr">{item.ref}</code></li>)}</ul></details>
      {isAdmin ? <details className="sod29-world-spatial-admin-audit"><summary>ביקורת מנהל · איחוד ללא מחיקה</summary>
        <p>{card.source.occurrenceCount} הופעות נשמרו בפרובננס; {card.source.duplicateOccurrenceCount} סומנו כחזרות באשכול. הנציג הוא הנוסח הארוך הזמין בקורא.</p>
        {card.source.duplicateRefs.length ? <ul>{card.source.duplicateRefs.map((ref) => <li key={ref}><code dir="ltr">{ref}</code></li>)}</ul> : <p>לא סומנה כפילות ודאית באשכול הזה.</p>}
        <p>OCR/תמונה: {card.image ? "מחובר" : "חסר — נשאר לבדיקה"} · רשומות מנוע מאומתות: {card.review.engineVerifiedRows}</p>
      </details> : null}
      <div className="sod29-actions">
        <Link className="sod29-action primary" to={`/2029/number/${card.value}`}>לערך {card.value}</Link>
        <Link className="sod29-action" to={card.source.locators.find((item) => item.ref === card.source.representativeRef)?.href || card.source.locators[0]?.href || card.source.href}>להופעת המקור המדויקת</Link>
      </div>
    </div>
  </article>;
}

function SpatialAdminQueue({ rows }) {
  return <section className="sod29-world-spatial-admin-queue" aria-label="תור מיון מנהל למרחבים ומבנים">
    <header><div><h4>תור המנהל</h4><p>חומר נוסף מן הקורא המורשה. הוא אינו מקודם לעץ ואינו נחשף לציבור דרך הרשימה הזאת.</p></div><span>{rows.length} אשכולות ממתינים</span></header>
    {rows.length ? <div className="sod29-world-kind-card-grid">{rows.slice(0, 40).map((row) => <article className="sod29-world-kind-card" key={row.id}>
      <small>{row.category} · {publicationStateLabel(row.status)}</small><strong>{row.needs}</strong><p>{row.statement}</p>
      <span>{row.findingCount} רשומות · {row.engineVerifiedCount} עם אימות מנוע</span>
      {row.locator.exact ? <Link className="sod29-action" to={row.locator.href}>למקור המדויק</Link> : null}
      <details><summary>מזהה וגישה</summary><code dir="ltr">{row.sourceRef}</code><p>היקף גישה: {row.privacyScope}</p></details>
    </article>)}</div> : <p>לא נמצאו כרגע מועמדים נוספים בקורא המורשה.</p>}
  </section>;
}

function SpatialShelf({ projection, isAdmin = false }) {
  const [section, setSection] = useState("selected");
  const deepLinkSlug = new URLSearchParams(window.location.search).get("spatial");
  const allCards = projection.cards.filter((card) => section === "selected" || (section === "series" ? card.series.length > 0 : card.section === section));
  const selectedDeepLinkIndex = deepLinkSlug ? projection.cards.findIndex((card) => card.slug === deepLinkSlug) : -1;
  const deepLinkIndex = section === "selected" ? selectedDeepLinkIndex : -1;
  const selectedInitialVisibleCount = selectedDeepLinkIndex >= 0
    ? Math.max(SPATIAL_PAGE_SIZE, Math.ceil((selectedDeepLinkIndex + 1) / SPATIAL_PAGE_SIZE) * SPATIAL_PAGE_SIZE)
    : SPATIAL_PAGE_SIZE;
  const [visibleCount, setVisibleCount] = useState(() => selectedInitialVisibleCount);
  const openSection = (nextSection) => {
    setSection(nextSection);
    setVisibleCount(nextSection === "selected" ? selectedInitialVisibleCount : SPATIAL_PAGE_SIZE);
  };
  useEffect(() => {
    if (!deepLinkSlug || visibleCount <= deepLinkIndex) return undefined;
    const scrollToTarget = () => document.getElementById(`spatial-${deepLinkSlug}`)?.scrollIntoView({ block: "start" });
    const frame = window.requestAnimationFrame(scrollToTarget);
    const settleTimers = [180, 520, 920].map((delay) => window.setTimeout(scrollToTarget, delay));
    return () => {
      window.cancelAnimationFrame(frame);
      settleTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [deepLinkIndex, deepLinkSlug, visibleCount]);
  const cards = allCards.slice(0, visibleCount);
  const remaining = Math.max(0, allCards.length - cards.length);
  if (projection?.access?.available === false) return <section className="sod29-world-kind-section"><p role="status">הקורא הציבורי של מרחבים ומבנים אינו זמין כרגע. לא מוצגים כרטיסי דמו.</p></section>;
  return <section className="sod29-world-kind-section sod29-world-spatial-shelf" aria-label="מרחבים ומבנים של צבי">
    <header><div><h3>{projection.title}</h3><p>{projection.description}</p></div><span>{projection.counts.approvedModels} מבנים · {projection.counts.sourceOccurrences} הופעות · {projection.counts.duplicateOccurrences} חזרות</span></header>
    <p className="sod29-world-spatial-rule">כל קישור פותח הופעה מדויקת בספריית צבי הציבורית. הופעות של אותו קורפוס נשמרות בפרובננס ואינן נספרות כמקורות עצמאיים. חוזק, איכות, אימות ופרסום אינם ציון אמת אחד.</p>
    <nav className="sod29-world-spatial-sections" aria-label="מדורי מרחבים ומבנים">{projection.sections.map((item) => <button type="button" key={item.key} aria-pressed={section === item.key} className={section === item.key ? "is-active" : ""} onClick={() => openSection(item.key)}>{item.label}</button>)}</nav>
    <div className="sod29-world-spatial-result-count" aria-live="polite">מציג {cards.length} מתוך {allCards.length} מבנים במדור הזה</div>
    <div className="sod29-world-spatial-grid">{cards.map((card, index) => <SpatialCard key={card.id} card={card} projection={projection} isAdmin={isAdmin} priority={index === 0} />)}</div>
    {remaining ? <div className="sod29-world-spatial-more"><button type="button" className="sod29-action primary" onClick={() => setVisibleCount((count) => Math.min(allCards.length, count + SPATIAL_PAGE_SIZE))}>להציג עוד {Math.min(SPATIAL_PAGE_SIZE, remaining)}</button><small>המשך הרשימה נטען לתצוגה רק לפי בקשה.</small></div> : null}
    {!remaining && allCards.length > SPATIAL_PAGE_SIZE ? <div className="sod29-world-spatial-more"><button type="button" className="sod29-action" onClick={() => setVisibleCount(SPATIAL_PAGE_SIZE)}>לצמצם לששת הראשונים</button></div> : null}
    {isAdmin ? <SpatialAdminQueue rows={projection.adminQueue || []} /> : null}
    <p className="sod29-muted">החלופה הדו־ממדית נטענת תחילה. רכיב התלת־ממד נמצא בחבילה עצלה נפרדת ונטען רק לאחר לחיצה.</p>
  </section>;
}

function loadKind(kind, isAdmin = false) {
  const cacheKey = `${kind}:${isAdmin ? "admin" : "public"}`;
  if (KIND_REQUEST_CACHE.has(cacheKey)) return KIND_REQUEST_CACHE.get(cacheKey);
  const request = fetchKind(kind, { isAdmin }).catch((error) => {
    KIND_REQUEST_CACHE.delete(cacheKey);
    throw error;
  });
  KIND_REQUEST_CACHE.set(cacheKey, request);
  return request;
}

function EntitySection({ section }) {
  return <section className="sod29-world-kind-section" aria-label={section.label}>
    <header><div><h3>{section.label}</h3>{section.description ? <p>{section.description}</p> : null}</div><span>{section.cards.length} מוצגים{section.hasMore ? " · יש עוד" : ""}</span></header>
    {section.cards.length ? <div className="sod29-world-kind-card-grid">{section.cards.map((card) => <Link
      key={`${section.key}:${card.id}`} className="sod29-world-kind-card" to={cardHref(card)}>
      <small>{card.kicker || section.label}</small><strong>{card.label}</strong>{card.sub ? <p>{card.sub}</p> : null}<span>לפתוח בעולם ←</span>
    </Link>)}</div> : <p className="sod29-muted">אין כרגע פריטים ציבוריים בסוג הזה.</p>}
  </section>;
}

function CipherShelf({ rows, hasMore }) {
  return <section className="sod29-world-kind-section" aria-label="צפנים שפורסמו">
    <header><div><h3>צפנים שפורסמו</h3><p>העולם מציג את הצופן כפריט ידע. החיפוש והבדיקה עצמם נשארים בכלי הצופן.</p></div><span>{rows.length} מוצגים{hasMore ? " · יש עוד" : ""}</span></header>
    <div className="sod29-world-kind-card-grid">{rows.map((row) => <Link key={row.id}
      className="sod29-world-kind-card" to={`/codes/${encodeURIComponent(row.slug || row.id)}`}>
      <small>צופן שפורסם</small><strong>{row.title || row.search_term || "צופן ללא כותרת"}</strong>
      <p>{row.skip_distance ? `דילוג ${row.skip_distance}` : "דילוג לא צוין"}{row.scope ? ` · ${row.scope === "tanakh" ? "תנ״ך" : "תורה"}` : ""}</p>
      <span>איכות: אין נתון בתצוגה · לפתוח צופן ←</span>
    </Link>)}</div>
    <div className="sod29-actions"><Link className="sod29-action" to="/codes">לספריית הצפנים</Link><Link className="sod29-action primary" to="/code">לכלי הצופן</Link></div>
  </section>;
}

function MediaShelf({ items, hasMore, access }) {
  if (access?.available === false) return <p role="status">המדיה הציבורית אינה זמינה כרגע.</p>;
  return <section className="sod29-world-kind-section" aria-label="תמונות ומדיה ציבורית">
    <header><div><h3>תמונות ומדיה ציבורית</h3><p>כל תמונה נשארת מחוברת לזהות המקור שלה. הופעה כאן אינה הופכת OCR או כיתוב לממצא מאומת.</p></div><span>{items.length} מוצגים{hasMore ? " · יש עוד" : ""}</span></header>
    {items.length ? <div className="sod29-world-media-shelf">{items.map((item) => <article key={item.mediaId}>
      <CanonicalMediaFigure2029 item={item} thumbnail alt={item.presentation?.label || "פתח תמונת מקור"} contextNote="פריט ציבורי במאגר המדיה" />
      <div><strong>{item.presentation?.label || "פריט מדיה"}</strong><small>{item.sourceRef}</small></div>
    </article>)}</div> : <p className="sod29-muted">לא נמצאו כרגע פריטי מדיה ציבוריים.</p>}
    <div className="sod29-actions"><Link className="sod29-action" to="/gallery">למאגר המדיה הציבורי</Link></div>
  </section>;
}

export default function WorldKnowledgeTypes2029({ kind = WORLD_KNOWLEDGE_KIND.NUMBERS, onKindChange, isAdmin = false }) {
  const [state, setState] = useState({ kind: null, loading: true, data: null, error: null });
  useEffect(() => {
    let alive = true;
    setState({ kind, loading: true, data: null, error: null });
    loadKind(kind, isAdmin)
      .then((data) => { if (alive) setState({ kind, loading: false, data, error: null }); })
      .catch((error) => { if (alive) setState({ kind, loading: false, data: null, error }); });
    return () => { alive = false; };
  }, [kind, isAdmin]);
  useEffect(() => {
    if (state.loading || state.kind !== kind) return undefined;
    const params = new URLSearchParams(window.location.search);
    const targetId = kind === WORLD_KNOWLEDGE_KIND.SPATIAL && params.get("spatial")
      ? `spatial-${params.get("spatial")}`
      : kind === WORLD_KNOWLEDGE_KIND.NUMBERS && params.get("constant")
        ? `constant-${params.get("constant")}`
        : null;
    if (!targetId) return undefined;
    const frame = window.requestAnimationFrame(() => document.getElementById(targetId)?.scrollIntoView({ block: "start" }));
    return () => window.cancelAnimationFrame(frame);
  }, [kind, state.kind, state.loading]);

  const option = WORLD_KNOWLEDGE_OPTIONS.find((item) => item.key === kind) || WORLD_KNOWLEDGE_OPTIONS[0];
  const data = state.kind === kind ? state.data : null;
  const sections = data?.sections || [];
  const openingSections = kind === WORLD_KNOWLEDGE_KIND.NUMBERS
    ? sections.filter((section) => section.key === "selected-numbers")
    : [];
  const remainingSections = kind === WORLD_KNOWLEDGE_KIND.NUMBERS
    ? sections.filter((section) => section.key !== "selected-numbers")
    : sections;
  return <section className="sod29-section sod29-world-knowledge-types" aria-label="עיון בעולם לפי סוג ידע">
    <div className="sod29-section-head"><div><div className="sod29-kicker">אותו עולם · כניסות שונות</div><h2>לגלות לפי סוג הידע.</h2>
      <p className="sod29-muted">כאן לא נוצרים מאגרים חדשים: כל כרטיס מגיע מהקורא או מההקרנה הקנונית של המספר, השפה, הצופן, המדיה, הזמן, המקור או המבנה המרחבי.</p></div></div>
    <nav className="sod29-world-kind-tabs" aria-label="סוגי הידע בעולם">{WORLD_KNOWLEDGE_OPTIONS.map((item) => <button
      type="button" key={item.key} className={item.key === kind ? "is-active" : ""} aria-pressed={item.key === kind}
      onClick={() => onKindChange?.(item.key)}><strong>{item.label}</strong><small>{item.description}</small></button>)}</nav>
    <div className="sod29-world-kind-heading"><h3>{option.label}</h3><p>{option.description}</p></div>
    {state.loading || state.kind !== kind ? <p role="status">פותח את {option.label}…</p> : null}
    {state.error ? <p role="status">הפריטים אינם זמינים כרגע. שום חומר חלופי לא הומצא.</p> : null}
    {openingSections.map((section) => <EntitySection key={section.key} section={section} />)}
    {kind === WORLD_KNOWLEDGE_KIND.NUMBERS && data?.constants ? <ZviConstantsShelf projection={data.constants} isAdmin={isAdmin} /> : null}
    {kind === WORLD_KNOWLEDGE_KIND.NUMBERS && data?.multiValue ? <ZviMultiValueShelf projection={data.multiValue} /> : null}
    {remainingSections.map((section) => <EntitySection key={section.key} section={section} />)}
    {kind === WORLD_KNOWLEDGE_KIND.CIPHERS && data ? <CipherShelf rows={data.ciphers} hasMore={data.hasMore} /> : null}
    {kind === WORLD_KNOWLEDGE_KIND.MEDIA && data ? <MediaShelf items={data.media} hasMore={data.hasMore} access={data.access} /> : null}
    {kind === WORLD_KNOWLEDGE_KIND.SPATIAL && data?.spatial ? <SpatialShelf projection={data.spatial} isAdmin={isAdmin} /> : null}
    {kind === WORLD_KNOWLEDGE_KIND.TIME && data ? <div className="sod29-actions"><Link className="sod29-action" to="/timeline">לציר הזמן המלא</Link></div> : null}
    {kind === WORLD_KNOWLEDGE_KIND.BOOKS && data ? <div className="sod29-actions"><Link className="sod29-action" to="/books">למרחב הספרים והמקורות</Link></div> : null}
  </section>;
}
