const clean = (value) => value == null ? "" : String(value).trim();

export const GOLDEN_878_JOURNEY_ID = "golden:878:v1";

export function phraseOf(item) {
  if (typeof item === "string") return clean(item);
  return clean(item?.phrase || item?.label);
}

export function methodKey(group) {
  return clean(group?.registry?.method_key || group?.method_key || group?.method);
}

export function methodLabel(group) {
  return clean(group?.registry?.display_label || group?.display_label || group?.method || group?.method_key) || "שיטה";
}

export async function fetchNumberMethodProfile(expression) {
  const phrase = clean(expression);
  if (!phrase || /^\d+$/.test(phrase)) return [];
  const { supabase } = await import("../supabase.js");
  const { data, error } = await supabase.rpc("fn_method_profile", {
    p_phrase: phrase,
    p_depth: "value",
  });
  if (error) throw error;
  const rows = (Array.isArray(data) ? data : []).map((row) => ({
    methodKey: clean(row?.method_key),
    displayLabel: clean(row?.display_label || row?.method_key) || "שיטה",
    category: clean(row?.category) || null,
    mathematicalFamily: clean(row?.mathematical_family) || null,
    lifecycleActive: row?.lifecycle_active !== false,
    requiredEntitlement: clean(row?.required_entitlement) || null,
    atomicOrComposite: clean(row?.atomic_or_composite) || null,
    computedValue: Number.isFinite(Number(row?.computed_value)) ? Number(row.computed_value) : null,
    definitionVersion: Number.isFinite(Number(row?.definition_version)) ? Number(row.definition_version) : null,
    dependencyRules: [],
  })).filter((row) => row.methodKey);

  const keys = rows.map((row) => row.methodKey);
  if (!keys.length) return rows;
  const { data: registry, error: registryError } = await supabase
    .from("gematria_methods")
    .select("method_key,dependency_rules,dependency_version")
    .in("method_key", keys);
  if (registryError) throw registryError;
  const deps = new Map((registry || []).map((row) => [clean(row?.method_key), row]));
  return rows.map((row) => ({
    ...row,
    dependencyRules: Array.isArray(deps.get(row.methodKey)?.dependency_rules) ? deps.get(row.methodKey).dependency_rules : [],
    dependencyVersion: Number.isFinite(Number(deps.get(row.methodKey)?.dependency_version)) ? Number(deps.get(row.methodKey).dependency_version) : null,
  }));
}

function hasFinalLetters(expression) {
  return /[ךםןףץ]/.test(clean(expression));
}

function isSingleWord(expression) {
  return clean(expression).split(/\s+/).filter(Boolean).length === 1;
}

function dependencyConditionApplies(condition, expression) {
  if (condition === "no_final_letters") return !hasFinalLetters(expression);
  if (condition === "single_word_input") return isSingleWord(expression);
  if (condition === "single_word_and_no_final_letters") return isSingleWord(expression) && !hasFinalLetters(expression);
  return false;
}

function buildEquivalenceRepresentative(methodProfile, expression) {
  const parent = new Map((methodProfile || []).map((row) => [row.methodKey, row.methodKey]));
  const find = (key) => {
    if (!parent.has(key)) return key;
    let p = parent.get(key);
    while (p !== parent.get(p)) p = parent.get(p);
    let cur = key;
    while (parent.get(cur) !== p) {
      const next = parent.get(cur);
      parent.set(cur, p);
      cur = next;
    }
    return p;
  };
  const order = new Map((methodProfile || []).map((row, index) => [row.methodKey, index]));
  const union = (a, b) => {
    if (!parent.has(a) || !parent.has(b)) return;
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    const keep = (order.get(ra) ?? 9999) <= (order.get(rb) ?? 9999) ? ra : rb;
    const drop = keep === ra ? rb : ra;
    parent.set(drop, keep);
  };

  for (const row of methodProfile || []) {
    for (const rule of Array.isArray(row?.dependencyRules) ? row.dependencyRules : []) {
      if (rule?.type !== "conditional_equivalence") continue;
      if (!dependencyConditionApplies(clean(rule?.condition), expression)) continue;
      union(row.methodKey, clean(rule?.to));
    }
  }
  return (key) => find(key);
}

export function deriveLeadingCrossing({ families = [], expression = "", root = null, methodProfile = [] } = {}) {
  const target = clean(expression);
  if (!target || !Number.isFinite(Number(root))) return null;
  const representative = buildEquivalenceRepresentative(methodProfile, target);

  const activeMethods = [];
  for (const group of families || []) {
    const phrases = (Array.isArray(group?.phrases) ? group.phrases : []).map(phraseOf).filter(Boolean);
    if (!phrases.includes(target)) continue;
    const key = methodKey(group);
    if (key) activeMethods.push({ methodKey: key, methodLabel: methodLabel(group), representative: representative(key) });
  }
  if (!activeMethods.length) return null;

  for (const active of activeMethods) {
    for (const group of families || []) {
      const partnerMethodKey = methodKey(group);
      if (!partnerMethodKey) continue;
      if (representative(partnerMethodKey) === active.representative) continue;
      const partner = (Array.isArray(group?.phrases) ? group.phrases : [])
        .map(phraseOf)
        .find((phrase) => phrase && phrase !== target);
      if (!partner) continue;

      return Object.freeze({
        kind: "cross_method_intersection",
        label: "הצלבה",
        partner,
        root: Number(root),
        methods: Object.freeze([
          { methodKey: active.methodKey, methodLabel: active.methodLabel, value: Number(root) },
          { methodKey: partnerMethodKey, methodLabel: methodLabel(group), value: Number(root) },
        ]),
        methodCount: 2,
        explainWhy: `${target} דרך ${active.methodLabel} ו־${partner} דרך ${methodLabel(group)} נפגשים ב־${root}. זו הצלבה חישובית בין שיטות בלתי־תלויות בהקשר הזה; המשמעות המחקרית נשארת נפרדת.`,
        source: "entityHubProjection.gematria.families + gematria_methods.dependency_rules",
      });
    }
  }
  return null;
}

export function deriveZeroScale({ zeroScale = null, root = null } = {}) {
  const chain = (Array.isArray(zeroScale?.scale_chain) ? zeroScale.scale_chain : [])
    .map(Number)
    .filter(Number.isSafeInteger);
  const n = Number(root);
  if (!Number.isSafeInteger(n) || !chain.length) return null;

  const index = chain.indexOf(n);
  const coreRoot = Number.isSafeInteger(Number(zeroScale?.core_root)) ? Number(zeroScale.core_root) : (chain[0] ?? n);
  const at = index >= 0 ? index : chain.indexOf(coreRoot);
  return Object.freeze({
    kind: "derivation",
    methodId: clean(zeroScale?.method_id) || "zero_scale",
    root: n,
    coreRoot,
    chain: Object.freeze(chain),
    previous: at > 0 ? chain[at - 1] : null,
    next: at >= 0 && at < chain.length - 1 ? chain[at + 1] : null,
    note: clean(zeroScale?.note) || "אותו שורש ספרתי בסדר גודל אחר",
    source: clean(zeroScale?.source_of_truth) || "zero_scale_law",
  });
}

export function methodProfileEntry(profile, selectedMethodKey) {
  if (!Array.isArray(profile) || !profile.length) return null;
  return profile.find((row) => row.methodKey === selectedMethodKey) || profile[0] || null;
}

export function buildRazielMicro({
  root,
  expression,
  selectedMethod,
  activeResult,
  crossing,
  zeroScale,
} = {}) {
  const rootNumber = Number(root);
  const expr = clean(expression) || (Number.isSafeInteger(rootNumber) ? String(rootNumber) : "הפוקוס הנוכחי");
  const method = clean(selectedMethod) || "השיטה הפעילה";
  const result = Number.isFinite(Number(activeResult)) ? Number(activeResult) : null;

  const facts = [];
  if (result != null) facts.push(`${expr} · ${method} → ${result}`);
  if (crossing?.partner) facts.push(`הצלבה עם ${crossing.partner} ב־${crossing.methodCount} שיטות`);
  if (zeroScale?.next != null) facts.push(`Zero Scale: ${rootNumber} → ${zeroScale.next}`);

  return Object.freeze({
    identity: "raziel",
    mode: "micro",
    title: "רזיאל",
    lead: facts[0] || `אני איתך על ${expr}`,
    text: facts.slice(1).join(" · ") || "אפשר להסביר את החישוב, להשוות שיטות או לבחור את הצעד המחקרי הבא.",
    actions: Object.freeze([
      { key: crossing ? "explain_crossing" : "explain_method", label: crossing ? "הסבר את ההצלבה" : "למה?" },
      { key: "compare_methods", label: "השווה שיטות" },
      { key: "next_research_step", label: "מה לבדוק עכשיו?" },
    ]),
  });
}

export function buildNumberCoreProjection({
  root,
  expression,
  selectedMethodKey,
  methodProfile = [],
  families = [],
  topics = [],
  sources = [],
  zeroScale = null,
  activityCount = 0,
} = {}) {
  const selected = methodProfileEntry(methodProfile, selectedMethodKey);
  const crossing = deriveLeadingCrossing({ families, expression, root, methodProfile });
  const zero = deriveZeroScale({ zeroScale, root });
  return Object.freeze({
    root: Number(root),
    expression: clean(expression) || String(root ?? ""),
    selectedMethod: selected,
    activeResult: selected?.computedValue ?? null,
    methods: Object.freeze(methodProfile),
    crossing,
    zeroScale: zero,
    pulse: Object.freeze({
      activityCount: Number(activityCount) || 0,
      meetingCount: Array.isArray(topics) ? topics.length : 0,
      sourceCount: Array.isArray(sources) ? sources.length : 0,
    }),
    razielMicro: buildRazielMicro({
      root,
      expression,
      selectedMethod: selected?.displayLabel || selectedMethodKey,
      activeResult: selected?.computedValue,
      crossing,
      zeroScale: zero,
    }),
  });
}
