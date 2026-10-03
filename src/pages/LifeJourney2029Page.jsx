import React, { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import PersonJourney from "../components/PersonJourney.jsx";
import { applySeo } from "../lib/seo.js";

export default function LifeJourney2029Page() {
  const [params] = useSearchParams();
  const seed = useMemo(() => ({
    firstName: params.get("first") || "",
    surname: params.get("last") || "",
    birthdate: params.get("birthdate") || "",
  }), [params]);

  useEffect(() => {
    applySeo({
      title: "מסע החיים · SOD1820",
      description: "מרחב אישי ופרטי לחיבור שם, תאריך ומשפחה אל מסע מחקר אחד.",
      path: "/2029/journey",
      noindex: true,
    });
  }, []);

  return <Sod2029Shell
    surface="journey"
    symbol="✦"
    eyebrow="PERSON · FAMILY · CONTEXT"
    title="מסע החיים"
    description="מרחב אישי אחד שמתחיל ממך, שומר את ההקשר ומעמיק בלי לפתוח מערכת חדשה."
  >
    <main data-experience-surface="life-journey-2029" data-experience-capability="person-life-journey">
      <PersonJourney variant="2029" seed={seed} />
    </main>
  </Sod2029Shell>;
}
