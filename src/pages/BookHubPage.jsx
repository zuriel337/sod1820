import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams, useNavigate } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { applySeo } from "../lib/seo.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import ShareActions from "../components/ShareActions.jsx";
import {
  fetchBookEntities, fetchBookEntityBySlug, fetchBookResearch,
  bookToWorkspaceItem, researchRowToWorkspaceItem, pageFromSourceRef,
  researchRowToBookRepresentation, deriveBookConnections, bookContextPatch,
  hasUnresolvedBookSeeds, parseSourceRefLocator,
} from "../lib/research/bookResearchProjection.js";
import {
  selectionToWorkspaceItem, selectionRef, bookEntityRef, dossierSelectionSourceRef,
} from "../lib/research/bookSelectionAdapter.js";

const STORAGE = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/Book/";

const SNAPSHOTS = {
  "ahavat-torah": {
    eyebrow: "AHAVAT TORAH · HEBREWBOOKS 5635",
    subtitle: "ר׳ פנחס זלמן הלוי סג״ל איש הורוויץ · תרס״ה / 1905",
    pdf: `${STORAGE}Hebrewbooks_org_5635.pdf`,
    promise: "מקור → עמוד/בלוק → Dataset/Research Unit → Finding → קשרים. המחקר ממשיך להתעשר בלי לשנות את זהות הספר.",
    metrics: [
      ["99", "עמודי PDF", "Digital Object"], ["15", "עמודים ברישום block רציף", "documented snapshot"],
      ["70", "blocks שמורים", "documented snapshot"], ["8", "טבלאות", "documented snapshot"],
      ["13", "datasets במפה", "documented snapshot"], ["18", "methods/procedures", "documented snapshot"],
      ["10", "סתירות", "preserved"], ["9", "קריאות לא פתורות", "preserved"],
    ],
    // 🔴 Coverage-axis verdicts kept separate per Intake §9 — this is the whole-book RECONCILIATION
    // gate result (work_log a39cb97a, AHAVAT_TORAH_WHOLE_BOOK_RECONCILIATION_20260905), quoted
    // here as a dated finding, NOT re-derived or upgraded. This is NOT a claim of 100% research
    // completeness — 4 of 5 axes below explicitly say PARTIAL/NOT ESTABLISHED.
    coverage: [
      { label: "Structural Page Accounting", value: "99/99", note: "כל עמודי ה-PDF קיימים/ממופים-מבנית. אינו Research completeness." },
      { label: "Research Map / Grammar Coverage", value: "SUFFICIENT FOR PROJECTION", note: "מספיק כדי להציג Book Projection; אינו טענת שחזור-מלא." },
      { label: "Exact-Witness Coverage", value: "PARTIAL", note: "VERIFIED EXACT / CORRECTED / STILL AMBIGUOUS נשמרים בנפרד; חלק מהעמודים בלבד עברו אדג'ודיקציית-עדות מדויקת." },
      { label: "Source Exhaustion", value: "NOT ESTABLISHED", note: "לא נטען שכל-מה-שיש-במקור מוצה." },
      { label: "Known-Corpus Exhaustion", value: "PARTIAL", note: "batch reconstruction (pp.16-99, כל הענפים) הושלמה; פערי-עדות/סתירות ספציפיים עדיין פתוחים (ר' Datasets למטה)." },
    ],
    // ⚠️ Documented snapshot, editorially curated — NOT a live read of PR#285/the source
    // manifest, and not itself an authority: the 5 coverage-axis verdicts above are quoted
    // from the live whole-book gate (work_log a39cb97a) as of 5.9.2026, not computed here.
    // Individual dataset rows below can still be stale relative to ongoing source work.
    // For current status, see docs/research-library/ahavat-torah/AHAVAT_TORAH_SOURCE_MANIFEST_285.md
    // on PR#285, and work_log a39cb97a for the full gate reasoning + open evidence list.
    datasets: [
      ["DS-01", "שם ה׳ · 1820", "p6", "CLOSED", "165+398+311+396+550=1820; arithmetic verified"],
      ["DS-02", "22 אותיות × פרשה/ספר", "pp35–41", "PARTIAL", "187+ rows; Aleph/Bet/Zayin anomalies preserved"],
      ["DS-03", "תיבות לפי פרשה/ספר", "pp41–43", "PARTIAL", "Torah total 79,976 supported; per-parasha closure incomplete"],
      ["DS-04", "סך אותיות", "p43±", "PARTIAL", "~304,812 historical source reading; final digit/reading unresolved"],
      ["DS-05", "אוריין תליתאי / attribution", "pp25–31", "OPEN", "person/group × parasha; פעמים ≠ תיבות"],
      ["DS-06", "משה", "p70", "PARTIAL", "647 closes at book/Torah level (sublayers CLOSED); parasha-row level remains open — corrected 5.9.2026, was previously mislabeled CLOSED/ANOMALY here"],
      ["DS-07", "שרשרת סנהדרין", "locator unconfirmed", "OPEN", "37 generations/links; the pp.71-80 exact-pass did NOT locate the previously-estimated p78 chain — page pending re-confirmation, not asserted here"],
      ["DS-08", "תוכחה", "pp88–91", "OPEN", "existence/estimate challenged; exact figures not fully extracted"],
      ["DS-09", "חמש מגילות · אותיות", "pp42–43", "OPEN", "multi-row matrix; unit semantics unknown"],
      ["DS-10", "חמש מגילות · תיבות", "p43", "OPEN", "source located; exact values not fully verified"],
      ["DS-11", "שורשים", "pp31–35", "OPEN", "author claims 1820 roots; list/rule not fully reconstructed"],
      ["DS-12", "לוח תיקונים", "p99", "CLOSED", "1983 errata/corrections including צ״ע"],
      ["DS-13", "עשה / 248", "pp69–70", "PARTIAL", "author conclusion 248; specific sublayers closed, dual breakdown not fully closed overall — corrected 5.9.2026, was previously mislabeled OPEN here"],
    ],
    families: [
      { title: "משפחת 1820", text: "מספר מופיע במספר populations/procedures נפרדים: שם ה׳, דיבור יעקב/רחל/לאה, הגדה, עלינו, ספירות, ערכין, תקיעות, עשרון ועוד. Same result ≠ same dataset." },
      { title: "משפחת 1830", text: "נשמרת כמשפחה נפרדת: 1833−3, 1816+14, וסכום משולש 1..60. אין למזג ל־1820." },
      { title: "79,976", text: "סך תיבות התורה נתמך ביותר ממסלול אחד; גבול attribution/counting האוניברסלי עדיין דורש דיוק." },
      { title: "18,200", text: "טבלת named-speaker ב־pp13–14 מגיעה ל־18,200; population/checksum/cohort semantics עדיין פתוחים." },
    ],
    open: ["5 פערי-עדות סופיים מ-Checkpoint5 (ל/ה, doubled-word subcorpus, 5-שנים/365/יום-כיפור, קטגוריות-זמן קהלת, בחירת-אסימון-סוף ברכת-כהנים)", "DS-03: סך-מקור נקרא חזותית 110,976 וסותר קריאה קודמת 79,976 — לא-נפתר", "DS-04: סך-כולל 304,812 מול 304,830 — קריאה אחרונה עמומה", "DS-08 (תוכחה) לא-נמצא ב-pp81–99 גם אחרי בדיקה-ממוקדת", "p99: לוח-התיקונים תשמ״ג שומר צ״ע-של-העורך עצמו — לא-נפתר", "DS-02/06/07/09/10/11/13 דורשים closure ברמות שונות (ר' Datasets למטה)", "Exact-witness adjudication אינו שווה למיפוי מבני", "Gematria claims אינם Engine Verified בלי המנוע הקנוני", "Final reconciliation צריך לשמר contradictions וקריאות לא פתורות"],
    seeds: [
      { key: "1820", label: "משפחת 1820", page: 6, family: "number-family", status: "documented" },
      { key: "1830", label: "משפחת 1830", page: 13, family: "number-family", status: "documented" },
      { key: "ds02", label: "DS-02 · אותיות × פרשה", page: 35, family: "dataset", status: "partial" },
      { key: "ds03", label: "DS-03 · 79,976", page: 41, family: "dataset", status: "partial" },
      { key: "ds05", label: "DS-05 · אוריין תליתאי", page: 25, family: "dataset", status: "open" },
      { key: "ds06", label: "DS-06 · משה 647", page: 70, family: "dataset", status: "partial" },
      { key: "ds07", label: "DS-07 · סנהדרין", page: null, family: "dataset", status: "open" },
      { key: "ds08", label: "DS-08 · תוכחה", page: 90, family: "dataset", status: "open" },
      { key: "ds11", label: "DS-11 · 1820 שורשים", page: 31, family: "dataset", status: "open" },
      { key: "ds13", label: "DS-13 · עשה 248", page: 69, family: "dataset", status: "open" },
    ],
  },
  "sefer-hapliah": {
    eyebrow: "SEFER HAPLIAH · HEBREWBOOKS 6355",
    subtitle: "ספר הפליאה · מקור עתיק שנבחן כ־stress-test ל־Universal Source Deep Research",
    pdf: `${STORAGE}Hebrewbooks_org_6355.pdf`,
    promise: "לא רק לקרוא ספר עתיק — להיכנס לתוכו: source, procedures, representations, operations, witness state וקשרים לעץ האחד.",
    metrics: [
      ["327", "עמודי PDF", "Digital Object"], ["42", "Research Objects", "documented live family snapshot"],
      ["§9", "Universal Source Protocol", "stress-test provenance"], ["7", "Identity tiers", "Book ≠ Witness ≠ Digital Object"],
    ],
    coverage: [
      { label: "Research Map", value: "whole-book stress test", note: "משפחות operator/representation נבדקו לאורך הספר; אינו exact-witness transcription של כל עמוד." },
      { label: "Research Objects", value: "42", note: "durable candidates/procedures; Candidate ≠ Canonical ≠ Published." },
      { label: "Witness", value: "HebrewBooks 6355", note: "Digital object הוא עד/אובייקט דיגיטלי, לא authority אוטומטית." },
      { label: "Protocol contribution", value: "§9", note: "הספר חשף/אימת את orchestration האוניברסלי בלי ליצור Peli'ah system נפרד." },
    ],
    datasets: [
      ["REP-01", "מטריצות אלפבית", "multi-locus", "SUPPORTED", "alphabet arrangements / positional representations"],
      ["REP-02", "מילוי וחילוץ", "multi-locus", "SUPPORTED", "milui/extraction patterns remain representation/procedure, not automatic new engine"],
      ["REP-03", "ראשי/סופי תיבות", "multi-locus", "SUPPORTED", "initial/final-letter operations with source-local semantics"],
      ["REP-04", "כלל / קדמי / ריבוע", "multi-locus", "SUPPORTED/PARTIAL", "operator identity crosswalk required before engine claims"],
      ["REP-05", "עומק / אורך / רוחב", "multi-locus", "SUPPORTED", "spatial-language family; representation vs interpretation kept separate"],
      ["REP-06", "קרי / כתיב", "multi-locus", "SUPPORTED", "textual-version/witness semantics matter"],
      ["REP-07", "צורות אות", "multi-locus", "SUPPORTED", "visual/letter-form representation family"],
    ],
    families: [
      { title: "Research Grammar", text: "TARGET/TEXT → REPRESENTATION → TRANSFORM → COMPOSE/GENERATE → ARRANGE/PROJECT → MEASURE → AGGREGATE → RELATE → INTERPRET." },
      { title: "Procedure Extraction", text: "מונח בספר אינו method חדש אוטומטית. קודם crosswalk ל־Foundation primitives, ורק semantic difference אמיתי נשמר." },
      { title: "Witness Discipline", text: "VERIFIED EXACT / CORRECTED / STILL AMBIGUOUS + reason. Digital transcription יכול להיות discovery aid בלבד." },
      { title: "Universal Impact", text: "ספר הפליאה שימש stress-test שהוביל ל־§9 orchestration: identity tiers, source-of-record, coverage distinctions, witness adjudication ו־multi-session coordination." },
    ],
    open: ["Exact-witness coverage אינו זהה ל־Research Map coverage", "Source term ≠ canonical Method identity", "Cross-book projection נשאר downstream על אותו Reality Graph", "Advanced 3D הוא renderer של אותו Research State ולא מערכת אמת חדשה"],
    seeds: [
      { key: "grammar", label: "Research Grammar", family: "procedure", status: "supported" },
      { key: "alphabet", label: "מטריצות אלפבית", family: "representation", status: "supported" },
      { key: "milui", label: "מילוי וחילוץ", family: "representation", status: "supported" },
      { key: "initials", label: "ראשי / סופי תיבות", family: "procedure", status: "supported" },
      { key: "klal", label: "כלל / קדמי / ריבוע", family: "operator", status: "partial" },
      { key: "depth", label: "עומק / אורך / רוחב", family: "spatial-language", status: "supported" },
      { key: "kriktiv", label: "קרי / כתיב", family: "textual-version", status: "supported" },
      { key: "forms", label: "צורות אות", family: "representation", status: "supported" },
    ],
  },
};

const TABS = [
  ["overview","מבט־על"], ["source","המקור"], ["research","המחקר"], ["structure","מבנים"], ["dossier","הדוסייה המתועדת"], ["layers","שכבות"],
  // 3D/spatial tab intentionally removed from this bounded slice (ZURIEL PARK/LATER decision) —
  // see BookSpatialView.jsx on gpt/book-research-context-spatial-v1, not carried onto this branch.
];

// Generic documented-snapshot reader. Public bundle remains an explicitly released
// projection; private live research never backfills this path implicitly.
const DOSSIER_SECTIONS = [
  ["datasets", "Datasets (DS)"],
  ["contradictions", "סתירות"],
  ["number_families", "משפחות מספרים"],
  ["representations", "ייצוגים"],
  ["procedures", "פרוצדורות"],
  ["matrices", "מטריצות"],
];
function useBookDossier(slug) {
  const [bundle, setBundle] = useState(null);
  useEffect(() => {
    if (!slug) return;
    let alive = true;
    setBundle(null);
    fetch(`/book-data/${slug}.tables.json`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (alive) setBundle(d); })
      .catch(() => { if (alive) setBundle(null); });
    return () => { alive = false; };
  }, [slug]);
  return bundle;
}

function dossierIdKey(section, row) {
  const preferred = {
    datasets: "dataset_id",
    contradictions: "id",
    number_families: "n",
    representations: "representation_id",
    procedures: "procedure_id",
    matrices: "matrix_id",
  }[section];
  if (preferred && row?.[preferred] != null) return preferred;
  return ["dataset_id", "representation_id", "procedure_id", "matrix_id", "id", "n", "key", "slug"].find(k => row?.[k] != null) || null;
}

function dossierLabel(row, idKey) {
  return row?.population || row?.conflict || row?.construction || row?.title || row?.label || (idKey ? String(row?.[idKey]) : "בחירה");
}

// 📖 Book Projection Experience Contract: semantic typography/palette only.
function style(P) { return `
  .bk{max-width:1440px;margin:auto;padding:24px 18px 90px;direction:rtl;color:${P.inkSoft};font-family:${F.body}}.bk a{color:inherit}.bk-hero{padding:34px 0 22px;border-bottom:1px solid ${P.border}}.bk-eye{font-family:${F.ui};font-size:11px;letter-spacing:2px;color:${P.accent};font-weight:900}.bk h1{font-family:${F.display};color:${P.ink};font-size:clamp(42px,7vw,76px);line-height:1;margin:9px 0 12px}.bk-lead{color:${P.inkSoft};font-family:${F.body};line-height:1.8;max-width:950px}.bk-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}.bk-btn{font-family:${F.ui};border:1px solid ${P.border};background:${P.cardSoft};color:${P.accentText};border-radius:12px;padding:9px 13px;cursor:pointer;text-decoration:none;font-weight:700;font-size:13px}.bk-btn.on{background:${P.glow}}.bk-btn:disabled{opacity:.55;cursor:not-allowed}.bk-tabs{display:flex;gap:6px;flex-wrap:wrap;position:sticky;top:0;z-index:4;padding:10px 0;background:linear-gradient(${P.cardSoft} 72%,transparent)}.bk-tab{font-family:${F.ui};border:1px solid ${P.border};background:${P.card};color:${P.inkSoft};border-radius:999px;padding:7px 12px;cursor:pointer}.bk-tab.on{color:${P.accentText};border-color:${P.borderStrong};background:${P.glow}}.bk-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:18px 0}.bk-card{border:1px solid ${P.border};border-radius:17px;background:${P.cardGrad};padding:16px}.bk-card b.big{font-family:${F.numeric};display:block;font-size:30px;color:${P.heroNum}}.bk-muted{color:${P.inkSoft};font-family:${F.body};font-size:12px}.bk-two{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(300px,.65fr);gap:14px}.bk-panel{border:1px solid ${P.border};border-radius:18px;background:${P.card};overflow:hidden}.bk-ph{font-family:${F.ui};padding:14px 16px;border-bottom:1px solid ${P.border};font-weight:900;color:${P.ink}}.bk-pb{padding:16px}.bk-row{padding:12px 0;border-bottom:1px solid ${P.border};line-height:1.6}.bk-row:last-child{border:0}.bk-pill{font-family:${F.ui};display:inline-block;padding:3px 8px;border-radius:999px;background:rgba(139,92,246,.14);color:#a78bfa;font-size:10px;font-weight:800;margin:2px}.bk-ok{color:#4fae74}.bk-warn{color:${P.accentDim}}.bk-pdf{height:min(78vh,900px);background:${P.card}}.bk-pdf iframe{width:100%;height:100%;border:0;background:white}.bk-data{display:grid;grid-template-columns:90px 1.3fr 90px 110px 2fr;gap:10px;align-items:start;padding:11px 0;border-bottom:1px solid ${P.border};font-size:12px;font-family:${F.body}}.bk-data strong{font-family:${F.numeric};color:${P.accentText}}.bk-find{padding:13px;border:1px solid ${P.border};border-radius:14px;margin-bottom:9px;background:${P.cardSoft}}.bk-find.active{border-color:${P.borderStrong};box-shadow:0 0 0 1px ${P.borderStrong}}.bk-find h4{font-family:${F.ui};margin:0 0 7px;font-size:14px;color:${P.ink}}.bk-find-meta{display:flex;gap:5px;flex-wrap:wrap;color:${P.inkSoft};font-family:${F.ui};font-size:10px}.bk-rep{margin-top:10px;padding:10px;border:1px dashed ${P.border};border-radius:12px;overflow:auto}.bk-matrix{display:grid;gap:4px;min-width:max-content}.bk-matrix-row{display:flex;gap:4px}.bk-matrix-cell{min-width:42px;padding:5px 7px;border:1px solid ${P.border};border-radius:7px;text-align:center}.bk-rep ol,.bk-rep ul{margin:6px 0;padding-inline-start:22px}.bk-layer{display:grid;grid-template-columns:150px 38px 1fr;align-items:center;margin:6px 0}.bk-layer-key{font-family:${F.ui};font-weight:900;color:${P.accentText}}.bk-arrow{text-align:center;color:${P.accentDim};font-size:20px}.bk-layer-box{border:1px solid ${P.border};border-radius:13px;padding:12px;background:${P.card};color:${P.inkSoft};font-family:${F.body};line-height:1.55}.bk-index{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:26px}.bk-book{display:block;text-decoration:none;min-height:270px;padding:22px;border:1px solid ${P.border};border-radius:22px;background:${P.cardGrad}}.bk-book h2{font-family:${F.display};color:${P.ink};font-size:34px;margin:8px 0}.bk-empty{text-align:center;padding:60px 20px;color:${P.inkSoft};font-family:${F.body}}.bk-section-title{font-family:${F.ui};color:${P.ink};font-size:28px;margin:26px 0 12px}.bk-notice{font-family:${F.body};border:1px dashed ${P.border};background:${P.cardSoft};padding:13px;border-radius:14px;color:${P.inkSoft};line-height:1.65}.bk-open li{margin:7px 0;color:${P.inkSoft};font-family:${F.body}}.bk-idgrid{display:grid;grid-template-columns:150px 1fr;gap:0;font-family:${F.body}}.bk-idgrid>div{padding:10px;border-bottom:1px solid ${P.border}}.bk-idgrid>div:nth-child(odd){color:${P.accentText};font-weight:800}.bk-code{direction:ltr;text-align:left;font-family:${F.numeric};font-size:11px;color:${P.inkSoft};overflow-wrap:anywhere}.bk-disclosure{border:1px solid ${P.border};border-radius:18px;background:${P.card};margin:18px 0}.bk-disclosure>summary{list-style:none;cursor:pointer;padding:14px 16px;font-family:${F.ui};font-weight:900;color:${P.ink};display:flex;align-items:center;gap:8px}.bk-disclosure>summary::-webkit-details-marker{display:none}.bk-disclosure>summary::before{content:'▸';color:${P.accentText};display:inline-block;transition:transform .15s}.bk-disclosure[open]>summary::before{transform:rotate(90deg)}.bk-disclosure-body{padding:2px 16px 16px}@media(max-width:900px){.bk-grid{grid-template-columns:repeat(2,1fr)}.bk-two,.bk-index{grid-template-columns:1fr}.bk-data{grid-template-columns:70px 1fr}.bk-data>*:nth-child(n+3){grid-column:2}.bk-layer{grid-template-columns:1fr}.bk-arrow{transform:rotate(90deg)}.bk-pdf{height:68vh}}` }

function TruthPills({ row, representation }) {
  const status = String(row?.status || "candidate").toUpperCase();
  return <>
    <span className="bk-pill">GOV · {status}</span>
    {row?.engine_verified === true && <span className="bk-pill">ENGINE · VERIFIED</span>}
    {row?.engine_verified === false && <span className="bk-pill">ENGINE · NOT VERIFIED</span>}
    {representation?.engineVerificationState && <span className="bk-pill">ENGINE STATE · {String(representation.engineVerificationState)}</span>}
    {representation?.witnessState && <span className="bk-pill">WITNESS · {String(representation.witnessState)}</span>}
    {row?.privacy_scope && <span className="bk-pill">ACCESS · {String(row.privacy_scope).toUpperCase()}</span>}
  </>;
}

// Compact, neutral breadcrumb for a rich locator (zone › work › sublocator) beyond the bare
// page — additive UI only, reads the SAME source_ref already shown in the bk-code line above
// it, never a new fetch/route/store. Fails closed to nothing when the locator carries no
// segments (legacy #pN / #pdf:N refs, or no ref at all) — see parseSourceRefLocator. Segment
// text is rendered exactly as stored (raw slug), never translated/interpreted into a factual
// Hebrew label — that would require a source/mapping this component does not have.
function LocatorBreadcrumb({ locator }) {
  const segments = Array.isArray(locator?.segments) ? locator.segments : [];
  if (!segments.length) return null;
  return <div className="bk-find-meta" style={{ marginTop: 4 }}>
    <span className="bk-pill" style={{ opacity: 0.8 }}>locator</span>
    {segments.map((seg, i) => <React.Fragment key={i}>{i > 0 && <span className="bk-muted">›</span>}<span className="bk-pill">{seg}</span></React.Fragment>)}
  </div>;
}

function shortPiece(value) {
  if (value == null) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  try { return JSON.stringify(value); } catch { return String(value); }
}

function RepresentationPreview({ representation }) {
  if (!representation) return null;
  if (representation.shape === "matrix" && representation.matrix.length) {
    return <div className="bk-rep"><div className="bk-muted">MATRIX · bounded preview</div><div className="bk-matrix">{representation.matrix.slice(0,8).map((r,i) => <div className="bk-matrix-row" key={i}>{(Array.isArray(r)?r:[r]).slice(0,12).map((cell,j) => <div className="bk-matrix-cell" key={j}>{shortPiece(cell)}</div>)}</div>)}</div></div>;
  }
  if (representation.shape === "procedure" && representation.steps.length) {
    return <div className="bk-rep"><div className="bk-muted">PROCEDURE · bounded preview</div><ol>{representation.steps.slice(0,8).map((step,i) => <li key={i}>{shortPiece(step)}</li>)}</ol></div>;
  }
  if (representation.shape === "composition") {
    const items = representation.generated.length ? representation.generated
      : representation.composition.length ? representation.composition
        : representation.generatorCandidate ? [representation.generatorCandidate] : [];
    if (items.length) return <div className="bk-rep"><div className="bk-muted">COMPOSITION / GENERATION · bounded preview</div><ul>{items.slice(0,12).map((x,i) => <li key={i}>{shortPiece(x)}</li>)}</ul></div>;
  }
  if (representation.shape === "spatial" && representation.dimensions.length) {
    return <div className="bk-rep"><div className="bk-muted">SPATIAL / DIMENSIONS · bounded preview</div>{representation.dimensions.slice(0,12).map((x,i) => <span className="bk-pill" key={i}>{shortPiece(x)}</span>)}</div>;
  }
  if (representation.shape === "grammar" && representation.grammar) {
    const grammar = Array.isArray(representation.grammar) ? representation.grammar : [representation.grammar];
    return <div className="bk-rep"><div className="bk-muted">RESEARCH GRAMMAR · bounded preview</div><ul>{grammar.slice(0,8).map((x,i) => <li key={i}>{shortPiece(x)}</li>)}</ul></div>;
  }
  if (representation.shape === "terms" && representation.terms.length) {
    return <div className="bk-rep"><div className="bk-muted">TERMS / REPRESENTATION</div>{representation.terms.slice(0,12).map((x,i) => <span className="bk-pill" key={i}>{shortPiece(x)}</span>)}</div>;
  }
  return null;
}

function IndexView({ books, loading }) {
  if (loading) return <div className="bk-empty">טוען ספרים מהעץ…</div>;
  return <>
    <div className="bk-hero"><div className="bk-eye">BOOKS · ONE RESEARCH REALITY</div><h1>ספרים ומקורות</h1><div className="bk-lead">כל ספר הוא ישות בעץ האחד. המקור, המחקר, הקשרים, ה־Workspace והממד המרחבי הם projections של אותו Book Context — לא מערכות נפרדות.</div></div>
    <div className="bk-index">{books.map(book => { const slug=book?.metadata?.slug; const snap=SNAPSHOTS[slug]; return <Link className="bk-book" key={book.id} to={`/book/${slug}`}><div className="bk-eye">{snap?.eyebrow || 'BOOK'}</div><h2>{book.label}</h2><div className="bk-lead">{snap?.promise || book.description}</div><div className="bk-actions"><span className="bk-pill">{book.identity_key}</span><span className="bk-pill">2D</span><span className="bk-pill">LAYERED</span></div></Link> })}</div>
  </>;
}

export default function BookHubPage() {
  const P = usePalette();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [qs, setQs] = useSearchParams();
  const [books,setBooks] = useState([]); const [book,setBook] = useState(null); const [research,setResearch] = useState(null); const [loading,setLoading] = useState(true); const [error,setError] = useState("");
  const [tab,setTab] = useState(qs.get("tab") || (slug ? "overview" : "index"));
  const [dossierSection, setDossierSection] = useState("datasets");
  const [savedSelections, setSavedSelections] = useState(() => new Set());
  const { addToResearch, togglePin, isPinned, enterDiscovery, context: researchContext, updateResearchContext } = useResearch();
  const page = Number(qs.get("page") || 1) || 1;
  const activeSelectionRef = qs.get("selection") || "";
  const activeResearchId = qs.get("research") || "";
  const dossier = useBookDossier(slug);
  // Hero-content preference (Book Projection minimal delta): the same public,
  // book-agnostic dossier bundle useBookDossier already fetches may optionally carry a
  // `hero` object shaped exactly like a SNAPSHOTS[slug] entry (eyebrow/subtitle/pdf/
  // promise/metrics/coverage/families/open/seeds). When present it is preferred over
  // the hand-authored SNAPSHOTS entry; SNAPSHOTS remains the fallback for any Book that
  // has not (yet) published a dossier.hero — nothing is deleted, nothing is required to
  // migrate, and a Book with neither still renders the same "not found" state as before.
  const snap = slug ? (dossier?.hero || SNAPSHOTS[slug] || null) : null;
  // Exact-reopen focus id: a deep link (?research=<id>) must resolve even when that row
  // has aged outside the default bounded batch — see fetchBookResearch({ focusId }).
  const focusResearchId = activeResearchId;
  // Exact dossier/source-selection reopen: the dossier bundle is a small, public, already-
  // fetched snapshot (not the private live corpus), so resolving `?selection=<ref>` back to
  // its row is a plain bounded lookup — same identity math the row list already does to
  // decide which row is "active", just run once for whichever ref is in the URL.
  const focusDossierSelection = useMemo(() => {
    if (!dossier || !activeSelectionRef || !book) return null;
    const bookRef = bookEntityRef(book);
    for (const [sectionKey] of DOSSIER_SECTIONS) {
      const rows = Array.isArray(dossier[sectionKey]) ? dossier[sectionKey] : [];
      for (const row of rows) {
        const idKey = dossierIdKey(sectionKey, row);
        const sourceRef = dossierSelectionSourceRef(book, row, idKey);
        if (!sourceRef) continue;
        const ref = selectionRef({ bookIdentityKey: bookRef, sourceRef });
        if (ref === activeSelectionRef) return { sourceRef, locator: ref };
      }
    }
    return null;
  }, [dossier, activeSelectionRef, book]);

  useEffect(() => { setTab(qs.get("tab") || (slug ? "overview" : "index")); }, [slug, qs]);
  useEffect(() => {
    if (!dossier) return;
    const available = DOSSIER_SECTIONS.filter(([k]) => Array.isArray(dossier[k]) && dossier[k].length).map(([k]) => k);
    if (available.length && !available.includes(dossierSection)) setDossierSection(available[0]);
  }, [dossier, dossierSection]);
  useEffect(() => {
    let alive=true; setLoading(true); setError("");
    if (!slug) {
      fetchBookEntities().then(x => { if(alive) setBooks(x); }).catch(e => { if(alive) setError(e.message); }).finally(() => { if(alive) setLoading(false); });
      return () => { alive=false; };
    }
    fetchBookEntityBySlug(slug).then(async b => {
      if (!alive) return; setBook(b);
      if (!b) return;
      const r = await fetchBookResearch(b, { focusId: focusResearchId }).catch(e => ({ rows:[],findings:[],restricted:true,truncated:false,focusIncluded:false,summary:{total:0,pages:[]},error:e }));
      if (alive) setResearch(r);
    }).catch(e => { if(alive) setError(e.message); }).finally(() => { if(alive) setLoading(false); });
    return () => { alive=false; };
  }, [slug, focusResearchId]);

  // Research Context bridge (Golden Cases A/B/C): entering a Book never invents/overwrites
  // an existing research root — it only establishes one when none exists yet, and always
  // keeps the current selection pointed at this Book (or the exact research row / dossier
  // selection in view). A research-object focus takes precedence when a URL somehow carries
  // both — otherwise whichever exact thing is in view narrows the selection; a plain Book
  // page (neither) keeps the generic book-level selection.
  useEffect(() => {
    if (!book) return;
    const focusRow = activeResearchId ? (research?.rows || []).find(r => String(r.id) === activeResearchId) : null;
    const focusSelection = focusRow
      ? { sourceRef: focusRow.source_ref ?? null, locator: `research-object:${focusRow.id}` }
      : focusDossierSelection;
    const patch = bookContextPatch({ book, slug, hasRoot: Boolean(researchContext?.subject), focusSelection });
    if (patch) updateResearchContext?.(patch);
    // researchContext intentionally excluded: this bridge reacts to Book/selection identity
    // changing, not to every Context update (including its own), which would loop.
  }, [book?.id, slug, activeResearchId, research, focusDossierSelection]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const title = slug && book ? `${book.label} — ספר ומחקר` : "ספרים ומקורות";
    applySeo({ title: `${title} · סוד 1820`, description: snap?.promise || "ספרים ומקורות בתוך Research OS האחד", path: slug ? `/book/${slug}` : "/book" });
  }, [slug, book, snap]);

  const workspaceItem = useMemo(() => bookToWorkspaceItem(book), [book]);
  // Connection projection — NOT graph edges (both Book nodes have 0 live edges). Bounded,
  // derived only from this Book's own already-curated seeds; every link resolves to the
  // existing universal /number/:n route. See deriveBookConnections.
  const connections = useMemo(() => deriveBookConnections(snap), [snap]);
  // Honest state when a Book has internal exploration seeds that haven't resolved to an
  // external canonical entity yet — say so plainly instead of rendering nothing or inventing
  // a relation. See hasUnresolvedBookSeeds.
  const hasUnresolvedConnections = useMemo(() => hasUnresolvedBookSeeds(snap), [snap]);
  const pinned = workspaceItem ? Boolean(isPinned?.(workspaceItem.id)) : false;
  const goTab = t => { setTab(t); const n=new URLSearchParams(qs); n.set("tab",t); setQs(n,{replace:true}); };
  const goPage = p => { const n=new URLSearchParams(qs); n.set("page",String(p)); n.set("tab","source"); setQs(n); setTab("source"); };
  const addBook = () => { if(workspaceItem){ addToResearch(workspaceItem); enterDiscovery?.(); } };
  // Golden Case B: leaving the Book via a resolved connection (e.g. a number page) must
  // come back to the exact same Book/selection, not just "back" in browser history — set
  // returnTo to the current Book URL (tab/page/research all still in qs) before navigating.
  const navigateToConnection = (href) => {
    if (!book) { navigate(href); return; }
    updateResearchContext?.({
      returnTo: {
        href: `${window.location.pathname}${window.location.search}`,
        label: book.label,
        subject: { id: book.identity_key, type: "book", label: book.label, href: `/book/${slug}` },
      },
    });
    navigate(href);
  };
  const addSelection = (row, idKey) => {
    if (!book || !row) return;
    const sourceRef = dossierSelectionSourceRef(book, row, idKey);
    if (!sourceRef) return;
    const selection = {
      source_ref: sourceRef,
      title: dossierLabel(row, idKey),
      status: row.status ?? null,
      confidence: row.confidence ?? null,
      truth_class: row.truth_class ?? null,
      engine_verified: row.engine_verified,
      engine_detail: row.engine_detail,
      privacy_scope: row.privacy_scope ?? null,
      publication_state: row.publication_state ?? null,
      witness_state: row.witness_state ?? row.exact_witness_state ?? null,
      representation_shape: row.representation_shape ?? null,
    };
    const item = selectionToWorkspaceItem(book, selection);
    if (!item) return;
    addToResearch(item);
    setSavedSelections(s => new Set(s).add(item.ref));
    // Context selection gap fix: saving a dossier/source selection must be reflected in the
    // Research Context immediately (same session), not only on a later ?selection=<ref>
    // reload. Root is never included here, so an existing root (Number/whatever) stays put.
    updateResearchContext?.({
      selection: { entityId: book.identity_key, entityType: "book", sourceRef, locator: item.ref },
      lens: "book",
    });
  };

  if (!slug) return <div className="bk"><style>{style(P)}</style>{error ? <div className="bk-empty">{error}</div> : <IndexView books={books} loading={loading}/>}</div>;
  if (loading && !book) return <div className="bk"><style>{style(P)}</style><div className="bk-empty">טוען Book Context…</div></div>;
  if (!book || !snap) return <div className="bk"><style>{style(P)}</style><div className="bk-empty">הספר לא נמצא בעץ הקנוני. <Link to="/book">חזרה לספרים</Link></div></div>;

  const tiers = book?.metadata?.identity_tiers || {};
  const liveRows = research?.rows || [];
  const summary = research?.summary || { total:0,pages:[] };
  const livePages = summary.pages || [];
  return <div className="bk"><style>{style(P)}</style>
    <div className="bk-hero">
      <Link to="/book" className="bk-eye" style={{textDecoration:'none'}}>← ספרים ומקורות</Link>
      <div className="bk-eye" style={{marginTop:10}}>{snap.eyebrow}</div><h1>{book.label}</h1><div className="bk-lead">{snap.subtitle}<br/>{snap.promise}</div>
      <div className="bk-actions"><button className="bk-btn" onClick={addBook}>➕ למחקר</button><button className={`bk-btn ${pinned?'on':''}`} onClick={() => workspaceItem && togglePin(workspaceItem)}>{pinned?'📌 מוצמד':'📌 הצמד'}</button><a className="bk-btn" href={snap.pdf} target="_blank" rel="noreferrer">פתח PDF ↗</a><span className="bk-btn" style={{cursor:'default'}}>🧭 {book.identity_key}</span>
        <ShareActions type="book" url={`/book/${slug}`} title={book.label} compact force style={{ display: "inline-flex" }} />
      </div>
    </div>
    <div className="bk-tabs">{TABS.map(([k,l]) => <button className={`bk-tab ${tab===k?'on':''}`} key={k} onClick={() => goTab(k)}>{l}</button>)}</div>

    {tab === "overview" && <>
      <h2 className="bk-section-title">מה מגלים בספר הזה</h2>
      <div className="bk-grid">{snap.families.map(f => <div className="bk-card" key={f.title}><b>{f.title}</b><div className="bk-muted" style={{marginTop:7,lineHeight:1.65}}>{f.text}</div></div>)}</div>
      <div className="bk-actions" style={{margin:'4px 0 22px'}}>
        <button className="bk-btn" onClick={() => goTab('source')}>📖 קריאה במקור המקורי</button>
        <button className="bk-btn" onClick={() => goTab('research')}>🔍 המחקר החי על הספר</button>
        <button className="bk-btn" onClick={() => goTab('dossier')}>📚 הדוסייה המתועדת</button>
      </div>

      {connections.length > 0 && <>
        <h2 className="bk-section-title">קשור במחקר הספר</h2>
        <div className="bk-panel"><div className="bk-pb">
          <div className="bk-muted" style={{marginBottom:8}}>קישורי-ניווט לעדשה הקיימת של כל מספר — לא קשר-גרף חדש ולא מסקנה סמנטית.</div>
          {connections.map(c => <button className="bk-pill" key={c.value} style={{border:0,cursor:'pointer',margin:'2px 4px 2px 0'}} onClick={() => navigateToConnection(c.href)}>{c.label}</button>)}
        </div></div>
      </>}
      {connections.length === 0 && hasUnresolvedConnections && <div className="bk-notice" style={{marginBottom:22}}>קשרים חיצוניים (למספרים/ישויות קנוניות) לספר הזה עדיין ממתינים לפתרון קנוני/Human-Gate. משפחות המחקר הפנימיות של הספר מוצגות למעלה — לא הומצא קשר-גרף כדי למלא את המקום הריק.</div>}

      <details className="bk-disclosure">
        <summary>🔬 פרטים טכניים ומדדי מחקר</summary>
        <div className="bk-disclosure-body">
          <div className="bk-grid">{snap.metrics.map(([v,l,n]) => <div className="bk-card" key={l}><b className="big">{v}</b><div>{l}</div><div className="bk-muted">{n}</div></div>)}</div>
          <div className="bk-two">
            <section className="bk-panel"><div className="bk-ph">מפת Coverage — לא אחוז מזויף אחד</div><div className="bk-pb">{snap.coverage.map(x => <div className="bk-row" key={x.label}><b>{x.label} · <span className="bk-warn">{x.value}</span></b><div className="bk-muted">{x.note}</div></div>)}</div></section>
            <section className="bk-panel"><div className="bk-ph">Research OS · live</div><div className="bk-pb"><div className="bk-row"><b>Book node</b><div className="bk-code">{book.id}</div></div><div className="bk-row"><b>Research Objects loaded now</b><span className="bk-ok">{summary.total || 0}</span>{research?.restricted && <div className="bk-muted">השכבה המלאה מוגנת ב־RLS; הציבור לא מקבל private research.</div>}{research?.truncated && <div className="bk-muted">תצוגה מוגבלת במכוון; ה־Book Hub אינו מוריד את כל קורפוס המחקר ללקוח.</div>}</div><div className="bk-row"><b>עמודים בבאצ׳ הקריא הנוכחי</b><div>{livePages.length ? livePages.join(' · ') : '—'}</div></div><div className="bk-row"><b>3D contract</b><div>אותו Research State · canonical_coordinates=false</div></div></div></section>
          </div>
          <h2 className="bk-section-title">זהות המקור — שבע שכבות שאינן מתמזגות</h2>
          <div className="bk-panel"><div className="bk-pb bk-idgrid"><div>Book</div><div className="bk-code">{book.identity_key}</div><div>Edition</div><div>{tiers.edition?.status || 'not specified'}</div><div>Witness</div><div className="bk-code">{tiers.witness?.identity || '—'} · {tiers.witness?.provider} {tiers.witness?.native_id}</div><div>Digital Object</div><div className="bk-code">{tiers.digital_object?.bucket}/{tiers.digital_object?.path}</div><div>Page/Region Locator</div><div className="bk-code">{tiers.locator?.pattern}</div><div>Authority</div><div>מוקצה question-by-question דרך provenance; Witness identity ≠ authority.</div></div></div>
          <h2 className="bk-section-title">פתוח כרגע</h2><div className="bk-panel"><div className="bk-pb"><ul className="bk-open">{snap.open.map(x => <li key={x}>{x}</li>)}</ul></div></div>
        </div>
      </details>
    </>}

    {tab === "source" && <div className="bk-two">
      <section className="bk-panel"><div className="bk-ph" style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'center'}}><span>המקור המקורי · PDF page {page}</span><a className="bk-btn" href={`${snap.pdf}#page=${page}`} target="_blank" rel="noreferrer">פתח בחלון ↗</a></div><div className="bk-pdf"><iframe key={page} src={`${snap.pdf}#page=${page}&view=FitH`} title={`${book.label} PDF`}/></div></section>
      <aside className="bk-panel"><div className="bk-ph">עמודים מתוך המחקר החי</div><div className="bk-pb">{livePages.length ? livePages.map(p => <button className="bk-btn" key={p} onClick={() => goPage(p)} style={{margin:3}}>{p}</button>) : <div className="bk-notice">למשתמש הנוכחי אין שכבת research_objects קריאה או שעדיין אין rows עם page locator. ה־PDF עצמו נשאר זמין.</div>}<div className="bk-row"><b>Locator contract</b><div className="bk-code">{tiers.locator?.pattern}</div></div><div className="bk-row"><b>Digital Object ≠ Book</b><div className="bk-muted">הקובץ הוא עד/אובייקט דיגיטלי. זהות הספר נשארת {book.identity_key}.</div></div></div></aside>
    </div>}

    {tab === "research" && <section id="research" className="bk-panel"><div className="bk-ph">Research Objects · תצוגה מוגבלת לפי source_ref · {summary.total || 0}</div><div className="bk-pb">
      {research?.restricted && <div className="bk-notice">המחקר המלא מוגן: `research_objects` אינו public feed. reader קיים + RLS קיים קובעים מה מותר לקרוא; אין fallback ל־public JSON.</div>}
      {research?.truncated && <div className="bk-notice">יש עוד חומר מורשה מעבר לבאצ׳ הנוכחי. הוא לא יורד כולו ללקוח; הרחבה עתידית תהיה pagination/ranking על אותו contract.</div>}
      {!research?.restricted && !liveRows.length && <div className="bk-empty">אין Research Objects קריאים עבור source_ref של הספר.</div>}
      {liveRows.map(row => {
        const p=pageFromSourceRef(row.source_ref);
        const item=researchRowToWorkspaceItem(row,book);
        const representation=researchRowToBookRepresentation(row);
        const active=String(row.id)===activeResearchId;
        return <div className={`bk-find ${active?'active':''}`} id={active?'research-selection':undefined} key={row.id}>
          <h4>{row.statement || row.kind || 'Research Object'}</h4>
          <div className="bk-find-meta"><TruthPills row={row} representation={representation}/>{row.kind && <span className="bk-pill">{row.kind}</span>}<span className="bk-pill">SHAPE · {representation.shape}</span>{p && <button className="bk-pill" onClick={() => goPage(p)} style={{border:0,cursor:'pointer'}}>p{p}</button>}{row.value != null && <span className="bk-pill">value {row.value}</span>}{row.confidence != null && <span className="bk-pill">confidence {row.confidence}</span>}</div>
          <div className="bk-code" style={{marginTop:7}}>{row.source_ref}</div>
          <LocatorBreadcrumb locator={representation.sourceLocator}/>
          <RepresentationPreview representation={representation}/>
          <div className="bk-actions"><button className="bk-btn" onClick={() => addToResearch(item)}>➕ למחקר</button>{p && <button className="bk-btn" onClick={() => goPage(p)}>פתח מקור בעמוד {p}</button>}</div>
        </div>;
      })}
    </div></section>}

    {tab === "structure" && <>
      <div className="bk-notice">הטבלה הבאה היא Research Map snapshot: `Dataset/Representation family ≠ Canonical method ≠ engine implementation`. ממצאים חדשים יכולים לעדכן את הסטטוס בלי לשנות את Book identity.</div>
      <div className="bk-panel" style={{marginTop:14}}><div className="bk-ph">Datasets / Representation Families</div><div className="bk-pb">{snap.datasets.map(([id,title,locus,status,note]) => <div className="bk-data" key={id}><strong>{id}</strong><div>{title}</div><div>{locus}</div><div><span className="bk-pill">{status}</span></div><div className="bk-muted">{note}</div></div>)}</div></div>
    </>}

    {tab === "dossier" && <>
      <div className="bk-notice">קורא רק `public/book-data/{slug}.tables.json` אם קיים bundle ציבורי מפורש. זה snapshot מתועד ונפרד מה־reader המוגן של `research_objects`; private/candidate research לעולם אינו ממלא את ה־bundle הזה אוטומטית. שמירת שורה נגזרת מזהות ה־Book/Witness בפועל — לא ממספר ספר קשיח.</div>
      {dossier === null && <div className="bk-empty">אין לספר הזה דוסייה ציבורית/מתועדת ששוחררה. זה מצב תקין: מחקר פרטי נשאר פרטי ולא מיוצא כדי למלא את המסך.</div>}
      {dossier && <>
        <div className="bk-tabs" style={{position:'static',marginTop:14}}>{DOSSIER_SECTIONS.filter(([k]) => Array.isArray(dossier[k]) && dossier[k].length).map(([k,l]) => <button className={`bk-tab ${dossierSection===k?'on':''}`} key={k} onClick={() => setDossierSection(k)}>{l}</button>)}</div>
        <div className="bk-panel" style={{marginTop:14}}><div className="bk-ph">{DOSSIER_SECTIONS.find(([k]) => k===dossierSection)?.[1] || dossierSection} · {(dossier[dossierSection] || []).length}</div>
          <div className="bk-pb">{(dossier[dossierSection] || []).map((row, i) => {
            const idKey = dossierIdKey(dossierSection, row);
            const sourceRef = dossierSelectionSourceRef(book, row, idKey);
            const pending = sourceRef ? selectionRef({ bookIdentityKey: bookEntityRef(book), sourceRef }) : null;
            const already = pending ? savedSelections.has(pending) : false;
            const active = pending && pending === activeSelectionRef;
            const label = dossierLabel(row, idKey);
            return <div className={`bk-find ${active?'active':''}`} id={active?'selection':undefined} key={idKey ? row[idKey] : i}>
              <h4>{idKey ? String(row[idKey]) : '—'} · {label}</h4>
              <div className="bk-find-meta">{row.status && <span className="bk-pill">GOV · {row.status}</span>}{row.engine_verified === true && <span className="bk-pill">ENGINE · VERIFIED</span>}{(row.witness_state || row.exact_witness_state) && <span className="bk-pill">WITNESS · {row.witness_state || row.exact_witness_state}</span>}{row.privacy_scope && <span className="bk-pill">ACCESS · {row.privacy_scope}</span>}{row.confidence != null && <span className="bk-pill">confidence {row.confidence}</span>}{row.delta && <span className="bk-pill">Δ {row.delta}</span>}</div>
              {sourceRef && <div className="bk-code" style={{marginTop:7}}>{sourceRef}</div>}
              {sourceRef && <LocatorBreadcrumb locator={parseSourceRefLocator(sourceRef)}/>}
              <div className="bk-actions"><button className="bk-btn" disabled={!sourceRef} onClick={() => addSelection(row, idKey)}>{!sourceRef ? "אין locator יציב" : already ? "✓ נשמר לבחירה" : "➕ שמור בחירה זו"}</button></div>
            </div>;
          })}</div>
        </div>
      </>}
    </>}

    {tab === "layers" && <>
      <div className="bk-notice">Layered view הוא אותו Context, לא storage חדש. אפשר לעבור בכל שכבה חזרה למקור ולשמור provenance.</div>
      <div className="bk-panel" style={{marginTop:14}}><div className="bk-pb">{[
        ["BOOK",book.identity_key,"זהות יציבה: הספר כמושא מחקר."],
        ["WITNESS",tiers.witness?.identity || '—',"העד שנבחר/נמצא; זהותו אינה authority."],
        ["DIGITAL OBJECT",`${tiers.digital_object?.bucket || ''}/${tiers.digital_object?.path || ''}`,"PDF/קובץ שממנו ניתן לאתר קריאות."],
        ["PAGE / BLOCK",tiers.locator?.pattern || 'structured locator',"Locator — אינו זהות הספר."],
        ["RESEARCH UNIT",`${snap.datasets.length} mapped families in current projection`,"Dataset / procedure / research unit עם population ו־rules."],
        ["FINDING",`${summary.total || 0} research_objects loaded in current bounded view`,"Finding/Claim/Calculation נשמרים עם truth state נפרד."],
        ["RELATIONS",`Reality Graph · ${book.id}`,"קשרים למספרים, אנשים, פסוקים, topics, ELS וספרים אחרים; לא graph מקביל."],
        ["WORKSPACE","ResearchProvider / ResearchCenter","➕ למחקר, pinned, history, collections, journeys — אותה סביבת עבודה קיימת."],
        ["SPATIAL / 3D","PARK — not in this slice","עתידי; ZURIEL PARK/LATER decision. אינו נבנה כאן."],
      ].map(([k,v,n],i) => <React.Fragment key={k}><div className="bk-layer"><div className="bk-layer-key">{k}</div><div className="bk-arrow">→</div><div className="bk-layer-box"><div>{v}</div><div className="bk-muted">{n}</div></div></div>{i<8 && <div style={{height:3}}/>}</React.Fragment>)}</div></div>
    </>}

  </div>;
}
