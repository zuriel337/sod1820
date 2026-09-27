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

export const JOURNEY_2029_EVENTS = Object.freeze([
  "start",
  "step",
  "save",
  "resume",
  "fork",
  "complete",
]);

const KIND_SET = new Set(JOURNEY_2029_KINDS);
const MODE_SET = new Set(JOURNEY_2029_MODES);
const EVENT_SET = new Set(JOURNEY_2029_EVENTS);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanToken(value, max = 80) {
  if (value == null) return null;
  const text = String(value).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  return text ? text.slice(0, max) : null;
}

export function normalizeJourney2029Kind(value) {
  const key = cleanToken(value);
  return KIND_SET.has(key) ? key : "general_research";
}

export function normalizeJourney2029Mode(value) {
  const key = cleanToken(value);
  return MODE_SET.has(key) ? key : "organic";
}

export function normalizeJourney2029Event(value) {
  const key = cleanToken(value);
  return EVENT_SET.has(key) ? key : null;
}

export function journey2029StateFromContext(context) {
  const dimensions = context?.dimensions;
  if (!dimensions || dimensions.journey2029Active !== true) return null;
  return {
    kind: normalizeJourney2029Kind(dimensions.journey2029Kind),
    mode: normalizeJourney2029Mode(dimensions.journey2029Mode),
    sourceSurface: cleanToken(dimensions.journey2029SourceSurface),
  };
}

export function buildJourney2029ContextPatch({
  kind = "general_research",
  mode = "organic",
  sourceSurface = null,
} = {}) {
  return {
    dimensions: {
      journey2029Active: true,
      journey2029Kind: normalizeJourney2029Kind(kind),
      journey2029Mode: normalizeJourney2029Mode(mode),
      journey2029SourceSurface: cleanToken(sourceSurface),
    },
  };
}

export function buildJourney2029Telemetry(eventType, {
  context = null,
  kind = null,
  mode = null,
  sourceSurface = null,
  pathId = null,
} = {}) {
  const event = normalizeJourney2029Event(eventType);
  if (!event) return null;

  const state = journey2029StateFromContext(context);
  const rootType = cleanToken(context?.subject?.type);
  const safePathId = UUID_RE.test(String(pathId || "")) ? String(pathId) : null;

  return {
    surface: "journey_2029",
    eventType: event,
    options: {
      journeyId: safePathId,
      props: {
        journey_kind: normalizeJourney2029Kind(kind || state?.kind),
        journey_mode: normalizeJourney2029Mode(mode || state?.mode),
        source_surface: cleanToken(sourceSurface || state?.sourceSurface),
        root_type: rootType,
        has_path: Boolean(safePathId),
      },
    },
  };
}

export function emitJourney2029(eventType, args = {}) {
  const payload = buildJourney2029Telemetry(eventType, args);
  if (!payload) return false;
  emit(payload.surface, payload.eventType, payload.options);
  return true;
}
