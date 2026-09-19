import { topicConvergenceContentSections } from "./topicConvergence.js";
import { canonicalResearchPublicLabel } from "../presentation/canonicalPresentation.js";

const clean = (value) => value == null ? "" : String(value).trim();
const CONVERGENCE = canonicalResearchPublicLabel("convergence");

function topicSourceFact(finding) {
  return (finding?.evidence?.facts || []).find((fact) => fact?.type === "topic-card-source") || null;
}

function firstText(items = []) {
  const item = (Array.isArray(items) ? items : []).find((row) => clean(row?.text || row?.title || row?.phrase));
  return clean(item?.text || item?.title || item?.phrase) || null;
}

function shorten(value, max = 160) {
  const text = clean(value).replace(/\s+/g, " ");
  if (!text) return null;
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const at = cut.lastIndexOf(" ");
  return `${cut.slice(0, at > max * 0.6 ? at : max).trim()}…`;
}

function meaningfulDescription(source, content, title) {
  const s = content?.sections || {};
  const phraseSummary = (s.phrases || []).slice(0, 5).map((row) => clean(row?.text)).filter(Boolean).join(" · ");
  return shorten(
    source?.subtitle
    || firstText(s.hint)
    || firstText(s.headline)
    || firstText(s.bullets)
    || phraseSummary
    || title,
  );
}

function cleanAttribution(content, source) {
  const values = [
    clean(source?.created_by),
    ...(content?.attribution || []).map((row) => clean(row?.text)),
  ].filter(Boolean);
  return [...new Set(values)];
}

export function buildTopic2029Projection(finding) {
  if (!finding || finding.kind !== "convergence" || !clean(finding?.subject?.key)) return null;

  const source = topicSourceFact(finding);
  const content = topicConvergenceContentSections(finding);
  const sections = content?.sections || {};
  const anchors = (finding?.projection?.anchors || [])
    .filter((row) => row?.type === "number" && Number.isFinite(Number(row.value)))
    .map((row) => Number(row.value));

  const title = clean(finding?.subject?.label) || CONVERGENCE;
  const slug = clean(source?.slug || finding?.subject?.key);
  const description = meaningfulDescription(source, content, title);
  const highlightNumbers = Array.isArray(source?.highlight_numbers)
    ? source.highlight_numbers.map(Number).filter(Number.isFinite)
    : [];

  return {
    id: clean(finding.id) || null,
    slug,
    title,
    description,
    canonicalPath: slug ? `/topic/${encodeURIComponent(slug)}` : null,
    sourceRef: clean(finding?.source?.sourceRef) || null,
    entityRef: clean(finding?.identity?.entityRef) || null,
    numbers: [...new Set(anchors)],
    highlightNumbers: [...new Set(highlightNumbers)],
    createdBy: clean(source?.created_by || content?.createdBy) || null,
    attribution: cleanAttribution(content, source),
    createdAt: source?.created_at || null,
    approvedAt: source?.approved_at || null,
    occurredAt: source?.occurred_at || null,
    quality: Number.isFinite(Number(source?.quality)) ? Number(source.quality) : null,
    meterScore: Number.isFinite(Number(source?.meter_score)) ? Number(source.meter_score) : null,
    imageIds: Array.isArray(source?.image_ids) ? source.image_ids.map(String) : [],
    searchTerms: Array.isArray(source?.search_terms) ? source.search_terms.map(String) : [],
    withheld: Boolean(content?.flags?.doNotPublish || finding?.access?.reason === "source-flag:_do_not_publish"),
    content,
    sections,
    relatedConvergences: Array.isArray(sections.convergenceRefs) ? sections.convergenceRefs : [],
    relatedPosts: Array.isArray(sections.posts) ? sections.posts : [],
    phrases: Array.isArray(sections.phrases) ? sections.phrases : [],
    caveats: Array.isArray(sections.caveat) ? sections.caveat : [],
    hints: Array.isArray(sections.hint) ? sections.hint : [],
    authoredFactsCount: Number(content?.counts?.supported || 0),
    verificationState: finding?.verification?.verification_state || null,
    stage: finding?.stage || null,
    governanceStatus: finding?.status || null,
    publicLabel: CONVERGENCE,
  };
}

export function topic2029SearchAudit(projection) {
  if (!projection) return null;
  return {
    canonicalIdentity: Boolean(projection.slug && projection.canonicalPath),
    titleLength: clean(projection.title).length,
    descriptionLength: clean(projection.description).length,
    numberCount: projection.numbers.length,
    authoredFactsCount: projection.authoredFactsCount,
    phraseCount: projection.phrases.length,
    sourceAttributionCount: projection.attribution.length,
    imageCount: projection.imageIds.length,
    withheld: projection.withheld,
    note: "Audit signals only; this helper does not decide indexability.",
  };
}
