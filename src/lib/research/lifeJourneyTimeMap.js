export const LIFE_JOURNEY_TIME_MAP_VERSION = "life-journey-time-map-v1";
export const LIFE_JOURNEY_TIME_MAP_MAX_CONVERGENCES = 24;

const clean = value => value == null ? "" : String(value).trim();
const list = value => Array.isArray(value) ? value : [];
const integer = value => (typeof value === "number" || (typeof value === "string" && value.trim()))
  && Number.isSafeInteger(Number(value)) ? Number(value) : null;

const DATE_ROLES = Object.freeze([
  Object.freeze({ role: "hebrew_day", label: "יום עברי" }),
  Object.freeze({ role: "hebrew_month", label: "חודש עברי" }),
  Object.freeze({ role: "hebrew_year", label: "שנה עברית" }),
  Object.freeze({ role: "hebrew_day_month", label: "יום וחודש" }),
  Object.freeze({ role: "hebrew_full_date", label: "תאריך עברי מלא" }),
]);

function dateWords(pretty) {
  const tokens = clean(pretty).split(/\s+/u).filter(Boolean);
  if (tokens.length < 3) return null;
  const day = tokens[0];
  const year = tokens.at(-1);
  const month = tokens.slice(1, -1).join(" ");
  if (!day || !month || !year) return null;
  return Object.freeze({
    hebrew_day: day,
    hebrew_month: month,
    hebrew_year: year,
    hebrew_day_month: `${day} ${month}`,
    hebrew_full_date: clean(pretty),
  });
}

function exactDaysBetween(left, right) {
  const start = Date.parse(`${left}T00:00:00Z`);
  const end = Date.parse(`${right}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return Math.round(Math.abs(end - start) / 86400000);
}

/** Projection of the existing date-expression research; no cycle or trait is inferred. */
export function buildLifeJourneyTimeMap({ birthTimeline = [], methodFindings = [], researchReady = false } = {}) {
  const events = [...list(birthTimeline)].sort((a, b) => clean(a?.dateIso).localeCompare(clean(b?.dateIso)));
  const eventRefs = new Set(events.map(event => clean(event?.memberRef)).filter(Boolean));
  const findingsByMemberRole = new Map();
  for (const finding of list(methodFindings)) {
    const memberRef = clean(finding?.memberRef);
    const role = clean(finding?.expressionRole);
    const value = integer(finding?.value);
    if (!eventRefs.has(memberRef) || !role.startsWith("hebrew_") || value == null) continue;
    const key = `${memberRef}:${role}`;
    const rows = findingsByMemberRole.get(key) || [];
    const methodLabel = clean(finding?.methodLabel || finding?.methodKey) || "שיטה";
    if (!rows.some(row => row.methodLabel === methodLabel && row.value === value)) rows.push(Object.freeze({
      id: clean(finding?.id) || `${key}:${methodLabel}:${value}`,
      methodKey: clean(finding?.methodKey),
      methodLabel,
      value,
      sourceRef: clean(finding?.sourceRef),
      versionRef: clean(finding?.versionRef),
    }));
    findingsByMemberRole.set(key, rows);
  }

  const people = events.map(event => {
    const memberRef = clean(event?.memberRef);
    const words = dateWords(event?.hebrewDate);
    const expressions = words ? DATE_ROLES.map(item => Object.freeze({
      ...item,
      text: words[item.role],
      methods: Object.freeze(findingsByMemberRole.get(`${memberRef}:${item.role}`) || []),
    })) : [];
    return Object.freeze({
      memberRef,
      name: clean(event?.name) || "אדם ללא שם",
      dateIso: clean(event?.dateIso),
      dateDisplay: clean(event?.dateDisplay),
      hebrewDate: clean(event?.hebrewDate),
      expressions: Object.freeze(expressions),
      researchedExpressionCount: expressions.filter(expression => expression.methods.length).length,
    });
  });

  const intervals = [];
  for (let left = 0; left < people.length; left += 1) {
    for (let right = left + 1; right < people.length; right += 1) {
      const daysBetween = exactDaysBetween(people[left].dateIso, people[right].dateIso);
      if (daysBetween == null) continue;
      intervals.push(Object.freeze({
        id: `${people[left].memberRef}:${people[right].memberRef}`,
        leftRef: people[left].memberRef,
        leftName: people[left].name,
        rightRef: people[right].memberRef,
        rightName: people[right].name,
        daysBetween,
        approximateYears: Math.round((daysBetween / 365.2425) * 10) / 10,
      }));
    }
  }

  const byValue = new Map();
  for (const person of people) for (const expression of person.expressions) for (const method of expression.methods) {
    const row = byValue.get(method.value) || new Map();
    const expressions = row.get(person.memberRef) || [];
    const key = `${expression.role}:${method.methodLabel}`;
    if (!expressions.some(item => item.key === key)) expressions.push({
      key,
      role: expression.role,
      label: expression.label,
      text: expression.text,
      methodLabel: method.methodLabel,
    });
    row.set(person.memberRef, expressions);
    byValue.set(method.value, row);
  }
  const allConvergences = [...byValue.entries()].flatMap(([value, memberRows]) => {
    if (memberRows.size < 2) return [];
    return [Object.freeze({
      value,
      personCount: memberRows.size,
      participants: Object.freeze([...memberRows.entries()].map(([memberRef, expressions]) => Object.freeze({
        memberRef,
        name: people.find(person => person.memberRef === memberRef)?.name || "אדם ללא שם",
        expressions: Object.freeze(expressions.map(({ key, ...item }) => Object.freeze(item))),
      }))),
    })];
  }).sort((a, b) => b.personCount - a.personCount || a.value - b.value);
  const timeConvergences = allConvergences.slice(0, LIFE_JOURNEY_TIME_MAP_MAX_CONVERGENCES);

  return Object.freeze({
    version: LIFE_JOURNEY_TIME_MAP_VERSION,
    people: Object.freeze(people),
    intervals: Object.freeze(intervals),
    convergences: Object.freeze(timeConvergences),
    state: researchReady ? "ready" : "waiting",
    coverage: Object.freeze({
      datedPeople: people.length,
      expressionCount: people.reduce((sum, person) => sum + person.expressions.length, 0),
      researchedExpressionCount: people.reduce((sum, person) => sum + person.researchedExpressionCount, 0),
      intervalCount: intervals.length,
      convergenceCount: timeConvergences.length,
      truncated: allConvergences.length > timeConvergences.length,
    }),
    boundaries: Object.freeze({
      read_only_projection: true,
      existing_date_matrix_only: true,
      no_astrology: true,
      no_predicted_cycles: true,
      no_new_engine: true,
      no_new_store: true,
    }),
  });
}

export default buildLifeJourneyTimeMap;
