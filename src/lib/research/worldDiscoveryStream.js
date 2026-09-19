import { fetchTopicCardList } from "./topicConvergence.js";
import { canonicalResearchPublicLabel } from "../presentation/canonicalPresentation.js";

const clean = (value) => value == null ? "" : String(value).trim();
const CONVERGENCE = canonicalResearchPublicLabel("convergence");

function publicCreatorLabel(row, publicPeople = []) {
  const creator = clean(row?.created_by);
  if (!creator) return "מקור ציבורי";
  const lower = creator.toLowerCase();
  if (lower === "ai") return "AI";
  if (lower.startsWith("מנוע")) return creator;
  if (lower === "sod1820" || lower === "sod 1820") return "SOD1820";

  for (const person of Array.isArray(publicPeople) ? publicPeople : []) {
    const names = [clean(person?.displayName), ...(Array.isArray(person?.aliases) ? person.aliases.map(clean) : [])].filter(Boolean);
    if (names.includes(creator)) return clean(person?.displayName) || "חוקר";
  }
  return "מקור ציבורי";
}

function safeDate(value) {
  const raw = clean(value);
  if (!raw) return null;
  const time = Date.parse(raw);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
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
    creator: publicCreatorLabel(row, publicPeople),
    at: approvedAt || createdAt,
    approvedAt,
    createdAt,
    slug: clean(row.slug) || null,
    value: Array.isArray(row.highlight_numbers) && row.highlight_numbers.length
      ? Number(row.highlight_numbers[0])
      : (Array.isArray(row.numbers) && row.numbers.length ? Number(row.numbers[0]) : null),
    numbers: Array.isArray(row.numbers) ? row.numbers.map(Number).filter(Number.isFinite) : [],
    publicState: "approved_public_projection",
  };
}

export function buildWorldDiscoveryStream(rows = [], { creator = "all", limit = 18, publicPeople = [] } = {}) {
  const safeCreator = clean(creator);
  const items = (Array.isArray(rows) ? rows : [])
    .map((row) => topicRowToWorldUpdate(row, { publicPeople }))
    .filter(Boolean)
    .filter((item) => safeCreator === "all" || item.creator === safeCreator)
    .sort((a, b) => {
      const atA = a.at ? Date.parse(a.at) : 0;
      const atB = b.at ? Date.parse(b.at) : 0;
      return atB - atA || a.id.localeCompare(b.id);
    })
    .slice(0, Math.max(1, Math.min(Number(limit) || 18, 40)));

  const creators = [...new Set(
    (Array.isArray(rows) ? rows : [])
      .map((row) => publicCreatorLabel(row, publicPeople))
      .filter(Boolean)
  )];

  return {
    items,
    creators,
    total: items.length,
    note: "Latest approved public convergence projection only. Order is approval/creation time, never truth rank.",
  };
}

export async function fetchWorldDiscoveryStream({ limit = 18, publicPeople = [] } = {}) {
  const requested = Math.max(1, Math.min(Number(limit) || 18, 40));
  const result = await fetchTopicCardList({
    limit: requested,
    offset: 0,
    rankByMeterScore: false,
  });
  const rows = Array.isArray(result?.rows) ? result.rows : [];
  return buildWorldDiscoveryStream(rows, { limit: requested, publicPeople });
}
