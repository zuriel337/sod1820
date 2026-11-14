import React, { useState } from "react";
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
  decoding = undefined,
  fetchPriority = undefined,
  className = "",
}) {
  const resolvedSrc = src || (
    primary
      ? (item?.imageUrl || item?.thumbUrl || null)
      : (item?.thumbUrl || item?.imageUrl || null)
  );
  // Design Contract V2 §8.3: a listed image never stays a broken square. A failed load removes the
  // image (the card keeps its title/text) instead of showing the browser's broken-image glyph.
  const [failedSrc, setFailedSrc] = useState(null);
  if (!resolvedSrc || failedSrc === resolvedSrc) return null;
  // Lazy (below-the-fold) media decodes off the critical path; an eager/priority image keeps the browser default.
  const resolvedDecoding = decoding ?? (loading === "lazy" ? "async" : undefined);
  const resolvedAlt = alt || item?.label || "תמונה";

  return <img
    src={resolvedSrc}
    alt={resolvedAlt}
    loading={loading}
    decoding={resolvedDecoding}
    fetchPriority={fetchPriority}
    className={[
      "sod29-canonical-media-image",
      primary ? "is-primary" : "",
      thumbnail ? "is-thumbnail" : "",
      className,
    ].filter(Boolean).join(" ")}
    data-media-fit="preserve-whole-image"
    onError={() => setFailedSrc(resolvedSrc)}
  />;
}
