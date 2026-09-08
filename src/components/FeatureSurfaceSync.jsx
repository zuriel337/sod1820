import React, { useEffect } from "react";
import { statusTone, usePalette } from "../lib/palette.js";
import { useFeatureState } from "./MaintenanceLock.jsx";

// Migration bridge for public references that are still plain <Link to="/forum"> entries.
// It projects one canonical availability state onto every forum CTA without creating local truth.
// Theme appearance is also canonical: the injected status consumes status.building and never inherits link color.
const A = "data-sod-forum-availability";
const NATIVE = "data-sod-forum-native-status";
const OLD_DISPLAY = "data-sod-forum-old-display";

function isForumAnchor(a) {
  try {
    const u = new URL(a.href, window.location.origin);
    return u.origin === window.location.origin && (u.pathname === "/forum" || u.pathname.startsWith("/forum/"));
  } catch { return false; }
}

function restore() {
  if (typeof document === "undefined") return;
  document.querySelectorAll(`a[${A}]`).forEach(a => a.removeAttribute(A));
  document.querySelectorAll(`[${NATIVE}]`).forEach(el => {
    const old = el.getAttribute(OLD_DISPLAY);
    if (old === "__empty__") el.style.removeProperty("display");
    else if (old != null) el.style.display = old;
    el.removeAttribute(NATIVE);
    el.removeAttribute(OLD_DISPLAY);
  });
  document.body?.removeAttribute("data-sod-forum-state");
}

function applyClosedProjection() {
  if (typeof document === "undefined") return;
  document.body?.setAttribute("data-sod-forum-state", "closed");
  document.querySelectorAll("a[href]").forEach(a => {
    if (!isForumAnchor(a) || a.closest(".mlock")) return;
    a.setAttribute(A, "closed");
    a.setAttribute("aria-description", "פורום המחקר סגור ובבנייה");
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
  const P = usePalette();
  const building = statusTone(P, "building");

  useEffect(() => {
    if (forum.loading) return undefined;
    restore();
    if (!forum.blocked) return undefined;

    let applying = false;
    const apply = () => {
      if (applying) return;
      applying = true;
      try { applyClosedProjection(); }
      finally { applying = false; }
    };
    apply();

    const observer = new MutationObserver(() => apply());
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); restore(); };
  }, [forum.loading, forum.blocked]);

  if (forum.loading || !forum.blocked) return null;
  return (
    <style>{`
      a[${A}="closed"]::after{
        content:"🚧 סגור · בבנייה";
        display:inline-flex;
        align-items:center;
        justify-content:center;
        margin-inline-start:6px;
        padding:2px 7px;
        border-radius:999px;
        border:1px solid ${building.border};
        background:${building.background};
        color:${building.color};
        font-size:10px;
        font-weight:900;
        line-height:1.35;
        white-space:nowrap;
        vertical-align:middle;
      }
    `}</style>
  );
}
