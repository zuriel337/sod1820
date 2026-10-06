import React from "react";
import VideoTranscript from "../VideoTranscript.jsx";

export default function PostEvidenceMedia2029({ media: rawMedia }) {
  // A canonical playable mediaUrl, once published, takes the highlight slot; until then the source card is the fallback.
  const media = rawMedia?.mediaUrl && !rawMedia?.highlight?.src
    ? { ...rawMedia, highlight: { ...(rawMedia.highlight || {}), src: rawMedia.mediaUrl } }
    : rawMedia;
  if (media?.wireframe) {
    return <section
      className="sod29-post-evidence-media is-wireframe"
      data-experience-capability="post-source-media"
      aria-label="מדיית המקור · מבנה בלבד"
    >
      <div className="sod29-wireframe-block">
        <b>HIGHLIGHT</b>
        <span>כאן יוצג רק רגע הראיה מתוך הסרטון</span>
      </div>
      <div className="sod29-wireframe-block">
        <b>FULL SOURCE</b>
        <span>כאן נשמרת גישה ברורה למקור המלא</span>
      </div>
    </section>;
  }
  if (!media?.highlight?.src && media?.sourceCard?.href) {
    const card = media.sourceCard;
    return <section
      className="sod29-post-evidence-media is-source-card"
      data-experience-capability="post-source-media"
      aria-label="מדיית המקור"
    >
      <a className="sod29-source-video-card" href={card.href} target="_blank" rel="noreferrer">
        <span className="sod29-source-video-poster" aria-hidden="true"><i>▶</i></span>
        <span className="sod29-source-video-copy">
          <small>צפו בתיעוד · נפתח באתר המקור</small>
          <strong>{card.title}</strong>
          <em>מקור: {card.outlet}{card.date ? " · " + card.date : ""}</em>
        </span>
      </a>
    </section>;
  }
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
      >
        {(media.captionTracks || []).map((t) => <track
          key={t.srclang + t.src}
          kind="subtitles"
          srcLang={t.srclang}
          src={t.src}
          label={t.label || t.srclang}
          default={t.isDefault}
        />)}
      </video>
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
    {media?.videoKey ? <VideoTranscript videoKey={media.videoKey} title={media.highlight?.label} /> : null}
  </section>;
}
