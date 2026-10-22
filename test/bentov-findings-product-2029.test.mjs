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
  assert.match(page, /0 \/ 33/);
  assert.match(page, /נדרשת השוואה לעד המקור, בנפרד מן המנוע/);
  assert.match(page, /האיתור השמור מוצג מול חלון ה־PDF שנמצא בביקורת/);
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

test("fidelity work queue preserves overlap math and requires human classification", () => {
  assert.match(page, /const FIDELITY_WORK_QUEUE/);
  assert.match(page, /count:\s*15/);
  assert.match(page, /count:\s*18/);
  assert.match(page, /5 מנוע \+ 12 הליך − 2 חופפים/);
  assert.equal(5 + 12 - 2, 15);
  assert.equal(15 + 18, 33);
  assert.match(page, /derivations:\s*0/);
  assert.match(page, /mediaRefs:\s*0/);
  assert.match(page, /recordedIntegrity:\s*0/);
  assert.match(page, /אין הכרעת נאמנות אוטומטית/);
  assert.match(page, /ממצאי פרוזה והשוואת־מקורות אינם זקוקים למנוע/);
  assert.match(page, /מהי הכרעת נאמנות/);
  assert.match(page, /זו אינה בדיקת מנוע ואינה החלטת פרסום/);
  assert.match(page, /data-fidelity-effect="assessment-only"/);
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
  assert.match(page, /אשר את כל 33 בתצוגה/);
  assert.match(page, /data-locator-approval="preview-test-only"/);
  assert.match(page, /const FIDELITY_VERDICT_META/);
  for (const label of ["מלא", "חלקי", "אי־התאמה", "לא חל", "חסרות ראיות"]) assert.match(page, new RegExp(label));
  assert.match(page, /data-fidelity-decision-effect="local-only"/);
  assert.match(page, /בדיקת מנוע, נאמנות למקור וסטטוס פרסום נשארים צירים נפרדים/);
  assert.match(page, /FINDINGS\.map\(finding => \[finding\.id, "needs_evidence"\]\)/);
  assert.match(page, /const EVIDENCE_REQUIREMENTS/);
  for (const key of ["witness_window", "locator_reconciliation", "surrounding_context", "claim_scope", "structured_trace", "source_fidelity_rationale"]) {
    assert.match(page, new RegExp(key));
  }
  assert.match(page, /data-evidence-effect="local-only"/);
  assert.match(page, /נוסח המקור, ציטוטים ומזהי מסד אינם נכנסים לחבילת הפריוויו/);
  assert.match(page, /disabled=\{key !== "needs_evidence" && !evidenceComplete\}/);
  assert.match(page, /if \(decision !== "needs_evidence" && !evidenceComplete\) return/);
  assert.match(page, /setFidelityDecisions\(decisions => \(\{ \.\.\.decisions, \[findingId\]: "needs_evidence" \}\)\)/);
  assert.match(page, /window\.location\.hash === "#bentov29-review-title"/);
  assert.match(page, /scrollIntoView\(\{ block: "start" \}\)/);
  assert.match(page, /אינה מתקנת את האיתור הקנוני ואינה נשלחת למסד/);
  assert.match(page, /אינה קובעת `fidelity_status`/);
  assert.doesNotMatch(page, /finding_key|artifact_id|candidate_id|source_provenance_reconstructed_sections/i);
});

test("publication readiness remains blocked behind canonical and human gates", () => {
  assert.match(page, /function PublicationReadiness/);
  assert.match(page, /data-publication-readiness="blocked"/);
  assert.match(page, /המוצר מוכן לביקורת פרטית—לא לפרסום/);
  assert.match(page, /שמירה קנונית, שינוי הרשאות ופתיחה לציבור דורשים הוראה נפרדת/);
  assert.match(page, /איתור מוכן", value: "3 \/ 33"/);
  assert.match(page, /בדיקת מנוע", value: "5 \/ 5"/);
  assert.match(page, /נאמנות שמורה", value: "0 \/ 33"/);
  assert.match(page, /גישה ציבורית", value: "0 \/ 33"/);
  assert.match(page, /data-publication-effect="none"/);
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
  assert.match(css, /min-height:44px/);
  assert.match(css, /@media\(max-width:390px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});

test("visual layer uses the project semantic tokens and a local illustration", () => {
  assert.match(page, /\/2029\/books\/bentov\/bentov-consciousness-map\.webp/);
  assert.match(css, /var\(--s29-/);
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
