// Reads the RENDERED Post (the reading source, after the proven units and any preview unit were placed) and returns its outline (postOutline2029.js).
// It only READS the structure and gives a heading / unit the id it lacks (an attribute on the rendered node, never a change of text or of the stored Post).
import { useEffect, useState } from "react";
import { buildPostOutline } from "./postOutline2029.js";

const FIXED = Object.freeze([["post-connections", "חיבורים"], ["post-sources", "מקורות"]]);

export function scanPostOutline(root) {
  if (!root || !root.ownerDocument) return [];
  const doc = root.ownerDocument;
  const entries = [];
  let n = 0;
  const ensure = (node, base) => {
    if (!node.id) { let id = base; while (doc.getElementById(id)) id += "-x"; node.id = id; node.style.scrollMarginTop = "96px"; }
    return node.id;
  };
  for (const node of root.querySelectorAll("h2, h3, [data-sod-update-stack], [data-sod-unit]")) {
    if (node.matches("[data-sod-update-stack]")) { entries.push({ kind: "updates", id: ensure(node, "post-updates"), text: "מה התחדש" }); continue; }
    if (node.matches("[data-sod-unit]")) {
      const title = node.querySelector("h2, h3, [data-sod-role='title']")?.textContent || node.getAttribute("aria-label") || "";
      entries.push({ kind: node.closest("[data-sod-update-stack]") ? "unit" : "unit-top", id: ensure(node, `post-unit-${++n}`), text: title });
      continue;
    }
    if (node.closest("[data-sod-unit], [data-sod-update-stack], aside, nav, footer, details, blockquote, table")) continue;
    entries.push({ kind: node.tagName.toLowerCase(), id: ensure(node, `post-sec-${++n}`), text: node.textContent });
  }
  const fixed = FIXED.filter(([id]) => doc.getElementById(id)).map(([id, label]) => ({ id, label }));
  return buildPostOutline({ entries, fixed });
}

// the outline of the Post in `rootRef` and the item the reader is at (the one closest to the reading line); re-read when the Post changes and a few
// times while its units and media settle
export function usePostOutline2029(rootRef, key) {
  const [outline, setOutline] = useState([]);
  const [activeId, setActiveId] = useState(null);
  useEffect(() => {
    let alive = true;
    let signature = "";
    const run = () => {
      const root = rootRef.current;
      if (!alive || !root) return;
      const next = scanPostOutline(root);
      const sig = JSON.stringify(next.map((i) => [i.id, i.label, i.level, i.parentId]));
      if (sig !== signature) { signature = sig; setOutline(next); }
    };
    const timers = [0, 600, 1800, 4000].map((ms) => window.setTimeout(run, ms));
    document.addEventListener("sod29:preview-unit-rebuilt", run);
    return () => { alive = false; timers.forEach((t) => window.clearTimeout(t)); document.removeEventListener("sod29:preview-unit-rebuilt", run); };
  }, [rootRef, key]);
  useEffect(() => {
    setActiveId((current) => (outline.some((i) => i.id === current) ? current : outline[0]?.id || null));
    if (!outline.length || typeof IntersectionObserver === "undefined") return undefined;
    const targets = outline.map((item) => ({ item, node: document.getElementById(item.targetId || item.id) })).filter((row) => row.node);
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))[0];
      const match = visible && targets.find((row) => row.node === visible.target);
      if (match) setActiveId(match.item.id);
    }, { rootMargin: "-18% 0px -66% 0px", threshold: [0, 0.01, 1] });
    targets.forEach((row) => observer.observe(row.node));
    return () => observer.disconnect();
  }, [outline]);
  return { outline, activeId };
}
