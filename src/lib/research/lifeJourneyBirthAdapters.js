export const LIFE_JOURNEY_BIRTH_ADAPTER_VERSION = "life-journey-local-birth-adapters-v1";
export const LIFE_JOURNEY_BIRTH_ENGINE = Object.freeze({
  package: "natalengine",
  version: "1.6.0",
  backend: "astronomy-engine-vsop87",
  execution: "local_browser_only",
});

const BODY_LABELS = Object.freeze({
  sun: "שמש",
  earth: "ארץ",
  moon: "ירח",
  north_node: "ראש דרקון",
  south_node: "זנב דרקון",
  northNode: "ראש דרקון",
  southNode: "זנב דרקון",
  mercury: "כוכב חמה",
  venus: "נוגה",
  mars: "מאדים",
  jupiter: "צדק",
  saturn: "שבתאי",
  uranus: "אורנוס",
  neptune: "נפטון",
  pluto: "פלוטו",
  ascendant: "אופק עולה",
  midheaven: "רום שמיים",
});

const SIGN_LABELS = Object.freeze({
  Aries: "טלה",
  Taurus: "שור",
  Gemini: "תאומים",
  Cancer: "סרטן",
  Leo: "אריה",
  Virgo: "בתולה",
  Libra: "מאזניים",
  Scorpio: "עקרב",
  Sagittarius: "קשת",
  Capricorn: "גדי",
  Aquarius: "דלי",
  Pisces: "דגים",
});

const TYPE_LABELS = Object.freeze({
  Generator: "Generator · מחולל",
  "Manifesting Generator": "Manifesting Generator · מחולל יוזם",
  Projector: "Projector · מקרין",
  Manifestor: "Manifestor · יוזם",
  Reflector: "Reflector · משקף",
});

const AUTHORITY_LABELS = Object.freeze({
  "Emotional Authority": "רגשית · מקלעת השמש",
  "Sacral Authority": "סקרלית",
  "Splenic Authority": "טחולית",
  "Ego/Heart Authority": "אגו · לב",
  "Self-Projected Authority": "מוקרנת־עצמי · מרכז G",
  "Mental/Environment": "מנטלית · סביבתית",
  "Lunar Authority": "ירחית",
});

const STRATEGY_LABELS = Object.freeze({
  Inform: "ליידע לפני פעולה",
  "Wait to Respond": "להמתין לתגובה",
  "Wait to Respond, then Inform": "להמתין לתגובה ואז ליידע",
  "Wait for the Invitation": "להמתין להזמנה",
  "Wait a Lunar Cycle": "להמתין למחזור ירח",
  Wait: "להמתין",
});

const DEFINITION_LABELS = Object.freeze({
  "No Definition": "ללא הגדרה קבועה",
  "Single Definition": "הגדרה אחידה",
  "Split Definition": "הגדרה מפוצלת",
  "Triple Split Definition": "הגדרה מפוצלת לשלושה",
  "Triple Split": "הגדרה מפוצלת לשלושה",
  "Quadruple Split Definition": "הגדרה מפוצלת לארבעה",
  "Quadruple Split": "הגדרה מפוצלת לארבעה",
});

const CENTER_LABELS = Object.freeze({
  head: "ראש",
  ajna: "אג'נה",
  throat: "גרון",
  g: "זהות · G",
  heart: "לב · רצון",
  sacral: "סקרל",
  solar: "מקלעת השמש",
  spleen: "טחול",
  root: "שורש",
});

const ASPECT_LABELS = Object.freeze({
  conjunction: "צמידות",
  sextile: "שישית",
  square: "ריבוע",
  trine: "משולש",
  opposition: "מולות",
});

function clean(value) {
  return value == null ? "" : String(value).trim();
}

function finiteCoordinate(value, min, max, label) {
  const number = typeof value === "number" ? value : Number(clean(value));
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new RangeError(`${label}_out_of_range`);
  }
  return number;
}

function validTimezone(timezone) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

export function validateLifeJourneyBirthInput(input = {}) {
  const birthdate = clean(input.birthdate);
  const birthtime = clean(input.birthtime);
  const timezone = clean(input.timezone);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) throw new TypeError("birthdate_required");
  const [year, month, day] = birthdate.split("-").map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) {
    throw new TypeError("birthdate_invalid");
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(birthtime)) throw new TypeError("birthtime_required");
  if (!timezone || !validTimezone(timezone)) throw new TypeError("timezone_invalid");

  const hasLatitude = clean(input.latitude) !== "";
  const hasLongitude = clean(input.longitude) !== "";
  if (hasLatitude !== hasLongitude) throw new TypeError("coordinates_incomplete");

  return Object.freeze({
    birthdate,
    birthtime,
    timezone,
    location: hasLatitude
      ? Object.freeze({
        lat: finiteCoordinate(input.latitude, -90, 90, "latitude"),
        lng: finiteCoordinate(input.longitude, -180, 180, "longitude"),
      })
      : null,
  });
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

function localWallTimeMs(utcMs, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(utcMs));
  const part = type => parts.find(item => item.type === type)?.value;
  const hour = part("hour") === "24" ? "00" : part("hour");
  return Date.parse(`${part("year")}-${part("month")}-${part("day")}T${hour}:${part("minute")}:${part("second")}Z`);
}

export function resolveHistoricalUtcOffset(birthdate, birthtime, timezone) {
  const target = Date.parse(`${birthdate}T${birthtime.slice(0, 5)}:00Z`);
  if (!Number.isFinite(target)) throw new TypeError("birth_datetime_invalid");
  let utc = target;
  for (let index = 0; index < 3; index += 1) utc += target - localWallTimeMs(utc, timezone);
  return (target - utc) / 3_600_000;
}

function decimalBirthHour(birthtime) {
  const [hours, minutes, seconds = "0"] = birthtime.split(":");
  return Number(hours) + (Number(minutes) / 60) + (Number(seconds) / 3600);
}

function sanitizePoint(point = {}) {
  return Object.freeze({
    longitude: round(point.longitude),
    sign: clean(point.sign),
    signLabel: SIGN_LABELS[point.sign] || clean(point.sign),
    degree: round(point.degInSign),
  });
}

function sanitizeHumanDesign(humanDesign = {}) {
  const strategy = clean(humanDesign.type?.strategy);
  const definition = clean(humanDesign.definition);
  return Object.freeze({
    type: clean(humanDesign.type?.name),
    typeLabel: TYPE_LABELS[humanDesign.type?.name] || clean(humanDesign.type?.name),
    strategy,
    strategyLabel: STRATEGY_LABELS[strategy] || strategy,
    authority: clean(humanDesign.authority?.name),
    authorityLabel: AUTHORITY_LABELS[clean(humanDesign.authority?.name)] || clean(humanDesign.authority?.name),
    profile: clean(humanDesign.profile?.numbers),
    definition,
    definitionLabel: DEFINITION_LABELS[definition] || definition,
    activatedGates: Object.freeze((humanDesign.gates?.all || []).map(Number).filter(Number.isSafeInteger)),
    definedChannels: Object.freeze((humanDesign.channels || []).map(channel => Object.freeze({
      key: (channel?.gates || []).map(Number).filter(Number.isSafeInteger).sort((a, b) => a - b).join("-"),
      name: clean(channel?.name),
    })).filter(channel => channel.key)),
    definedCenters: Object.freeze((humanDesign.centers?.defined || []).map(center => Object.freeze({
      key: clean(center?.key),
      label: CENTER_LABELS[center?.key] || clean(center?.name),
    }))),
    openCenters: Object.freeze((humanDesign.centers?.allUndefinedNames || []).map(center => Object.freeze({
      key: clean(center),
      label: CENTER_LABELS[center] || clean(center),
    }))),
  });
}

function sanitizeSky(sky = {}) {
  if (!sky?.hasLocation || !sky?.rising?.accurate) return null;
  const entries = [
    ["sun", sky.sun],
    ["moon", sky.moon],
    ...Object.entries(sky.planets || {}),
    ["north_node", sky.nodes?.north],
    ["south_node", sky.nodes?.south],
  ];
  const sanitizeSkyPoint = point => sanitizePoint({
    longitude: point?.longitude,
    sign: point?.sign?.name,
    degInSign: Number(point?.longitude) % 30,
  });
  return Object.freeze({
    coordinateSource: "explicit_session_coordinates",
    angles: Object.freeze({
      ascendant: sanitizeSkyPoint(sky.rising),
      midheaven: sanitizeSkyPoint(sky.midheaven),
    }),
    bodies: Object.freeze(entries.map(([key, body]) => {
      const point = sanitizeSkyPoint(body);
      return Object.freeze({
        key,
        label: BODY_LABELS[key] || key,
        ...point,
      });
    }).filter(body => body.key && Number.isFinite(body.longitude))),
    aspects: Object.freeze((sky.aspects || []).map(aspect => Object.freeze({
      left: BODY_LABELS[aspect?.planet1] || clean(aspect?.planet1),
      right: BODY_LABELS[aspect?.planet2] || clean(aspect?.planet2),
      kind: clean(aspect?.aspect),
      label: ASPECT_LABELS[aspect?.aspect] || clean(aspect?.aspect),
      symbol: clean(aspect?.symbol),
      angle: round(aspect?.angle),
      orb: round(aspect?.orb),
    })).filter(aspect => aspect.left && aspect.right && aspect.kind)),
  });
}

/**
 * Explicit, in-memory birth calculation. The adapter accepts no name, person-ref
 * or place string, calls no API and returns no echoed birth input.
 */
export async function calculateLifeJourneyBirthMap(input, {
  loadEngine = async () => {
    const [humanDesign, astrology] = await Promise.all([
      import("natalengine/humandesign"),
      import("natalengine/astrology"),
    ]);
    return { ...humanDesign, ...astrology };
  },
} = {}) {
  const normalized = validateLifeJourneyBirthInput(input);
  const engine = await loadEngine();
  if (typeof engine?.calculateHumanDesign !== "function" || typeof engine?.calculateAstrology !== "function") {
    throw new TypeError("birth_engine_unavailable");
  }
  const offset = resolveHistoricalUtcOffset(normalized.birthdate, normalized.birthtime, normalized.timezone);
  const hour = decimalBirthHour(normalized.birthtime);
  const humanDesign = engine.calculateHumanDesign(normalized.birthdate, hour, offset, { nodeType: "true" });
  const sky = normalized.location
    ? engine.calculateAstrology(normalized.birthdate, hour, offset, normalized.location.lat, normalized.location.lng)
    : null;

  return Object.freeze({
    version: LIFE_JOURNEY_BIRTH_ADAPTER_VERSION,
    humanDesign: sanitizeHumanDesign(humanDesign),
    sky: normalized.location ? sanitizeSky(sky) : null,
    trace: Object.freeze({
      engine: LIFE_JOURNEY_BIRTH_ENGINE.package,
      engineVersion: LIFE_JOURNEY_BIRTH_ENGINE.version,
      backend: LIFE_JOURNEY_BIRTH_ENGINE.backend,
      execution: LIFE_JOURNEY_BIRTH_ENGINE.execution,
      historicalTimezone: true,
      explicitCoordinates: Boolean(normalized.location),
      inputEchoed: false,
    }),
  });
}

export default calculateLifeJourneyBirthMap;
