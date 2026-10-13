import React, { useState } from "react";
import { displayAvatarUrl } from "../lib/avatar.js";
import { use2029Palette } from "../lib/palette.js";
import "./UserBadge.css";

// Canonical user presentation. Identity/visibility must be resolved by the reader;
// this component never looks users up by name, fetches a profile, or claims ownership.
export default function UserBadge({ name, avatarUrl, initial, avatarOnly = false, avatarClassName = "", children }) {
  const palette = use2029Palette();
  const style = { "--user-badge-ink": palette.ink, "--user-badge-muted": palette.inkSoft, "--user-badge-accent": palette.accentText, "--user-badge-surface": palette.cardSoft, "--user-badge-border": palette.border };
  const source = displayAvatarUrl(avatarUrl);
  const [failedSource, setFailedSource] = useState(null);
  const showImage = source && source !== failedSource;
  const avatar = <span className={`sod-user-avatar ${avatarClassName}`} style={style} aria-hidden="true" data-avatar-state={showImage ? "image" : "fallback"}>
    {showImage ? <img src={source} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailedSource(source)} /> : (initial || [...(name || "?")][0])}
  </span>;
  if (avatarOnly) return avatar;
  return <span className="sod-user-badge" style={style}>{avatar}<span className="sod-user-badge-copy"><strong>{name || "חבר הקהילה"}</strong>{children}</span></span>;
}
