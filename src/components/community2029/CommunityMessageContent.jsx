import React, { useState } from "react";
import { messageLinkPreviews, splitMessageLinks } from "../../lib/community/messageLinks.js";

function LinkPreview({ link }) {
  const [playing, setPlaying] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const provider = link.kind === "youtube" ? "YouTube" : "Vimeo";
  if (link.kind === "link") return <a className="sod29-community-link-card" href={link.href} target="_blank" rel="noopener noreferrer"><strong dir="ltr">{link.host}</strong><span dir="ltr">{link.href}</span><small>פתיחת הקישור ↗</small></a>;
  return <div className="sod29-community-video-card">
    {playing ? <iframe src={link.embed} title={`סרטון ${provider}`} allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      : <button type="button" className="sod29-community-video-cover" onClick={() => setPlaying(true)} aria-label={`פתיחת נגן ${provider}`}>
        {link.thumbnail && !imageFailed ? <img src={link.thumbnail} alt="" loading="lazy" onError={() => setImageFailed(true)} /> : null}
        <span className="sod29-community-play" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 4v16l13-8Z" /></svg></span><span className="sod29-community-video-label">סרטון {provider}</span>
      </button>}
    <a href={link.href} target="_blank" rel="noopener noreferrer">צפייה ב־{provider} ↗</a>
  </div>;
}

export default function CommunityMessageContent({ text, previewsOnly = false }) {
  const parts = splitMessageLinks(text);
  const links = messageLinkPreviews(parts);
  return <>
    {!previewsOnly ? <p className="sod29-community-body">{parts.map((part, index) => part.link ? <a key={index} dir="auto" href={part.link.href} target="_blank" rel="noopener noreferrer">{part.text}</a> : part.text)}</p> : null}
    {links.length ? <div className="sod29-community-link-previews" aria-label="תצוגה מקדימה לקישורים">{links.map((link) => <LinkPreview key={link.key} link={link} />)}</div> : null}
  </>;
}
