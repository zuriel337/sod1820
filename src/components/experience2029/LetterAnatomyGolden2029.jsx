import React from "react";

export default function LetterAnatomyGolden2029({ scene, mode="full" }) {
  const nodes=Array.isArray(scene?.sceneNodes)?scene.sceneNodes:[];
  const expressionNode=nodes.find((node)=>node.kind==="expression");
  const resultNode=nodes.find((node)=>node.kind==="engine_result");
  const letterNodes=nodes.filter((node)=>node.kind==="letter_anatomy");
  const verified=resultNode?.ref?.engine_verified===true;
  if(!expressionNode||!verified||!letterNodes.length){
    return <section className="sod29-letter-anatomy" dir="rtl" data-mode="unverified" aria-live="polite">
      <div className="sod29-letter-anatomy__result"><span>ממתין לאימות המנוע</span></div>
    </section>;
  }
  const expression=String(expressionNode.label||"");
  return <section className="sod29-letter-anatomy" dir="rtl" data-mode={mode} aria-label={`אנטומיית אותיות — ${expression}`}>
    <header><small>צופן בתרבות · תיק 001</small><h2>{expression}</h2></header>
    <div className="sod29-letter-anatomy__word" role="list">
      {letterNodes.map((node,i)=>{
        const spec=node?.ref?.spec;
        const spelling=String(spec?.expansions?.[0]?.spelling||node.subtitle||node.label||"");
        return <span className="sod29-letter-anatomy__letter" role="listitem" key={node.id||`${i}-${node.label}`}>
          <b aria-hidden="true">{node.label}</b>
          <span className="sod29-letter-anatomy__inside">{spelling.slice(1)}</span>
          <span className="sr-only">{spec?.a11y?.list_alternative||spelling}</span>
        </span>;
      })}
    </div>
    <div className="sod29-letter-anatomy__result" aria-label={`תוצאת המנוע ${resultNode.label}`}><span>{resultNode.subtitle}</span><strong>{resultNode.label}</strong></div>
  </section>;
}
