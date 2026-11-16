// Video ↔ number ↔ content-unit references for a Post — a PROJECTION over existing identities (ZURIEL 12.11.2026, section 7).
// There is no public number→video reader today: the catalog (`video_media_assets_v1`) is a derived view that only matches ABSOLUTE urls,
// and the research layer (`research_objects` VIDEO_REPRESENTATION_MAP) is private and written by a service-role RPC. Writing there needs
// ZURIEL's explicit approval, so this file records only what is already proven, as references, and never invents a second:
//   - `catalog` states whether the asset is a catalogued asset (public_id read live 12.11.2026) or NOT catalogued;
//   - `startSec: null` means "time unknown": the video opens from its start, never at a made-up second;
//   - two occurrences of one number stay two occurrences with their own nature (a count in the frame is not a gematria claim).
// Not a registry of truth, not a store: nothing here is verified by being listed; the engine state of a claim comes only from the engine.
import { numberPageHref } from "./numberPageAddress.js";

const CROWN_SRC = "/media/posts/2026-11-sharshar-crown/sharshar-crown.mp4";
const SHOES_SRC = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/agent/sharshar-66-shoes-7677719742953671953.mp4";

export const OCCURRENCE_NATURE = Object.freeze({
  on_screen_count: "מספר שמופיע בצילום הסרטון — ספירה, לא חישוב גימטרי",
  unit_caption: "כיתוב שבחר צוריאל ליחידה — טענה גימטרית שטרם נבדקה במנוע עד שנבדקה",
  spoken: "נאמר בסרטון",
});

export const POST_VIDEO_REFERENCES_2029 = Object.freeze({
  5107: Object.freeze([
    Object.freeze({
      id: "sharshar-66-shoes", src: SHOES_SRC, label: "שרשר — 66 זוגות נעליים",
      catalog: Object.freeze({ status: "catalogued", publicId: "ac662f4a0ad1001e9240018dd6f7213c", semanticMap: false }),
      occurrences: Object.freeze([]),
    }),
    Object.freeze({
      id: "sharshar-crown", src: CROWN_SRC, label: "שרשר המלך — ממשלת אייזנקוט מושבעת",
      // Relative path ⇒ the catalog's absolute-url match misses it (found live 12.11.2026). Linking it into the catalog is a DB write.
      catalog: Object.freeze({ status: "not_catalogued", publicId: null, semanticMap: false, blocker: "relative_src_not_matched_by_video_media_placements_v1" }),
      occurrences: Object.freeze([
        Object.freeze({ id: "crown-1437-likes", number: 1437, nature: "on_screen_count", text: "1,437 לייקים", startSec: null, unitId: null, gematria: false }),
        Object.freeze({ id: "crown-1437-caption", number: 1437, nature: "unit_caption", text: "1437 = משיח הויה", startSec: null, unitId: "knesset-sworn-1234-1011", gematria: true, methodText: "משולש" }),
      ]),
    }),
  ]),
  5112: Object.freeze([
    Object.freeze({
      id: "fz1073-video-a", src: "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/2029/video/2026/10/plane-14000-14-75/final-20261001-v4.mp4", label: "סרטון הרמזים — טיסה 1073",
      catalog: Object.freeze({ status: "catalogued", publicId: "988b0457cc44074a29a98f7abe4029fb", semanticMap: true }), occurrences: Object.freeze([]),
    }),
    Object.freeze({
      id: "fz1073-video-b", src: "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/2029/video/2026/10/d808d3ce-9312-4c15-b5ed-4fbf45a3c8a9/original.mp4", label: "הסרטון השני — טיסה 1073",
      catalog: Object.freeze({ status: "catalogued", publicId: "83c3afd23566b3ded4b85427c4327e95", semanticMap: true }), occurrences: Object.freeze([]),
    }),
  ]),
});

export const videoReferencesForPost = (postId) => POST_VIDEO_REFERENCES_2029[Number(postId)] || [];

// Same video, whatever the quoting of its src (relative paths compare by path only).
export const videoRefBySrc = (postId, src) => {
  const clean = String(src || "").split(/[?#]/)[0];
  return videoReferencesForPost(postId).find((video) => video.src === clean || clean.endsWith(video.src)) || null;
};

// Every occurrence of a number in this Post's videos, each with where it opens: the unit anchor when the occurrence belongs to a unit,
// and the video itself. No second is ever invented: a `#t=` is added only when startSec is a real number.
export function occurrencesForNumber(postId, number, { postHref = "" } = {}) {
  const wanted = Number(number);
  const out = [];
  for (const video of videoReferencesForPost(postId)) for (const occ of video.occurrences) {
    if (occ.number !== wanted) continue;
    out.push({
      ...occ, videoId: video.id, videoLabel: video.label, videoSrc: video.src, catalog: video.catalog,
      natureLabel: OCCURRENCE_NATURE[occ.nature] || "",
      unitHref: occ.unitId ? `${postHref}#${encodeURIComponent(occ.unitId)}` : null,
      timeKnown: Number.isFinite(occ.startSec),
      videoOpenHref: `${video.src}${Number.isFinite(occ.startSec) ? `#t=${occ.startSec}` : ""}`,
      numberHref: numberPageHref(wanted),
    });
  }
  return out;
}
