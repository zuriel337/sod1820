import { METHODS } from '../gematria.js';

// Phase 1 only: bounded, local demonstration. Never use these balances as account
// entitlements, research strength or a server reward ledger.
export const PREVIEW_STORAGE_KEY = 'sod-kingdom-preview-v1';
export const FIXTURE_PROVENANCE = Object.freeze({
  project: 'linswmnnkjxvweumprav', verifiedAt: '2026-10-09',
  function: 'fn_method_profile', depth: 'value', definitionVersion: 1,
  engineRuleVersion: 2, authority: 'vetted_preview_fixture',
});
export const BUILDINGS = Object.freeze([
  { id: 'garden', name: 'גן האותיות', icon: 'gematria', description: 'כל אות היא התחלה של גילוי.', unlock: null },
  { id: 'mine', name: 'מכרה המספרים', icon: 'research', description: 'אותה מילה, מבט חדש על המספר.', unlock: 'garden-2' },
  { id: 'factory', name: 'מפעל הצירופים', icon: 'layers', description: 'הגילויים שלכם הופכים לאור.', unlock: 'mine-2' },
]);
// Values captured by read-only execution of the canonical method profile, not
// authored arithmetic. Local replay uses the SAME existing client METHODS.
export const CHALLENGES = Object.freeze([
  ['letters', 'garden', 'אב', 'רגיל', 3, 'שתי אותיות, צעד ראשון', 'חברו את ערכי שתי האותיות.'],
  ['heart', 'garden', 'לב', 'רגיל', 32, 'לב הממלכה', 'ל = 30. הוסיפו את הערך של ב.'],
  ['light', 'garden', 'אור', 'רגיל', 207, 'אור ראשון', 'א = 1, ו = 6, ר = 200.'],
  ['life', 'garden', 'חיים', 'רגיל', 68, 'הגן מתעורר', 'בשיטה הרגילה, ם שווה למ.'],
  ['peace', 'mine', 'שלום', 'רגיל', 376, 'בעומק המכרה', 'ש = 300, ל = 30, ו = 6, ם = 40.'],
  ['king', 'mine', 'מלך', 'סידורי', 36, 'מחליפים נקודת מבט', 'סידורי הוא מיקום האות באלף־בית: מ = 13, ל = 12, ך = 11.'],
  ['one', 'mine', 'אחד', 'רגיל', 13, 'מוצאים את האחד', 'א = 1, ח = 8, ד = 4.'],
  ['love', 'factory', 'אהבה', 'רגיל', 13, 'חיבור מפתיע', 'א = 1, ה = 5, ב = 2. ה מופיעה פעמיים.'],
  ['torah', 'factory', 'תורה', 'סידורי', 53, 'סדר חדש', 'סידורי: ת = 22, ו = 6, ר = 20, ה = 5.'],
  ['blessing', 'factory', 'ברכה', 'סידורי', 38, 'הממלכה מאירה', 'סידורי: ב = 2, ר = 20, כ = 11, ה = 5.'],
].map(([id, building, expression, method, answer, title, hint]) => Object.freeze({
  id, building, expression, method, answer, title, hint, reward: 20, xp: 10,
  provenance: FIXTURE_PROVENANCE,
})));
export const UPGRADES = Object.freeze([
  { id: 'garden-2', building: 'garden', title: 'שביל האותיות', cost: 20, discoveries: 2, requires: null, benefit: 'גן ברמה 2 ופתיחת מכרה המספרים' },
  { id: 'mine-2', building: 'mine', title: 'עדשת המספרים', cost: 30, discoveries: 5, requires: 'garden-2', benefit: 'מכרה ברמה 2 ופתיחת מפעל הצירופים' },
  { id: 'factory-2', building: 'factory', title: 'מנסרת האור', cost: 35, discoveries: 7, requires: 'mine-2', benefit: 'מפעל ברמה 2: 10 אור מכל גילוי חדש במקום 5' },
  { id: 'garden-3', building: 'garden', title: 'גן פורח', cost: 45, discoveries: 8, requires: 'garden-2', benefit: 'גן ברמה 3 ותוספת קבועה של 5 אור לייצור מכל גילוי חדש' },
  { id: 'mine-3', building: 'mine', title: 'מכרה זוהר', cost: 60, discoveries: 10, requires: 'mine-2', benefit: 'מכרה ברמה 3 ותוספת חד־פעמית של 20 אור למפעל' },
]);
export function initialState() { return { started: false, completed: [], upgrades: [], light: 0, xp: 0, pending: 0, events: [] }; }
export function isUnlocked(state, buildingId) {
  const building = BUILDINGS.find((item) => item.id === buildingId);
  return Boolean(building && (!building.unlock || state.upgrades.includes(building.unlock)));
}
export function buildingLevel(state, id) {
  return isUnlocked(state, id) ? 1 + UPGRADES.filter((item) => item.building === id && state.upgrades.includes(item.id)).length : 0;
}
export function upgradeAvailable(state, upgrade) {
  return state.started && !state.upgrades.includes(upgrade.id) && isUnlocked(state, upgrade.building)
    && state.completed.length >= upgrade.discoveries && state.light >= upgrade.cost
    && (!upgrade.requires || state.upgrades.includes(upgrade.requires));
}
export function fixtureMatchesEngine(challenge) {
  const method = METHODS.find((item) => item.key === challenge.method);
  return Boolean(method && method.fn(challenge.expression) === challenge.answer);
}
export function answerMatches(challenge, answer) {
  const text = String(answer ?? '').trim();
  return /^\d{1,6}$/.test(text) && Number(text) === challenge.answer && fixtureMatchesEngine(challenge);
}
export function transition(state, action) {
  if (!action || typeof action !== 'object') return state;
  let patch;
  let event;
  if (action.type === 'start' && !state.started) {
    patch = { started: true }; event = { type: 'start' };
  } else if (action.type === 'answer' && state.started) {
    const challenge = CHALLENGES.find((item) => item.id === action.id);
    if (!challenge || !isUnlocked(state, challenge.building) || state.completed.includes(challenge.id)
      || !answerMatches(challenge, action.answer)) return state;
    const production = isUnlocked(state, 'factory')
      ? (state.upgrades.includes('factory-2') ? 10 : 5) + (state.upgrades.includes('garden-3') ? 5 : 0) : 0;
    patch = { completed: [...state.completed, challenge.id], light: state.light + challenge.reward,
      xp: state.xp + challenge.xp, pending: state.pending + production };
    event = { type: 'answer', id: challenge.id, answer: challenge.answer };
  } else if (action.type === 'upgrade') {
    const upgrade = UPGRADES.find((item) => item.id === action.id);
    if (!upgrade || !upgradeAvailable(state, upgrade)) return state;
    patch = { upgrades: [...state.upgrades, upgrade.id], light: state.light - upgrade.cost,
      pending: state.pending + (upgrade.id === 'mine-3' ? 20 : 0) };
    event = { type: 'upgrade', id: upgrade.id };
  } else if (action.type === 'collect' && state.started && state.pending > 0) {
    patch = { light: state.light + state.pending, pending: 0 }; event = { type: 'collect' };
  } else return state;
  return { ...state, ...patch, events: [...state.events, event] };
}
export function restorePreview(raw) {
  try {
    const saved = JSON.parse(raw);
    if (saved?.version !== 1 || !Array.isArray(saved.events) || saved.events.length > 64) return initialState();
    return saved.events.reduce(transition, initialState());
  } catch { return initialState(); }
}
export function serializePreview(state) { return JSON.stringify({ version: 1, events: state.events }); }
