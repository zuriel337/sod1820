import React from "react";
import NavigationIcon2029 from "../experience2029/NavigationIcon2029.jsx";

const PILLAR_HINT = Object.freeze({
  learn: "דרכי חישוב, מקורות ומסלולים",
  discover: "דוגמאות מודרכות מן העולם",
  participate: "לתרגל, לשחק ולשתף",
});

/** One focal point: the hall's seal. Colours come only from semantic roles. */
export default function BeitMidrashHero({ identity, pillars }) {
  return <header className="bm-hero">
    <div className="bm-hero-frame">
      <div className="bm-seal" aria-hidden="true">
        <span className="bm-seal-ring"><NavigationIcon2029 name="books" /></span>
      </div>
      <p className="bm-logotype" aria-label="SOD1820">SOD1820</p>
      <span className="bm-eyebrow">{identity.eyebrow}</span>
      <h1>{identity.title}</h1>
      <p className="bm-lead">{identity.description}</p>
      <nav className="bm-pillars" aria-label="שלושת שערי בית המדרש">
        {pillars.map((pillar) => <a key={pillar.id} href={`#bm-${pillar.id}`}>
          <strong>{pillar.title}</strong>
          <small>{PILLAR_HINT[pillar.id]}</small>
        </a>)}
      </nav>
    </div>
  </header>;
}
