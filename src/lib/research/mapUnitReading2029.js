import { publicPostUnitHref } from "../publicPostUrls.js";
import { numberExpressionFocusHref } from "./numberExpressionFocus.js";

// Editorial selection for the preview, independent of publication order.
export const mapLeadId = 5107;
const bennettId = 5113;
export const mapTimelinePostIds = [mapLeadId, bennettId];

const elections = {
  id: mapLeadId, slug: "sharshar-elections-redemption-hints-draft", key: "yamin-smol-2026-5787-1237-1158",
  label: "ימין ושמאול תפרצי · הבחירות",
  essence: "יניב לוי פותח בפסוק מישעיהו וקושר אותו ל־2026 ולתשפ״ז. בהמשך מופיעה הקריאה המספרית של יצחק שחר קנדרו.",
};
const bennett = {
  id: bennettId, slug: "bennett-melach-631-78", key: "bennett-salt-covenant-unity-20261119",
  label: "ברית מלח · בנט",
  eventDate: "2026-11-18",
  eventLabel: "הדיווח על ההצעה",
  equation: { expression: "מלח", method: "רגיל", value: 78 },
  essence: "בקריאה של הפוסט, המלח שנזרק לעבר בנט בבני ברק מתחבר להצעתו להושיב יריבים פוליטיים בממשלה אחת. ״ברית מלח״ היא החוט המקשר בין שני הרגעים.",
};

export function mapWorldHref(unitId) {
  return unitId
    ? "/world?view=reality-map&selected=" + encodeURIComponent(unitId)
    : "/world?view=reality-map";
}

export function mapUnitReading(postId, activeKey) {
  const source = [elections, bennett].find(item => item.id === Number(postId));
  if (!source || (activeKey !== undefined && activeKey !== source.key)) return null;
  const target = source === elections ? bennett : elections;
  return { ...source, relatedKey: target.key, relatedPostId: target.id, relatedLabel: target.label,
    connectionDocumentedOn: "2026-11-20", href: publicPostUnitHref({ slug: target.slug, source: "ai" }, target.key),
    reason: "ביחידת הבחירות נקרא הפסוק על ימין ושמאל. בפוסט בנט חוזרת אותה שאלה מזווית פוליטית: איך מחברים בין קצוות?" };
}

// Transform only the displayed copy. Keep every authored child, its order, anchor and media.
export function compactMapUnitHtml(html, postId) {
  const unit = mapUnitReading(postId);
  if (!unit || !globalThis.document) return html;
  const template = document.createElement("template");
  template.innerHTML = html;
  const section = template.content.getElementById(unit.key);
  const heading = section?.querySelector(":scope > h2, :scope > header > h2");
  if (!heading || section.querySelector(":scope > [data-map-depth]")) return html;
  section.dataset.sodUnit = unit.key;
  const head = heading.parentElement === section ? heading : heading.parentElement;
  const depth = document.createElement("details");
  depth.setAttribute("data-map-depth", "");
  const summary = document.createElement("summary");
  summary.textContent = "הרחבה ומקורות";
  depth.append(summary);
  while (head.nextSibling) depth.append(head.nextSibling);
  const essence = document.createElement("p");
  essence.dataset.mapEssence = "";
  essence.textContent = unit.essence;
  head.after(essence);
  const equation = unit.equation;
  const marker = equation && depth.querySelector(`[data-gem="${equation.value}"]`);
  if (marker?.closest("p")?.textContent.includes(`״${equation.expression}״`)) {
    const equationLink = document.createElement("a");
    equationLink.dataset.mapEquation = "";
    equationLink.href = numberExpressionFocusHref(equation.value, equation);
    equationLink.textContent = `${equation.expression} = ${equation.value}`;
    essence.after(equationLink);
  }
  const link = document.createElement("a");
  link.dataset.mapRelated = "";
  link.href = unit.href;
  link.textContent = unit.relatedLabel + " ←";
  section.append(depth, link);
  return template.innerHTML;
}
