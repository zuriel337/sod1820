import React from "react";

export default function PostEvidenceMedia2029({ media }) {
  if (!media?.highlight?.src && !media?.fullSource?.href) return null;
  return <section
    className="sod29-post-evidence-media"
    data-experience-capability="post-source-media"
    aria-label="מדיית המקור"
  >
    {media?.highlight?.src ? <div className="sod29-post-evidence-highlight">
      <div className="sod29-post-evidence-kicker">רגע המקור</div>
      <video
        controls
        playsInline
        preload="none"
        poster={media.highlight.poster || undefined}
        src={media.highlight.src}
        aria-label={media.highlight.label || "רגע המקור"}
      />
      <small>{media.highlight.label}</small>
    </div> : null}
    {media?.fullSource?.href ? <a
      className="sod29-post-full-source"
      href={media.fullSource.href}
      target={media.fullSource.href.startsWith("http") ? "_blank" : undefined}
      rel={media.fullSource.href.startsWith("http") ? "noreferrer" : undefined}
    >
      <span>מקור מלא</span>
      <strong>{media.fullSource.label || "לצפייה בסרטון המלא"}</strong>
      <b aria-hidden="true">←</b>
    </a> : null}
  </section>;
}
