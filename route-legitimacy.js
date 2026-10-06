// ROUTE_LEGITIMACY_2029_V1
// Pure routing projection used by Edge middleware. No DB access, no bot policy, no truth owner.

export const KNOWN_SINGLE_SEGMENT_ROUTES = new Set([
  "/2029",
  "/718",
  "/888",
  "/about",
  "/admin",
  "/archive",
  "/beit-midrash",
  "/bennett-melach-631-78",
  "/book",
  "/books",
  "/broadcasts",
  "/buy",
  "/chat",
  "/code",
  "/codes",
  "/community",
  "/community-shadow-preview-2029",
  "/contact",
  "/credits",
  "/cross",
  "/editor",
  "/els",
  "/enter",
  "/entity-hub-preview",
  "/experience",
  "/flydubai-fz1073-363-14000-remzei-geula",
  "/explorer-preview",
  "/forum",
  "/galaxy",
  "/gallery",
  "/gallery-updates",
  "/gematria",
  "/gematria-3d",
  "/heichal",
  "/home-classic",
  "/home-new",
  "/join",
  "/journey",
  "/journey-beta",
  "/lab",
  "/languages",
  "/login",
  "/map",
  "/meaning-lab",
  "/members",
  "/name",
  "/name-lab",
  "/number",
  "/numbers",
  "/numbers-report",
  "/or-geula",
  "/post",
  "/privacy",
  "/profile",
  "/reality",
  "/research",
  "/research-viewer",
  "/reveal",
  "/spatial-gematria",
  "/start",
  "/stream",
  "/sulamot",
  "/sulamot10",
  "/sulamot11",
  "/sulamot2",
  "/sulamot3",
  "/sulamot4",
  "/sulamot5",
  "/sulamot6",
  "/sulamot7",
  "/sulamot8",
  "/sulamot9",
  "/theme-preview",
  "/timeline",
  "/traffic",
  "/unsubscribe",
  "/verified",
  "/verse-gematria",
  "/welcome",
  "/whats-new",
  "/world",
  "/אור-הגאולה",
  "/בית-חדש",
  "/גימטריה",
  "/גימטריה-מרחבית",
  "/גימטריה-תלת-ממדית",
  "/דף-צאט-ראשי",
  "/דף-ראשי",
  "/דף-ראשי-2",
  "/היכל",
  "/הצלבה",
  "/חישוב",
  "/מסע",
  "/מעבדת-השם",
  "/מעבדת-משמעות",
  "/משיח-בשנת-התשעו",
  "/ניסיון",
  "/פוסטים-אחרונים",
  "/פוסטים-אחרונים-2",
  "/פסוקים",
  "/צור-קשר",
  "/קשרי-שפות",
  "/שם",
]);

export function normalizeRoutePath(path) {
  let p = String(path || "/").split("?")[0] || "/";
  if (!p.startsWith("/")) p = "/" + p;
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p || "/";
}

export function decodedRoutePath(path) {
  const p = normalizeRoutePath(path);
  try { return decodeURIComponent(p); } catch { return p; }
}

export function isSingleSegmentRoute(path) {
  const p = normalizeRoutePath(path);
  return /^\/[^/]+$/.test(p);
}

export function isKnownSingleSegmentRoute(path) {
  const p = normalizeRoutePath(path);
  if (KNOWN_SINGLE_SEGMENT_ROUTES.has(p)) return true;
  const decoded = decodedRoutePath(p);
  return KNOWN_SINGLE_SEGMENT_ROUTES.has(decoded);
}

export function postSlugVariants(path) {
  const p = normalizeRoutePath(path);
  const raw = p.replace(/^\//, "");
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch { /* keep raw */ }
  const encodedLower = encodeURIComponent(decoded).replace(/%[0-9A-Fa-f]{2}/g, m => m.toLowerCase());
  return {
    decoded,
    encodedLower: encodedLower === decoded ? null : encodedLower,
  };
}
