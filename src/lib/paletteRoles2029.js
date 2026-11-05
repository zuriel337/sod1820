// 2029-owned semantic colour roles for inline-styled form/gate components, derived from the 2029 palette only.
// (Replaces the retired Legacy gold-on-black constants: values now follow the day / parchment / night presets.)
export function accentRoles2029(P) {
  return {
    surface: P.card, surface2: P.cardSoft, border: P.border, borderGold: P.borderStrong,
    gold: P.accent, goldLight: P.accentText, goldBright: P.heroNum, goldDim: P.accentDim, muted: P.inkSoft,
    accentBtn: P.accentBtn, onAccent: P.onAccent,
  };
}
