import React, { useEffect } from "react";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import ElsWorkAreaPage from "./ElsWorkAreaPage.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { applySeo } from "../lib/seo.js";

export default function Els2029Page() {
  const research = useResearch();
  useEffect(() => {
    applySeo({ title: "ELS · SOD1820", description: "ELS Research Work Area בתוך מערכת 2029", path: "/els" });
    research.updateResearchContext?.({ lens: "els" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <Sod2029Shell wide eyebrow="ONE ELS ENGINE · MANY PROJECTIONS" title="ELS" description="המשטח החדש אינו מחשב ELS בעצמו. הוא מארח את Work Area הקיים שמקרין את המנוע הקנוני, בתוך אותו Research Context ו־Raziel.">
    <section className="sod29-section" style={{ padding: 0, overflow: "hidden" }}>
      <ElsWorkAreaPage />
    </section>
  </Sod2029Shell>;
}
