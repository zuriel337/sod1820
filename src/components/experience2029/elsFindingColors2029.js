import { DESIGN_V2_PALETTES } from "../../lib/palette.js";

// Presentation only: saved legacy colors keep their identity in storage while 2029
// projects them through the existing system palette, consistently in rail and matrix.
const roles = ["accent", "accentSecondary", "accentDiscovery", "brandGold"];
const names = ["ראשי", "משני", "גילוי", "זהב"];
export const findingColorChoices = (palette) => roles.map((role, index) => ({
  color: palette[role] || palette.accent, label: names[index],
  stored: DESIGN_V2_PALETTES.dark[role],
}));
export function projectFindingColor(raw, palette) {
  const value = String(raw || "").toLowerCase();
  let index = roles.findIndex((role) => Object.values(DESIGN_V2_PALETTES).some((p) => p[role]?.toLowerCase() === value));
  if (index < 0) index = Array.from(value).reduce((sum, char) => sum + char.charCodeAt(0), 0) % roles.length;
  return findingColorChoices(palette)[index].color;
}
