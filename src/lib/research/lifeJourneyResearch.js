import { aggregateFindings } from "../nameNormalize.js";
import { NAME_LAB_TRACK_CLASSIFICATION } from "./nameLabTrackClassification.js";
import { gregorianToHebrewDateRepresentation, runPersonalDateResearch } from "./personalDateResearch.js";
import { buildAccessDescriptor } from "./researchPlanV2.js";
import { newInteractionId } from "./interactionCorrelation.js";
import { projectEls2029Result } from "./els2029Projection.js";

// A consumer of existing engines. No new calculation, identity or persistence authority.
export const LIFE_ENGINES = Object.freeze([
  { id: "name", label: "השם במקורות", detail: "פסוקים, קרבה, מילוי, אנגרמות ותמורות — עם נרמול הממצאים" },
  { id: "methods", label: "שיטות הגימטריה", detail: "כל השיטות שהמנוע הקנוני מחזיר לשם שנבחר" },
  { id: "date", label: "שם ותאריך", detail: "תאריך עברי והצלבות עם השם" },
  { id: "family", label: "הצלבה עם המשפחה", detail: "השוואה בין השמות שבחרת, ללא מיזוג אנשים" },
  { id: "els", label: "דילוגי אותיות", detail: "חיפוש מוגבל ובדיקה חוזרת של מיקום הממצא" },
]);
export const LIFE_HREF = "/2029/journey";
const clean = (v) => String(v ?? "").trim();
const engineIds = new Set(LIFE_ENGINES.map((e) => e.id));
export const isEngineNumber = (v) => typeof v === "number" && Number.isSafeInteger(v);

export function resolveLifePerson(members, ownerId, ref) {
  if (!ownerId || !ref || !ref.startsWith(`person:${ownerId}:`)) return null;
  const row = members.find((m) => m.source_ref === ref);
  if (!row || !clean(row.name)) return null;
  const meta = row.meta && typeof row.meta === "object" ? row.meta : {};
  const parts = clean(row.name).split(/\s+/);
  return { ref, name: clean(row.name), first: clean(meta.first_name) || parts[0],
    surname: clean(meta.surname) || parts.slice(1).join(" "), birthdate: clean(meta.birthdate_iso) };
}

export function nameTrackGroups(doc) {
  if (!doc || typeof doc !== "object" || doc.error) throw new Error("name_unavailable");
  if (doc.graded === true && Array.isArray(doc.combo?.tracks)) {
    return [{ label: "השם המלא", tracks: doc.combo.tracks },
      ...(doc.sources || []).filter((s) => Array.isArray(s.doc?.tracks))
        .map((s) => ({ label: s.source, tracks: s.doc.tracks }))];
  }
  if (Array.isArray(doc.tracks)) return [{ label: "השם", tracks: doc.tracks }];
  throw new Error("name_unavailable");
}

export function projectLifeName(doc) {
  const groups = nameTrackGroups(doc);
  return { groups: groups.map((group) => ({ ...group, tracks: group.tracks.map((t) => ({
    ...t, classification: NAME_LAB_TRACK_CLASSIFICATION[t.id]?.semantic_class || "context",
  })) })), normalized: aggregateFindings(groups.map((g) => g.tracks)) };
}

// Persist navigation references only. Inputs/results remain in the private Ledger and memory.
// Neither display-normalized keys nor ELS occurrence IDs are opaque identifiers.
export function lifeJourneyContext({ ownerId, personRef, engines, familyRefs = [], scope = "torah", form = "full", previous = null, step = "results" }) {
  const validRef = (ref) => typeof ref === "string" && ref.startsWith(`person:${ownerId}:`);
  if (!ownerId || !validRef(personRef)) throw new Error("invalid_person_scope");
  const samePath = previous?.dimensions?.lifePersonRef === personRef;
  return {
    subject: { id: personRef, type: "person", label: "מסע חיים פרטי", href: LIFE_HREF },
    selection: { entityId: personRef, entityType: "person" },
    lens: "person", access: { tier: "personal", scope: "private" },
    journey: samePath ? previous.journey : null, returnTo: null,
    dimensions: {
      lifePersonRef: personRef, lifeEngines: engines.filter((id) => engineIds.has(id)),
      lifeFamilyRefs: familyRefs.filter(validRef).slice(0, 6),
      lifeElsScope: scope === "tanakh" ? "tanakh" : "torah", lifeElsForm: form === "first" ? "first" : "full",
      lifeStep: ["results", "methods", "name", "date", "family", "els"].includes(step) ? step : "results",
      journey2029Active: true, journey2029Kind: "person_life", journey2029Mode: "organic", journey2029SourceSurface: "journey",
      surfaceSections: [{ id: "life-intake", label: "הפרטים שלי" }, { id: "life-research", label: "המחקר שלי" }, { id: "life-family", label: "המשפחה שלי" }],
      surfaceFocus: { id: personRef, type: "person", label: "מסע חיים פרטי", primary: "המחקר האישי", reason: "בחירת מנועים, בדיקת ממצאים והמשך מאותו הקשר" },
    },
  };
}

export function lifeNumberContext(context, value) {
  if (!isEngineNumber(value) || value < 0) throw new Error("invalid_number");
  return { ...context,
    subject: { id: String(value), type: "number", label: String(value), href: `/2029/number/${value}` },
    selection: { entityId: String(value), entityType: "number", resultValue: value },
    lens: "number", dimensions: { ...context.dimensions, surfaceFocus: null, surfaceSections: [] },
    returnTo: { href: LIFE_HREF, label: "חזרה למסע החיים", subject: context.subject, selection: context.selection,
      lens: context.lens, dimensions: context.dimensions, journey: context.journey },
  };
}

export async function lifeRpc(client, name, args, signal) {
  if (signal?.aborted) throw new Error("cancelled");
  let request = client.rpc(name, args);
  if (signal && typeof request.abortSignal === "function") request = request.abortSignal(signal);
  const { data, error } = await request;
  if (signal?.aborted) throw new Error("cancelled");
  if (error || data == null || data?.error) throw new Error("engine_unavailable");
  return data;
}

export async function runLifeJourneyResearch({ client, userId, ownerId, members, personRef, engines,
  familyRefs = [], scope = "torah", form = "full", signal, onResult = () => {} }) {
  const person = resolveLifePerson(members, ownerId, personRef);
  if (!userId || !person) throw new Error("person_unavailable");
  const selected = [...new Set(engines)].filter((id) => engineIds.has(id));
  const accessDescriptor = buildAccessDescriptor({ user_ref: userId, authenticated: true,
    verified_authority: { source: "supabase_auth", subject_verified: true } }, "authenticated_user");
  const rpc = (fn, args) => lifeRpc(client, fn, args, signal);
  const tasks = {
    name: async () => projectLifeName(await rpc("fn_name_research_graded", {
      p_name: person.first, p_surname: person.surname || null, p_birthdate: null, p_question: null,
    })),
    methods: async () => {
      const result = await rpc("fn_all_methods", { p_word: person.name });
      const methods = Object.entries(result).filter(([, value]) => isEngineNumber(value));
      if (!methods.length) throw new Error("methods_unavailable");
      return { methods };
    },
    date: async () => {
      const representation = gregorianToHebrewDateRepresentation(person.birthdate);
      if (!representation) return { unavailable: "נדרש תאריך לידה תקין בפרטים השמורים." };
      const bundle = await runPersonalDateResearch({ name: person.first, surname: person.surname || null,
        birthdateIso: person.birthdate, accessDescriptor,
        crossProvider: ({ name, surname, representation: rep }) => rpc("fn_cross_research", {
          p_items: [name, surname, rep.hebrew.pretty].filter(Boolean),
        }),
      });
      return { representation, bundle };
    },
    family: async () => {
      const refs = [...new Set([personRef, ...familyRefs])];
      if (refs.length > 6) return { unavailable: "בחרו עד שישה אנשים בכל השוואה." };
      const people = refs.map((ref) => resolveLifePerson(members, ownerId, ref));
      if (people.some((p) => !p)) throw new Error("person_unavailable");
      if (people.length < 2) return { unavailable: "בחרו לפחות אדם נוסף להשוואה." };
      return { people: people.map((p) => ({ ref: p.ref, name: p.name })),
        result: await rpc("fn_cross_research", { p_items: people.map((p) => p.name) }) };
    },
    els: async () => {
      const term = form === "first" ? person.first : person.name;
      const { data, error } = await client.functions.invoke("els-search-bridge", { body: {
        op: "page", term, scope: scope === "tanakh" ? "tanakh" : "torah",
        skip_min: 2, skip_max: 40, page_size: 16, interaction_id: newInteractionId(),
      }, signal });
      const result = data?.result;
      if (error || !result || result.contract !== "els_search_page_v1" || result.completion?.executed !== true || !["OK", "EXECUTED_EMPTY"].includes(result.status)) throw new Error("els_unavailable");
      return { result, projection: projectEls2029Result(result) };
    },
  };
  const results = {};
  await Promise.all(selected.map(async (id) => {
    let outcome;
    try {
      const data = await tasks[id]();
      outcome = { state: data.unavailable ? "unavailable" : "ready", data };
    } catch {
      outcome = { state: "error", error: "המסלול לא השלים את הבדיקה. אפשר לנסות שוב; שאר התוצאות נשמרות כאן." };
    }
    if (signal?.aborted) return;
    results[id] = outcome;
    onResult(id, outcome);
  }));
  return results;
}
