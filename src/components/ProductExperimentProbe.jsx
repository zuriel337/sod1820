import React, { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { PRODUCT_EXPERIMENTS, trackExperiment } from "../lib/productIntelligence.js";

const EXP = PRODUCT_EXPERIMENTS.CORE_TOOL_REACHABILITY_RESTORE_20260906;

function classifyCoreTool(pathname, search) {
  if (pathname === "/research") {
    const q = new URLSearchParams(search || "");
    const tool = q.get("tool");
    const tab = q.get("tab");
    if (!tool) return { tool: "heichal", route_kind: "landing" };
    if (tool === "gematria" || (tool === "midrash" && tab === "calc")) return { tool: "gematria", route_kind: "tool" };
    if (tool === "els") return { tool: "els", route_kind: "tool" };
    if (tool === "number") return { tool: "number", route_kind: "tool" };
    if (tool === "midrash") return { tool: "midrash", route_kind: "tool" };
    return { tool, route_kind: "research_tool" };
  }
  if (pathname === "/code") return { tool: "els", route_kind: "standalone_tool" };
  if (pathname === "/beit-midrash") return { tool: "midrash", route_kind: "standalone_tool" };
  if (pathname === "/number" || pathname.startsWith("/number/")) return { tool: "number", route_kind: "standalone_tool" };
  return null;
}

function entryKind(previousPath) {
  if (!previousPath) return "direct_or_external";
  if (previousPath === "/") return "home";
  if (previousPath.startsWith("/research")) return "heichal_internal";
  return "internal";
}

// Global, route-level observer for the current restoration experiment. This avoids sprinkling
// tracking into every tool/button and also captures direct deep-links. Device/account/bot truth
// are added by the existing events pipeline and Clean Traffic classifier — never reclassified here.
export default function ProductExperimentProbe() {
  const { pathname, search } = useLocation();
  const previousRef = useRef(null);

  useEffect(() => {
    const previous = previousRef.current;
    const current = `${pathname}${search || ""}`;
    previousRef.current = current;

    const hit = classifyCoreTool(pathname, search);
    if (!hit) return;

    trackExperiment(EXP, "view", {
      surface: "product-experiment",
      slug: `${EXP.id}:${hit.tool}`,
      tool: hit.tool,
      route_kind: hit.route_kind,
      path: pathname,
      query: search || null,
      previous_path: previous,
      entry_kind: entryKind(previous),
    });
  }, [pathname, search]);

  return null;
}
