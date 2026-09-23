const clean = (value) => value == null ? "" : String(value).trim();

let catalogCache = null;
let catalogPending = null;

function numericValue(row) {
  const value = Number(row?.metadata?.value ?? (row?.type === "number" ? row?.label : null));
  return Number.isSafeInteger(value) ? value : null;
}

export function classifyCurationNode(row = {}) {
  const tier = clean(row?.metadata?.tier).toLowerCase();
  const role = clean(row?.metadata?.role).toLowerCase();
  const type = clean(row?.type).toLowerCase();
  if (role === "crown_anchor" && type === "number") return "crown_anchor";
  if (tier === "diamond" && type === "entity") return "diamond_core";
  if (tier === "gold" && type === "number" && role === "anchor") return "gold_anchor";
  if (tier === "gold" && type === "entity") return "gold_core";
  return null;
}

function humanReason(item) {
  if (item.kind === "diamond_core") return "אחת מחתימות היהלום הנדירות שמרכיבות את כתר 1820.";
  if (item.kind === "crown_anchor") return "המרכז המספרי של כתר 1820, שאליו מתחברות חתימות היהלום והעדויות.";
  if (item.kind === "gold_anchor") return item.axisTheme
    ? `עוגן מספרי מרכזי בציר ${item.axisTheme}.`
    : "עוגן מספרי מרכזי שמרכז סביבו חיבורים מאומתים.";
  if (item.kind === "gold_core") return item.family === "david_geula_core"
    ? "זהות ליבה ממשפחת הזהב של דוד, גאולה ומשיח."
    : "זהות ליבה שנבחרה לזהב במחקר.";
  return "אוצר מחקר מרכזי.";
}

export function normalizeCurationNode(row = {}) {
  const kind = classifyCurationNode(row);
  if (!kind) return null;
  const item = {
    id: clean(row.id),
    type: clean(row.type),
    label: clean(row.label),
    description: clean(row.description) || null,
    tier: clean(row?.metadata?.tier).toLowerCase() || null,
    role: clean(row?.metadata?.role).toLowerCase() || null,
    family: clean(row?.metadata?.curation_family) || null,
    value: numericValue(row),
    axisTheme: clean(row.axis_theme) || null,
    rawReason: clean(row?.metadata?.curation_reason) || null,
    reason: null,
    kind,
  };
  item.reason = humanReason(item);
  return Object.freeze(item);
}

const itemOrder = Object.freeze({
  diamond_core: 0,
  crown_anchor: 1,
  gold_core: 2,
  gold_anchor: 3,
});

export function buildCurationCatalog2029(rows = []) {
  const items = [];
  const seen = new Set();
  for (const row of Array.isArray(rows) ? rows : []) {
    const item = normalizeCurationNode(row);
    if (!item || !item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
  }
  items.sort((a, b) => (
    (itemOrder[a.kind] ?? 99) - (itemOrder[b.kind] ?? 99)
    || (a.value ?? Number.MAX_SAFE_INTEGER) - (b.value ?? Number.MAX_SAFE_INTEGER)
    || a.label.localeCompare(b.label, "he")
  ));

  const diamonds = items.filter((item) => item.kind === "diamond_core");
  const gold = items.filter((item) => item.kind === "gold_core");
  const anchors = items.filter((item) => item.kind === "gold_anchor" || item.kind === "crown_anchor");
  const byLabel = Object.freeze(Object.fromEntries(items.map((item) => [item.label, item])));
  const byValue = {};
  for (const item of anchors) {
    if (item.value == null) continue;
    if (!byValue[item.value]) byValue[item.value] = item;
  }

  return Object.freeze({
    items: Object.freeze(items),
    diamonds: Object.freeze(diamonds),
    gold: Object.freeze(gold),
    anchors: Object.freeze(anchors),
    byLabel,
    byValue: Object.freeze(byValue),
  });
}

export async function fetchCurationCatalog2029() {
  if (catalogCache) return catalogCache;
  if (catalogPending) return catalogPending;
  catalogPending = (async () => {
    const { supabase } = await import("../supabase.js");
    const fields = "id,type,label,description,metadata,axis_theme,is_active";
    const [diamondResult, goldResult, crownResult] = await Promise.all([
      supabase.from("nodes").select(fields).eq("is_active", true).eq("metadata->>tier", "diamond").limit(40),
      supabase.from("nodes").select(fields).eq("is_active", true).eq("metadata->>tier", "gold").limit(120),
      supabase.from("nodes").select(fields).eq("is_active", true).eq("metadata->>role", "crown_anchor").limit(20),
    ]);
    const error = diamondResult.error || goldResult.error || crownResult.error;
    if (error) throw error;
    catalogCache = buildCurationCatalog2029([
      ...(diamondResult.data || []),
      ...(goldResult.data || []),
      ...(crownResult.data || []),
    ]);
    return catalogCache;
  })().finally(() => { catalogPending = null; });
  return catalogPending;
}

function relationEndpointLabels(row) {
  const relation = row?.projection?.relations?.[0] || row?.relation || row || {};
  const labels = [];
  for (const endpoint of [relation?.from, relation?.to]) {
    const label = clean(endpoint?.label || endpoint?.name);
    if (label) labels.push(label);
  }
  const fallback = clean(row?.label);
  if (fallback) labels.push(fallback);
  return labels;
}

export function buildNumberCuration2029({ root, relations = [], catalog = null } = {}) {
  const value = Number(root);
  const safeCatalog = catalog || buildCurationCatalog2029([]);
  const anchor = Number.isSafeInteger(value) ? safeCatalog.byValue?.[value] || null : null;
  const relationLabels = new Set();
  let witnessCount = 0;
  for (const relation of Array.isArray(relations) ? relations : []) {
    for (const label of relationEndpointLabels(relation)) relationLabels.add(label);
    const role = clean(relation?.metadata?.curation_role || relation?.projection?.relations?.[0]?.metadata?.curation_role);
    if (role === "gold_witness" || role === "diamond_witness") witnessCount += 1;
  }

  const cores = [...safeCatalog.diamonds, ...safeCatalog.gold]
    .filter((item) => item.value === value || relationLabels.has(item.label))
    .sort((a, b) => (
      (itemOrder[a.kind] ?? 99) - (itemOrder[b.kind] ?? 99)
      || a.label.localeCompare(b.label, "he")
    ));

  return Object.freeze({
    anchor,
    cores: Object.freeze(cores.slice(0, 3)),
    coreCount: cores.length,
    witnessCount,
    hasCuration: Boolean(anchor || cores.length),
  });
}

export function curationForLabel2029(catalog, label) {
  return catalog?.byLabel?.[clean(label)] || null;
}

export function curationForValue2029(catalog, value) {
  const n = Number(value);
  return Number.isSafeInteger(n) ? catalog?.byValue?.[n] || null : null;
}
