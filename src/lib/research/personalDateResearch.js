import { gregorianDateToHebrewRepresentation, GREGORIAN_HEBREW_REPRESENTATION_VERSION } from "../timeFlow.js";
import { makeUniversalFinding } from "./universalFinding.js";
import { normalizeAccessDescriptor } from "./researchPlanV2.js";
import {
  ACCESS_CLASS,
  EVIDENCE_RELATION,
  SEMANTIC_CLASS,
  capabilityResult,
  composeResearchResultBundle,
} from "./researchResultBundle.js";

export const PERSONAL_DATE_REPRESENTATION_VERSION = "personal-date-representation-v1";

const clean = (value) => {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
};

export function gregorianToHebrewDateRepresentation(iso) {
  const base = gregorianDateToHebrewRepresentation(iso);
  if (!base) return null;
  return Object.freeze({
    ...base,
    version: PERSONAL_DATE_REPRESENTATION_VERSION,
    transform: Object.freeze({
      ...base.transform,
      owner_version: GREGORIAN_HEBREW_REPRESENTATION_VERSION,
    }),
  });
}

export function personalDateRepresentationFinding(representation, { createdAt = null } = {}) {
  if (!representation?.input_iso || !representation?.hebrew?.clean) return null;
  return makeUniversalFinding({
    kind: "date",
    subject: {
      type: "date",
      key: `gregorian:${representation.input_iso}`,
      label: representation.hebrew.pretty,
      lang: "he",
    },
    source: {
      engine: "@hebcal/core",
      adapter: PERSONAL_DATE_REPRESENTATION_VERSION,
      sourceRef: representation.input_iso,
      method: "gregorian_date_to_hebrew_date",
      corpus: null,
      lang: "he",
    },
    identity: {
      sourceIdentity: {
        input_iso: representation.input_iso,
        hebrew_date: representation.hebrew.pretty,
        hebrew_clean: representation.hebrew.clean,
      },
      occurrence: null,
      entityRef: null,
      relationRef: null,
    },
    verification: {
      claimed_expression: null,
      claimed_method: null,
      claimed_value: null,
      engine_method_tested: "gregorian_date_to_hebrew_date",
      engine_result: representation,
      verification_state: "not_tested",
    },
    evidence: {
      refs: [],
      facts: [{
        type: "date-representation",
        input_iso: representation.input_iso,
        hebrew_pretty: representation.hebrew.pretty,
        hebrew_clean: representation.hebrew.clean,
      }],
      score: null,
      confidence: null,
    },
    access: { tier: "personal", reason: "birthdate_personal_context" },
    provenance: {
      createdBy: "ENGINE:@hebcal/core",
      createdAt: createdAt || new Date().toISOString(),
      inputRef: `date:${representation.input_iso}`,
    },
    projection: {
      anchors: [],
      relations: [],
      dimensions: {
        semantic_class: "derivation",
        representation_version: PERSONAL_DATE_REPRESENTATION_VERSION,
      },
    },
    view: { rendererHints: { role: "personal-date-representation" } },
  });
}

export function personalDateCrossFindings(crossResult, representation, { createdAt = null } = {}) {
  if (!representation?.input_iso || !crossResult || typeof crossResult !== "object") return [];
  const points = Array.isArray(crossResult.meeting_points) ? crossResult.meeting_points : [];
  return points.map((point) => {
    const value = Number(point?.value);
    if (!Number.isSafeInteger(value)) return null;
    return makeUniversalFinding({
      kind: "date_cross",
      subject: {
        type: "date",
        key: `gregorian:${representation.input_iso}`,
        label: representation.hebrew.pretty,
        lang: "he",
        value,
      },
      source: {
        engine: "fn_cross_research",
        adapter: PERSONAL_DATE_REPRESENTATION_VERSION,
        sourceRef: null,
        method: "cross_meeting_point",
        corpus: null,
        lang: "he",
      },
      identity: {
        sourceIdentity: {
          input_iso: representation.input_iso,
          value,
          hits: point?.hits ?? null,
          across_items: point?.across_items ?? null,
          from: Array.isArray(point?.from) ? point.from : [],
        },
        occurrence: null,
        entityRef: null,
        relationRef: null,
      },
      verification: {
        claimed_expression: null,
        claimed_method: null,
        claimed_value: null,
        engine_method_tested: "fn_cross_research",
        engine_result: point,
        verification_state: "not_tested",
      },
      evidence: {
        refs: [],
        facts: [{
          type: "personal-date-cross-meeting-point",
          value,
          hits: point?.hits ?? null,
          across_items: point?.across_items ?? null,
        }],
        score: null,
        confidence: null,
      },
      access: { tier: "personal", reason: "birthdate_cross_personal_context" },
      provenance: {
        createdBy: "ENGINE:fn_cross_research",
        createdAt: createdAt || new Date().toISOString(),
        inputRef: `date:${representation.input_iso}`,
      },
      projection: {
        anchors: [],
        relations: [],
        dimensions: { semantic_class: "derivation", dependency_group: `personal_date_cross:${representation.input_iso}` },
      },
      view: { rendererHints: { role: "personal-date-cross" } },
    });
  }).filter(Boolean);
}

export function composePersonalDateResearchBundle({
  birthdateIso,
  crossResult = null,
  accessDescriptor = null,
  createdAt = null,
} = {}) {
  const effectiveAccess = normalizeAccessDescriptor(accessDescriptor);
  const personalAllowed = Array.isArray(effectiveAccess?.allowed_access_tiers)
    && effectiveAccess.allowed_access_tiers.includes("personal");
  const representation = gregorianToHebrewDateRepresentation(birthdateIso);
  if (!representation) {
    return composeResearchResultBundle({
      query: { raw_input: personalAllowed ? clean(birthdateIso) : null },
      capabilities: [capabilityResult({
        key: "personal_date_representation",
        owner: "person_foundation_contract_law",
        status: "failed",
        reason: "invalid_or_unrepresentable_gregorian_date",
        findings: [],
        accessClass: ACCESS_CLASS.PERSONAL,
        semanticClass: SEMANTIC_CLASS.DERIVATION,
        versionRefs: [PERSONAL_DATE_REPRESENTATION_VERSION],
      })],
      accessDescriptor: effectiveAccess,
    });
  }

  const dateFinding = personalDateRepresentationFinding(representation, { createdAt });
  const crossFindings = personalDateCrossFindings(crossResult, representation, { createdAt });
  const dateOutcomes = dateFinding ? [{
    finding_id: dateFinding.id,
    evidence_relation: EVIDENCE_RELATION.DERIVATION,
    depends_on: [],
    reason: "deterministic_calendar_representation",
  }] : [];
  const crossOutcomes = crossFindings.map((finding) => ({
    finding_id: finding.id,
    evidence_relation: EVIDENCE_RELATION.DERIVATION,
    depends_on: dateFinding ? [dateFinding.id] : [],
    reason: "name_date_cross_is_derived_from_personal_date_representation",
  }));

  return composeResearchResultBundle({
    query: { raw_input: personalAllowed ? representation.input_iso : null },
    capabilities: [
      capabilityResult({
        key: "personal_date_representation",
        owner: "person_foundation_contract_law",
        findings: dateFinding ? [dateFinding] : [],
        findingOutcomes: dateOutcomes,
        accessClass: ACCESS_CLASS.PERSONAL,
        semanticClass: SEMANTIC_CLASS.DERIVATION,
        sourceRefs: personalAllowed ? [representation.input_iso] : [],
        versionRefs: [PERSONAL_DATE_REPRESENTATION_VERSION, "@hebcal/core"],
      }),
      capabilityResult({
        key: "personal_name_date_cross",
        owner: "research_strategy_layer_law",
        findings: crossFindings,
        findingOutcomes: crossOutcomes,
        accessClass: ACCESS_CLASS.PERSONAL,
        semanticClass: SEMANTIC_CLASS.DERIVATION,
        reason: crossResult ? null : "cross_result_not_supplied",
        versionRefs: [PERSONAL_DATE_REPRESENTATION_VERSION, "fn_cross_research"],
      }),
    ],
    resolvedRunSnapshot: personalAllowed ? {
      date_representation: representation,
    } : null,
    accessDescriptor: effectiveAccess,
  });
}


export function createSupabasePersonalDateCrossProvider(supabase) {
  if (!supabase || typeof supabase.rpc !== "function") {
    throw new TypeError("personalDateResearch: Supabase client with rpc() is required");
  }
  return async function personalDateCross({ name, surname = null, representation } = {}) {
    const first = clean(name);
    if (!first || !representation?.hebrew?.pretty) return null;
    const items = [first, clean(surname), representation.hebrew.pretty].filter(Boolean);
    if (items.length < 2) return null;
    const { data, error } = await supabase.rpc("fn_cross_research", { p_items: items });
    if (error) throw error;
    return data || null;
  };
}

export async function runPersonalDateResearch({
  name,
  surname = null,
  birthdateIso,
  crossProvider,
  accessDescriptor = null,
  createdAt = null,
} = {}) {
  if (typeof crossProvider !== "function") {
    throw new TypeError("personalDateResearch: crossProvider function is required");
  }
  const representation = gregorianToHebrewDateRepresentation(birthdateIso);
  if (!representation) {
    return composePersonalDateResearchBundle({ birthdateIso, accessDescriptor, createdAt });
  }
  const crossResult = await crossProvider({ name, surname, representation });
  return composePersonalDateResearchBundle({
    birthdateIso,
    crossResult,
    accessDescriptor,
    createdAt,
  });
}

export default gregorianToHebrewDateRepresentation;
