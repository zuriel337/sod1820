import React, { useEffect, useState } from "react";
import ExternalVideoFacade2029 from "../experience2029/ExternalVideoFacade2029.jsx";
import { messageLinkPreviews, splitMessageLinks } from "../../lib/community/messageLinks.js";
import { parseMessageFormatting } from "../../lib/community/messageFormatting.js";
import { use2029Palette } from "../../lib/palette2029.js";
import { fetchLinkPreview } from "../../lib/community/linkPreviewClient.js";

// Generic external link: the plain card (host + address) is always there; Open Graph title/description/image replace it only
// when the preview service answered. No request happens while the feature flag is off.
function GenericLinkCard({ link, draft = false }) {
  const [preview, setPreview] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    // A draft is not posted yet: the preview service only answers for addresses already posted in a public message, so a draft keeps
    // the plain card and asks nothing (no request per typed letter either).
    if (draft) return undefined;
    let alive = true;
    fetchLinkPreview(link.href).then((value) => { if (alive) setPreview(value); });
    return () => { alive = false; };
  }, [link.href, draft]);
  if (!preview) return <a className="sod29-community-link-card" href={link.href} target="_blank" rel="noopener noreferrer"><strong dir="ltr">{link.host}</strong><span dir="ltr">{link.href}</span><small>פתיחת הקישור ↗</small></a>;
  return <a className="sod29-community-link-card has-og" data-link-preview="og" href={link.href} target="_blank" rel="noopener noreferrer">
    {preview.image && !imageFailed ? <img className="sod29-community-link-og-image" src={preview.image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} /> : null}
    <span className="sod29-community-link-og-copy">
      <small dir="auto">{preview.siteName || link.host}</small>
      {preview.title ? <strong dir="auto">{preview.title}</strong> : null}
      {preview.description ? <span dir="auto">{preview.description}</span> : null}
    </span>
  </a>;
}

function LinkPreview({ link, draft = false }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  if (link.kind === "video") return <div className="sod29-community-video-card">{videoFailed ? <p>לא ניתן לנגן את הקובץ בדפדפן הזה. אפשר לפתוח את הסרטון בקישור.</p> : <video controls playsInline preload="metadata" src={link.href} aria-label="סרטון שצורף להודעה" onError={() => setVideoFailed(true)} />}<a href={link.href} target="_blank" rel="noopener noreferrer">פתיחת הסרטון המצורף ↗</a></div>;
  if (link.kind === "image") return <a className="sod29-community-attachment-image" href={link.href} target="_blank" rel="noopener noreferrer" aria-label="פתיחת התמונה המצורפת">{imageFailed ? <span role="status">התמונה לא נטענה. אפשר לפתוח אותה בקישור ↗</span> : <img src={link.href} alt="תמונה שצורפה להודעה" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} />}</a>;
  if (link.kind === "file") return <a className="sod29-community-link-card" href={link.href} target="_blank" rel="noopener noreferrer"><strong>📎 קובץ {link.extension}</strong><small>פתיחת הקובץ המצורף ↗</small></a>;
  if (link.kind === "link") return <GenericLinkCard link={link} draft={draft} />;
  return <ExternalVideoFacade2029 link={link} className="sod29-community-video-card" />;
}

export default function CommunityMessageContent({ text, previewsOnly = false, bodyRef }) {
  const palette = use2029Palette();
  const nodes = parseMessageFormatting(text);
  const previewParts = [];
  // Keep a styled URL inside ONE LTR anchor, including when a selection marks
  // only part of it. Splitting it into RTL siblings reverses URL fragments.
  const renderInline = (runs, key) => {
    const parts = splitMessageLinks(runs.map(run => run.text).join(""));
    previewParts.push(...parts);
    let runIndex = 0, runOffset = 0;
    const take = length => {
      const pieces = [];
      while (length > 0 && runIndex < runs.length) {
        const run = runs[runIndex], size = Math.min(length, run.text.length - runOffset);
        let piece = run.text.slice(runOffset, runOffset + size);
        for (const mark of [...run.marks].reverse()) piece = mark === "bold" ? <strong>{piece}</strong> : mark === "underline" ? <u>{piece}</u> : <span className={`sod29-community-text-${mark}`}>{piece}</span>;
        pieces.push(<React.Fragment key={`${runIndex}:${runOffset}`}>{piece}</React.Fragment>);
        length -= size; runOffset += size;
        if (runOffset === run.text.length) { runIndex++; runOffset = 0; }
      }
      return pieces;
    };
    return parts.map((part, index) => {
      const content = take(part.text.length);
      if (!part.link) return <React.Fragment key={`${key}:${index}`}>{content}</React.Fragment>;
      const label = { image: "פתיחת התמונה המצורפת", video: "פתיחת הסרטון המצורף", file: `פתיחת קובץ ${part.link.extension}` }[part.link.kind];
      return <a key={`${key}:${index}`} dir={label ? "auto" : "ltr"} href={part.link.href} target="_blank" rel="noopener noreferrer">{label || content}</a>;
    });
  };
  const renderBlocks = (nodes, inherited = [], path = "body") => {
    const output = []; let runs = [];
    const flush = () => { if (runs.length) { output.push(...renderInline(runs, `${path}:${output.length}`)); runs = []; } };
    const visit = (node, marks) => {
      if (node.type === "text") { if (node.text) runs.push({ text: node.text, marks }); return; }
      if (node.type === "quote") { flush(); output.push(<blockquote key={`${path}:quote:${output.length}`}>{renderBlocks(node.children, marks, `${path}:quote:${output.length}`)}</blockquote>); return; }
      for (const child of node.children) visit(child, [...marks, node.type]);
    };
    for (const node of nodes) visit(node, inherited);
    flush(); return output;
  };
  const content = renderBlocks(nodes);
  const links = messageLinkPreviews(previewParts);
  return <>
    {!previewsOnly ? <div ref={bodyRef} className="sod29-community-body" style={{ "--community-text-gold": palette.warmAccent, "--community-text-blue": palette.accentText }}>{content}</div> : null}
    {links.length ? <div className="sod29-community-link-previews" aria-label="תצוגה מקדימה לקישורים">{links.map((link) => <LinkPreview key={link.key} link={link} draft={previewsOnly} />)}</div> : null}
  </>;
}
