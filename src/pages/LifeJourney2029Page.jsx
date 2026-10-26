import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import React, { useCallback, useEffect } from "react";
import Sod2029Shell, { use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import PersonJourney from "../components/PersonJourney.jsx";
import LifeJourneyCapabilities2029 from "../components/experience2029/LifeJourneyCapabilities2029.jsx";
import { useOptionalRazielSession2029 } from "../components/experience2029/RazielSessionMount2029.jsx";
import { requestLifeJourneyHintEvidenceExplanation } from "../lib/research/lifeJourneyHintEvidenceExplanation.js";
import { applySeo } from "../lib/seo.js";

function LifeJourney2029Surface() {
  const shell = use2029Shell();
  const raziel = useOptionalRazielSession2029();
  const requestHintExplanation = useCallback((submission) => requestLifeJourneyHintEvidenceExplanation({
    submission,
    locked: shell.razielLocked,
    openRaziel: shell.openRaziel,
    submit: raziel?.submit,
  }), [raziel?.submit, shell.openRaziel, shell.razielLocked]);
  return <main data-experience-surface="life-journey-2029" data-experience-capability="person-life-journey">
    <PersonJourney variant="2029" CapabilitySurface={LifeJourneyCapabilities2029} onRequestHintExplanation={requestHintExplanation} />
  </main>;
}

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
    <LifeJourney2029Surface />
  </Sod2029Shell>;
}
