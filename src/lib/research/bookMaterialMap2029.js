import { selectionToWorkspaceItem } from "./bookSelectionAdapter.js";

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
    sections: [],
    methods: [],
    connections: [],
    witnessClosures: [],
    openQuestions: [],
    completion: null,
    researchIntake: null,
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

function normalizeMaterialSection(row, index) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const title = clean(row.title);
  const pages = clean(row.pages);
  const material = clean(row.material || row.text || row.note);
  if (!title && !material) return null;
  return {
    id: clean(row.id) || `material-section-${index + 1}`,
    title: title || `חטיבה ${index + 1}`,
    pages: pages || null,
    material,
    status: clean(row.status) || null,
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

function normalizeWitnessClosure(row, index) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const title = clean(row.title);
  if (!title) return null;
  return {
    id: clean(row.id) || `witness-closure-${index + 1}`,
    title,
    locus: clean(row.locus) || null,
    status: clean(row.status) || null,
    note: clean(row.note) || null,
    sourceRef: clean(row.source_ref) || null,
  };
}

function normalizeCompletion(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const label = clean(row.label);
  const summary = clean(row.summary);
  if (!label && !summary) return null;
  return {
    phase: clean(row.phase) || null,
    label: label || "מצב מפת החומר",
    summary,
    blockingOpen: Number.isFinite(row.blocking_open) ? row.blocking_open : null,
    extractionBacklog: Number.isFinite(row.extraction_backlog) ? row.extraction_backlog : null,
    sourceNativeQuestions: Number.isFinite(row.source_native_questions) ? row.source_native_questions : null,
    nextPhase: clean(row.next_phase) || null,
  };
}

function normalizeResearchIntakeStep(row, index) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const title = clean(row.title);
  if (!title) return null;
  return {
    id: clean(row.id) || `research-intake-${index + 1}`,
    title,
    target: clean(row.target) || null,
    status: clean(row.status) || null,
    note: clean(row.note) || null,
  };
}

function normalizeResearchIntake(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const steps = compact((Array.isArray(row.steps) ? row.steps : []).map(normalizeResearchIntakeStep));
  const status = clean(row.status);
  const principle = clean(row.principle);
  if (!steps.length && !status && !principle) return null;
  const cleanIds = (value) => Array.isArray(value) ? [...new Set(value.map(clean).filter(Boolean))] : [];
  return {
    status: status || null,
    principle: principle || null,
    steps,
    candidateDatasetIds: cleanIds(row.candidate_datasets),
    evidenceOnlyDatasetIds: cleanIds(row.evidence_only_datasets),
    withdrawnDatasetIds: cleanIds(row.withdrawn_provenance),
  };
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
    sections: compact((Array.isArray(hero.sections) ? hero.sections : []).map(normalizeMaterialSection)),
    methods: compact((Array.isArray(hero.families) ? hero.families : []).map(normalizeMethod)),
    connections: relations.length ? relations : seeds,
    witnessClosures: compact((Array.isArray(hero.witness_closures) ? hero.witness_closures : []).map(normalizeWitnessClosure)),
    openQuestions: compact((Array.isArray(hero.open) ? hero.open : []).map(normalizeOpenQuestion)),
    completion: normalizeCompletion(hero.completion),
    researchIntake: normalizeResearchIntake(hero.research_intake),
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

function firstPage(value) {
  const match = clean(value).match(/\d+/);
  const page = Number(match?.[0]);
  return Number.isFinite(page) && page > 0 ? page : null;
}

function materialSelectionItem(book, material, selection, intake) {
  const item = selectionToWorkspaceItem(book, selection, {
    snapshotVersion: `material-v${material.schemaVersion || 1}-${material.source?.generatedAt || "snapshot"}`,
    tab: "dossier",
  });
  if (!item) return null;
  return {
    ...item,
    metadata: {
      ...item.metadata,
      intake: {
        v: 1,
        disposition: intake.disposition,
        materialId: intake.materialId,
        workspaceOnly: true,
        createsResearchObject: false,
      },
    },
  };
}

/**
 * Builds the bounded Workspace pack for a completed public material map.
 * This is a deterministic client projection only: adding it to ResearchProvider
 * saves source-linked selections and never writes or promotes research_objects.
 */
export function buildBookMaterialWorkspacePack(material, book) {
  if (!material?.available || !book || material.researchIntake?.status !== "READY_FOR_SELECTIVE_INTAKE") return [];

  const sourceIdentity = clean(material.source?.identity);
  const bookIdentity = clean(book.identity_key) || (clean(book.id) ? `book:${clean(book.id)}` : "");
  if (!sourceIdentity || !bookIdentity) return [];

  const bookItem = {
    id: bookIdentity,
    type: "book",
    title: clean(book.label) || material.slug,
    label: clean(book.label) || material.slug,
    link: clean(book?.metadata?.route) || `/book/${encodeURIComponent(material.slug)}`,
    metadata: {
      nodeId: book.id || null,
      identityKey: book.identity_key || null,
      sourceRefPrefixes: book?.metadata?.source_ref_prefixes || [],
      witness: book?.metadata?.identity_tiers?.witness || null,
      digitalObject: book?.metadata?.identity_tiers?.digital_object || null,
      intake: { v: 1, disposition: "source_anchor", workspaceOnly: true, createsResearchObject: false },
    },
  };

  const candidateIds = new Set(material.researchIntake.candidateDatasetIds || []);
  const datasetItems = material.findings.flatMap((finding) => {
    if (!candidateIds.has(finding.id)) return [];
    const page = firstPage(finding.locus);
    if (!page) return [];
    const sourceRef = `${sourceIdentity}#p${page}:${finding.id.toLowerCase()}`;
    const item = materialSelectionItem(book, material, {
      source_ref: sourceRef,
      title: `${finding.id} · ${finding.title}`,
      status: "candidate",
      engine_verified: null,
      witness_state: finding.status,
      privacy_scope: "public",
      publication_state: "documented_public_bundle",
      truth_class: "source_backed_research_candidate",
      representation_shape: "dataset",
    }, { disposition: "candidate_finding", materialId: finding.id });
    return item ? [item] : [];
  });

  const witnessItems = material.witnessClosures.flatMap((closure) => {
    if (!closure.sourceRef) return [];
    const item = materialSelectionItem(book, material, {
      source_ref: closure.sourceRef,
      title: `${closure.id} · ${closure.title}`,
      status: "candidate",
      engine_verified: closure.status === "ENGINE_VERIFIED" ? true : null,
      witness_state: closure.status,
      privacy_scope: "public",
      publication_state: "documented_public_bundle",
      truth_class: "source_witness_observation",
      representation_shape: "witness_closure",
    }, { disposition: "witness_observation", materialId: closure.id });
    return item ? [item] : [];
  });

  const seen = new Set();
  return [bookItem, ...datasetItems, ...witnessItems].filter((item) => {
    const identity = `${item.type}:${item.ref || item.id}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}
