import { emit } from "../events.js";

export const JOURNEY_2029_KINDS = Object.freeze([
  "discovery",
  "number_expression",
  "person_life",
  "name",
  "els",
  "source_book",
  "topic_event",
  "general_research",
]);

export const JOURNEY_2029_MODES = Object.freeze(["organic", "guided"]);
export const JOURNEY_2029_EVENTS = Object.freeze(["start", "step", "save", "resume", "fork", "complete"]);

const KIND_SET = new Set(JOURNEY_2029_KINDS);
const MODE_SET = new Set(JOURNEY_2029_MODES);
const EVENT_SET = new Set(JOURNEY_2029_EVENTS);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function token(value, max = 96) {
  const text = value == null ? "" : String(value).trim().replace(/\s+/g, "-");
  return text ? text.slice(0, max) : null;
}

export function makeJourney2029InstanceKey(prefix = "journey") {
  try {
    if (globalThis.crypto?.randomUUID) return `${token(prefix, 32) || "journey"}:${globalThis.crypto.randomUUID()}`;
  } catch { /* noop */ }
  return `${token(prefix, 32) || "journey"}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

// Public Journey telemetry is intentionally content-free.
// Never pass a query, name, person-ref, family value, source text or private locator here.
export function emitJourney2029(eventType, {
  journeyKind = "general_research",
  journeyMode = "organic",
  sourceSurface = null,
  rootType = null,
  pathId = null,
  publicInstanceKey = null,
} = {}) {
  if (!EVENT_SET.has(eventType)) return null;

  const kind = KIND_SET.has(journeyKind) ? journeyKind : "general_research";
  const mode = MODE_SET.has(journeyMode) ? journeyMode : "organic";
  const source = token(sourceSurface, 64);
  const root = token(rootType, 48);
  const instance = token(publicInstanceKey, 120) || makeJourney2029InstanceKey(kind);

  emit("journey_2029", eventType, {
    journeyId: UUID_RE.test(String(pathId || "")) ? String(pathId) : null,
    props: {
      journey_kind: kind,
      journey_mode: mode,
      source_surface: source,
      root_type: root,
      journey_instance: instance,
    },
  });

  return instance;
}
