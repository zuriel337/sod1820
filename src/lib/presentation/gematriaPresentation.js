import {
  canonicalMethodPublicLabel,
  sortMethodsByCanonicalOrder,
} from "./canonicalPresentation.js";

export const GEMATRIA_PRESENTATION_CONTRACT = "gematria_presentation_v1";
export const DEFAULT_GEMATRIA_PREVIEW_LIMIT = 6;

const FAMILY_META = Object.freeze({
  base: Object.freeze({ key: "base", label: "שיטות יסוד", order: 10 }),
  depth: Object.freeze({ key: "depth", label: "שיטות עומק", order: 20 }),
  composite: Object.freeze({ key: "composite", label: "שיטות מורכבות", order: 30 }),
  contextual: Object.freeze({ key: "contextual", label: "שיטות מיוחדות/הקשריות", order: 40 }),
  other: Object.freeze({ key: "other", label: "שיטות נוספות", order: 90 }),
});

const EVIDENCE_CLASSES = new Set(["independent", "dependent", "unknown"]);

const clean = (value) => value == null ? "" : String(value).trim();
const list = (value) => Array.isArray(value) ? value : [];
const finiteNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
const boolOrNull = (value) => value === true ? true : value === false ? false : null;

function methodKeyOf(row) {
  return clean(row?.methodKey ?? row?.method_key ?? row?.key ?? row?.method);
}

function methodStateMap(rows = []) {
  return new Map(list(rows).map((row) => [methodKeyOf(row), row]).filter(([key]) => key));
}

function lookupByMethodKey(source, key) {
  if (!source || !key) return null;
  if (source instanceof Map) return source.get(key) ?? null;
  return source[key] ?? null;
}

function canonicalSortOrder(row) {
  const value = Number(row?.sortOrder ?? row?.sort_order);
  return Number.isFinite(value) ? value : null;
}

function normalizeDerivedFrom(row, state) {
  const value = row?.derivedFrom ?? row?.derived_from ?? state?.derivedFrom ?? state?.derived_from;
  return list(value).map(clean).filter(Boolean);
}

function normalizeMethodRow(row, state, { accessByMethodKey = null } = {}) {
  const methodKey = methodKeyOf(row) || methodKeyOf(state);
  if (!methodKey) return null;

  const stateActive = state?.active;
  const rowActive = row?.lifecycleActive ?? row?.lifecycle_active ?? row?.active;
  const active = stateActive === false || rowActive === false
    ? false
    : stateActive === true || rowActive === true
      ? true
      : null;

  const executionKind = clean(
    row?.executionKind ?? row?.execution_kind ?? state?.executionKind ?? state?.execution_kind,
  ) || null;
  const category = clean(row?.category ?? state?.category) || null;
  const derivedFrom = normalizeDerivedFrom(row, state);
  const requiredEntitlement = clean(
    row?.requiredEntitlement
      ?? row?.required_entitlement
      ?? state?.requiredEntitlement
      ?? state?.required_entitlement,
  ) || null;

  const explicitAccess = lookupByMethodKey(accessByMethodKey, methodKey);
  const accessAllowed = typeof explicitAccess === "boolean"
    ? explicitAccess
    : typeof explicitAccess?.allowed === "boolean"
      ? explicitAccess.allowed
      : null;

  const executable = boolOrNull(state?.executable);
  const engineVerified = boolOrNull(state?.engineVerified ?? state?.engine_verified);
  const inEngineDrift = boolOrNull(state?.inEngineDrift ?? state?.in_engine_drift);
  const computedValue = finiteNumber(row?.computedValue ?? row?.computed_value ?? row?.value);
  const available = accessAllowed === false || active === false || executable === false
    ? false
    : computedValue != null
      ? true
      : null;

  return {
    methodKey,
    publicLabel: canonicalMethodPublicLabel({
      method_key: methodKey,
      display_label: row?.displayLabel ?? row?.display_label ?? state?.display_label,
    }),
    value: accessAllowed === false ? null : computedValue,
    sortOrder: canonicalSortOrder(row) ?? canonicalSortOrder(state),
    category,
    mathematicalFamily: clean(
      row?.mathematicalFamily
        ?? row?.mathematical_family
        ?? state?.mathematicalFamily
        ?? state?.mathematical_family,
    ) || null,
    executionKind,
    operator: clean(row?.operator ?? state?.operator) || null,
    derivedFrom,
    version: finiteNumber(
      row?.definitionVersion
        ?? row?.definition_version
        ?? row?.methodVersion
        ?? row?.method_version
        ?? state?.methodVersion
        ?? state?.method_version,
    ),
    registered: boolOrNull(state?.registered),
    active,
    executable,
    engineVerified,
    scannable: boolOrNull(state?.scannable),
    inEngineDrift,
    notScannableReason: clean(state?.notScannableReason ?? state?.not_scannable_reason) || null,
    requiredEntitlement,
    access: {
      allowed: accessAllowed,
      requiredEntitlement,
      reason: clean(explicitAccess?.reason) || (accessAllowed === false ? "restricted" : null),
    },
    available,
    lifecycleState: clean(row?.lifecycleState ?? row?.lifecycle_state ?? state?.lifecycleState) || null,
  };
}

function normalizeEquivalenceGroup(group) {
  if (!group || group?.applies === false) return null;

  const pair = [
    clean(group?.baseKey ?? group?.base_key),
    clean(group?.variantKey ?? group?.variant_key),
  ].filter(Boolean);
  const members = list(group?.methodKeys ?? group?.method_keys ?? group?.members)
    .map(clean)
    .filter(Boolean);
  const keys = [...new Set(members.length ? members : pair)];
  if (keys.length < 2) return null;

  return {
    representativeMethodKey: clean(
      group?.representativeMethodKey ?? group?.representative_method_key,
    ) || keys[0],
    methodKeys: keys,
    reason: clean(group?.reason ?? group?.equivalenceType ?? group?.equivalence_type) || null,
  };
}

function buildAppliedEquivalenceIndex(appliedEquivalences = []) {
  const index = new Map();
  for (const raw of list(appliedEquivalences)) {
    const group = normalizeEquivalenceGroup(raw);
    if (!group) continue;
    for (const methodKey of group.methodKeys) index.set(methodKey, group);
  }
  return index;
}

function evidenceClassFor(evidenceByMethodKey, methodKey) {
  const evidence = lookupByMethodKey(evidenceByMethodKey, methodKey);
  const value = clean(
    typeof evidence === "string"
      ? evidence
      : evidence?.independence ?? evidence?.evidenceClass ?? evidence?.evidence_class,
  ).toLowerCase();
  return EVIDENCE_CLASSES.has(value) ? value : "unknown";
}

function primaryRoleFor(method, equivalence) {
  if (method.executionKind === "context_activated" || method.category === "context") return "contextual";
  if (method.category === "composite" || method.executionKind === "composite_engine") return "composite";
  if (equivalence) return "equivalent";
  if (method.derivedFrom.length) return "derived";
  return "independent";
}

function exceptionalStateFor(method) {
  if (method.inEngineDrift === true) return "mismatch";
  if (method.access.allowed === false) return "unavailable";
  if (method.active === false || method.executable === false) return "unavailable";
  if (method.lifecycleState === "candidate") return "candidate";
  if (method.engineVerified === false) return "unverified";
  if (method.primaryRole === "contextual") return "contextual";
  if (method.primaryRole === "composite") return "composite";
  if (method.primaryRole === "equivalent") return "equivalent";
  if (method.primaryRole === "derived") return "derived";
  return null;
}

function humanFamilyFor(method) {
  if (method.executionKind === "context_activated" || method.category === "context") return FAMILY_META.contextual;
  if (method.category === "composite" || method.executionKind === "composite_engine") return FAMILY_META.composite;
  if (method.category === "depth") return FAMILY_META.depth;
  if (method.category === "base") return FAMILY_META.base;
  return FAMILY_META.other;
}

function freezeMethod(method, equivalence, evidenceClass) {
  const primaryRole = primaryRoleFor(method, equivalence);
  const roles = [
    primaryRole,
    ...(method.derivedFrom.length && primaryRole !== "derived" ? ["derived"] : []),
  ];

  const enriched = {
    ...method,
    derivedFrom: Object.freeze([...method.derivedFrom]),
    primaryRole,
    roles: Object.freeze([...new Set(roles)]),
    equivalence: equivalence
      ? Object.freeze({
          representativeMethodKey: equivalence.representativeMethodKey,
          methodKeys: Object.freeze([...equivalence.methodKeys]),
          reason: equivalence.reason,
        })
      : null,
    evidence: Object.freeze({
      independence: evidenceClass,
      governed: evidenceClass !== "unknown",
    }),
  };

  enriched.exceptionalState = exceptionalStateFor(enriched);
  return Object.freeze(enriched);
}

function buildFamilyGroups(methods) {
  const buckets = new Map();

  for (const method of methods) {
    const family = humanFamilyFor(method);
    if (!buckets.has(family.key)) {
      buckets.set(family.key, {
        key: family.key,
        label: family.label,
        order: family.order,
        methods: [],
      });
    }
    buckets.get(family.key).methods.push(method);
  }

  return Object.freeze(
    [...buckets.values()]
      .sort((a, b) => a.order - b.order)
      .map((group) => Object.freeze({
        key: group.key,
        label: group.label,
        methods: Object.freeze(sortMethodsByCanonicalOrder(group.methods)),
      })),
  );
}

function evidenceSummary(methods) {
  const summary = {
    independentMethodCount: 0,
    dependentMethodCount: 0,
    unknownMethodCount: 0,
    hasGovernedClassification: false,
  };

  for (const method of methods) {
    if (method.evidence.independence === "independent") summary.independentMethodCount += 1;
    else if (method.evidence.independence === "dependent") summary.dependentMethodCount += 1;
    else summary.unknownMethodCount += 1;
  }

  summary.hasGovernedClassification = summary.independentMethodCount + summary.dependentMethodCount > 0;
  return Object.freeze(summary);
}

function buildValueGroups(methods) {
  const groups = new Map();

  for (const method of methods) {
    if (method.value == null) continue;
    const key = String(method.value);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(method);
  }

  return Object.freeze(
    [...groups.entries()]
      .map(([value, members]) => {
        const sorted = sortMethodsByCanonicalOrder(members);
        return Object.freeze({
          value: Number(value),
          methodKeys: Object.freeze(sorted.map((method) => method.methodKey)),
          methods: Object.freeze(sorted),
          hasMultipleMethods: sorted.length > 1,
          evidence: evidenceSummary(sorted),
        });
      })
      .sort((a, b) => {
        const ai = methods.findIndex((method) => a.methodKeys.includes(method.methodKey));
        const bi = methods.findIndex((method) => b.methodKeys.includes(method.methodKey));
        return ai - bi;
      }),
  );
}

function normalizeNormalization(expressionRaw, normalization = null) {
  const normalized = clean(
    normalization?.normalized
      ?? normalization?.expressionNormalized
      ?? normalization?.expression_normalized,
  ) || expressionRaw;
  const changed = typeof normalization?.changed === "boolean"
    ? normalization.changed
    : normalized !== expressionRaw;
  const visibleNoticeNeeded = Boolean(
    normalization?.visibleNoticeNeeded
      ?? normalization?.visible_notice_needed
      ?? normalization?.materiallyChanged
      ?? normalization?.materially_changed
      ?? false,
  );

  return Object.freeze({
    raw: expressionRaw,
    normalized,
    changed,
    reasons: Object.freeze(list(normalization?.reasons ?? normalization?.reason).map(clean).filter(Boolean)),
    visibleNoticeNeeded: changed && visibleNoticeNeeded,
  });
}

function normalizeRelationsSummary(relationsSummary = null) {
  const count = Number(relationsSummary?.count);
  return Object.freeze({
    count: Number.isSafeInteger(count) && count >= 0 ? count : 0,
    leadingRelation: relationsSummary?.leadingRelation ?? relationsSummary?.leading_relation ?? null,
    journeyAvailable: Boolean(
      relationsSummary?.journeyAvailable ?? relationsSummary?.journey_available ?? false,
    ),
  });
}

function selectPreviewMethods(methods, activeMethod, limit) {
  if (!methods.length) return Object.freeze([]);
  const max = Math.max(1, Number.isSafeInteger(Number(limit)) ? Number(limit) : DEFAULT_GEMATRIA_PREVIEW_LIMIT);
  const ordered = sortMethodsByCanonicalOrder(methods);
  const rest = activeMethod
    ? ordered.filter((method) => method.methodKey !== activeMethod.methodKey)
    : ordered;
  return Object.freeze((activeMethod ? [activeMethod, ...rest] : rest).slice(0, max));
}

function focalProjection({ focusKind, expressionRaw, numberRoot, activeMethod }) {
  const number = finiteNumber(numberRoot) ?? activeMethod?.value ?? null;
  if (focusKind === "number") {
    return Object.freeze({
      primaryType: "number",
      primary: number,
      secondaryType: "expression",
      secondary: expressionRaw || null,
    });
  }
  return Object.freeze({
    primaryType: "expression",
    primary: expressionRaw || null,
    secondaryType: "number",
    secondary: number,
  });
}

/**
 * Pure Gematria presentation adapter.
 *
 * Important boundaries:
 * - never calculates Gematria;
 * - never queries Supabase;
 * - never evaluates conditional equivalence rules;
 * - never invents evidence independence;
 * - never loads graph/Journey/Trace payloads.
 *
 * The caller must supply canonical calculation/profile/state data and, when available,
 * already-governed evidence/equivalence decisions.
 */
export function buildGematriaPresentationModel({
  expression = "",
  expressionRaw = null,
  numberRoot = null,
  focusKind = "expression",
  activeMethodKey = null,
  methodProfile = [],
  methodStates = [],
  appliedEquivalences = [],
  evidenceByMethodKey = null,
  accessByMethodKey = null,
  contextualMethodKeys = [],
  includeUnavailableKeys = [],
  normalization = null,
  relationsSummary = null,
  trace = null,
  researchContextRef = null,
  previewLimit = DEFAULT_GEMATRIA_PREVIEW_LIMIT,
} = {}) {
  const rawExpression = clean(expressionRaw ?? expression);
  const normalizedFocusKind = clean(focusKind).toLowerCase() === "number" ? "number" : "expression";
  const stateByKey = methodStateMap(methodStates);
  const profileByKey = new Map(
    list(methodProfile).map((row) => [methodKeyOf(row), row]).filter(([key]) => key),
  );

  const requestedActiveKey = clean(activeMethodKey);
  const explicitUnavailable = new Set(list(includeUnavailableKeys).map(clean).filter(Boolean));
  if (requestedActiveKey) explicitUnavailable.add(requestedActiveKey);

  for (const methodKey of explicitUnavailable) {
    if (!profileByKey.has(methodKey) && stateByKey.has(methodKey)) {
      profileByKey.set(methodKey, { method_key: methodKey, computed_value: null });
    }
  }

  const normalizedMethods = [];
  for (const [methodKey, row] of profileByKey.entries()) {
    const normalized = normalizeMethodRow(row, stateByKey.get(methodKey), { accessByMethodKey });
    if (normalized) normalizedMethods.push(normalized);
  }

  const contextualAllowed = new Set(list(contextualMethodKeys).map(clean).filter(Boolean));
  if (requestedActiveKey) contextualAllowed.add(requestedActiveKey);

  const displayable = normalizedMethods.filter((method) => {
    const isContextual = method.executionKind === "context_activated" || method.category === "context";
    if (isContextual && !contextualAllowed.has(method.methodKey)) return false;
    if (method.access.allowed === false && !explicitUnavailable.has(method.methodKey)) return false;
    if (method.active === false && !explicitUnavailable.has(method.methodKey)) return false;
    return true;
  });

  const equivalenceIndex = buildAppliedEquivalenceIndex(appliedEquivalences);
  const methods = Object.freeze(
    sortMethodsByCanonicalOrder(displayable)
      .map((method) => freezeMethod(
        method,
        equivalenceIndex.get(method.methodKey) ?? null,
        evidenceClassFor(evidenceByMethodKey, method.methodKey),
      )),
  );

  const byKey = new Map(methods.map((method) => [method.methodKey, method]));
  const activeMethod = (
    (requestedActiveKey && byKey.get(requestedActiveKey))
    || byKey.get("רגיל")
    || methods[0]
    || null
  );

  const normalizedExpression = normalizeNormalization(rawExpression, normalization);
  const relationSummary = normalizeRelationsSummary(relationsSummary);

  return Object.freeze({
    contract: GEMATRIA_PRESENTATION_CONTRACT,
    focusKind: normalizedFocusKind,
    subject: Object.freeze({
      expressionRaw: rawExpression || null,
      expressionNormalized: normalizedExpression.normalized || null,
      numberRoot: finiteNumber(numberRoot) ?? activeMethod?.value ?? null,
    }),
    focal: focalProjection({
      focusKind: normalizedFocusKind,
      expressionRaw: rawExpression,
      numberRoot,
      activeMethod,
    }),
    activeMethod,
    methods,
    previewMethods: selectPreviewMethods(methods, activeMethod, previewLimit),
    methodCount: methods.length,
    familyGroups: buildFamilyGroups(methods),
    valueGroups: buildValueGroups(methods),
    evidence: evidenceSummary(methods),
    normalization: normalizedExpression,
    relationsSummary: relationSummary,
    trace: Object.freeze({
      available: Boolean(trace?.available ?? trace?.traceAvailable ?? false),
      lazy: true,
    }),
    continuity: Object.freeze({
      expression: rawExpression || null,
      methodKey: activeMethod?.methodKey ?? requestedActiveKey || null,
      focus: normalizedFocusKind,
      researchContextRef: researchContextRef ?? null,
    }),
  });
}
