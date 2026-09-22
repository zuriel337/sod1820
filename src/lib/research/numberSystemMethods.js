import { supabase } from "../supabase.js";
import {
  createCanonicalNumberW2Executors,
  NUMERIC_SYSTEM_METHOD_RULE_IDS,
} from "./researchW2ExecutorsBase.js";

const clean = (value) => value == null ? "" : String(value).trim();

const LABELS = Object.freeze({
  zero_scale_law: "שיטת האפס · סדר הגודל",
  shitat_haechad_alef_law: "שיטת האחד",
  zero_navigation: "האפס הנע",
  moment_clock_law: "שעת רגע",
});

function humanSystemMethodCard(finding) {
  const fact = Array.isArray(finding?.evidence?.facts) ? finding.evidence.facts[0] : null;
  const ruleId = clean(fact?.rule_id || finding?.source?.method);
  const input = Number(fact?.input ?? finding?.subject?.value);
  const output = fact?.output && typeof fact.output === "object" ? fact.output : {};
  if (!ruleId || !Number.isSafeInteger(input)) return null;

  if (ruleId === "zero_scale_law") {
    const chain = (Array.isArray(output.scale_chain) ? output.scale_chain : [])
      .map(Number)
      .filter(Number.isSafeInteger);
    const index = chain.indexOf(input);
    const next = index >= 0 && index < chain.length - 1 ? chain[index + 1] : null;
    const previous = index > 0 ? chain[index - 1] : null;
    return {
      key: `${ruleId}:${input}`,
      ruleId,
      ruleVersion: fact?.rule_version ?? null,
      title: LABELS[ruleId],
      value: input,
      display: chain.length ? chain.join(" → ") : String(input),
      note: "אותו שורש ספרתי בסדר גודל אחר · נגזרת, לא שוויון",
      target: next ?? previous,
      finding,
    };
  }

  if (ruleId === "shitat_haechad_alef_law") {
    const leading = Number(output.leading_unit);
    const remainder = Number(output.remainder);
    if (!Number.isSafeInteger(leading) || !Number.isSafeInteger(remainder)) return null;
    return {
      key: `${ruleId}:${input}`,
      ruleId,
      ruleVersion: fact?.rule_version ?? null,
      title: LABELS[ruleId],
      value: input,
      display: `${input} → ${leading} + ${remainder}`,
      note: "האלף המוביל כרמז לאחד · רמז משלים, לא שוויון",
      target: remainder,
      finding,
    };
  }

  if (ruleId === "zero_navigation") {
    const target = Number(output.core);
    if (!Number.isSafeInteger(target)) return null;
    return {
      key: `${ruleId}:${input}`,
      ruleId,
      ruleVersion: fact?.rule_version ?? null,
      title: LABELS[ruleId],
      value: input,
      display: `${input} → ${target}`,
      note: "הסרת אפס סופי · נגזרת פרשנית, לא שוויון",
      target,
      finding,
    };
  }

  return {
    key: `${ruleId}:${input}`,
    ruleId,
    ruleVersion: fact?.rule_version ?? null,
    title: LABELS[ruleId] || "שיטת מערכת",
    value: input,
    display: String(input),
    note: "יישום חוק מערכת · נגזרת, לא ראיה עצמאית",
    target: null,
    finding,
  };
}

async function fetchLiveNumericRuleVersions(ids) {
  const wanted = Array.isArray(ids) ? ids.filter(Boolean) : [...NUMERIC_SYSTEM_METHOD_RULE_IDS];
  if (!wanted.length) return {};
  const { data, error } = await supabase
    .from("nodes")
    .select("rule_id,rule_version")
    .eq("type", "rule")
    .eq("is_active", true)
    .in("rule_id", wanted);
  if (error) return {};
  return Object.fromEntries(
    (Array.isArray(data) ? data : [])
      .filter((row) => clean(row?.rule_id) && Number.isFinite(Number(row?.rule_version)))
      .map((row) => [clean(row.rule_id), Number(row.rule_version)]),
  );
}

export async function fetchNumberSystemMethods(value) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    return { status: "skipped", cards: [], trace: null };
  }

  const executors = createCanonicalNumberW2Executors({
    supabase,
    numericRuleVersions: fetchLiveNumericRuleVersions,
  });
  const result = await executors.numeric_operators({
    identityResolution: {
      identities: [{ type: "number", value: number, ref: `number:${number}` }],
    },
  });
  const cards = (Array.isArray(result?.findings) ? result.findings : [])
    .map(humanSystemMethodCard)
    .filter(Boolean);
  return {
    status: result?.status || "unknown",
    cards,
    trace: result?.trace || null,
  };
}

export { humanSystemMethodCard };
export default fetchNumberSystemMethods;
