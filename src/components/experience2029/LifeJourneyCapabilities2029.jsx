import React from "react";
import LifeJourneyDate2029 from "./LifeJourneyDate2029.jsx";
import LifeJourneyHints2029 from "./LifeJourneyHints2029.jsx";
import LifeJourneyName2029 from "./LifeJourneyName2029.jsx";

export default function LifeJourneyCapabilities2029({ view, user, name, profile, personRef, memberRef, onContinue, onReturn, hintState, hintMembers, onSaveHint, hintInvestigations, onInvestigateHint, onExplainHint }) {
  if (view === "hints") return <LifeJourneyHints2029 state={hintState} members={hintMembers} onSave={onSaveHint} investigationState={hintInvestigations} onInvestigate={onInvestigateHint} onExplain={onExplainHint} />;
  if (view === "name") return <LifeJourneyName2029 name={name} profile={profile} personRef={personRef} memberRef={memberRef} onContinue={onContinue} onReturn={onReturn} />;
  if (view === "date") return <LifeJourneyDate2029 user={user} profile={profile} personRef={personRef} memberRef={memberRef} onContinue={onContinue} onReturn={onReturn} />;
  return null;
}
