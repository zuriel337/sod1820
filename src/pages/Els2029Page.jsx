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

  return <Sod2029Shell wide surface="els" symbol="✦" eyebrow="ONE ELS ENGINE · MANY PROJECTIONS" title="ELS" description="אותו מנוע קנוני, עכשיו בתוך סביבת המחקר המשותפת: העוגן, ההקשר, רזיאל והחזרה המדויקת נשארים איתך גם כשנכנסים למטריצה.">
    <section className="sod29-tool-stage">
      <ElsWorkAreaPage />
    </section>
  </Sod2029Shell>;
}
