import { analyzeNumberMath } from "./numberMathProfile.js";

// Thin teaser projection over the existing deterministic Number Math Profile (the same engine the full
// Number page reads). Local, bounded, no network and no gematria claims. Shared by light surfaces.
const FAMILY_HE = Object.freeze({
  prime: "ראשוני", semiprime: "חצי־ראשוני", square: "ריבועי", triangular: "משולשי", cube: "מעוקב",
  perfect: "מושלם", abundant: "שופע", power_of_two: "חזקה של 2",
  palindrome_base10: "פלינדרום", palindromic_prime_base10: "ראשוני פלינדרומי",
});

const factorText = (factors) => factors.map((f) => (f.exponent > 1 ? `${f.prime}^${f.exponent}` : `${f.prime}`)).join(" × ");

export function buildNumberQuickFacts(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) return [];
  const math = analyzeNumberMath(n);
  if (math?.status !== "ok") return [];
  const facts = [{ key: "parity", label: n % 2 === 0 ? "זוגי" : "אי-זוגי" }];
  const fz = math.arithmetic?.factorization;
  if (math.arithmetic?.prime) facts.push({ key: "prime", label: "ראשוני" });
  else if (fz?.complete && fz.factors?.length) facts.push({ key: "factors", label: `פירוק: ${factorText(fz.factors)}` });
  const root = math.digit_structure?.digital_root;
  if (Number.isInteger(root)) facts.push({ key: "root", label: `שורש דיגיטלי ${root}` });
  for (const family of math.families || []) {
    if (family.key !== "prime" && FAMILY_HE[family.key]) facts.push({ key: family.key, label: FAMILY_HE[family.key] });
  }
  return facts.slice(0, 6);
}

// Sections of the full Number page (anchors live in NumberLivingWorld2029). Static teaser, no data.
export const NUMBER_PAGE_TEASERS = Object.freeze([
  { key: "expressions", label: "ביטויים עם אותו ערך", hash: "#number-expressions" },
  { key: "connections", label: "חיבורים ומקבילות", hash: "#number-connections-live" },
  { key: "math", label: "יקום המספר והמתמטיקה", hash: "#number-math" },
  { key: "journey", label: "המסע של המספר", hash: "#number-journey-gate" },
]);
