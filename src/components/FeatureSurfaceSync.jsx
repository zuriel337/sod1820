import React, { useEffect } from "react";
import { useFeatureState } from "./MaintenanceLock.jsx";

// Migration bridge for public references that are still plain <Link> entries.
// It projects canonical site_flags availability onto legacy/global CTAs without creating local truth.
const FORUM_A = "data-sod-forum-availability";
const TREE_A = "data-sod-convergence-tree-availability";
const NATIVE = "data-sod-feature-native-status";
const OLD_DISPLAY = "data-sod-feature-old-display";

function internalPathAnchor(a, test) {
  try {
    const u = new URL(a.href, window.location.origin);
    return u.origin === window.location.origin && test(u.pathname);
  } catch { return false; }
}

function isForumAnchor(a) {
  return internalPathAnchor(a, p => p === "/forum" || p.startsWith("/forum/"));
}

function isConvergenceTreeAnchor(a) {
  return internalPathAnchor(a, p => p === "/numbers" || p.startsWith("/numbers/"));
}

function restore() {
  if (typeof document === "undefined") return;
  document.querySelectorAll(`a[${FORUM_A}],a[${TREE_A}]`).forEach(a => {
    a.removeAttribute(FORUM_A);
    a.removeAttribute(TREE_A);
    a.removeAttribute("aria-description");
  });
  document.querySelectorAll(`[${NATIVE}]`).forEach(el => {
    const old = el.getAttribute(OLD_DISPLAY);
    if (old === "__empty__") el.style.removeProperty("display");
    else if (old != null) el.style.display = old;
    el.removeAttribute(NATIVE);
    el.removeAttribute(OLD_DISPLAY);
  });
  document.body?.removeAttribute("data-sod-forum-state");
  document.body?.removeAttribute("data-sod-convergence-tree-state");
}

function applyClosedProjection({ attr, bodyAttr, matches, description }) {
  if (typeof document === "undefined") return;
  document.body?.setAttribute(bodyAttr, "closed");
  document.querySelectorAll("a[href]").forEach(a => {
    if (!matches(a) || a.closest(".mlock")) return;
    a.setAttribute(attr, "closed");
    a.setAttribute("aria-description", description);
    a.querySelectorAll("span,div,small").forEach(el => {
      if ((el.textContent || "").trim() !== "● פעיל" || el.hasAttribute(NATIVE)) return;
      el.setAttribute(NATIVE, "1");
      el.setAttribute(OLD_DISPLAY, el.style.display || "__empty__");
      el.style.setProperty("display", "none", "important");
    });
  });
}

export default function FeatureSurfaceSync() {
  const forum = useFeatureState("lock_forum");
  const convergenceTree = useFeatureState("lock_convergence_tree");

  useEffect(() => {
    if (forum.loading || convergenceTree.loading) return undefined;
    restore();
    if (!forum.blocked && !convergenceTree.blocked) return undefined;

    let applying = false;
    const apply = () => {
      if (applying) return;
      applying = true;
      try {
        if (forum.blocked) applyClosedProjection({
          attr: FORUM_A,
          bodyAttr: "data-sod-forum-state",
          matches: isForumAnchor,
          description: "פורום המחקר סגור ובבנייה",
        });
        if (convergenceTree.blocked) applyClosedProjection({
          attr: TREE_A,
          bodyAttr: "data-sod-convergence-tree-state",
          matches: isConvergenceTreeAnchor,
          description: "עץ ההתכנסויות סגור ובבנייה מחדש",
        });
      } finally { applying = false; }
    };
    apply();

    const observer = new MutationObserver(() => apply());
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); restore(); };
  }, [forum.loading, forum.blocked, convergenceTree.loading, convergenceTree.blocked]);

  if ((forum.loading || !forum.blocked) && (convergenceTree.loading || !convergenceTree.blocked)) return null;
  return (
    <style>{`
      a[${FORUM_A}="closed"]::after,
      a[${TREE_A}="closed"]::after{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        margin-inline-start:6px;
        padding:2px 7px;
        border-radius:999px;
        border:1px solid rgba(212,175,55,.42);
        background:rgba(212,175,55,.10);
        color:inherit;
        font-size:10px;
        font-weight:900;
        line-height:1.35;
        white-space:nowrap;
        vertical-align:middle;
      }
      a[${FORUM_A}="closed"]::after{content:"🚧 סגור · בבנייה";}
      a[${TREE_A}="closed"]::after{content:"🌳 סגור · בבנייה מחדש";}
    `}</style>
  );
}
