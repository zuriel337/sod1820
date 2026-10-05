import React from "react";
import { Link } from "react-router-dom";
import "./sourceFirstFindingCard.css";

// Shared public finding card: source words first, then system derivations, connections and
// challenges. Depth (research vocabulary) stays in the Heichal, never here.
// Pure presentation of buildSourceFirstFinding(); no fetching, no truth mutation.

function Connection({ item }) {
  if (item.href) {
    return <Link className="sod29-sff-chip is-link" to={item.href} data-connection-type={item.type}>{item.label}</Link>;
  }
  return <span className="sod29-sff-chip" data-connection-type={item.type}>{item.label}</span>;
}

export default function SourceFirstFindingCard({ model, compact = false, onInspect = null }) {
  if (!model?.source?.statement) return null;
  const { source, derivations, connections, challenges, secondary } = model;
  return <article className={`sod29-sff${compact ? " is-compact" : ""}`} data-source-first-finding={model.id}>
    <section className="sod29-sff-source" data-sff-section="source">
      <blockquote>{source.statement}</blockquote>
      {source.contributor || source.sourceLabel
        ? <footer>{[source.contributor, source.sourceLabel].filter(Boolean).join(" · ")}</footer>
        : null}
    </section>
    {derivations.length ? <section className="sod29-sff-derivations" data-sff-section="derivations">
      {derivations.map((row) => <div key={row.key} data-derivation={row.key}>
        <span>{row.label}</span>
        {row.href ? <Link to={row.href}>{row.text}</Link> : <strong>{row.text}</strong>}
      </div>)}
    </section> : null}
    {connections.length ? <section className="sod29-sff-connections" data-sff-section="connections">
      {connections.map((item) => <Connection key={`${item.type}:${item.label}`} item={item} />)}
    </section> : null}
    {challenges.length ? <section className="sod29-sff-challenges" data-sff-section="challenges">
      {challenges.map((item) => <p key={item.key} data-challenge-kind={item.kind}>
        {item.text}{item.contributor ? ` — ${item.contributor}` : ""}
      </p>)}
    </section> : null}
    {secondary ? <small className="sod29-sff-secondary" data-sff-section="secondary">{secondary.title}</small> : null}
    {onInspect ? <button type="button" className="sod29-sff-depth" data-sff-section="depth" onClick={onInspect}>בדוק לעומק</button> : null}
  </article>;
}
