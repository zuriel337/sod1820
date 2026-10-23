import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const app = read("src/App2029.jsx");
const page = read("src/pages/BentovFindingsProduct2029Page.jsx");
const css = read("src/pages/bentovFindingsProduct2029.css");
const frame = read("src/components/experience2029/SystemFrame2029.jsx");

test("Bentov product is an unlinked Preview surface on the existing control document", () => {
  assert.match(app, /surface"\) === "bentov-findings-product"/);
  assert.match(app, /VITE_BOOK_PUBLICATION_REVIEW_PREVIEW/);
  assert.match(app, /BentovFindingsProduct2029Page/);
  assert.equal(frame.includes("bentov-findings-product"), false);
  assert.match(page, /noindex:\s*true/);
  assert.match(page, /status="Preview · קריאה בלבד"/);
});

test("focused final-finding mode renders every requested reader product instead of the review desk", () => {
  assert.match(page, /function FinalFindingExperience/);
  assert.match(page, /new URLSearchParams\(window\.location\.search\)\.get\("view"\) === "final-finding"/);
  assert.match(page, /new URLSearchParams\(window\.location\.search\)\.get\("finding"\)/);
  assert.match(page, /const finalFinding = FINDINGS\.find/);
  assert.match(page, /if \(finalFindingMode\) return <Sod2029Shell/);
  assert.match(page, /<FinalFindingExperience finding=\{finalFinding\} \/>/);
  assert.match(page, /data-final-finding-mode="all-findings-preview"/);
  assert.match(page, /aria-label="מעבר בין 33 הממצאים"/);
  assert.match(page, /FINDINGS\.map\(item => <a/);
  assert.match(page, /finalFindingHref\(item\.number\)/);
  assert.match(page, /33 ממצאים במסלול קריאה אחד/);
  assert.match(page, /const FINAL_PRODUCT_COPY/);
  assert.match(page, /פתח את הממצא מזווית אחרת/);
  assert.match(page, /ניסוח מוצר והסבר AI בפריוויו — אינם ציטוט ואינם חושפים את נוסח הממצא הקנוני/);
  assert.match(page, /למקור · PDF · עמוד \{activePage\}/);
  assert.match(page, /Preview בלבד · 0 חומר ציבורי · אין כתיבה או שינוי הרשאות/);
  assert.match(page, /const FINAL_FINDING_LENSES/);
  assert.match(page, /useState\("body"\)/);
});

test("book source law keeps a large authorized PDF surface beside every finding", () => {
  assert.match(page, /const BOOK_READER_SYSTEM_CONTRACT/);
  assert.match(page, /mode: "source_always_visible"/);
  assert.match(page, /desktop: "large_sticky_pdf_beside_finding"/);
  assert.match(page, /mobile: "source_immediately_after_finding"/);
  assert.match(page, /detachedCitation: false/);
  assert.match(page, /hiddenModal: false/);
  assert.match(page, /respectsSourceAuthorization: true/);
  assert.match(page, /function FindingSourcePanel/);
  assert.match(page, /id="bentov29-final-source"/);
  assert.match(page, /data-source-visibility=\{BOOK_READER_SYSTEM_CONTRACT\.sourceVisibility\.mode\}/);
  assert.match(page, /data-source-access=\{source\.access\}/);
  assert.match(page, /source\.access === "approved-display" \? source\.pdfUrl : null/);
  assert.match(page, /pdfUrl: "https:\/\/avalonlibrary\.net\/ebooks\/Itzhak%20Bentov%20-%20Brief%20Tour%20of%20Higher%20Consciousness\.pdf"/);
  assert.match(page, /access: "approved-display"/);
  assert.match(page, /קובץ המקור עצמו מוגן בפריוויו/);
  assert.match(page, /לא נמצא בענף נכס PDF שאושר לתצוגה/);
  assert.match(page, /המקור באנגלית נשאר פתוח לצד ההסבר העברי/);
  assert.match(page, /href="#bentov29-final-source"/);
  assert.match(page, /pagesFromVerifiedLocator/);
  assert.match(page, /sourcePages\.length/);
  assert.match(page, /onPageSelect\(page\)/);
  assert.match(css, /\.bentov29-final-product-layout\{[^}]*grid-template-areas:"hero source" "story source"/);
  assert.match(css, /\.sod29-root:has\(\.bentov29-final\)\{overflow-x:clip;overflow-y:visible\}/);
  assert.match(css, /\.bentov29-final-source\{[^}]*position:sticky/);
  assert.match(css, /@media\(max-width:1180px\)\{\.bentov29-final-product-layout\{[^}]*grid-template-areas:"hero" "source" "story"/);
});

test("non-Hebrew books keep the witness and add a separate reusable Hebrew AI explanation", () => {
  assert.match(page, /mode: "source_language_witness_plus_hebrew_ai_explanation"/);
  assert.match(page, /sourceWitnessPreserved: true/);
  assert.match(page, /aiExplanationLanguage: "he"/);
  assert.match(page, /aiExplanationIsSource: false/);
  assert.match(page, /fullBookMode: "chapter_by_chapter_hebrew_companion"/);
  assert.match(page, /verbatimFullTranslation: false/);
  assert.match(page, /compileOnceProjectMany: true/);
  assert.match(page, /surfaceNamesContract: false/);
  assert.match(page, /data-translation-presentation=\{BOOK_READER_SYSTEM_CONTRACT\.nonHebrewPresentation\.mode\}/);
  assert.match(page, /const BOOK_CHAPTER_COMPANION/);
  assert.match(page, /הסבר AI בעברית/);
  assert.match(page, /הספר, פרק אחר פרק/);
  assert.match(page, /זהו סיכום והסבר לקריאה, לא תרגום מילה במילה/);
  assert.match(page, /הטקסט האנגלי נשמר פתוח כמקור הסמכות ואינו מוחלף או מועתק/);
  assert.doesNotMatch(page, /חוק ספרים:|חוק המקור|חובת תצוגה/);
  assert.match(css, /\.bentov29-ai-context/);
  assert.match(css, /\.bentov29-book-guide/);
});

test("the Hebrew companion covers the whole book chapter by chapter and controls the source page", () => {
  const companionStart = page.indexOf("const BOOK_CHAPTER_COMPANION");
  const companionEnd = page.indexOf("function pagesFromVerifiedLocator", companionStart);
  const companion = page.slice(companionStart, companionEnd);
  const windows = [...companion.matchAll(/fromPdf: (\d+), toPdf: (\d+)/g)]
    .map(match => ({ from: Number(match[1]), to: Number(match[2]) }));

  assert.equal(windows.length, 25);
  assert.equal(windows[0].from, 1);
  assert.equal(windows.at(-1).to, 127);
  windows.forEach((window, index) => {
    assert.ok(window.from <= window.to);
    if (index > 0) assert.equal(window.from, windows[index - 1].to + 1);
  });

  assert.match(page, /25 תחנות · כל 127 עמודי ה־PDF/);
  assert.match(page, /originalTitle: "The Model of the Universe"/);
  assert.match(page, /originalTitle: "Meeting Your Higher Self"/);
  assert.match(page, /originalTitle: "Essay on Cosmology"/);
  assert.match(page, /aria-label="בחירת פרק בספר"/);
  assert.match(page, /BOOK_CHAPTER_COMPANION\.map\(\(chapter, index\)/);
  assert.match(page, /onClick=\{\(\) => setActivePage\(chapter\.fromPdf\)\}/);
  assert.match(page, /chapterCompanionForPage\(activePage\)/);
  assert.match(page, /סיכום ופרשנות, לא תרגום מילולי/);
  assert.match(css, /\.bentov29-chapter-index/);
  assert.match(css, /\.bentov29-chapter-detail/);
});

test("product data is visibly a synthetic display model and cannot publish", () => {
  assert.match(page, /data-preview-data="synthetic"/);
  assert.match(page, /data-publication-effect="none"/);
  assert.match(page, /הדמיית מוצר — לא חומר שפורסם/);
  assert.match(page, /נוסחי הממצאים והקשרים במפה הם הדגמת ממשק בלבד/);
  assert.match(page, />0<\/strong><span>ציבוריים/);
  assert.doesNotMatch(page, /supabase|\.rpc\(|\.from\(["']|fetch\(|axios|admin_research_review|set_publication/i);
});

test("status axes and actual inventory totals remain separate", () => {
  assert.match(page, /const TOTAL_FINDINGS = 33/);
  assert.match(page, /\.\.\.Array\(17\)\.fill\("observation"\)/);
  assert.match(page, /\.\.\.Array\(6\)\.fill\("hypothesis"\)/);
  assert.match(page, /\.\.\.Array\(5\)\.fill\("claim"\)/);
  assert.match(page, /\.\.\.Array\(5\)\.fill\("relation"\)/);
  for (const label of ["קליטה", "בדיקת מנוע", "נאמנות למקור", "ממשל", "גישה"]) assert.match(page, new RegExp(label));
  for (const total of ["33", "5", "28", "3", "8", "22"]) assert.match(page, new RegExp(`<strong>${total}</strong>`));
  assert.match(page, /data-live-inventory="aggregate-only"/);
  assert.match(page, /33 \/ 33/);
  assert.match(page, /הכרעות שמורות/);
  assert.match(page, /33\/33 במסד הקנוני/);
  assert.match(page, /האיתור שלפני הביקורת מוצג מול העוגן הקנוני שנשמר/);
  assert.match(page, /\{ page: 109, findings: 1 \}/);
  const sourceWindows = [...page.matchAll(/\{ page: (\d+), findings: (\d+) \}/g)];
  assert.equal(sourceWindows.length, 18);
  assert.equal(sourceWindows.reduce((total, match) => total + Number(match[2]), 0), 33);
});

test("locator audit is aggregate-only, complete and keeps stored locators distinct", () => {
  assert.match(page, /const LOCATOR_AUDIT_BY_STORED_PAGE/);
  assert.match(page, /reviewed:\s*33/);
  assert.match(page, /confirmed:\s*3/);
  assert.match(page, /expanded:\s*8/);
  assert.match(page, /correction:\s*22/);
  assert.match(page, /איתור שמור/);
  assert.match(page, /בדיקת PDF/);
  assert.match(page, /data-live-inventory="aggregate-only"/);
  assert.doesNotMatch(page, /finding_key|source_provenance_reconstructed_sections|direct_sequel_first_book/i);

  const audits = [...page.matchAll(/^\s+(\d+): \{ confirmed: (\d+), expanded: (\d+), correction: (\d+), verifiedPages: "([^"]+)" \},$/gm)];
  assert.equal(audits.length, 18);
  assert.equal(audits.reduce((total, match) => total + Number(match[2]) + Number(match[3]) + Number(match[4]), 0), 33);
  assert.equal(audits.reduce((total, match) => total + Number(match[2]), 0), 3);
  assert.equal(audits.reduce((total, match) => total + Number(match[3]), 0), 8);
  assert.equal(audits.reduce((total, match) => total + Number(match[4]), 0), 22);
});

test("fidelity review preserves review cohorts and exposes the canonical aggregate separately", () => {
  assert.match(page, /const FIDELITY_WORK_QUEUE/);
  assert.match(page, /count:\s*15/);
  assert.match(page, /count:\s*18/);
  assert.equal(5 + 12 - 2, 15);
  assert.equal(15 + 18, 33);
  assert.match(page, /const CANONICAL_FIDELITY_LANES/);
  assert.match(page, /verifiedExact:\s*23/);
  assert.match(page, /reconstructedMultiLocus:\s*10/);
  assert.match(page, /derivations:\s*0/);
  assert.match(page, /mediaRefs:\s*33/);
  assert.match(page, /recordedIntegrity:\s*33/);
  assert.match(page, /23 מדויקות · 10 רב־מוקדיות/);
  assert.match(page, /fidelityApproved:\s*33/);
  assert.match(page, /humanApproved:\s*33/);
  assert.match(page, /canonicalFidelityStored:\s*33/);
  assert.match(page, /effect:\s*"canonical_readonly_snapshot"/);
  assert.match(page, /ממצאי פרוזה והשוואת־מקורות אינם זקוקים למנוע/);
  assert.match(page, /מהי הכרעת נאמנות/);
  assert.match(page, /זו אינה בדיקת מנוע ואינה החלטת פרסום/);
  assert.match(page, /data-fidelity-effect="canonical-readonly-summary"/);
});

test("engine applicability and source fidelity are explicit independent axes", () => {
  assert.match(page, /const ENGINE_STATUS_META/);
  assert.match(page, /engineStatus: index < 5 \? "verified" : "not_applicable"/);
  assert.match(page, /data-engine-fidelity-contract="separate"/);
  assert.match(page, /<strong>5<\/strong><span>עברו בדיקת מנוע/);
  assert.match(page, /<strong>28<\/strong><span>מנוע לא רלוונטי/);
  assert.match(page, /5 מתוך 5 שבהם מנוע רלוונטי/);
  assert.match(page, /לא כשל ולא חוסר אימות/);
  assert.match(page, /בדיקת מנוע", value: "5 \/ 5"/);
  assert.match(page, /ב־28 האחרים המנוע אינו חל/);
  assert.doesNotMatch(page, /28 ממצאים עדיין אינם מאומתים במנוע/);
});

test("review workbench models all 33 decisions without exposing canonical records", () => {
  assert.match(page, /function ReviewWorkbench/);
  assert.match(page, /data-review-effect="local-only"/);
  assert.match(page, /שולחן הכרעה ל־33 תיקי ממצא/);
  assert.match(page, /קודי תצוגה בלבד—לא מזהי מסד ולא תוכן מועמד/);
  assert.match(page, /const REVIEW_CHECKS/);
  for (const label of ["איתור", "עד מקור", "מבנה", "נאמנות", "שער אנושי"]) {
    assert.match(page, new RegExp(`label: "${label}"`));
  }
  for (const count of ["count: 22", "count: 8", "count: 3", "count: 15", "count: 18"]) {
    assert.match(page, new RegExp(count));
  }
  assert.match(page, /אינם נשמרים ואינם משנים סטטוס אמת/);
  assert.match(page, /הכרעת איתור מקומית/);
  assert.match(page, /מאשר חלון PDF/);
  assert.match(page, /מחזיר לבדיקה נוספת/);
  assert.match(page, /משאיר פתוח/);
  assert.match(page, /locatorDecisions/);
  assert.match(page, /FINDINGS\.map\(finding => \[finding\.id, "accept"\]\)/);
  assert.match(page, /new Set\(REVIEW_CHECKS\.map\(check => check\.key\)\)/);
  assert.match(page, /החל אישור 33\/33 בתצוגה/);
  assert.match(page, /data-locator-approval="preview-test-only"/);
  assert.match(page, /const FIDELITY_VERDICT_META/);
  for (const label of ["מלא", "חלקי", "אי־התאמה", "לא חל", "חסרות ראיות"]) assert.match(page, new RegExp(label));
  assert.match(page, /data-fidelity-decision-effect="local-only"/);
  assert.match(page, /בדיקת מנוע, נאמנות למקור וסטטוס פרסום נשארים צירים נפרדים/);
  assert.match(page, /FINDINGS\.map\(finding => \[finding\.id, PREVIEW_REVIEW_DECISION\.verdict\]\)/);
  assert.match(page, /new Set\(evidenceRequirementsFor\(finding\)\.map\(requirement => requirement\.key\)\)/);
  assert.match(page, /const EVIDENCE_REQUIREMENTS/);
  for (const key of ["witness_window", "locator_reconciliation", "surrounding_context", "claim_scope", "structured_trace", "source_fidelity_rationale"]) {
    assert.match(page, new RegExp(key));
  }
  assert.match(page, /data-evidence-effect="local-only"/);
  assert.match(page, /נוסח המקור, ציטוטים ומזהי מסד אינם נכנסים לחבילת הפריוויו/);
  assert.match(page, /disabled=\{key !== "needs_evidence" && !evidenceComplete\}/);
  assert.match(page, /if \(decision !== "needs_evidence" && !evidenceComplete\) return/);
  assert.match(page, /setFidelityDecisions\(decisions => \(\{ \.\.\.decisions, \[findingId\]: "needs_evidence" \}\)\)/);
  assert.match(page, /\["#bentov29-review-title", "#bentov29-publication-gate-title"\]\.includes\(window\.location\.hash\)/);
  assert.match(page, /document\.getElementById\(window\.location\.hash\.slice\(1\)\)/);
  assert.match(page, /window\.setTimeout\(scrollToHash, 450\)/);
  assert.match(page, /scrollIntoView\(\{ block: "start" \}\)/);
  assert.match(page, /אינה משנה את תיקוני האיתור שכבר נשמרו/);
  assert.match(page, /אינה משנה את `fidelity_status` הקנוני/);
  assert.doesNotMatch(page, /finding_key|artifact_id|candidate_id|source_provenance_reconstructed_sections/i);
});

test("publication readiness shows completed canonical write while publication stays blocked", () => {
  assert.match(page, /function PublicationReadiness/);
  assert.match(page, /data-publication-readiness="blocked"/);
  assert.match(page, /הכתיבה הקנונית הושלמה—הפרסום עדיין סגור/);
  assert.match(page, /שינוי הרשאות ופתיחה לציבור לא בוצעו/);
  assert.match(page, /איתור קנוני", value: "33 \/ 33"/);
  assert.match(page, /בדיקת מנוע", value: "5 \/ 5"/);
  assert.match(page, /נאמנות מדויקת", value: "23 \/ 33"/);
  assert.match(page, /נאמנות רב־מוקדית", value: "10 \/ 33"/);
  assert.match(page, /נאמנות שמורה", value: "33 \/ 33"/);
  assert.match(page, /הכרעה אנושית", value: "33 \/ 33"/);
  assert.match(page, /ביקורת פרסום", value: "33 \/ 33"/);
  assert.match(page, /גישה ציבורית", value: "0 \/ 33"/);
  assert.match(page, /NEXT · Access implementation/);
  assert.match(page, /data-publication-effect="none"/);
});

test("publication decision gate models the complete reader package without publishing", () => {
  assert.match(page, /function PublicationDecisionGate/);
  assert.match(page, /data-publication-decision-effect="local-only"/);
  assert.match(page, /כך 33 הממצאים הופכים לחבילת ספר לציבור/);
  assert.match(page, /אין כתיבה למסד, אין שינוי הרשאות ואין פרסום/);
  assert.match(page, /const PUBLICATION_CHECKS/);
  for (const label of ["נוסח ציבורי", "הצגת מקור", "ייחוס", "פרטיות", "נגישות"]) {
    assert.match(page, new RegExp(`label: "${label}"`));
  }
  assert.match(page, /const PUBLICATION_DECISION_META/);
  for (const key of ["ready_for_publication", "needs_public_copy", "hold", "exclude"]) {
    assert.match(page, new RegExp(key));
  }
  assert.match(page, /publicationFidelity: index < PREVIEW_REVIEW_DECISION\.verifiedExact \? "exact" : "multi_locus"/);
  assert.match(page, /הצג מוצר מלא 33\/33/);
  assert.match(page, /disabled=\{key === "ready_for_publication" && !allChecksComplete\}/);
  assert.match(page, /setPublicationDecisions\(Object\.fromEntries/);
  assert.match(page, /setPublicationChecks\(Object\.fromEntries/);
  assert.match(page, /0 ממצאים ציבוריים/);
  assert.match(page, /מעבר אמיתי דורש שער כתיבה והרשאה נפרד/);
  assert.doesNotMatch(page, /publishFinding|publicationRpc|setPublicAccess/);
});

test("interactive controls are accessible and local-only", () => {
  assert.match(page, /aria-label="מפה אינטראקטיבית/);
  assert.match(page, /aria-pressed=/);
  assert.match(page, /role="group" aria-label="סינון לפי סוג ממצא"/);
  assert.match(page, /role="group" aria-label="בחירת קבוצת עבודה לבדיקת נאמנות"/);
  assert.match(page, /role="group" aria-label="סינון תיקי העבודה"/);
  assert.match(page, /aria-pressed=/);
  assert.match(page, /הסימון זמני במכשיר ואינו נשמר, מאשר או מפרסם דבר/);
  assert.match(css, /\.bentov29-evidence-list button/);
  assert.match(css, /\.bentov29-fidelity-decision button:disabled/);
  assert.match(css, /\.bentov29-publication-decision button:disabled/);
  assert.match(css, /\.bentov29-publication-checks button/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /@media\(max-width:390px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});

test("visual layer uses the project semantic tokens and a local illustration", () => {
  assert.match(page, /\/2029\/books\/bentov\/bentov-consciousness-map\.webp/);
  assert.match(css, /var\(--s29-/);
  assert.match(css, /\.bentov29-final-hero/);
  assert.match(css, /\.bentov29-final-model \.ring/);
  assert.match(css, /@media\(max-width:430px\)/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
});

test("Bentov typography consumes the Design V2 scale and keeps Hebrew out of the numeric face", () => {
  assert.match(css, /--b29-type-meta:var\(--s29-type-micro,14px\)/);
  assert.match(css, /--b29-type-ui:var\(--s29-type-ui,16px\)/);
  assert.match(css, /--b29-type-body:var\(--s29-type-body,18px\)/);
  assert.match(css, /@media\(min-width:1024px\)\{\.bentov29\{--b29-type-meta:var\(--s29-type-small,16px\)\}\}/);

  const literalFontSizes = [...css.matchAll(/font-size:(\d+(?:\.\d+)?)px/g)]
    .map(match => Number(match[1]))
    .filter(size => size < 14);
  const literalShorthandSizes = [...css.matchAll(/font:\d+\s+(\d+(?:\.\d+)?)px\//g)]
    .map(match => Number(match[1]))
    .filter(size => size < 14);
  assert.deepEqual(literalFontSizes, []);
  assert.deepEqual(literalShorthandSizes, []);

  assert.match(page, /className="bentov29-numeric-value">0<\/span><span className="bentov29-value-label">ציבוריים/);
  assert.match(css, /\.bentov29-verification-chain \.bentov29-numeric-value\{font-family:var\(--s29-font-numeric\);font-size:inherit;line-height:1\}/);
  assert.match(css, /\.bentov29-verification-chain \.bentov29-value-label\{font-family:var\(--s29-font-ui\);font-size:var\(--b29-type-ui\);letter-spacing:0\}/);
  assert.match(css, /\.bentov29 \.bentov29-node\{width:44px;height:44px\}/);
});
