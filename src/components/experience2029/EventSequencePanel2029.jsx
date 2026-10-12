import React, { useEffect, useRef, useState } from "react";
import { PROVEN_POST_SOURCE_UPDATES, formatUpdateDate } from "../../lib/research/postSourceUpdates2029.js";
import { buildPostTree } from "../../lib/research/postLineage2029.js";
import { BRAND_LOCKUP_NAV_2029 } from "../../lib/brandAssets2029.js";

// One recursive node of the "רצף האירועים" tree. Marks here are tree-local ("שינוי בענף"), never feed updates.
function EventTreeNode({ node, sheet, onNavigate }) {
  const go = () => { if (sheet) onNavigate?.(node); };
  const label = node.here
    ? <span className="is-label" aria-current="page">{node.label} <em>· אתה כאן</em></span>
    : <a href={node.href} onClick={go}>{node.label}</a>;
  return <li className={`is-${node.kind}${node.here ? " is-here" : ""}`}>
    {(node.origins || []).map((origin) => <span className="sod29-event-tree-origin" key={origin.id}><small>מגיע מ</small> <a href={origin.href} onClick={go}>{origin.label}</a> <em>{formatUpdateDate(origin.at)} · {origin.note}</em></span>)}
    {label}
    {node.kind === "unit"
      ? <em>נוסף {formatUpdateDate(node.addedAt)}</em>
      : node.changedAt ? <b className="sod29-event-tree-mark">שינוי בענף · {formatUpdateDate(node.changedAt)}</b> : null}
    {node.via ? <em>{node.via}</em> : null}
    {node.children?.length ? <ol>{node.children.map((child) => <EventTreeNode key={`${child.kind}:${child.id}`} node={child} sheet={sheet} onNavigate={onNavigate} />)}</ol> : null}
  </li>;
}


/** Post id of the current post context, or null. */
export function eventSequencePostId(context, surface) {
  return surface === "post" && context?.subject?.type === "post" && Number.isSafeInteger(Number(context.subject.id)) ? Number(context.subject.id) : null;
}

/** Whether a declared "רצף האירועים" tree exists for the current post (decides if the companion shows its tab). */
export const hasEventSequence = (context, surface) => {
  const id = eventSequencePostId(context, surface);
  return id != null && buildPostTree(id, null) != null;
};

/**
 * "רצף האירועים": its own window in the left companion (next to הקשר and עדכונים), never inside the context panel.
 * It shows where the post comes from, its place in the tree ("אתה כאן") and which branch changed. Marks are local to
 * the tree and are not system updates. What is documented here and how is defined later; this window only renders
 * the declared tree plus the certified source units.
 */
export default function EventSequencePanel2029({ context, surface = "post", sheet = false, onNavigate }) {
  const postId = eventSequencePostId(context, surface);
  const sectionKey = context?.dimensions?.activeSectionId || "";
  const [presentUnitIds, setPresentUnitIds] = useState(null);
  const listRef = useRef(null);
  useEffect(() => {
    if (postId == null || typeof document === "undefined") { setPresentUnitIds(null); return undefined; }
    const entries = PROVEN_POST_SOURCE_UPDATES[postId] || [];
    // Source units exist only once the authored source is in the DOM (direct/hash reload can mount this first).
    const check = () => {
      const ids = entries.filter((entry) => document.getElementById(entry.targetId)).map((entry) => entry.targetId);
      setPresentUnitIds((previous) => (previous && previous.size === ids.length && ids.every((id) => previous.has(id)) ? previous : new Set(ids)));
      return ids.length === entries.length;
    };
    if (check() || typeof MutationObserver === "undefined") return undefined;
    const observer = new MutationObserver(() => { if (check()) observer.disconnect(); });
    observer.observe(document.body, { childList: true, subtree: true });
    const stop = window.setTimeout(() => observer.disconnect(), 8000);
    return () => { observer.disconnect(); window.clearTimeout(stop); };
  }, [postId, sectionKey]);
  const tree = postId != null ? buildPostTree(postId, presentUnitIds || new Set()) : null;
  const hereKey = tree ? JSON.stringify(tree).length : 0;
  useEffect(() => {
    // "אתה כאן" must never be buried: bring the current node to the middle of the nearest scroll area.
    const here = listRef.current?.querySelector(".is-here > .is-label");
    if (!here) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    here.scrollIntoView({ block: "center", inline: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [postId, hereKey]);
  if (!tree) return null;
  return <nav className="sod29-event-tree" aria-label="רצף האירועים" data-context-event-tree="true">
    <header className="sod29-event-tree-head">
      <img src={BRAND_LOCKUP_NAV_2029.src} width={BRAND_LOCKUP_NAV_2029.width} height={BRAND_LOCKUP_NAV_2029.height} alt="" aria-hidden="true" />
      <strong>רצף האירועים</strong>
    </header>
    <ol className="sod29-event-tree-list" ref={listRef}><EventTreeNode node={tree.root} sheet={sheet} onNavigate={onNavigate} /></ol>
    <small className="sod29-event-tree-note">סימון בענף בלבד. הוא לא מופיע כעדכון בשאר המערכת.</small>
  </nav>;
}
