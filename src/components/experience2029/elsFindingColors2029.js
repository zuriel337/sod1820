import { DESIGN_V2_PALETTES } from "../../lib/palette.js";

// Presentation only: preserve stored colors and map the canonical engine's automatic
// slots to distinct matrix accents. Rail swatches and cells use the same projection.
const legacySlots = ["#2f9e5a", "#3b82d6", "#8b5cf6", "#e0851b", "#d6336c", "#0d9488", "#b45309", "#4f7a12", "#c026d3", "#0891b2", "#dc2626", "#65a30d"];
const priorRoles = ["accent", "accentSecondary", "accentDiscovery", "brandGold"];
export const findingColorChoices = (palette) => palette.matrix.findings.map((choice) => ({
  ...choice, stored: choice.color,
}));
export function projectFindingColor(raw, palette) {
  const value = String(raw || "").toLowerCase();
  const choices = findingColorChoices(palette);
  const exact = choices.find((choice) => choice.stored.toLowerCase() === value);
  if (exact) return exact.color;
  let index = legacySlots.indexOf(value);
  if (index < 0) index = priorRoles.findIndex((role) => Object.values(DESIGN_V2_PALETTES).some((p) => p[role]?.toLowerCase() === value));
  if (index < 0) index = Array.from(value).reduce((sum, char) => sum + char.charCodeAt(0), 0) % choices.length;
  return choices[index].color;
}

export function nextFindingColor(findings, palette) {
  const choices = findingColorChoices(palette);
  const used = new Set(findings.map((finding) => projectFindingColor(finding.color, palette)));
  return (choices.find((choice) => !used.has(choice.color)) || choices[findings.length % choices.length]).stored;
}
