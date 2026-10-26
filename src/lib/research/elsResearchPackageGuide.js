export const ELS_RESEARCH_PACKAGE_GUIDE_CONTRACT = "els_research_package_guide_v1";

const rows = value => Array.isArray(value) ? value : [];

/**
 * Explain already-verified package evidence without deriving a semantic or statistical claim.
 * This is a projection only; it performs no search and accepts no coordinates as input.
 */
export function projectElsResearchPackageGuide(result) {
  if (result?.lens !== "matrix-candidates" || result?.ok !== true) return null;
  const items = rows(result.items).filter(item => ["VERIFIED", "SOURCE_EXACT"].includes(item?.status));
  const groups = rows(result.groups);
  const sourceContext = items.filter(item => item.sourceContext?.axisTopic === true).length;
  const sourceExact = items.filter(item => item.status === "SOURCE_EXACT").length;
  const verifiedEls = items.filter(item => item.status === "VERIFIED").length;
  const compact = items.filter(item => item.geometry?.stage === "A").length;
  const spaced = items.filter(item => item.geometry?.stage === "B").length;
  const parallel = items.filter(item => item.neighborhood?.band === "parallel").length;
  const intersections = items.filter(item => item.neighborhood?.band === "intersection").length;

  const facts = [];
  if (sourceContext) facts.push(`${sourceContext} ממצאי הקשר נקראו ברצף המקור של פסוקי הציר`);
  if (sourceExact) facts.push(`${sourceExact} רצפי מקור מדויקים`);
  if (verifiedEls) facts.push(`${verifiedEls} מופעי ELS שעברו אימות קנוני`);
  if (compact) facts.push(`${compact} ממצאים בשלב א׳ ללא פער בתצוגת המטריצה`);
  if (spaced) facts.push(`${spaced} ממצאים בשלב ב׳ עם פער מקומי`);

  let inspectFirst = "לא נמצאה עדיין עדיפות מבנית בתוך החבילה המצומצמת.";
  if (sourceContext) inspectFirst = "קראו קודם את פסוקי המקור: זהו קשר טקסטואלי מדויק לציר, אך עדיין לא פירוש של הסיפור.";
  else if (intersections) inspectFirst = `בדקו קודם ${intersections} חציות שנוגעות ממש בציר הראשי.`;
  else if (parallel) inspectFirst = `בדקו קודם ${parallel} מקבילות צמודות שנעות בחוק גיאומטרי משותף.`;
  else if (compact) inspectFirst = "בדקו קודם את ממצאי שלב א׳, שבהם האותיות רצופות בתצוגת המטריצה.";

  const next = groups.length
    ? `פתחו אחת מ־${groups.length} קבוצות המבנה, אמתו רק את המילים הרלוונטיות ואז קראו את המקור והמשך הציר.`
    : items.length
      ? "פתחו ממצא אחד, קראו את המקור והמשך הציר, ורק אחר כך החליטו אם להוסיף אותו למחקר."
      : "אפשר לחזור לתוכנית ולפתוח יעד אחר, או להרחיב טבעת באופן יזום.";

  return Object.freeze({
    contract: ELS_RESEARCH_PACKAGE_GUIDE_CONTRACT,
    facts: Object.freeze(facts),
    inspectFirst,
    next,
    boundary: "החבילה מסבירה occurrence, מקור וגיאומטריה בלבד. היא אינה קובעת משמעות, מובהקות סטטיסטית או אמת.",
    counts: Object.freeze({ sourceContext, sourceExact, verifiedEls, compact, spaced, parallel, intersections, groups: groups.length }),
  });
}
