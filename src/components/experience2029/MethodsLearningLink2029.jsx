import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";

// The same Router and Research Context used by other navigation controls. A
// learning visit preserves the current source; it does not create research data.
export default function MethodsLearningLink({ href }) {
  const location = useLocation();
  const research = useResearch();
  const preserveOrigin = event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    research.updateResearchContext?.(current => {
      const context = current || {};
      let ownSource = false;
      try {
        ownSource = context.subject?.href?.startsWith("/")
          && !context.subject.href.startsWith("//")
          && new URL(context.subject.href, window.location.origin).pathname === location.pathname;
      } catch { /* Unknown source identity keeps only the current route. */ }
      const locator = ownSource && context.subject?.type === "post"
        && context.selection?.locator?.startsWith("#") ? context.selection.locator : "";
      const href = `${location.pathname}${location.search}${location.hash || locator}`;
      return { returnTo: { href, label: ownSource ? context.subject.label : "חזרה למקום שממנו יצאתם",
        subject: context.subject || null, selection: context.selection || null,
        lens: context.lens || null, dimensions: context.dimensions || {}, journey: context.journey || null } };
    });
  };
  return <Link to={href} state={{ sodEntryArrival: "internal" }} onClick={preserveOrigin}>
    לימוד שיטות בבית המדרש
  </Link>;
}
