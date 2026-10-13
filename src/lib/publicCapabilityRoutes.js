// Address projection of existing site_flags. No new availability state or owner.
const ROUTES = [
  [/^\/numbers(?:\/|$)/, 'lock_convergence_tree', 'מפת המספרים'],
  [/^\/(?:number|2029\/number)(?:\/|$)/, 'lock_number', 'דף המספר'],
  [/^\/books?(?:\/|$)/, 'lock_books', 'ספרים ומקורות'],
  [/^\/(?:heichal(?:\.html)?|היכל)(?:\/|$)/, 'lock_heichal', 'ההיכל'],
  [/^\/(?:journey|journey-beta|מסע|2029\/journey)(?:\/|$)/, 'lock_life_journey', 'המסע האישי'],
  [/^\/forum(?:\/|$)/, 'lock_forum', 'פורום המחקר'],
  [/^\/(?:cross|הצלבה)(?:\/|$)/, 'lock_cross', 'הצלבת שיטות'],
  [/^\/research(?:\/|$)/, 'lock_research', 'סביבת המחקר'],
];
export const PUBLIC_CAPABILITY_KEYS = [...new Set(ROUTES.map(([, key]) => key))];
export function publicCapabilityForPath(rawPath) {
  let path;
  try { path = decodeURIComponent(String(rawPath).split(/[?#]/)[0]); } catch { return null; }
  const match = ROUTES.find(([pattern]) => pattern.test(path));
  return match ? { key: match[1], title: match[2] } : null;
}
export function publicCapabilityIsOpen(rows, key) {
  if (!Array.isArray(rows)) return false;
  const matching = rows.filter(row => row?.key === key);
  return matching.length === 1 && matching[0].enabled === false
    && ['all', 'anon'].includes(matching[0].mode);
}
