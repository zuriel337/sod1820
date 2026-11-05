import React, { useState } from "react";
import { displayAvatarUrl, writerAvatarStyle } from "../lib/avatar.js";
import { use2029Palette } from "../lib/palette.js";
import "./UserBadge.css";

// Source size requested from storage: covers the 36-104 px avatar slots up to 2x density without shipping the original.
const AVATAR_SOURCE_PX = 160;

// Canonical user presentation. Identity/visibility must be resolved by the reader;
// this component never looks users up by name, fetches a profile, or claims ownership.
export default function UserBadge({ name, avatarUrl, initial, avatarOnly = false, avatarClassName = "", colorfulFallback = false, fallbackSeed, fallbackImage, children }) {
  const palette = use2029Palette();
  const style = { "--user-badge-ink": palette.ink, "--user-badge-muted": palette.inkSoft, "--user-badge-accent": palette.accentText, "--user-badge-surface": palette.cardSoft, "--user-badge-border": palette.border, ...(colorfulFallback ? writerAvatarStyle(fallbackSeed || name || initial) : {}) };
  const original = displayAvatarUrl(avatarUrl);
  const source = original || (typeof fallbackImage === "string" && /^\/community-avatars\/[0-9a-f]{20}\.(?:jpg|png|webp)$/.test(fallbackImage) ? fallbackImage : null);
  // The slot is 36-104 px: ask storage for a small rendition (the original can be a multi-megabyte animated GIF) and fall back to the original once if it fails.
  const optimized = original ? displayAvatarUrl(avatarUrl, { size: AVATAR_SOURCE_PX }) : null;
  const [failedSource, setFailedSource] = useState(null);
  const [originalSource, setOriginalSource] = useState(null);
  const showImage = source && source !== failedSource;
  const imageSrc = optimized && optimized !== source && originalSource !== source ? optimized : source;
  const avatar = <span className={`sod-user-avatar ${avatarClassName}`} style={style} aria-hidden="true" data-avatar-state={showImage ? "image" : "fallback"} data-avatar-treatment={colorfulFallback ? "color" : undefined}>
    {showImage ? <img src={imageSrc} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => { if (imageSrc !== source) setOriginalSource(source); else setFailedSource(source); }} /> : (initial || [...(name || "?")][0])}
  </span>;
  if (avatarOnly) return avatar;
  return <span className="sod-user-badge" style={style}>{avatar}<span className="sod-user-badge-copy"><strong>{name || "חבר הקהילה"}</strong>{children}</span></span>;
}
