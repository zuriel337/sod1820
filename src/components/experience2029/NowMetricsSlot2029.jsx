import React, { useContext } from "react";
import { metricsPanelOf } from "../../lib/nowMetricsSlot2029.js";
import { NowMetricsContext2029 } from "./nowMetricsContext2029.js";

// Renders the metrics panel supplied by the metrics-contract owner, or nothing. No data, no fetch, no computation here.
export default function NowMetricsSlot2029() {
  const Panel = metricsPanelOf(useContext(NowMetricsContext2029));
  if (!Panel) return null;
  return <section className="sod29-nowpub-metrics" aria-label="מדדי האתר" data-now-metrics-slot><Panel /></section>;
}
