// Retired client-side thumbnail capture.
//
// EGRESS_HARDENING_MONITORING_V1:
// Public surfaces MUST NOT create hidden <video> elements or fetch MP4/WebM before an explicit
// user play action. Thumbnail generation is owned by the existing backend gen-thumb pipeline
// (gallery-thumbs / post-thumbs / channel-thumbs cron jobs). This compatibility export remains a
// no-op so stale imports cannot silently reintroduce public egress.
export function ensureVideoThumbs() {
  return { ok: false, retired: true, owner: "backend-gen-thumb" };
}
