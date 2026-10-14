import React from "react";
import "./canonicalMediaImage2029.css";

/**
 * Canonical 2029 content-media image.
 * Default policy is preserve-the-whole-image. Cropping must be an explicit future opt-in.
 */
export default function CanonicalMediaImage2029({
  item = null,
  src = null,
  alt = "",
  primary = false,
  thumbnail = false,
  loading = "lazy",
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
    loading={loading}
    className={[
      "sod29-canonical-media-image",
      primary ? "is-primary" : "",
      thumbnail ? "is-thumbnail" : "",
      className,
    ].filter(Boolean).join(" ")}
    data-media-fit="preserve-whole-image"
  />;
}
