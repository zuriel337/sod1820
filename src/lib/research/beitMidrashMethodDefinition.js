const clean = (value) => value == null ? "" : String(value).trim();

const FAMILY_LABELS = Object.freeze({
  base_additive: "חיבור ערכים לפי כללי השיטה",
  base_additive_substitution: "המרת אותיות לפי צופן ואז חיבור הערכים",
  adjacent_difference: "חישוב יחסים/הפרשים בין אותיות סמוכות",
  cumulative_prefix_sum: "סכימת קידומות מצטברות",
  position_weighted_sum: "שקלול האותיות לפי מיקומן",
  letter_square_sum: "חיבור ריבוע הערך של כל אות",
  composite_sum: "חיבור תוצאות של שיטות קנוניות",
  composite_diff: "הפרש בין תוצאות של שיטות קנוניות",
  extended_letter_values: "ערכי אותיות מורחבים לפי הקשר מפורש",
});

const CONDITION_LABELS = Object.freeze({
  no_final_letters: "כשאין אותיות סופיות",
  single_word_input: "כאשר הקלט הוא מילה אחת",
  single_word_and_no_final_letters: "במילה אחת ללא אותיות סופיות",
  explicit_large_letter_context: "רק כאשר הוגדר במפורש הקשר של אות רבתי",
});

const OPERATOR_LABELS = Object.freeze({ sum: "+", diff: "−" });

export function methodMechanicalDefinition(row = {}, profile = {}, labelByKey = new Map()) {
  const methodLabel = clean(row.display_label || row.method_key || profile.displayLabel || profile.methodKey) || "השיטה";
  const sub = clean(profile.sub);
  const family = clean(profile.mathematicalFamily);
  const executionKind = clean(row.execution_kind || profile.executionKind);
  const operator = clean(row.operator || profile.operator);
  const derivedFrom = Array.isArray(row.derived_from)
    ? row.derived_from.map(clean).filter(Boolean)
    : Array.isArray(profile.derivedFrom) ? profile.derivedFrom.map(clean).filter(Boolean) : [];

  let what = sub;
  if (!what && derivedFrom.length) {
    const names = derivedFrom.map((key) => labelByKey.get(key) || key);
    const op = OPERATOR_LABELS[operator] || operator || "→";
    what = "שיטה מורכבת: " + names.join(" " + op + " ");
  }
  if (!what && FAMILY_LABELS[family]) what = FAMILY_LABELS[family];
  if (!what && executionKind === "context_activated") what = "השיטה מחושבת רק כאשר קיים ההקשר הנדרש.";
  if (!what) what = "שיטה קנונית הרשומה במנוע; הפירוט המדויק מוצג דרך עקבת החישוב.";

  let structure = null;
  if (derivedFrom.length) {
    structure = methodLabel + " = " + derivedFrom
      .map((key) => labelByKey.get(key) || key)
      .join(" " + (OPERATOR_LABELS[operator] || operator || "·") + " ");
  } else if (FAMILY_LABELS[family]) {
    structure = FAMILY_LABELS[family];
  } else if (executionKind === "context_activated") {
    structure = "שיטה תלוית־הקשר; אין להמציא ערך בלי הקשר מתאים.";
  }

  const dependencies = [];
  const rules = Array.isArray(profile.dependencyRules) ? profile.dependencyRules : [];
  for (const rule of rules) {
    if (!rule || typeof rule !== "object") continue;
    if (rule.type === "conditional_equivalence" && clean(rule.to)) {
      dependencies.push(
        "עשויה להיות שקולה ל־" + (labelByKey.get(clean(rule.to)) || clean(rule.to))
        + (clean(rule.condition) ? " " + (CONDITION_LABELS[clean(rule.condition)] || "(" + clean(rule.condition) + ")") : "")
      );
    } else if (rule.type === "same_family_extension" && clean(rule.to)) {
      dependencies.push("הרחבה של אותה משפחה ביחס ל־" + (labelByKey.get(clean(rule.to)) || clean(rule.to)));
    } else if (rule.type === "scale_transform" && clean(rule.to)) {
      dependencies.push(
        "טרנספורמציית קנה־מידה ביחס ל־" + (labelByKey.get(clean(rule.to)) || clean(rule.to))
        + (Number.isFinite(Number(rule.factor)) ? " ×" + Number(rule.factor) : "")
      );
    }
  }

  return Object.freeze({
    what,
    structure,
    familyLabel: FAMILY_LABELS[family] || family || null,
    dependencies: Object.freeze(dependencies),
    interpretation: clean(profile.soul) || null,
  });
}

export default methodMechanicalDefinition;
