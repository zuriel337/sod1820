import { fetchTopicCardList } from "./topicConvergence.js";
import { fetchBookEntities } from "./bookResearchProjection.js";
import { canonicalResearchPublicLabel } from "../presentation/canonicalPresentation.js";

const clean = (value) => value == null ? "" : String(value).trim();
const CONVERGENCE = canonicalResearchPublicLabel("convergence");

function publicPersonForName(name, publicPeople = []) {
  const creator = clean(name);
  if (!creator) return null;
  for (const person of Array.isArray(publicPeople) ? publicPeople : []) {
    const names = [clean(person?.displayName), ...(Array.isArray(person?.aliases) ? person.aliases.map(clean) : [])].filter(Boolean);
    if (names.includes(creator)) return person;
  }
  return null;
}

function publicCreatorLabel(value, publicPeople = []) {
  const creator = clean(value);
  if (!creator) return "מקור ציבורי";
  const lower = creator.toLowerCase();
  if (lower === "ai") return "AI";
  if (lower.startsWith("מנוע")) return creator;
  if (lower === "sod1820" || lower === "sod 1820" || lower === "agent:sod1820") return "SOD1820";

  const person = publicPersonForName(creator, publicPeople);
  if (person) return clean(person.displayName) || "חוקר";
  return "מקור ציבורי";
}

function safeDate(value) {
  const raw = clean(value);
  if (!raw) return null;
  const time = Date.parse(raw);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function finite(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function topicRowToWorldUpdate(row, { publicPeople = [] } = {}) {
  if (!row?.id) return null;
  const approvedAt = safeDate(row.approved_at);
  const createdAt = safeDate(row.created_at);
  return {
    id: `topic:${row.id}`,
    kind: "convergence",
    label: clean(row.title) || CONVERGENCE,
    summary: clean(row.subtitle) || null,
    creator: publicCreatorLabel(row.created_by, publicPeople),
    at: approvedAt || createdAt,
    approvedAt,
    createdAt,
    slug: clean(row.slug) || null,
    value: Array.isArray(row.highlight_numbers) && row.highlight_numbers.length
      ? finite(row.highlight_numbers[0])
      : (Array.isArray(row.numbers) && row.numbers.length ? finite(row.numbers[0]) : null),
    numbers: Array.isArray(row.numbers) ? row.numbers.map(finite).filter((value) => value != null) : [],
    sourceRef: `topic_cards:${row.id}`,
    publicState: "approved_public_projection",
  };
}

export function researchRowToWorldUpdate(row, { publicPeople = [] } = {}) {
  if (!row?.id) return null;
  const status = clean(row.status).toLowerCase();
  if (!["approved", "canonical"].includes(status)) return null;
  const createdAt = safeDate(row.created_at);
  const value = finite(row.value);
  const contributor = clean(row.contributor);
  const person = publicPersonForName(contributor, publicPeople);
  return {
    id: `research:${row.id}`,
    kind: "finding",
    findingKind: clean(row.kind) || "observation",
    label: clean(row.statement) || "ממצא מחקר חדש",
    summary: clean(row.evidence) || null,
    creator: publicCreatorLabel(contributor, publicPeople),
    creatorSlug: person?.slug || null,
    at: createdAt,
    approvedAt: null,
    createdAt,
    slug: null,
    value,
    numbers: value == null ? [] : [value],
    sourceRef: clean(row.source_ref) || `research_objects:${row.id}`,
    publicState: "authorized_research_projection",
  };
}

export function buildWorldDiscoveryStream(input = [], { creator = "all", limit = 18, publicPeople = [] } = {}) {
  const safeCreator = clean(creator);
  const topicRows = Array.isArray(input) ? input : (Array.isArray(input?.topics) ? input.topics : []);
  const researchRows = Array.isArray(input) ? [] : (Array.isArray(input?.research) ? input.research : []);

  const candidates = [
    ...topicRows.map((row) => topicRowToWorldUpdate(row, { publicPeople })),
    ...researchRows.map((row) => researchRowToWorldUpdate(row, { publicPeople })),
  ].filter(Boolean);

  const items = candidates
    .filter((item) => safeCreator === "all" || item.creator === safeCreator)
    .sort((a, b) => {
      const atA = a.at ? Date.parse(a.at) : 0;
      const atB = b.at ? Date.parse(b.at) : 0;
      return atB - atA || a.id.localeCompare(b.id);
    })
    .slice(0, Math.max(1, Math.min(Number(limit) || 18, 40)));

  const creators = [...new Set(candidates.map((item) => item.creator).filter(Boolean))];

  return {
    items,
    creators,
    total: items.length,
    sourceCounts: {
      findings: candidates.filter((item) => item.kind === "finding").length,
      convergences: candidates.filter((item) => item.kind === "convergence").length,
    },
    note: "Latest authorized Research Findings + approved public Convergences. Visibility follows the current session/RLS; order is time, never truth rank.",
  };
}

export async function fetchWorldDiscoveryStream({ limit = 18, publicPeople = [], includeResearch = false } = {}) {
  const requested = Math.max(1, Math.min(Number(limit) || 18, 40));
  const topicPromise = fetchTopicCardList({
    limit: Math.min(40, Math.max(requested, 24)),
    offset: 0,
    rankByMeterScore: false,
  });
  const researchPromise = includeResearch
    ? import("../supabase.js").then(async ({ supabase }) => {
        const { data, error } = await supabase
          .from("research_objects")
          .select("id,created_at,kind,statement,evidence,value,source_ref,contributor,status")
          .in("status", ["approved", "canonical"])
          .order("created_at", { ascending: false })
          .limit(Math.min(80, Math.max(requested * 2, 40)));
        if (error) throw error;
        return Array.isArray(data) ? data : [];
      })
    : Promise.resolve([]);

  const [topicResult, researchResult] = await Promise.all([topicPromise, researchPromise]);
  const topics = Array.isArray(topicResult?.rows) ? topicResult.rows : [];
  return buildWorldDiscoveryStream(
    { topics, research: researchResult },
    { limit: requested, publicPeople }
  );
}
