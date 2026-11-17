// src/lib/spatial/cubeJourney.js — PURE: the state and the doorways of the inner exploration of a cube (1020).
// No React/three import, no calculation, no network. It adds NO research fact, NO store and NO contract:
//  - the exploration state lives in the URL of the page the cube is on (cube=in&face=N&door=…&dir=…), so a reload, the browser's Back and the frame's
//    EXISTING "exact return" (Research Context `returnTo`, researchContext.js) all restore the same face and the same doorway;
//  - every doorway is a POINTER at something that already exists: the canonical gematria trace (verification), the Number page, the Zvi calculation of this
//    card, the source-bound Sefer Yetzirah reader (structure id + component id + PDF page, validated against public/book-data/sefer-yetzirah.structures.json
//    by test/spatial-cube-journey.test.mjs), and the related Zvi model 3060. Nothing of the book is copied here beyond the labels the structures file carries;
//  - the cube's six faces are a USER INTERFACE for choosing among six source directions, an explicit projection — never a claim that the ten «טוב» on a face
//    equal the six seals. A seal is never attached to a face: the direction is chosen AFTER entry, by the person.
import { numberPageHref } from "../research/numberPageAddress.js";

export const CUBE_JOURNEY_FACES = 6;

// ---- the existing source-bound pointers (Books owner). Validated against the structures file, not re-transcribed ----
export const SEFER_YETZIRAH_POINTERS = Object.freeze({
  identity: "book:sefer-yetzirah-9perushim",
  title: "ספר יצירה · תשעה פירושים",
  // the six directions in the order the source structure lists them; the labels are the structure's own component labels
  directions: Object.freeze([
    Object.freeze({ key: "up", label: "רום" }), Object.freeze({ key: "down", label: "תחת" }), Object.freeze({ key: "east", label: "מזרח" }),
    Object.freeze({ key: "west", label: "מערב" }), Object.freeze({ key: "south", label: "דרום" }), Object.freeze({ key: "north", label: "צפון" }),
  ]),
  sealsSynoptic: Object.freeze({ structureId: "sy-structure:six-seals-synoptic", page: 73, sourceRef: "book:sefer-yetzirah-9perushim#p73:synoptic_body:text:synoptic:ch1:six-seals" }),
  sealsGra: Object.freeze({ structureId: "sy-structure:six-seals-gra-edition", page: 175, sourceRef: "book:sefer-yetzirah-9perushim#p175:gra_commentary:text:gra-edition:ch1:six-seals" }),
  depths: Object.freeze({ structureId: "sy-structure:ten-depths", page: 53, sourceRef: "book:sefer-yetzirah-9perushim#p53:synoptic_body:text:synoptic:ch1:depths", good: "good", evil: "evil" }),
});
const componentId = (structureId, key) => `${structureId}:component:${key}`;

// The reader is a Books-owner surface behind the book-publication review flag; the public-reading artifact (and so the protected Preview) builds with that flag
// OFF, so there the doorway is link-only and says why — it never pretends the source is open.
export function bookReaderHref({ structureId, key = null, page, experience = null }) {
  const params = new URLSearchParams({ surface: "sefer-yetzirah-world" });
  if (experience) params.set("experience", experience);
  params.set("page", String(page));
  if (structureId) params.set("structure", structureId);
  if (structureId && key) params.set("component", componentId(structureId, key));
  return `/2029/control?${params.toString()}`;
}
export const bookReaderAvailable = (env = import.meta.env) => env?.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW === "true";

// ---- exploration state in the URL ----
const DOOR_IDS = Object.freeze(["verify", "number", "zvi", "seals", "gra", "depths", "next"]);
export const CUBE_JOURNEY_DOORS = DOOR_IDS;
const DIRECTION_KEYS = SEFER_YETZIRAH_POINTERS.directions.map((item) => item.key);

export function readCubeJourney(search = "") {
  const params = new URLSearchParams(search);
  const inside = params.get("cube") === "in";
  const faceRaw = params.get("face");
  const face = /^[0-5]$/.test(faceRaw || "") ? Number(faceRaw) : null;
  const door = DOOR_IDS.includes(params.get("door")) ? params.get("door") : null;
  const dir = DIRECTION_KEYS.includes(params.get("dir")) ? params.get("dir") : null;
  // a face / door / direction means something only inside the cube
  return inside ? { inside: true, face, door, dir } : { inside: false, face: null, door: null, dir: null };
}

// The href of the same page with the exploration state written in (other parameters — lab, view, kind — and the hash are kept).
export function cubeJourneyHref(location = {}, state = {}) {
  const params = new URLSearchParams(location.search || "");
  for (const key of ["cube", "face", "door", "dir"]) params.delete(key);
  if (state.inside) {
    params.set("cube", "in");
    if (Number.isInteger(state.face) && state.face >= 0 && state.face < CUBE_JOURNEY_FACES) params.set("face", String(state.face));
    if (DOOR_IDS.includes(state.door)) params.set("door", state.door);
    if (DIRECTION_KEYS.includes(state.dir)) params.set("dir", state.dir);
  }
  const search = params.toString();
  return `${location.pathname || ""}${search ? `?${search}` : ""}${location.hash || ""}`;
}

// ---- verification (reads the already-evaluated path: the canonical engine verified it; nothing is computed here) ----
export function journeyVerification(path) {
  const term = (path?.terms || []).find((t) => t.role === "expression");
  const status = path?.status || "pending";
  return { word: term?.text ?? null, value: term?.value ?? null, status, verified: status === "verified", method: "רגיל" };
}

const DIRECTION_LABEL = Object.freeze(Object.fromEntries(SEFER_YETZIRAH_POINTERS.directions.map((item) => [item.key, item.label])));
export const directionLabel = (key) => DIRECTION_LABEL[key] || null;

// ---- the doorways ----
// card: the World spatial card DTO; path: the evaluated path carried by the cube; face: the selected face (0..5) or null; dir: the chosen source direction or null.
// Only a model with registered source pointers has book doorways (today: the 1020 cube); every cube has verification, its number, its own calculation.
const BOOK_DOORWAY_SLUGS = Object.freeze(["hashgacha-pratit-1020"]);
const RELATED_BY_SLUG = Object.freeze({ "hashgacha-pratit-1020": Object.freeze({ slug: "yesharim-cube-3060", value: 3060, label: "3060 · קוביית ישר והתכנסות המחומש", relation: "השגחה פרטית (1020) × 3 — שלושת האבות" }) });

export function buildCubeDoorways({ card, path = null, dir = null, readerAvailable = false, lab = "museum" } = {}) {
  const verification = journeyVerification(path);
  const word = verification.word, value = verification.value;
  const doors = [];
  doors.push({ id: "verify", group: "engine", kind: "panel", state: verification.verified ? "ready" : verification.status === "pending" ? "pending" : "unavailable",
    label: `אמת «${word}» = ${value} במנוע`, hint: "גימטריה רגילה, מהמנוע הקנוני (gematria_method_trace)", verification });
  if (Number.isFinite(Number(value))) doors.push({ id: "number", group: "number", kind: "link", state: "ready", href: numberPageHref(Number(value)),
    label: `פתח את המספר ${value}`, hint: "דף המספר הקיים — כל מה שנאסף עליו" });
  doors.push({ id: "zvi", group: "research", kind: "panel", state: "ready", label: "החישוב של צבי בכרטיס", hint: "מוצג כפי שמצוטט במודל; הצורה היא המחשה של החישוב, לא ראיה נוספת" });
  if (BOOK_DOORWAY_SLUGS.includes(card?.slug)) {
    const P = SEFER_YETZIRAH_POINTERS, open = Boolean(readerAvailable);
    const locked = open ? {} : { lockedReason: "הקורא של ספר יצירה נמצא בבדיקת פרסום ואינו פתוח לציבור בגרסה זו. המקור מצוין כאן כהפניה בלבד (ספר, עמוד, מבנה) ואינו נפתח." };
    doors.push({ id: "seals", group: "book", kind: "link", state: open ? (dir ? "ready" : "choose") : "locked", needsDirection: true,
      href: open && dir ? bookReaderHref({ structureId: P.sealsSynoptic.structureId, key: dir, page: P.sealsSynoptic.page }) : null,
      label: "ששת הכיוונים · ספר יצירה", hint: `שש החותמות בגוף המשולב · עמ׳ ${P.sealsSynoptic.page}. בוחרים כיוון אחרי הכניסה — אף כיוון אינו מוצמד לפאה.`,
      source: { identity: P.identity, title: P.title, page: P.sealsSynoptic.page, structureId: P.sealsSynoptic.structureId, componentId: dir ? componentId(P.sealsSynoptic.structureId, dir) : null, ref: P.sealsSynoptic.sourceRef },
      projectionNote: "ששת פני הקובייה משמשים כאן ממשק לבחירת ששת הכיוונים של המקור. זו הקרנה לצורך בחירה: חזרת «טוב» עשר פעמים בכל פאה אינה שש החותמות, והספר אינו מוכיח את המודל.", ...locked });
    doors.push({ id: "gra", group: "book", kind: "link", state: open ? (dir ? "ready" : "choose") : "locked", needsDirection: true, optional: true,
      href: open && dir ? bookReaderHref({ structureId: P.sealsGra.structureId, key: dir, page: P.sealsGra.page }) : null,
      label: "השוואה לנוסח הגר״א", hint: `אותם שישה כיוונים בנוסח הגר״א · עמ׳ ${P.sealsGra.page}`,
      source: { identity: P.identity, title: P.title, page: P.sealsGra.page, structureId: P.sealsGra.structureId, componentId: dir ? componentId(P.sealsGra.structureId, dir) : null, ref: P.sealsGra.sourceRef },
      projectionNote: "בנוסח הגר״א שבעמוד 175 קיימת שונות בנוסח התיבה (בירר / בחר) שאינה מוכרעת כאן; תמונת העמוד היא הקובעת. הוויכוח הנוסחי נשמר פתוח.", ...locked });
    doors.push({ id: "depths", group: "book", kind: "link", state: open ? "ready" : "locked",
      href: open ? bookReaderHref({ structureId: P.depths.structureId, key: P.depths.good, page: P.depths.page, experience: "depths" }) : null,
      label: "טוב ורע · עשרת העומקים", hint: `עשרה עומקים, ובהם טוב ורע · עמ׳ ${P.depths.page}`,
      source: { identity: P.identity, title: P.title, page: P.depths.page, structureId: P.depths.structureId, componentId: componentId(P.depths.structureId, P.depths.good), ref: P.depths.sourceRef },
      projectionNote: "«טוב» בעשרת העומקים הוא מונח של הספר; «טוב» בקובייה הוא מונח של המודל. שניהם ערך 17 בגימטריה, והקשר ביניהם נשאר שאלה פתוחה לחוקר.", ...locked });
  }
  const related = RELATED_BY_SLUG[card?.slug];
  if (related) doors.push({ id: "next", group: "continue", kind: "link", state: "ready", href: `/world?view=explore&kind=spatial&lab=${encodeURIComponent(lab)}#spatial-${related.slug}`,
    label: `המשך ל־${related.value}`, hint: related.relation, related });
  return doors;
}

// The target the frame's EXISTING "exact return" (Research Context returnTo) restores: the same page, the same face, the same door and direction.
export function cubeReturnTarget({ location, card, state, doorId = null }) {
  const href = cubeJourneyHref(location, { ...state, inside: true, door: doorId || state?.door || null });
  const face = Number.isInteger(state?.face) ? state.face : null;
  const subject = { id: `spatial:${card?.slug}`, type: "spatial_model", label: card?.title || card?.slug || null, href };
  return {
    href,
    label: `חזרה לקובייה ${card?.value ?? ""}${face != null ? ` · פאה ${face + 1}` : ""}`.trim(),
    subject,
    selection: { entityId: face != null ? `${subject.id}:face:${face}` : subject.id, entityType: face != null ? "spatial_face" : "spatial_model", locator: doorId ? `#cube-door-${doorId}` : null },
    lens: "world",
  };
}
