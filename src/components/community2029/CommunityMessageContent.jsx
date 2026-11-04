import React, { useState } from "react";
import { messageLinkPreviews, splitMessageLinks } from "../../lib/community/messageLinks.js";
import { messageFormattingText, parseMessageFormatting } from "../../lib/community/messageFormatting.js";
import { use2029Palette } from "../../lib/palette.js";

function LinkPreview({ link }) {
  const [playing, setPlaying] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const provider = link.kind === "youtube" ? "YouTube" : "Vimeo";
  if (link.kind === "video") return <div className="sod29-community-video-card">{videoFailed ? <p>לא ניתן לנגן את הקובץ בדפדפן הזה. אפשר לפתוח את הסרטון בקישור.</p> : <video controls playsInline preload="metadata" src={link.href} aria-label="סרטון שצורף להודעה" onError={() => setVideoFailed(true)} />}<a href={link.href} target="_blank" rel="noopener noreferrer">פתיחת הסרטון המצורף ↗</a></div>;
  if (link.kind === "image") return <a className="sod29-community-attachment-image" href={link.href} target="_blank" rel="noopener noreferrer" aria-label="פתיחת התמונה המצורפת"><img src={link.href} alt="תמונה שצורפה להודעה" loading="lazy" /></a>;
  if (link.kind === "file") return <a className="sod29-community-link-card" href={link.href} target="_blank" rel="noopener noreferrer"><strong>📎 קובץ {link.extension}</strong><small>פתיחת הקובץ המצורף ↗</small></a>;
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

export default function CommunityMessageContent({ text, previewsOnly = false, bodyRef }) {
  const palette = use2029Palette();
  const nodes = parseMessageFormatting(text);
  const parts = splitMessageLinks(messageFormattingText(nodes));
  let partIndex = 0, partOffset = 0;
  const renderText = value => {
    const fragments = [];
    let offset = 0;
    while (offset < value.length && partIndex < parts.length) {
      const part = parts[partIndex], length = Math.min(value.length - offset, part.text.length - partOffset);
      const segment = value.slice(offset, offset + length);
      if (part.link) {
        const attachment = { image: "פתיחת התמונה המצורפת", video: "פתיחת הסרטון המצורף", file: `פתיחת קובץ ${part.link.extension}` }[part.link.kind];
        if (!attachment || partOffset === 0) fragments.push(<a key={`${partIndex}:${partOffset}`} dir="auto" href={part.link.href} target="_blank" rel="noopener noreferrer">{attachment || segment}</a>);
      } else fragments.push(segment);
      offset += length; partOffset += length;
      if (partOffset === part.text.length) { partIndex++; partOffset = 0; }
    }
    return fragments;
  };
  const render = (nodes, path = "body") => nodes.map((node, index) => {
    const key = `${path}:${index}`;
    if (node.type === "text") {
      return <React.Fragment key={key}>{renderText(node.text)}</React.Fragment>;
    }
    const children = render(node.children, key);
    if (node.type === "bold") return <strong key={key}>{children}</strong>;
    if (node.type === "underline") return <u key={key}>{children}</u>;
    if (node.type === "quote") return <blockquote key={key}>{children}</blockquote>;
    return <span key={key} className={`sod29-community-text-${node.type}`}>{children}</span>;
  });
  const content = render(nodes);
  const links = messageLinkPreviews(parts);
  return <>
    {!previewsOnly ? <div ref={bodyRef} className="sod29-community-body" style={{ "--community-text-gold": palette.warmAccent, "--community-text-blue": palette.accentText }}>{content}</div> : null}
    {links.length ? <div className="sod29-community-link-previews" aria-label="תצוגה מקדימה לקישורים">{links.map((link) => <LinkPreview key={link.key} link={link} />)}</div> : null}
  </>;
}
