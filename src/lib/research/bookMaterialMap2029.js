const PILOT_SLUGS = Object.freeze(["ahavat-torah", "sefer-hapliah"]);
const PILOT_SLUG_SET = new Set(PILOT_SLUGS);

const INVENTORY_LABELS = Object.freeze({
  content_blocks: "בלוקי תוכן",
  page_register: "עמודים ברישום",
  datasets: "מאגרי נתונים",
  calculations: "חישובים",
  occurrence_tables: "טבלאות מופעים",
  number_families: "משפחות מספרים",
  relations: "קשרים",
  contradictions: "סתירות",
  exceptions: "חריגים",
  sources: "מקורות והפניות",
});

function clean(value) {
  return value == null ? "" : String(value).replace(/\s+/g, " ").trim();
}

function safePublicUrl(value) {
  const text = clean(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function unavailable(slug, reason) {
  return {
    available: false,
    slug: clean(slug) || null,
    reason,
    source: null,
    metrics: [],
    coverage: [],
    findings: [],
    methods: [],
    connections: [],
    openQuestions: [],
    inventory: [],
  };
}

function normalizeMetric(row, index) {
  if (!Array.isArray(row)) return null;
  const value = clean(row[0]);
  const label = clean(row[1]);
  if (!value && !label) return null;
  return { id: `metric-${index + 1}`, value, label, note: clean(row[2]) || null };
}

function normalizeCoverage(row, index) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const label = clean(row.label);
  const value = clean(row.value);
  if (!label && !value) return null;
  return { id: `coverage-${index + 1}`, label, value, note: clean(row.note) || null };
}

function normalizeFinding(row, index) {
  if (!Array.isArray(row)) return null;
  const id = clean(row[0]) || `finding-${index + 1}`;
  const title = clean(row[1]);
  if (!title) return null;
  return {
    id,
    title,
    locus: clean(row[2]) || null,
    status: clean(row[3]) || null,
    note: clean(row[4]) || null,
  };
}

function normalizeMethod(row, index) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const title = clean(row.title);
  const text = clean(row.text);
  if (!title && !text) return null;
  return { id: `method-${index + 1}`, title: title || `משפחה ${index + 1}`, text };
}

function normalizeRelation(row, index) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const text = clean(row.description || row.text || row.note);
  if (!text) return null;
  const pages = Array.isArray(row.pdf_pages) ? row.pdf_pages.filter(Number.isFinite) : [];
  return {
    id: clean(row.relation_id || row.id) || `relation-${index + 1}`,
    title: clean(row.relation_id || row.kind) || `קשר ${index + 1}`,
    text,
    meta: [pages.length ? `עמודים ${pages.join(", ")}` : null, clean(row.confidence) || null].filter(Boolean).join(" · ") || null,
  };
}

function normalizeSeed(row, index) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const title = clean(row.label);
  if (!title) return null;
  return {
    id: clean(row.key) || `seed-${index + 1}`,
    title,
    text: [clean(row.family), clean(row.status)].filter(Boolean).join(" · "),
    meta: Number.isFinite(row.page) ? `עמוד ${row.page}` : null,
  };
}

function normalizeOpenQuestion(value, index) {
  const text = clean(value);
  return text ? { id: `open-${index + 1}`, text } : null;
}

function compact(items) {
  return items.filter(Boolean);
}

export const BOOK_MATERIAL_PREVIEW_SLUGS = PILOT_SLUGS;

export function isBookMaterialPreview(slug) {
  return PILOT_SLUG_SET.has(clean(slug));
}

/**
 * Converts an explicitly published public/book-data bundle into one human-facing
 * material map. This is a presentation projection only: it never reads or
 * backfills private/candidate research and never changes the source bundle.
 */
export function buildBookMaterialMap(bundle, { expectedSlug } = {}) {
  if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) {
    return unavailable(expectedSlug, "invalid_bundle");
  }

  const slug = clean(bundle.book_slug);
  const expected = clean(expectedSlug);
  if (!isBookMaterialPreview(slug) || (expected && slug !== expected)) {
    return unavailable(expected || slug, "identity_mismatch");
  }

  const hero = bundle.hero && typeof bundle.hero === "object" ? bundle.hero : {};
  const relations = compact((Array.isArray(bundle.relations) ? bundle.relations : []).map(normalizeRelation));
  const seeds = compact((Array.isArray(hero.seeds) ? hero.seeds : []).map(normalizeSeed));
  const inventory = Object.entries(INVENTORY_LABELS).flatMap(([key, label]) => {
    const value = Array.isArray(bundle[key]) ? bundle[key].length : 0;
    return value ? [{ key, label, value }] : [];
  });

  return {
    available: true,
    slug,
    reason: null,
    schemaVersion: Number(bundle.schema_version) || null,
    source: {
      identity: clean(bundle.source_identity) || null,
      subtitle: clean(hero.subtitle) || null,
      promise: clean(hero.promise) || null,
      pdfUrl: safePublicUrl(hero.pdf),
      generatedAt: clean(bundle.generated_at) || null,
    },
    metrics: compact((Array.isArray(hero.metrics) ? hero.metrics : []).map(normalizeMetric)),
    coverage: compact((Array.isArray(hero.coverage) ? hero.coverage : []).map(normalizeCoverage)),
    findings: compact((Array.isArray(hero.datasets) ? hero.datasets : []).map(normalizeFinding)),
    methods: compact((Array.isArray(hero.families) ? hero.families : []).map(normalizeMethod)),
    connections: relations.length ? relations : seeds,
    openQuestions: compact((Array.isArray(hero.open) ? hero.open : []).map(normalizeOpenQuestion)),
    inventory,
  };
}

export async function fetchBookMaterialMap(slug, { fetchImpl = globalThis.fetch } = {}) {
  const safeSlug = clean(slug);
  if (!isBookMaterialPreview(safeSlug)) return unavailable(safeSlug, "not_in_preview");
  if (typeof fetchImpl !== "function") return unavailable(safeSlug, "fetch_unavailable");

  try {
    const response = await fetchImpl(`/book-data/${safeSlug}.tables.json`, {
      headers: { Accept: "application/json" },
    });
    if (!response?.ok) return unavailable(safeSlug, "bundle_unavailable");
    const bundle = await response.json();
    return buildBookMaterialMap(bundle, { expectedSlug: safeSlug });
  } catch {
    return unavailable(safeSlug, "load_failed");
  }
}
