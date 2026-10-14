import React from "react";
import "./canonicalMediaImage2029.css";

/**
 * Canonical 2029 content-media image.
 * Default policy is preserve-the-whole-image. Cropping must be an explicit future opt-in.
 * `priority` is only for the single above-fold LCP image of a route (eager + fetchpriority=high);
 * every other image stays lazy.
 */
export default function CanonicalMediaImage2029({
  item = null,
  src = null,
  alt = "",
  primary = false,
  thumbnail = false,
  loading = "lazy",
  priority = false,
  className = "",
}) {
  const resolvedSrc = src || (
    primary
      ? (item?.imageUrl || item?.thumbUrl || null)
      : (item?.thumbUrl || item?.imageUrl || null)
  );
  if (!resolvedSrc) return null;
  const resolvedAlt = alt || item?.label || "תמונה";

  return <img
    src={resolvedSrc}
    alt={resolvedAlt}
    loading={priority ? "eager" : loading}
    fetchPriority={priority ? "high" : undefined}
    className={[
      "sod29-canonical-media-image",
      primary ? "is-primary" : "",
      thumbnail ? "is-thumbnail" : "",
      className,
    ].filter(Boolean).join(" ")}
    data-media-fit="preserve-whole-image"
  />;
}
