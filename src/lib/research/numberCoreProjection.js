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
  return (Array.isArray(data) ? data : []).map((row) => ({
    methodKey: clean(row?.method_key),
    displayLabel: clean(row?.display_label || row?.method_key) || "שיטה",
    category: clean(row?.category) || null,
    mathematicalFamily: clean(row?.mathematical_family) || null,
    lifecycleActive: row?.lifecycle_active !== false,
    requiredEntitlement: clean(row?.required_entitlement) || null,
    atomicOrComposite: clean(row?.atomic_or_composite) || null,
    computedValue: Number.isFinite(Number(row?.computed_value)) ? Number(row.computed_value) : null,
    definitionVersion: Number.isFinite(Number(row?.definition_version)) ? Number(row.definition_version) : null,
  })).filter((row) => row.methodKey);
}

function familyMethodsForExpression(families, expression) {
  const target = clean(expression);
  if (!target) return [];
  const out = [];
  for (const group of families || []) {
    const phrases = (Array.isArray(group?.phrases) ? group.phrases : []).map(phraseOf).filter(Boolean);
    if (!phrases.includes(target)) continue;
    out.push({
      methodKey: methodKey(group),
      methodLabel: methodLabel(group),
      phrases,
    });
  }
  return out;
}

export function deriveLeadingCrossing({ families = [], expression = "", root = null } = {}) {
  const activeFamilies = familyMethodsForExpression(families, expression);
  if (activeFamilies.length < 2) return null;

  const byPartner = new Map();
  let order = 0;
  for (const group of activeFamilies) {
    for (const partner of group.phrases) {
      if (!partner || partner === expression) continue;
      if (!byPartner.has(partner)) byPartner.set(partner, { partner, methods: [], order: order++ });
      const rec = byPartner.get(partner);
      if (!rec.methods.some((item) => item.methodKey === group.methodKey)) {
        rec.methods.push({ methodKey: group.methodKey, methodLabel: group.methodLabel, value: Number(root) });
      }
    }
  }

  const candidates = [...byPartner.values()]
    .filter((item) => item.methods.length >= 2)
    .sort((a, b) => b.methods.length - a.methods.length || a.order - b.order || a.partner.localeCompare(b.partner, "he"));

  const lead = candidates[0];
  if (!lead) return null;
  return Object.freeze({
    kind: "cross_method_intersection",
    label: "הצלבה",
    partner: lead.partner,
    root: Number(root),
    methods: Object.freeze(lead.methods),
    methodCount: lead.methods.length,
    explainWhy: `${expression} ו־${lead.partner} נפגשים ב־${lead.methods.length} שיטות על ${root}. זו הצלבה חישובית; המשמעות המחקרית נשארת נפרדת.`,
    source: "entityHubProjection.gematria.families",
  });
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
  const crossing = deriveLeadingCrossing({ families, expression, root });
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
