import React from "react";

export default function TriangleMethodGolden2029({ scene }) {
  const nodes=Array.isArray(scene?.sceneNodes)?scene.sceneNodes:[];
  const subject=nodes.find((node)=>node.kind==="expression");
  const result=nodes.find((node)=>node.kind==="engine_result");
  const verified=result?.ref?.engine_verified===true;
  const kind=scene?.projection_kind;

  if(!subject||!verified||!["letter_potential_triangle","word_prefix_triangle"].includes(kind)){
    return <section className="sod29-triangle-method" dir="rtl" data-state="unverified" aria-live="polite">
      <div className="sod29-triangle-method__result"><span>ממתין לאימות החישוב</span></div>
    </section>;
  }

  const isWordTriangle=kind==="word_prefix_triangle";
  const steps=nodes.filter((node)=>node.kind===(isWordTriangle?"triangle_prefix_row":"letter_potential"));

  return <section
    className="sod29-triangle-method"
    dir="rtl"
    data-experience-capability={isWordTriangle?"triangle-word":"kadmi-potential"}
    data-projection-kind={kind}
    aria-label={(isWordTriangle?"משולש מילה — ":"קדמי / פוטנציאל — ")+subject.label}
  >
    <header>
      <small>{isWordTriangle?"משולש מילה · התהוות מצטברת":"קדמי · משולש / פוטנציאל"}</small>
      <h2>{subject.label}</h2>
    </header>

    <div className="sod29-triangle-method__shape" role="list">
      {steps.map((step,index)=><div
        className="sod29-triangle-method__row"
        role="listitem"
        key={step.id}
        style={{"--triangle-step":index+1}}
      >
        <strong>{step.label}</strong>
        <small>{step.subtitle}</small>
      </div>)}
    </div>

    <div className="sod29-triangle-method__result" aria-label={"תוצאת המנוע "+result.label}>
      <span>{result.subtitle}</span>
      <strong>{result.label}</strong>
    </div>
  </section>;
}
