import React from "react";
import { Link } from "react-router-dom";
import BeitMidrashSection from "./BeitMidrashSection.jsx";

function Gate({ destination }) {
  if (destination.href) {
    return <Link className="bm-button is-primary" to={destination.href}>{destination.title}</Link>;
  }
  // No canonical path has been handed over yet: say so, do not invent a form or game here.
  return <span className="bm-button is-pending" role="note" aria-disabled="true" data-destination-status={destination.status}>
    {destination.title} · יתחבר בקרוב
  </span>;
}

export default function BeitMidrashParticipate({ manifest, focusedSection }) {
  const practice = manifest.sections.find((section) => section.id === "practice");
  const together = manifest.sections.find((section) => section.id === "participate");
  const { calculator, game, contribution, community } = manifest.destinations;
  return <>
    <BeitMidrashSection id="practice" icon="number" title={practice.title} description={practice.description} focused={focusedSection === "practice"}>
      <div className="bm-actions">
        <Link className="bm-button is-primary" to={calculator.href}>{calculator.title}</Link>
        <Gate destination={game} />
      </div>
      <p className="bm-note">{calculator.description}</p>
    </BeitMidrashSection>
    <BeitMidrashSection id="participate" icon="community" title={together.title} description={together.description} focused={focusedSection === "participate"}>
      <div className="bm-actions">
        <a className="bm-button is-primary" href={community.href}>{community.title}</a>
        <Gate destination={contribution} />
      </div>
    </BeitMidrashSection>
  </>;
}
