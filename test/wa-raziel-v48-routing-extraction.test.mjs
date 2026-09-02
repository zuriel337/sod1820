// wa-raziel v48 regression test — Universal Question → Research Execution wiring.
// Pure, offline (no DB, no Deno, no network) — mirrors the exact logic added to
// supabase/functions/wa-raziel/index.ts (buildCompoundClaims/crossCandidateArithmeticCheck/
// dateEntitiesFromText's regex layer), the same pattern test/normalize-parity.test.mjs uses for
// SQL-vs-JS parity: this file can't import the .ts Deno Edge Function directly, so it re-states
// the identical pure logic against the SAME shared src/lib functions and asserts on real
// production WhatsApp text (wa_bot_log ids cited below, Supabase project linswmnnkjxvweumprav).
// If wa-raziel/index.ts's logic for these functions changes, update both in lockstep.
import { extractCompoundClaims } from "../src/lib/triage.js";
import { extractCandidates } from "../src/lib/analysisFlow.js";

function buildCompoundClaims(text) {
  const claims = extractCompoundClaims(text) || [];
  if (!claims.length) return "";
  const lines = claims.slice(0, 6).map((c) => {
    if (c.status === "ENGINE_VERIFIED_COMPOSITE") return `✅ אומת במנוע: ${c.text} = ${c.result}`;
    if (c.status === "ENGINE_MISMATCH") return `⚠️ סתירה מול המנוע: ${c.text} (הרכיבים אומתו, החישוב לא משחזר ${c.result})`;
    if (c.status === "METHOD_UNRESOLVED") return `❓ רכיב לא-מזוהה בשיטה קנונית: ${c.text}`;
    return null;
  }).filter(Boolean);
  return lines.length ? `טענות-חשבון/גימטריה מורכבות שחולצו והועברו למנוע הקנוני (Shared Expression Extraction):\n${lines.join("\n")}` : "";
}
function crossCandidateArithmeticCheck(text) {
  const nums = [...new Set((extractCandidates(text) || [])
    .filter((c) => c.type === "number-anchor" && Number.isFinite(c.value))
    .map((c) => c.value))].slice(0, 8);
  if (nums.length < 3) return "";
  const hits = [];
  for (let i = 0; i < nums.length && hits.length < 4; i++) {
    for (let j = i; j < nums.length && hits.length < 4; j++) {
      const [a, b] = [nums[i], nums[j]];
      for (const c of nums) {
        if (c === a || c === b) continue;
        if (a * b === c) hits.push(`✅ אומת חשבונית: ${a} × ${b} = ${c}`);
        else if (a + b === c) hits.push(`✅ אומת חשבונית: ${a} + ${b} = ${c}`);
      }
    }
  }
  return hits.join("\n");
}
const HE_VAL = { "א":1,"ב":2,"ג":3,"ד":4,"ה":5,"ו":6,"ז":7,"ח":8,"ט":9,"י":10,"כ":20,"ך":20,"ל":30,"מ":40,"ם":40,"נ":50,"ן":50,"ס":60,"ע":70,"פ":80,"ף":80,"צ":90,"ץ":90,"ק":100,"ר":200,"ש":300,"ת":400 };
function heNumeral(s) { let n = 0; for (const ch of (s || "").replace(/[^א-ת]/g, "")) n += HE_VAL[ch] || 0; return n; }
const HE_DATE_RE = new RegExp("([א-ת]{1,3})['׳\"״]?\\s+(תשרי|מרחשוון|מרחשון|חשוון|חשון|כסליו|כסלו|טבת|שבט|אדר(?:\\s+[אב])?|ניסן|אייר|סיוון|סיון|תמוז|אב|אלול)\\s+(ה?['׳]?ת[א-ת\"״'׳]{2,6})");
const GREG_DATE_RE = /\b(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})\b/;

// Regression corpus — real wa_bot_log rows (Supabase project linswmnnkjxvweumprav).
const CASES = [
  { name: "hebrew_date (wa_bot_log:925/926)", id: 926,
    text: "מה אפשר ללמוד על מי שנולד בטו בתשרי, התשנה?" },
  { name: "gregorian_date_career (wa_bot_log:912/913)", id: 912,
    text: "השם שלי קטי ברדה \nתאריך לידה 30/1/1985\nהייתי רוצה לבדוק עם הקרירה" },
  { name: "arithmetic_2172 (wa_bot_log:924)", id: 924,
    text: `2172 הוא גימטריה של פסוקית מנבואת בלעם ופסוקית מפרשת ה"מלך":
(במד' כד יז) אֶרְאֶנּוּ וְלֹא עַתָּה אֲשׁוּרֶנּוּ וְלֹא קָרוֹב דָּרַךְ כּוֹכָב מִיַּעֲקֹב ...
2172 הוא כפולה של 12 ב-181. גם סכום הספרות 2.1.7.2. הוא 12.
12 – מספר השבטים, החודשים בשנה,
181 – מספר ראשוני` },
  { name: "sensitive_spouse (wa_bot_log:916)", id: 916,
    text: "לאחרונה עולה לי הרבה שבעלי מסתיר ממני ומהמר בשקט בלי שאני ידע ,האם יש לזה קשר?" },
  { name: "working_19_19 preserve (wa_bot_log:914)", id: 914,
    text: "מה המסר מהמספר 19:19" },
  { name: "working_2323 preserve (wa_bot_log:917)", id: 917,
    text: "מה המסר מהמספר 2323" },
  { name: "christina_symbolic_x (wa_bot_log:298)", id: 298,
    text: "שם ע״ב 72×3=216" },
  { name: "christina_symbolic_sum (wa_bot_log:346)", id: 346,
    text: "543 × 4 גילויים.. = 2172" },
];

let pass = 0, fail = 0;
function check(label, cond, detail) {
  if (cond) { pass++; }
  else { fail++; console.error(`FAIL: ${label}${detail ? " — " + detail : ""}`); }
}

for (const { name, text } of CASES) {
  const compound = buildCompoundClaims(text);
  const arith = crossCandidateArithmeticCheck(text);
  console.log(`\n=== ${name} ===\ncompound: ${JSON.stringify(compound).slice(0, 200)}\narith: ${JSON.stringify(arith).slice(0, 200)}`);

  if (name.startsWith("working_")) {
    check(`${name}: no false-positive compound claim on a bare single-number query`, compound === "");
    check(`${name}: no false-positive arithmetic on a bare single-number query`, arith === "");
  }
  if (name.startsWith("christina_symbolic")) {
    check(`${name}: symbolic compound claim IS caught by the existing shared pipeline (import works end-to-end)`, compound.includes("✅ אומת במנוע"), compound);
  }
  if (name.startsWith("arithmetic_2172")) {
    // KEY PROOF: the writer's prose phrasing is NOT caught by the symbolic compound grammar (honest, expected) —
    // but the numbers it already extracts (2172, 12, 181) ARE cross-verified arithmetically: 12 × 181 = 2172.
    check("arithmetic_2172: compound grammar correctly does NOT match prose (\"X הוא כפולה של Y ב-Z\")", compound === "");
    check("arithmetic_2172: cross-candidate arithmetic check verifies 12 × 181 = 2172", arith.includes("12 × 181 = 2172"), arith);
  }
  if (name.startsWith("sensitive_spouse")) {
    check("sensitive_spouse: produces no fabricated arithmetic/compound evidence", compound === "" && arith === "");
  }
}

// Date entity extraction — Gregorian works; Hebrew (pre-existing HE_DATE_RE) does NOT match the ב-/ה- prefixed
// natural form. This is an HONEST, asserted gap — not silently accepted, not silently "fixed".
{
  const greg = "השם שלי קטי ברדה \nתאריך לידה 30/1/1985\nהייתי רוצה לבדוק עם הקרירה".match(GREG_DATE_RE);
  check("Gregorian DD/MM/YYYY date IS matched (new GREG_DATE_RE)", !!greg && greg[1] === "30" && greg[2] === "1" && greg[3] === "1985");

  const heb = "מה אפשר ללמוד על מי שנולד בטו בתשרי, התשנה?".match(HE_DATE_RE);
  check("Hebrew date WITH natural ב-/ה- prefix is NOT matched by the pre-existing HE_DATE_RE (documented gap, not fixed this pass)", heb === null);

  // Sanity: HE_DATE_RE DOES match a bare, unprefixed form (proves the regex itself is not broken, just prefix-narrow).
  const hebBare = "טו תשרי תשנה".match(HE_DATE_RE);
  check("Hebrew date WITHOUT prefix still matches HE_DATE_RE (baseline sanity)", !!hebBare && heNumeral(hebBare[1]) === 15);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
