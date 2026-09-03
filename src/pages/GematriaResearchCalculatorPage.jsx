import React, { useEffect } from "react";
import { applySeo } from "../lib/seo.js";
import GematriaResearchCalculator from "../components/gematria-research/GematriaResearchCalculator.jsx";

export default function GematriaResearchCalculatorPage() {
  useEffect(() => {
    applySeo({
      title: "מעבדת גימטריה — חשב, פתח והבן כל שיטה",
      description: "מחשבון גימטריה מקצועי: כל שיטה מחושבת דרך המנוע הקנוני ונפתחת להסבר שלב-אחר-שלב.",
      path: "/gematria-research",
    });
  }, []);
  return (
    <div style={{ minHeight: "100vh", background: "#f6f7f9", padding: "40px 16px 80px" }}>
      <GematriaResearchCalculator />
    </div>
  );
}
