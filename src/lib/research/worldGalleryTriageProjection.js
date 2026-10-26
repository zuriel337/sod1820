import { getGalleryPage } from "../supabase.js";

const clean = (value) => value == null ? "" : String(value).trim();
const OCR_COMPLETE = new Set(["done", "complete", "completed", "verified"]);

function stringList(value) {
  return Array.isArray(value) ? value.map(clean).filter(Boolean) : [];
}

function numberList(value) {
  return Array.isArray(value) ? value.map(Number).filter(Number.isFinite) : [];
}

function isPublicGalleryRow(row) {
  return Number(row?.published) === 1
    && Number(row?.min_tier || 0) === 0
    && row?.curator_hidden !== true
    && Boolean(clean(row?.image_url));
}

function completenessScore(row) {
  return clean(row?.description).length * 2
    + clean(row?.name).length
    + stringList(row?.tags).length * 20
    + numberList(row?.ocr_numbers).length * 8
    + (OCR_COMPLETE.has(clean(row?.ocr_status).toLowerCase()) ? 40 : 0)
    + (row?.occurred_at ? 5 : 0)
    + (row?.thumb_url ? 3 : 0);
}

function chooseRepresentative(rows) {
  return [...rows].sort((left, right) => completenessScore(right) - completenessScore(left)
    || clean(right?.description).length - clean(left?.description).length
    || clean(right?.name).length - clean(left?.name).length
    || clean(right?.created_at).localeCompare(clean(left?.created_at))
    || clean(left?.id).localeCompare(clean(right?.id)))[0];
}

function projectOccurrence(row, ocrIssueIds) {
  const id = clean(row?.id);
  return Object.freeze({
    id,
    sourceRef: id ? `gallery_images:${id}` : null,
    title: clean(row?.name) || clean(row?.description) || "תמונה ללא כותרת",
    description: clean(row?.description) || null,
    imageUrl: clean(row?.image_url) || null,
    thumbUrl: clean(row?.thumb_url) || clean(row?.image_url) || null,
    source: clean(row?.source) || "לא צוין",
    galleryId: row?.gallery_id ?? null,
    wpGalleryId: row?.wp_gallery_id ?? null,
    occurredAt: row?.occurred_at || null,
    createdAt: row?.created_at || null,
    ocrStatus: clean(row?.ocr_status) || "לא צוין",
    ocrIncomplete: ocrIssueIds.has(id),
    tags: Object.freeze(stringList(row?.tags)),
    numbers: Object.freeze(numberList(row?.ocr_numbers)),
    publicVisible: isPublicGalleryRow(row),
    completenessScore: completenessScore(row),
  });
}

export function projectWorldGalleryTriageRows(rows = [], { ocrIssueIds = [] } = {}) {
  const issueIds = new Set((Array.isArray(ocrIssueIds) ? ocrIssueIds : []).map(clean).filter(Boolean));
  const byId = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const id = clean(row?.id);
    if (id && clean(row?.image_url)) byId.set(id, row);
  }
  const uniqueRows = [...byId.values()];
  const byExactUrl = new Map();
  for (const row of uniqueRows) {
    const key = clean(row.image_url);
    const group = byExactUrl.get(key) || [];
    group.push(row);
    byExactUrl.set(key, group);
  }

  const workItems = [];
  let duplicateGroups = 0;
  let duplicateRows = 0;
  for (const groupRows of byExactUrl.values()) {
    const hasDuplicate = groupRows.length > 1;
    const hasOcrIssue = groupRows.some((row) => issueIds.has(clean(row.id)));
    if (hasDuplicate) {
      duplicateGroups += 1;
      duplicateRows += groupRows.length - 1;
    }
    if (!hasDuplicate && !hasOcrIssue) continue;

    const representativeRow = chooseRepresentative(groupRows);
    const representative = projectOccurrence(representativeRow, issueIds);
    const occurrences = [representativeRow, ...groupRows.filter((row) => row !== representativeRow)]
      .map((row) => projectOccurrence(row, issueIds));
    const issues = [hasOcrIssue ? "ocr" : null, hasDuplicate ? "duplicate" : null].filter(Boolean);
    workItems.push(Object.freeze({
      id: representative.id,
      sourceRef: representative.sourceRef,
      title: representative.title,
      description: representative.description,
      imageUrl: representative.imageUrl,
      thumbUrl: representative.thumbUrl,
      publicVisible: occurrences.some((row) => row.publicVisible),
      ocrStatus: representative.ocrStatus,
      tags: representative.tags,
      numbers: representative.numbers,
      issues: Object.freeze(issues),
      occurrenceCount: occurrences.length,
      independentSourceCount: 1,
      occurrences: Object.freeze(occurrences),
      sourceRefs: Object.freeze(occurrences.map((row) => row.sourceRef).filter(Boolean)),
      recommendedDisplayId: representative.id,
      recommendation: hasOcrIssue
        ? "להשלים OCR ולבדוק את הטקסט לפני חיבור מחקרי."
        : "לאגד בתצוגה בלבד ולשמור את כל הופעות המקור.",
      representativeReason: "זהו הנוסח העשיר ביותר בשם, תיאור, תגיות ומספרי OCR בתוך כתובת התמונה הזהה.",
    }));
  }

  const issuePriority = (item) => item.issues.includes("ocr") ? 0 : 1;
  workItems.sort((left, right) => issuePriority(left) - issuePriority(right)
    || right.occurrenceCount - left.occurrenceCount
    || left.title.localeCompare(right.title, "he")
    || left.id.localeCompare(right.id));

  return Object.freeze({
    capturedAt: new Date().toISOString(),
    rows: Object.freeze(workItems),
    counts: Object.freeze({
      total: uniqueRows.length,
      publicVisible: uniqueRows.filter(isPublicGalleryRow).length,
      ocrReview: issueIds.size,
      ocrStatusIncomplete: uniqueRows.filter((row) => !OCR_COMPLETE.has(clean(row?.ocr_status).toLowerCase())).length,
      missingTags: uniqueRows.filter((row) => stringList(row?.tags).length === 0).length,
      missingLabel: uniqueRows.filter((row) => !clean(row?.name) && !clean(row?.description)).length,
      duplicateGroups,
      duplicateRows,
      queueItems: workItems.length,
    }),
    rules: Object.freeze({
      exactUrlOnly: true,
      duplicateOccurrencesAreNotIndependentSources: true,
      noSourceDeletion: true,
      ocrIsStoredExtractionNotTruth: true,
      noAutomaticTreePromotion: true,
    }),
  });
}

export async function fetchWorldGalleryTriageProjection({ reader = getGalleryPage, pageSize = 500 } = {}) {
  const first = await reader({ page: 0, limit: pageSize, hidden: "all", review: "identity", withCount: true });
  const rows = [...(first?.data || [])];
  const total = Math.max(rows.length, Number(first?.count) || 0);
  const pages = Math.min(20, Math.ceil(total / pageSize));
  for (let page = 1; page < pages; page += 1) {
    const result = await reader({ page, limit: pageSize, hidden: "all", review: "identity", withCount: false });
    rows.push(...(result?.data || []));
  }
  const ocr = await reader({ page: 0, limit: 100, hidden: "all", review: "ocr", withCount: true });
  return projectWorldGalleryTriageRows(rows, {
    ocrIssueIds: (ocr?.data || []).map((row) => row?.id),
  });
}
