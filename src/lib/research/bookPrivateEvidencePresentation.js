// Hebrew status presentation for authorized private Book evidence packets.
//
// This pure adapter intentionally omits claims, source witnesses, truth-axis
// payloads and requirement evidence. It has no authorization, persistence,
// governance or publication effect; the canonical private packet remains the
// only source for authorized evidence detail.

const view = (labelHe, semanticRole, detailHe = null) => Object.freeze({
  labelHe,
  detailHe,
  semanticRole,
});

const REQUIREMENTS = Object.freeze({
  witness_window: Object.freeze({
    ...view("חלון עד המקור", "source"),
    nextActionHe: "יש לפתוח את חלון המקור המורשה ולוודא שהקטע המלא נמצא.",
  }),
  locator_reconciliation: Object.freeze({
    ...view("יישוב האיתור", "locator"),
    nextActionHe: "יש להשוות בין האיתור השמור לחלון שנבדק ולתעד את ההכרעה.",
  }),
  surrounding_context: Object.freeze({
    ...view("ההקשר מסביב", "context"),
    nextActionHe: "יש לתעד את ההקשר שלפני הקטע ואחריו.",
  }),
  claim_scope: Object.freeze({
    ...view("גבולות הממצא", "scope"),
    nextActionHe: "יש לקבוע במפורש במה המקור תומך ומה הוא אינו טוען.",
  }),
  structured_trace: Object.freeze({
    ...view("עקבה מבנית", "structure"),
    nextActionHe: "יש להשוות את הרכיבים, השלבים וההפניות לעד המקור.",
  }),
  applicability_rationale: Object.freeze({
    ...view("נימוק תחולת השער", "applicability"),
    nextActionHe: "יש לתעד אם שער הנאמנות המובנית חל ומדוע.",
  }),
});

const STATES = Object.freeze({
  ready: view("מוכן", "complete", "הדרישה הושלמה בחבילת הראיות הפרטית."),
  partial: view("חלקי", "partial", "קיים בסיס לבדיקה, אך חסר תיעוד להשלמת הדרישה."),
  missing: view("חסר", "unresolved", "אין עדיין תיעוד מספיק להשלמת הדרישה."),
  not_applicable: view("לא חל", "not_applicable", "הדרישה אינה חלה על הממצא הזה."),
});

const LANES = Object.freeze({
  complex: view("בדיקת נאמנות מורכבת", "complex", "נדרשת השוואה מבנית לעדות המקור."),
  applicability: view("הכרעת תחולת השער", "applicability", "יש להכריע ולתעד אם בדיקת נאמנות מורכבת חלה."),
});

const UNKNOWN_REQUIREMENT = Object.freeze({
  ...view("דרישת ראיות נוספת", "unknown", "הדרישה אינה מוכרת לשכבת התצוגה ודורשת עיון."),
  nextActionHe: "יש לזהות את הדרישה ולתעד כיצד משלימים אותה לפני הכרעה.",
});

const READY_ACTION = "אין פעולה נוספת בדרישה זו; היא ממתינה להכרעה האנושית הכוללת.";
const NOT_APPLICABLE_ACTION = "יש לשמור את נימוק אי־התחולה כחלק מן ההכרעה האנושית.";

function clean(value) {
  return value == null ? "" : String(value).trim();
}

function presentation(rawValue, selected, isKnown) {
  return Object.freeze({
    labelHe: selected.labelHe,
    detailHe: selected.detailHe,
    semanticRole: selected.semanticRole,
    rawValue: rawValue == null ? null : rawValue,
    isKnown,
  });
}

function mapped(rawValue, values, fallback) {
  const key = clean(rawValue);
  const selected = key && Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null;
  return presentation(rawValue, selected || fallback, Boolean(selected));
}

function finiteNonNegative(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

export function presentBookEvidenceRequirement(rawValue) {
  return mapped(rawValue, REQUIREMENTS, UNKNOWN_REQUIREMENT);
}

export function presentBookEvidenceState(rawValue) {
  return mapped(
    rawValue,
    STATES,
    view("דורש עיון", "unknown", "מצב הדרישה אינו מוכר ולכן אינו נחשב מוכן."),
  );
}

export function presentBookEvidenceLane(rawValue) {
  return mapped(
    rawValue,
    LANES,
    view("מסלול בדיקה דורש עיון", "unknown", "מסלול הבדיקה אינו מוכר ולכן אי אפשר להשלים הכרעה."),
  );
}

function presentRequirement(entry) {
  const requirement = presentBookEvidenceRequirement(entry?.key);
  const state = presentBookEvidenceState(entry?.state);
  const definition = REQUIREMENTS[clean(entry?.key)] || UNKNOWN_REQUIREMENT;
  const nextActionHe = state.rawValue === "ready"
    ? READY_ACTION
    : state.rawValue === "not_applicable" ? NOT_APPLICABLE_ACTION : definition.nextActionHe;

  return Object.freeze({
    key: clean(entry?.key) || null,
    labelHe: requirement.labelHe,
    detailHe: requirement.detailHe,
    state,
    nextActionHe,
    evidenceAvailable: entry?.evidence != null,
  });
}

export function buildBookPrivateEvidencePresentation(packet) {
  const input = packet && typeof packet === "object" ? packet : {};
  const requirements = Array.isArray(input.requirements)
    ? input.requirements.map(presentRequirement)
    : [];
  const declaredReady = input?.readiness?.readyForFidelityVerdict === true;
  const safeExposure = input.exposure === "authorized_private" ? "authorized_private" : "restricted";
  const readyForFidelityVerdict = safeExposure === "authorized_private" && declaredReady;
  const readinessView = readyForFidelityVerdict
    ? view(
      "מוכן להכרעת נאמנות",
      "ready_for_human_verdict",
      "הראיות הדרושות נאספו; עדיין נדרשת הכרעה אנושית ואין לכך השפעת פרסום.",
    )
    : view(
      "חסרות ראיות להכרעה",
      "needs_evidence",
      "יש להשלים את הדרישות הפתוחות לפני הכרעת נאמנות אנושית.",
    );

  return Object.freeze({
    id: clean(input.id) || null,
    exposure: safeExposure,
    publicationEffect: "none",
    lane: presentBookEvidenceLane(input.reviewLane),
    requirements: Object.freeze(requirements),
    readiness: Object.freeze({
      completeCount: finiteNonNegative(input?.readiness?.completeCount),
      requiredCount: finiteNonNegative(input?.readiness?.requiredCount),
      readyForFidelityVerdict,
      labelHe: readinessView.labelHe,
      detailHe: readinessView.detailHe,
      semanticRole: readinessView.semanticRole,
      humanGateRequired: true,
    }),
  });
}

export function buildBookPrivateEvidenceCollectionPresentation(evidencePacket) {
  const input = evidencePacket && typeof evidencePacket === "object" ? evidencePacket : {};
  const packets = Array.isArray(input.packets)
    ? input.packets.map(buildBookPrivateEvidencePresentation)
    : [];
  const focusedPacket = input.focusedPacket
    ? buildBookPrivateEvidencePresentation(input.focusedPacket)
    : null;

  return Object.freeze({
    accessMode: input.accessMode === "authorized_private_review"
      ? "authorized_private_review"
      : "restricted",
    publicationEffect: "none",
    packets: Object.freeze(packets),
    focusedPacket,
    summary: Object.freeze({
      totalPackets: finiteNonNegative(input?.summary?.totalPackets),
      readyForFidelityVerdict: finiteNonNegative(input?.summary?.readyForFidelityVerdict),
      needsEvidence: finiteNonNegative(input?.summary?.needsEvidence),
      complex: finiteNonNegative(input?.summary?.complex),
      applicability: finiteNonNegative(input?.summary?.applicability),
    }),
  });
}
