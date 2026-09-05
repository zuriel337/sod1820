import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { applySeo } from "../lib/seo.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import ShareActions from "../components/ShareActions.jsx";
import {
  fetchBookEntities, fetchBookEntityBySlug, fetchBookResearch,
  bookToWorkspaceItem, researchRowToWorkspaceItem, pageFromSourceRef,
} from "../lib/research/bookResearchProjection.js";
import { selectionToWorkspaceItem, selectionRef, bookEntityRef } from "../lib/research/bookSelectionAdapter.js";

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

// 📖 Book Phase B (work_log 88043a72) — generic documented-snapshot reader.
// Fetches public/book-data/<slug>.tables.json (book-agnostic schema; a book with no
// bundle yet returns 404 and the tab shows an honest empty-state, not an error).
const DOSSIER_SECTIONS = [
  ["datasets", "Datasets (DS)"],
  ["contradictions", "סתירות"],
  ["number_families", "משפחות מספרים"],
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

// 📖 Book Projection Experience Contract (work_log 49e92bf6/56ae06a7, PR#332 §8): typography
// via semantic F roles only (no literal font-family), colors via usePalette() tokens only
// (no agent-local palette) — both light and dark, theme-aware (research_clean surface mode).
function style(P) { return `
  .bk{max-width:1440px;margin:auto;padding:24px 18px 90px;direction:rtl;color:${P.inkSoft};font-family:${F.body}}.bk a{color:inherit}.bk-hero{padding:34px 0 22px;border-bottom:1px solid ${P.border}}.bk-eye{font-family:${F.ui};font-size:11px;letter-spacing:2px;color:${P.accent};font-weight:900}.bk h1{font-family:${F.display};color:${P.ink};font-size:clamp(42px,7vw,76px);line-height:1;margin:9px 0 12px}.bk-lead{color:${P.inkSoft};font-family:${F.body};line-height:1.8;max-width:950px}.bk-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}.bk-btn{font-family:${F.ui};border:1px solid ${P.border};background:${P.cardSoft};color:${P.accentText};border-radius:12px;padding:9px 13px;cursor:pointer;text-decoration:none;font-weight:700;font-size:13px}.bk-btn.on{background:${P.glow}}.bk-tabs{display:flex;gap:6px;flex-wrap:wrap;position:sticky;top:0;z-index:4;padding:10px 0;background:linear-gradient(${P.cardSoft} 72%,transparent)}.bk-tab{font-family:${F.ui};border:1px solid ${P.border};background:${P.card};color:${P.inkSoft};border-radius:999px;padding:7px 12px;cursor:pointer}.bk-tab.on{color:${P.accentText};border-color:${P.borderStrong};background:${P.glow}}.bk-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:18px 0}.bk-card{border:1px solid ${P.border};border-radius:17px;background:${P.cardGrad};padding:16px}.bk-card b.big{font-family:${F.numeric};display:block;font-size:30px;color:${P.heroNum}}.bk-muted{color:${P.inkSoft};font-family:${F.body};font-size:12px}.bk-two{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(300px,.65fr);gap:14px}.bk-panel{border:1px solid ${P.border};border-radius:18px;background:${P.card};overflow:hidden}.bk-ph{font-family:${F.ui};padding:14px 16px;border-bottom:1px solid ${P.border};font-weight:900;color:${P.ink}}.bk-pb{padding:16px}.bk-row{padding:12px 0;border-bottom:1px solid ${P.border};line-height:1.6}.bk-row:last-child{border:0}.bk-pill{font-family:${F.ui};display:inline-block;padding:3px 8px;border-radius:999px;background:rgba(139,92,246,.14);color:#a78bfa;font-size:10px;font-weight:800;margin:2px}.bk-ok{color:#4fae74}.bk-warn{color:${P.accentDim}}.bk-pdf{height:min(78vh,900px);background:${P.card}}.bk-pdf iframe{width:100%;height:100%;border:0;background:white}.bk-data{display:grid;grid-template-columns:90px 1.3fr 90px 110px 2fr;gap:10px;align-items:start;padding:11px 0;border-bottom:1px solid ${P.border};font-size:12px;font-family:${F.body}}.bk-data strong{font-family:${F.numeric};color:${P.accentText}}.bk-find{padding:13px;border:1px solid ${P.border};border-radius:14px;margin-bottom:9px;background:${P.cardSoft}}.bk-find h4{font-family:${F.ui};margin:0 0 7px;font-size:14px;color:${P.ink}}.bk-find-meta{display:flex;gap:5px;flex-wrap:wrap;color:${P.inkSoft};font-family:${F.ui};font-size:10px}.bk-layer{display:grid;grid-template-columns:150px 38px 1fr;align-items:center;margin:6px 0}.bk-layer-key{font-family:${F.ui};font-weight:900;color:${P.accentText}}.bk-arrow{text-align:center;color:${P.accentDim};font-size:20px}.bk-layer-box{border:1px solid ${P.border};border-radius:13px;padding:12px;background:${P.card};color:${P.inkSoft};font-family:${F.body};line-height:1.55}.bk-index{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:26px}.bk-book{display:block;text-decoration:none;min-height:270px;padding:22px;border:1px solid ${P.border};border-radius:22px;background:${P.cardGrad}}.bk-book h2{font-family:${F.display};color:${P.ink};font-size:34px;margin:8px 0}.bk-empty{text-align:center;padding:60px 20px;color:${P.inkSoft};font-family:${F.body}}.bk-section-title{font-family:${F.ui};color:${P.ink};font-size:28px;margin:26px 0 12px}.bk-notice{font-family:${F.body};border:1px dashed ${P.border};background:${P.cardSoft};padding:13px;border-radius:14px;color:${P.inkSoft};line-height:1.65}.bk-open li{margin:7px 0;color:${P.inkSoft};font-family:${F.body}}.bk-idgrid{display:grid;grid-template-columns:150px 1fr;gap:0;font-family:${F.body}}.bk-idgrid>div{padding:10px;border-bottom:1px solid ${P.border}}.bk-idgrid>div:nth-child(odd){color:${P.accentText};font-weight:800}.bk-code{direction:ltr;text-align:left;font-family:${F.numeric};font-size:11px;color:${P.inkSoft};overflow-wrap:anywhere}@media(max-width:900px){.bk-grid{grid-template-columns:repeat(2,1fr)}.bk-two,.bk-index{grid-template-columns:1fr}.bk-data{grid-template-columns:70px 1fr}.bk-data>*:nth-child(n+3){grid-column:2}.bk-layer{grid-template-columns:1fr}.bk-arrow{transform:rotate(90deg)}.bk-pdf{height:68vh}}` }

function TruthPill({ row }) {
  const txt = row?.engine_verified ? "ENGINE VERIFIED" : (row?.status || "candidate").toUpperCase();
  return <span className="bk-pill" style={row?.engine_verified ? { color:'#4fae74',background:'rgba(79,174,116,.14)' } : null}>{txt}</span>;
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
  const [qs, setQs] = useSearchParams();
  const [books,setBooks] = useState([]); const [book,setBook] = useState(null); const [research,setResearch] = useState(null); const [loading,setLoading] = useState(true); const [error,setError] = useState("");
  const [tab,setTab] = useState(qs.get("tab") || (slug ? "overview" : "index"));
  const [dossierSection, setDossierSection] = useState("datasets");
  const [savedSelections, setSavedSelections] = useState(() => new Set());
  const { addToResearch, togglePin, isPinned, enterDiscovery } = useResearch();
  const snap = slug ? SNAPSHOTS[slug] : null;
  const page = Number(qs.get("page") || 1) || 1;
  const dossier = useBookDossier(slug);

  useEffect(() => { setTab(qs.get("tab") || (slug ? "overview" : "index")); }, [slug, qs]);
  useEffect(() => {
    let alive=true; setLoading(true); setError("");
    if (!slug) {
      fetchBookEntities().then(x => { if(alive) setBooks(x); }).catch(e => { if(alive) setError(e.message); }).finally(() => { if(alive) setLoading(false); });
      return () => { alive=false; };
    }
    fetchBookEntityBySlug(slug).then(async b => {
      if (!alive) return; setBook(b);
      if (!b) return;
      const r = await fetchBookResearch(b).catch(e => ({ rows:[],findings:[],restricted:true,summary:{total:0,pages:[]},error:e }));
      if (alive) setResearch(r);
    }).catch(e => { if(alive) setError(e.message); }).finally(() => { if(alive) setLoading(false); });
    return () => { alive=false; };
  }, [slug]);

  useEffect(() => {
    const title = slug && book ? `${book.label} — ספר ומחקר` : "ספרים ומקורות";
    applySeo({ title: `${title} · סוד 1820`, description: snap?.promise || "ספרים ומקורות בתוך Research OS האחד", path: slug ? `/book/${slug}` : "/book" });
  }, [slug, book, snap]);

  const workspaceItem = useMemo(() => bookToWorkspaceItem(book), [book]);
  const pinned = workspaceItem ? Boolean(isPinned?.(workspaceItem.id)) : false;
  const goTab = t => { setTab(t); const n=new URLSearchParams(qs); n.set("tab",t); setQs(n,{replace:true}); };
  const goPage = p => { const n=new URLSearchParams(qs); n.set("page",String(p)); n.set("tab","source"); setQs(n); setTab("source"); };
  const addBook = () => { if(workspaceItem){ addToResearch(workspaceItem); enterDiscovery?.(); } };
  // 📖 Phase B: one exact dossier row -> a distinct, reproducible Workspace selection
  // (never the book's own ref — see bookSelectionAdapter.js). Row shapes vary per
  // section (datasets/contradictions/number_families all differ) so we normalize a
  // stable id + source_ref-style locator here before handing off to the adapter.
  const addSelection = (row, idKey) => {
    if (!book || !row) return;
    const rowId = String(row[idKey] ?? "");
    const pdfPage = Array.isArray(row.pdf_pages) ? row.pdf_pages[0] : row.pdf_pages;
    const sourceRef = `book:hebrewbooks:5635#p${pdfPage ?? "0"}:${rowId}`;
    const selection = {
      source_ref: sourceRef,
      title: row.population || row.conflict || row.construction || rowId,
      status: row.status || null,
      confidence: row.confidence ?? null,
      truth_class: row.truth_class ?? null,
    };
    const item = selectionToWorkspaceItem(book, selection);
    if (!item) return;
    addToResearch(item);
    setSavedSelections(s => new Set(s).add(item.ref));
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
        {/* 🔗 שיתוף קונטקסטואלי-מפורש-בלבד (research_clean — אין chrome אוטומטי): הכפתור הזה,
            לא מנגנון-אוטומטי, הוא הדרך היחידה לשתף מ-Book Hub. יעד ברירת-מחדל = כתובת-הדף
            הנוכחית = /book/:slug הקנוני. force=true כי הווידג'ט-הצף מוסתר כאן (share.js). */}
        <ShareActions type="book" title={book.label} compact force style={{ display: "inline-flex" }} />
      </div>
    </div>
    <div className="bk-tabs">{TABS.map(([k,l]) => <button className={`bk-tab ${tab===k?'on':''}`} key={k} onClick={() => goTab(k)}>{l}</button>)}</div>

    {tab === "overview" && <>
      <div className="bk-grid">{snap.metrics.map(([v,l,n]) => <div className="bk-card" key={l}><b className="big">{v}</b><div>{l}</div><div className="bk-muted">{n}</div></div>)}</div>
      <div className="bk-two">
        <section className="bk-panel"><div className="bk-ph">מפת Coverage — לא אחוז מזויף אחד</div><div className="bk-pb">{snap.coverage.map(x => <div className="bk-row" key={x.label}><b>{x.label} · <span className="bk-warn">{x.value}</span></b><div className="bk-muted">{x.note}</div></div>)}</div></section>
        <section className="bk-panel"><div className="bk-ph">Research OS · live</div><div className="bk-pb"><div className="bk-row"><b>Book node</b><div className="bk-code">{book.id}</div></div><div className="bk-row"><b>Research Objects readable now</b><span className="bk-ok">{summary.total || 0}</span>{research?.restricted && <div className="bk-muted">השכבה המלאה מוגנת ב־RLS; הציבור לא מקבל private research.</div>}</div><div className="bk-row"><b>עמודים עם research_object קריא</b><div>{livePages.length ? livePages.join(' · ') : '—'}</div></div><div className="bk-row"><b>3D contract</b><div>אותו Research State · canonical_coordinates=false</div></div></div></section>
      </div>
      <h2 className="bk-section-title">זהות המקור — שבע שכבות שאינן מתמזגות</h2>
      <div className="bk-panel"><div className="bk-pb bk-idgrid"><div>Book</div><div className="bk-code">{book.identity_key}</div><div>Edition</div><div>{tiers.edition?.status || 'not specified'}</div><div>Witness</div><div className="bk-code">{tiers.witness?.identity || '—'} · {tiers.witness?.provider} {tiers.witness?.native_id}</div><div>Digital Object</div><div className="bk-code">{tiers.digital_object?.bucket}/{tiers.digital_object?.path}</div><div>Page/Region Locator</div><div className="bk-code">{tiers.locator?.pattern}</div><div>Authority</div><div>מוקצה question-by-question דרך provenance; Witness identity ≠ authority.</div></div></div>
      <h2 className="bk-section-title">משפחות מחקר מרכזיות</h2><div className="bk-grid">{snap.families.map(f => <div className="bk-card" key={f.title}><b>{f.title}</b><div className="bk-muted" style={{marginTop:7,lineHeight:1.65}}>{f.text}</div></div>)}</div>
      <h2 className="bk-section-title">פתוח כרגע</h2><div className="bk-panel"><div className="bk-pb"><ul className="bk-open">{snap.open.map(x => <li key={x}>{x}</li>)}</ul></div></div>
    </>}

    {tab === "source" && <div className="bk-two">
      <section className="bk-panel"><div className="bk-ph" style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'center'}}><span>המקור המקורי · PDF page {page}</span><a className="bk-btn" href={`${snap.pdf}#page=${page}`} target="_blank" rel="noreferrer">פתח בחלון ↗</a></div><div className="bk-pdf"><iframe key={page} src={`${snap.pdf}#page=${page}&view=FitH`} title={`${book.label} PDF`}/></div></section>
      <aside className="bk-panel"><div className="bk-ph">עמודים מתוך המחקר החי</div><div className="bk-pb">{livePages.length ? livePages.map(p => <button className="bk-btn" key={p} onClick={() => goPage(p)} style={{margin:3}}>{p}</button>) : <div className="bk-notice">למשתמש הנוכחי אין שכבת research_objects קריאה או שעדיין אין rows עם page locator. ה־PDF עצמו נשאר זמין.</div>}<div className="bk-row"><b>Locator contract</b><div className="bk-code">{tiers.locator?.pattern}</div></div><div className="bk-row"><b>Digital Object ≠ Book</b><div className="bk-muted">הקובץ הוא עד/אובייקט דיגיטלי. זהות הספר נשארת {book.identity_key}.</div></div></div></aside>
    </div>}

    {tab === "research" && <section id="research" className="bk-panel"><div className="bk-ph">Research Objects לפי source_ref · {summary.total || 0}</div><div className="bk-pb">
      {research?.restricted && <div className="bk-notice">המחקר המלא מוגן: `research_objects` אינו public feed. אם אתה מחובר כאדמין, ה־RLS הקיים מאפשר את השכבה; לציבור נשארת רק Projection מאושרת/מסוכמת.</div>}
      {!research?.restricted && !liveRows.length && <div className="bk-empty">אין Research Objects קריאים עבור source_ref של הספר.</div>}
      {liveRows.map(row => { const p=pageFromSourceRef(row.source_ref); const item=researchRowToWorkspaceItem(row,book); return <div className="bk-find" key={row.id}><h4>{row.statement || row.kind || 'Research Object'}</h4><div className="bk-find-meta"><TruthPill row={row}/>{row.kind && <span className="bk-pill">{row.kind}</span>}{p && <button className="bk-pill" onClick={() => goPage(p)} style={{border:0,cursor:'pointer'}}>p{p}</button>}{row.value != null && <span className="bk-pill">value {row.value}</span>}{row.confidence != null && <span className="bk-pill">confidence {row.confidence}</span>}</div><div className="bk-code" style={{marginTop:7}}>{row.source_ref}</div><div className="bk-actions"><button className="bk-btn" onClick={() => addToResearch(item)}>➕ למחקר</button>{p && <button className="bk-btn" onClick={() => goPage(p)}>פתח מקור בעמוד {p}</button>}</div></div> })}
    </div></section>}

    {tab === "structure" && <>
      <div className="bk-notice">הטבלה הבאה היא Research Map snapshot: `Dataset/Representation family ≠ Canonical method ≠ engine implementation`. ממצאים חדשים יכולים לעדכן את הסטטוס בלי לשנות את Book identity.</div>
      <div className="bk-panel" style={{marginTop:14}}><div className="bk-ph">Datasets / Representation Families</div><div className="bk-pb">{snap.datasets.map(([id,title,locus,status,note]) => <div className="bk-data" key={id}><strong>{id}</strong><div>{title}</div><div>{locus}</div><div><span className="bk-pill">{status}</span></div><div className="bk-muted">{note}</div></div>)}</div></div>
    </>}

    {tab === "dossier" && <>
      <div className="bk-notice">קורא את `public/book-data/{slug}.tables.json` — הדוסייה-המתועדת מ-git (documented snapshot, ר' Master State §23.30 — עשוי לפגר אחרי מחקר-המקור החי, ר' PR#285/AHAVAT_TORAH_SOURCE_MANIFEST_285.md למצב-עדכני). נפרד מ-`research_objects` החי בטאב "המחקר". שמירת-שורה יוצרת בחירת-מקור נבדלת, לא-דורסת את שמירת-הספר-עצמו.</div>
      {dossier === null && <div className="bk-empty">אין עדיין דוסייה-מתועדת לספר הזה — התבנית מוכנה, ממתינה לנתונים (ר' ספר-הפליאה).</div>}
      {dossier && <>
        <div className="bk-tabs" style={{position:'static',marginTop:14}}>{DOSSIER_SECTIONS.filter(([k]) => Array.isArray(dossier[k]) && dossier[k].length).map(([k,l]) => <button className={`bk-tab ${dossierSection===k?'on':''}`} key={k} onClick={() => setDossierSection(k)}>{l}</button>)}</div>
        <div className="bk-panel" style={{marginTop:14}}><div className="bk-ph">{DOSSIER_SECTIONS.find(([k]) => k===dossierSection)?.[1] || dossierSection} · {(dossier[dossierSection] || []).length}</div>
          <div className="bk-pb">{(dossier[dossierSection] || []).map((row, i) => {
            const idKey = dossierSection === "datasets" ? "dataset_id" : dossierSection === "contradictions" ? "id" : "n";
            const label = row.population || row.conflict || row.construction || String(row[idKey]);
            const pending = (() => { const p=Array.isArray(row.pdf_pages)?row.pdf_pages[0]:row.pdf_pages; return selectionRef({ bookIdentityKey: bookEntityRef(book), sourceRef: `book:hebrewbooks:5635#p${p??"0"}:${row[idKey]}` }); })();
            const already = savedSelections.has(pending);
            return <div className="bk-find" key={row[idKey] ?? i}>
              <h4>{String(row[idKey])} · {label}</h4>
              <div className="bk-find-meta">{row.status && <span className="bk-pill">{row.status}</span>}{row.confidence != null && <span className="bk-pill">confidence {row.confidence}</span>}{row.delta && <span className="bk-pill">Δ {row.delta}</span>}</div>
              <div className="bk-actions"><button className="bk-btn" onClick={() => addSelection(row, idKey)}>{already ? "✓ נשמר לבחירה" : "➕ שמור בחירה זו"}</button></div>
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
        ["FINDING",`${summary.total || 0} research_objects readable in current session`,"Finding/Claim/Calculation נשמרים עם truth state נפרד."],
        ["RELATIONS",`Reality Graph · ${book.id}`,"קשרים למספרים, אנשים, פסוקים, topics, ELS וספרים אחרים; לא graph מקביל."],
        ["WORKSPACE","ResearchProvider / ResearchCenter","➕ למחקר, pinned, history, collections, journeys — אותה סביבת עבודה קיימת."],
        ["SPATIAL / 3D","PARK — not in this slice","עתידי; ZURIEL PARK/LATER decision. אינו נבנה כאן."],
      ].map(([k,v,n],i) => <React.Fragment key={k}><div className="bk-layer"><div className="bk-layer-key">{k}</div><div className="bk-arrow">→</div><div className="bk-layer-box"><div>{v}</div><div className="bk-muted">{n}</div></div></div>{i<8 && <div style={{height:3}}/>}</React.Fragment>)}</div></div>
    </>}

  </div>;
}
