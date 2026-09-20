const clean = (value) => value == null ? "" : String(value).trim();

const asArray = (value) => Array.isArray(value) ? value : [];

function exactNumberMention(value, root) {
  const text = clean(value);
  const n = Number(root);
  if (!text || !Number.isSafeInteger(n)) return false;
  return new RegExp(`(^|[^0-9])${n}([^0-9]|$)`).test(text);
}

function normalizeCluster(cluster, kind) {
  if (!cluster || typeof cluster !== "object") return null;
  const facts = asArray(cluster.facts).map(clean).filter(Boolean);
  return Object.freeze({
    key: clean(cluster.key) || null,
    kind,
    title: clean(cluster.title) || "מבנה מחקר",
    facts: Object.freeze(facts),
    why: clean(cluster.why_primary || cluster.boundary || cluster.display_logic) || null,
    boundary: clean(cluster.dependency_boundary || cluster.boundary) || null,
    truthClass: clean(cluster.truth_class) || null,
  });
}

function clusterTouchesRoot(cluster, root) {
  if (!cluster) return false;
  if (exactNumberMention(cluster.title, root)) return true;
  return asArray(cluster.facts).some((fact) => exactNumberMention(fact, root));
}

function findContractRow(researchRows = []) {
  const rows = asArray(researchRows).filter((row) => (
    row?.engine_detail?.deep_view_contract_v1
    || row?.engine_detail?.deep_view_ranking_v1
    || row?.meta?.numeric_family?.deep_view_contract_v1
    || row?.meta?.numeric_family?.deep_view_ranking_v1
  ));
  return rows[0] || null;
}

function rootDependencyFamilies(row, root) {
  const calibration = row?.engine_detail?.calibration_404_474_1404_v2 || {};
  const families = calibration?.confirmed_dependent_expression_families?.[String(root)];
  const result = asArray(families).map((item) => Object.freeze({
    familyKey: clean(item?.family_key) || null,
    phrases: Object.freeze(asArray(item?.phrases).map(clean).filter(Boolean)),
    collapsedDelta: Number.isFinite(Number(item?.collapsed_delta)) ? Number(item.collapsed_delta) : null,
    method: null,
  }));

  const extra = calibration?.post_release_delta?.newly_exposed_dependency;
  if (Number(extra?.value) === Number(root)) {
    result.push(Object.freeze({
      familyKey: clean(extra?.word_family_key) || null,
      phrases: Object.freeze(asArray(extra?.phrases).map(clean).filter(Boolean)),
      collapsedDelta: 1,
      method: clean(extra?.method) || null,
    }));
  }
  return Object.freeze(result);
}

function normalizeEvidence(row, access = true) {
  if (!row || access === false) {
    return Object.freeze({
      available: false,
      raw: null,
      independent: null,
      dependent: null,
      independentP1Methods: null,
      signal: null,
    });
  }
  const int = (value) => Number.isSafeInteger(Number(value)) ? Number(value) : null;
  return Object.freeze({
    available: true,
    raw: int(row.phrase_count),
    independent: int(row.independent_phrase_count),
    dependent: int(row.dependent_expression_phrase_count),
    independentP1Methods: int(row.independent_p1_method_count),
    signal: clean(row.signal) || null,
  });
}

export function buildNumberDeepViewProjection({
  root,
  researchRows = [],
  crossMethodStrength = null,
  crossMethodStrengthAvailable = true,
} = {}) {
  const numberRoot = Number(root);
  if (!Number.isSafeInteger(numberRoot)) return null;

  const contractRow = findContractRow(researchRows);
  const contract = contractRow?.engine_detail?.deep_view_contract_v1 || {};
  const ranking = contractRow?.engine_detail?.deep_view_ranking_v1 || {};
  const contractMeta = contractRow?.meta?.numeric_family?.deep_view_contract_v1 || {};
  const rankingMeta = contractRow?.meta?.numeric_family?.deep_view_ranking_v1 || {};

  const allPrimary = asArray(ranking?.primary_clusters)
    .map((cluster) => normalizeCluster(cluster, "primary"))
    .filter(Boolean);
  const allSecondary = asArray(ranking?.secondary_clusters)
    .map((cluster) => normalizeCluster(cluster, "secondary"))
    .filter(Boolean);

  const primary = allPrimary.filter((cluster) => clusterTouchesRoot(cluster, numberRoot));
  const secondary = allSecondary.filter((cluster) => clusterTouchesRoot(cluster, numberRoot));
  const evidence = normalizeEvidence(crossMethodStrength, crossMethodStrengthAvailable);

  const deep = contract?.deep || {};
  const controls = asArray(ranking?.control_clusters).map(clean).filter(Boolean);
  const context = asArray(ranking?.context_clusters).map(clean).filter(Boolean);
  const frozenCounts = contract?.frozen_relation_counts && typeof contract.frozen_relation_counts === "object"
    ? contract.frozen_relation_counts
    : {};

  const available = Boolean(
    evidence.available
    || contractRow
    || primary.length
    || secondary.length
  );

  if (!available) return null;

  return Object.freeze({
    root: numberRoot,
    sourceResearchObjectId: clean(contractRow?.id) || null,
    contractAvailable: Boolean(contractRow),
    contractStatus: clean(contractMeta?.status || rankingMeta?.status) || null,
    evidence,
    primary: Object.freeze(primary),
    secondary: Object.freeze(secondary),
    dependentFamilies: rootDependencyFamilies(contractRow, numberRoot),
    controls: Object.freeze(controls),
    context: Object.freeze(context),
    deepChecklist: Object.freeze(asArray(deep?.show).map(clean).filter(Boolean)),
    frozenRelationCounts: Object.freeze({ ...frozenCounts }),
    actions: Object.freeze(asArray(contract?.heichal_actions).map((action) => Object.freeze({
      action: clean(action?.action) || null,
      label: clean(action?.label) || null,
      boundary: clean(action?.boundary) || null,
    })).filter((action) => action.action && action.label)),
    truthLanguage: Object.freeze({ ...(contract?.truth_language || {}) }),
    boundary: Object.freeze({
      noScore: true,
      rankIsProjectionNotTruth: true,
      interpretationRequiresHumanGate: true,
      privateContractMayBeAccessFiltered: !contractRow,
    }),
  });
}

export default buildNumberDeepViewProjection;
