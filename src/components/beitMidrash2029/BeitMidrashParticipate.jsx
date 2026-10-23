import React from "react";
import { Link } from "react-router-dom";
import { use2029Shell } from "../experience2029/Sod2029Shell.jsx";
import BeitMidrashSection from "./BeitMidrashSection.jsx";

const kingdomPreviewEnabled = import.meta.env?.VITE_KINGDOM_PREVIEW === "true";

function Gate({ destination, enabled = true, onActivate = null }) {
  if (onActivate) {
    return <button className="bm-button is-primary" type="button" onClick={onActivate}>{destination.title}</button>;
  }
  if (destination.href && enabled) {
    return <Link className="bm-button is-primary" to={destination.href}>{destination.title}</Link>;
  }
  return <span className="bm-button is-pending" role="note" aria-disabled="true" data-destination-status={destination.status}>
    {destination.title} · זמין ב־Preview הייעודי
  </span>;
}

export default function BeitMidrashParticipate({ manifest, focusedSection }) {
  const { openIssueReport } = use2029Shell();
  const practice = manifest.sections.find((section) => section.id === "practice");
  const together = manifest.sections.find((section) => section.id === "participate");
  const { calculator, game, contribution, community } = manifest.destinations;
  return <>
    <BeitMidrashSection id="practice" icon="number" title={practice.title} description={practice.description} focused={focusedSection === "practice"}>
      <div className="bm-actions">
        <Link className="bm-button is-primary" to={calculator.href}>{calculator.title}</Link>
        <Gate destination={game} enabled={kingdomPreviewEnabled} />
      </div>
      <p className="bm-note">{calculator.description}</p>
    </BeitMidrashSection>
    <BeitMidrashSection id="participate" icon="community" title={together.title} description={together.description} focused={focusedSection === "participate"}>
      <div className="bm-actions">
        <a className="bm-button is-primary" href={community.href}>{community.title}</a>
        <Gate
          destination={contribution}
          onActivate={() => openIssueReport({
            concept: "hint",
            learnStage: "tried",
            actionTried: "share-hint",
            initialText: "מצאתי רמז שברצוני לשתף:\n\nהמקור המדויק:\n\nמה ראיתי:\n",
          })}
        />
      </div>
      <p className="bm-note">{contribution.description}</p>
    </BeitMidrashSection>
  </>;
}
