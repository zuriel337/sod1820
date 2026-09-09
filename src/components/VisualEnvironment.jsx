import React from "react";
import { ENVIRONMENT, VISUAL_ASSET_STATE } from "../lib/designTokens.js";
import "./VisualEnvironment.css";

const VALID_ENVIRONMENTS = new Set(Object.values(ENVIRONMENT));
const VALID_STATES = new Set(Object.values(VISUAL_ASSET_STATE));

export default function VisualEnvironment({
  role = ENVIRONMENT.DARK_OBSERVATORY,
  assetUrl = null,
  assetState = VISUAL_ASSET_STATE.CANONICAL_FALLBACK,
  focalPosition = "50% 50%",
  className = "",
}) {
  const safeRole = VALID_ENVIRONMENTS.has(role) ? role : ENVIRONMENT.RESEARCH_LAB;
  const safeState = VALID_STATES.has(assetState) ? assetState : VISUAL_ASSET_STATE.CANONICAL_FALLBACK;
  const style = assetUrl
    ? { "--vf-environment-image": `url("${String(assetUrl).replace(/"/g, "%22")}")`, "--vf-environment-focal": focalPosition }
    : { "--vf-environment-focal": focalPosition };

  return (
    <div
      className={`vf-environment vf-environment--${safeRole} ${className}`.trim()}
      data-environment-role={safeRole}
      data-asset-state={safeState}
      style={style}
      aria-hidden="true"
    >
      <div className="vf-environment__image" />
      <div className="vf-environment__atmosphere" />
      <div className="vf-environment__field" />
      <div className="vf-environment__horizon" />
      <div className="vf-environment__readability" />
    </div>
  );
}
