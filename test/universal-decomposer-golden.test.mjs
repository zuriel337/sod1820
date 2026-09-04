import {
  buildUniversalDecomposition,
  extractProcedureChains,
  extractSourceReferences,
  extractSourceRelations,
} from "../src/lib/research/universalDecomposer.js";

let pass = 0, fail = 0;
function check(label, condition, detail = "") {
  if (condition) { pass++; console.log(`PASS: ${label}`); }
  else { fail++; console.error(`FAIL: ${label}${detail ? ` — ${detail}` : ""}`); }
}

const zvi = `"הנערה הזאת" רק במגילת רות
יש רק שתי הופעות יחידות בתנ"ך: "הנערה הזאת". שתיהן במגילת רות.
"ויאמר בעז לנערו הנצב על הקוצרים,למי הנערה הזאת"(רות ב,ה).
"ויהי ביתך כבית פרץ אשר ילדה תמר ליהודה מן הזרע אשר יתן י-ה-ו-ה לך מן הנערה הזאת".(רות ד,יב).
ה"זאת" כינוי למלכות."לך" נכתב בכף סופית קמוצה.חיבור לכתר.הארת הכתר ישירות דרך בועז (חכמה) אל המלכות דרך הבינה (נעמי).
יש לרות ההכנה הרוחנית הנדרשת לחבור המלכות לחכמה.
"מי" כינוי לספירת הבינה(50 שערי בינה) ו"זאת" כנוי לספירת המלכות.`;

const refs = extractSourceReferences(zvi);
check("Zvi: exactly two conservative source references", refs.length === 2, JSON.stringify(refs));
check("Zvi: Ruth 2:5 locator preserved source-native", refs.some((r) => r.book === "רות" && r.chapterRaw === "ב" && r.verseRaw === "ה"));
check("Zvi: Ruth 4:12 locator preserved source-native", refs.some((r) => r.book === "רות" && r.chapterRaw === "ד" && r.verseRaw === "יב"));

const rels = extractSourceRelations(zvi);
const hasRel = (a, b, type = null) => rels.some((r) => r.left === a && r.right === b && (!type || r.relationType === type));
check("Zvi: זאת→מלכות preserved as source claim, not fact", hasRel("זאת", "מלכות", "symbolizes_candidate"), JSON.stringify(rels));
check("Zvi: מי→בינה preserved as source claim", hasRel("מי", "בינה", "symbolizes_candidate"), JSON.stringify(rels));
check("Zvi: בועז↔חכמה apposition candidate extracted", hasRel("בועז", "חכמה", "apposition_candidate"), JSON.stringify(rels));
check("Zvi: הבינה↔נעמי apposition candidate extracted without inventing direction", hasRel("הבינה", "נעמי", "apposition_candidate"), JSON.stringify(rels));
check("Zvi: every source relation stays candidate/not_tested", rels.every((r) => r.governanceState === "candidate" && r.verificationState === "not_tested"));

const peliah = `ספר הפליאה מפעיל פרוצדורה חוזרת:
TARGET → MILUI REPRESENTATION → POSITIONAL EXTRACTION → CALCULATION/RELATION
אין להסיק מכאן ששיטת החילוץ היא מנוע חדש.`;
const procedures = extractProcedureChains(peliah);
check("Peliah: one source-declared procedure chain", procedures.length === 1, JSON.stringify(procedures));
check("Peliah: procedure preserves four ordered steps", procedures[0]?.steps?.length === 4, JSON.stringify(procedures));

const bookDecomp = buildUniversalDecomposition({
  source: {
    kind: "book",
    sourceRef: "hebrewbooks:6355#procedure:milui-positional-extraction",
    title: "ספר הפליאה",
    witness: "HebrewBooks 6355",
    locator: { pdfPage: 84 },
  },
  text: peliah,
});
check("Peliah: same universal contract handles book source profile", bookDecomp.contract === "research_intake_foundation_contract_v8" && bookDecomp.source.kind === "book");
check("Peliah: procedure remains candidate requiring primitive crosswalk", bookDecomp.unresolved.some((u) => u.kind === "procedure_execution_crosswalk"));
check("No automatic graph mutation capability exists in decomposition model", bookDecomp.invariants.includes("NO_AUTOMATIC_NODE_OR_EDGE_CREATION"));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
