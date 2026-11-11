// ONE legend for the whole Post (ZURIEL 12.11.2026, decision 5): units carry only their symbol; the meaning is here, on demand.
import React from "react";
import { SEMANTIC_LEGEND } from "../../lib/research/postSemanticDesign2029.js";

export default function PostSemanticLegend2029() {
  return <details className="sod29-semantic-legend" data-experience-capability="post-semantic-legend">
    <summary>מקרא הסמלים בפוסט</summary>
    <dl>
      {SEMANTIC_LEGEND.map((item) => <React.Fragment key={item.key}>
        <dt><span aria-hidden="true">{item.symbol}</span> {item.label}</dt>
        <dd>{item.detail}</dd>
      </React.Fragment>)}
    </dl>
  </details>;
}
