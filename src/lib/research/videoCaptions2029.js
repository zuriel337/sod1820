// Captions for a self-hosted video (video_transcription_law v3 §2/§5): a transcript made for a video is also published as a
// WebVTT file, so the player can offer it as captions. One address rule, no table read:
//   • a video in the canonical tree  …/media/sod1820/2029/video/<YYYY>/<MM>/<asset>/original.mp4
//     has its captions beside it    …/media/sod1820/2029/video/<YYYY>/<MM>/<asset>/captions/<lang>.vtt
//   • a channel video stored elsewhere (older broadcasts in the gallery bucket) has them under its occurrence:
//                                     …/media/sod1820/2029/video/<YYYY>/<MM of the occurrence, UTC>/orgeula-<id>/captions/<lang>.vtt
// A candidate is only an address. Whether the file exists is checked when the viewer starts the video (useVideoCaptions2029),
// so a page that lists videos makes no extra request, and a video without captions shows no empty captions option.
import { useCallback, useRef, useState } from "react";
import { publicStorageMedia } from "../mediaEgressGuard.js";

const MEDIA_BASE = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/";
export const VIDEO_CAPTION_LANGS_2029 = Object.freeze([
  Object.freeze({ lang: "he", label: "עברית" }),
  Object.freeze({ lang: "ar", label: "العربية" }),
]);
const CANONICAL_VIDEO = /^\/storage\/v1\/object\/public\/media\/(sod1820\/2029\/video\/\d{4}\/\d{2}\/[A-Za-z0-9_-]+)\/original\.mp4$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function captionFolder(mediaHref, occurrenceId, at) {
  const media = publicStorageMedia(mediaHref);
  if (!media || media.rendition || media.kind !== "video") return null;
  const canonical = CANONICAL_VIDEO.exec(new URL(media.href).pathname);
  if (canonical) return `${MEDIA_BASE}${canonical[1]}/captions/`;
  const id = String(occurrenceId || "").toLowerCase();
  const time = Date.parse(at || "");
  if (!UUID.test(id) || !Number.isFinite(time)) return null;
  const day = new Date(time);
  const month = String(day.getUTCMonth() + 1).padStart(2, "0");
  return `${MEDIA_BASE}sod1820/2029/video/${day.getUTCFullYear()}/${month}/orgeula-${id}/captions/`;
}

// Every caption address a video could have, in display order. Empty when the video is not a public self-hosted file.
export function videoCaptionCandidates2029({ mediaHref, occurrenceId, at } = {}) {
  const folder = captionFolder(mediaHref, occurrenceId, at);
  if (!folder) return [];
  return VIDEO_CAPTION_LANGS_2029.map(entry => ({ ...entry, src: `${folder}${entry.lang}.vtt` }));
}

// Probe once, on the first play. Returns the tracks that exist and the probe to call from the video's onPlay.
export function useVideoCaptions2029(candidates, { fetchImpl } = {}) {
  const [tracks, setTracks] = useState([]);
  const probed = useRef(false);
  const probe = useCallback(() => {
    if (probed.current || !candidates?.length) return;
    probed.current = true;
    const run = fetchImpl || (typeof fetch === "function" ? fetch : null);
    if (!run) return;
    Promise.all(candidates.map(candidate => run(candidate.src, { method: "HEAD" })
      .then(response => (response.ok ? candidate : null), () => null)))
      .then(found => setTracks(found.filter(Boolean)));
  }, [candidates, fetchImpl]);
  return [tracks, probe];
}
