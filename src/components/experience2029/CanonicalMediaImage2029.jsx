import React from "react";
import "./canonicalMediaImage2029.css";
import { SUPABASE_URL } from "../../lib/supabasePublicConfig.js";
import { MOBILE_READING_MEDIA, mobileReadingRenditionUrl } from "./mobileReadingImage2029.js";

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
  const rendition = resolvedSrc
    ? mobileReadingRenditionUrl(resolvedSrc, { supabaseUrl: SUPABASE_URL, primary, thumbnail })
    : null;
  // Bounded fallback: one failed rendition drops the <source> for this src; no retry.
  const [failedFor, setFailedFor] = React.useState(null);
  if (!resolvedSrc) return null;
  const resolvedAlt = alt || item?.label || "תמונה";
  const useRendition = rendition && failedFor !== resolvedSrc;

  const img = <img
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
    onError={useRendition ? () => setFailedFor(resolvedSrc) : undefined}
  />;
  if (!useRendition) return img;
  return <picture style={{ display: "contents" }}>
    <source media={MOBILE_READING_MEDIA} srcSet={rendition} type="image/jpeg" />
    {img}
  </picture>;
}
