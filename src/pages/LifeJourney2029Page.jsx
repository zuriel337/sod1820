import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import React, { useEffect } from "react";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import PersonJourney from "../components/PersonJourney.jsx";
import { applySeo } from "../lib/seo.js";

export default function LifeJourney2029Page() {
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
    symbol={<NavigationIcon2029 name="journey" />}
    eyebrow="PERSON · FAMILY · CONTEXT"
    title="מסע החיים"
    description="מרחב אישי אחד שמתחיל ממך, שומר את ההקשר ומעמיק בלי לפתוח מערכת חדשה."
  >
    <main data-experience-surface="life-journey-2029" data-experience-capability="person-life-journey">
      <PersonJourney variant="2029" />
    </main>
  </Sod2029Shell>;
}
