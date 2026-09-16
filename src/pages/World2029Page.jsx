import React, { useEffect } from "react";
import World2029Experience from "./World2029Experience.jsx";
import { applySeo } from "../lib/seo.js";
import "./world-system-frame.css";

export default function World2029Page() {
  useEffect(() => {
    applySeo({
      title: "העולם · SOD1820",
      description: "עולם המחקר החי של SOD1820 — התכנסויות, מספרים, מקורות, אירועים וביטויים מעל One Reality Graph.",
      path: "/world",
    });
  }, []);
  return <World2029Experience />;
}
