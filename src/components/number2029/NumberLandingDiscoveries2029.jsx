// The discovery blocks of the /number landing: the new discoveries and the active writers come from the one existing reader pair (discoveryCenter2029.js,
// the same cache as the Home section and /stats). Loaded after the first paint; a reader that is not available draws nothing.
import React from "react";
import { useDiscoveryCenter, DiscoveryLatest, DiscoveryWriters } from "../experience2029/DiscoveryCenter2029.jsx";

export default function NumberLandingDiscoveries2029() {
  const { status, model } = useDiscoveryCenter();
  if (status !== "ready" || !model) return null;
  const left = model.latest.length > 0, right = model.writers.length > 0;
  if (!left && !right) return null;
  return <div className={`dc29-grid nl29-wide${left && right ? "" : " dc29-one"}`}>
    {left ? <div className="dc29-col"><DiscoveryLatest items={model.latest} model={model} mode="home" admin={false} /></div> : null}
    {right ? <div className="dc29-col"><DiscoveryWriters writers={model.writers} fill /></div> : null}
  </div>;
}
