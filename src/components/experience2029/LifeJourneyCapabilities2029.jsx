import React from "react";
import LifeJourneyEls2029 from "./LifeJourneyEls2029.jsx";
import LifeJourneyHints2029 from "./LifeJourneyHints2029.jsx";
import LifeJourneyName2029 from "./LifeJourneyName2029.jsx";

export default function LifeJourneyCapabilities2029({ view, user, name, context, onVerified, onReturn }) {
  if (view === "hints") return <LifeJourneyHints2029 user={user} />;
  if (view === "name") return <LifeJourneyName2029 name={name} onReturn={onReturn} />;
  if (view === "els") return <LifeJourneyEls2029 name={name} context={context} onVerified={onVerified} onReturn={onReturn} />;
  return null;
}
