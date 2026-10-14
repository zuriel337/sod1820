import React, { useEffect, useState } from "react";
import CanonicalProgress from "../CanonicalProgress.jsx";
import CanonicalMediaImage2029 from "./CanonicalMediaImage2029.jsx";
import { mediaResearchDetails, mediaToLightboxImage } from "../../lib/research/galleryMediaEnvelope.js";

/**
 * Shared 2029 media presentation: whole-image (contain) + click opens the existing Lightbox
 * with the full image and research details. Consumes the Entity Hub media envelope only —
 * surfaces must never read gallery_images directly. `contextNote` is the context relation
 * (why shown here) and is the only part that differs between surfaces.
 */
export default function CanonicalMediaFigure2029({
  item,
  alt = "",
  primary = false,
  thumbnail = false,
  contextNote = null,
  onOpen = null,
  className = "",
  children = null,
}) {
  const [open, setOpen] = useState(false);
  const [Lightbox, setLightbox] = useState(null);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    if (!open || Lightbox) return undefined;
    let active = true;
    setLoadError(false);
    import("../Lightbox.jsx").then(
      module => { if (active) setLightbox(() => module.default); },
      () => { if (active) setLoadError(true); },
    );
    return () => { active = false; };
  }, [open, Lightbox]);
  if (!item || !(item.imageUrl || item.thumbUrl)) return null;
  const lightboxImage = mediaToLightboxImage(item);
  return <>
    <button
      type="button"
      className={["sod29-canonical-media-figure", className].filter(Boolean).join(" ")}
      data-media-id={item.mediaId || ""}
      data-gallery-image-id={item.galleryImageId || ""}
      onClick={() => { onOpen?.(item); if (lightboxImage) setOpen(true); }}
      aria-label={alt || item.label || "פתח תמונה"}
    >
      <CanonicalMediaImage2029 item={item} alt={alt} primary={primary} thumbnail={thumbnail} />
      {children}
    </button>
    {open && lightboxImage && !Lightbox ? <CanonicalProgress
      compact
      title={loadError ? "לא ניתן לפתוח את התמונה כרגע" : "פותחים את התמונה"}
      detail={loadError ? "אפשר לסגור ולנסות לפתוח שוב." : null}
      onCancel={() => setOpen(false)}
    /> : null}
    {open && lightboxImage && Lightbox ? <Lightbox
      images={[lightboxImage]}
      initialIndex={0}
      onClose={() => setOpen(false)}
      note={contextNote}
      research={mediaResearchDetails(item)}
    /> : null}
  </>;
}
