// The message that stands where a Home block's content was when its read came back empty or failed: one calm line and, when the read can be repeated, a retry.
// It is the block's own content, not a banner: the block keeps the box it held (the settled-box hook's `keep`), so the message appears in the place of what the
// person was looking at and nothing below it moves. Presentation only; the retry runs the same read again (the caller owns it). It is announced politely, and
// it does not carry the status role: that role marks "still loading" for the evidence tooling (a loading line never counts as content).
import React from "react";

export default function HomeReadNotice2029({ children, onRetry, label = "נסו שוב" }) {
  return <div className="h29-notice" aria-live="polite">
    <p>{children}</p>
    {onRetry ? <button type="button" className="h29-btn" onClick={onRetry}>{label}</button> : null}
  </div>;
}
