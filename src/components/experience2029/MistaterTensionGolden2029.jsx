import React from "react";

export default function MistaterTensionGolden2029({ scene }) {
  const nodes=Array.isArray(scene?.sceneNodes)?scene.sceneNodes:[];
  const relations=Array.isArray(scene?.sceneRelations)?scene.sceneRelations:[];
  const expressionNode=nodes.find((node)=>node.kind==="expression");
  const resultNode=nodes.find((node)=>node.kind==="engine_result");
  const letters=nodes.filter((node)=>node.kind==="letter_anchor");
  const tensions=relations.filter((rel)=>rel.kind==="tension_between");
  const verified=resultNode?.ref?.engine_verified===true;

  if(!expressionNode||!verified||!letters.length){
    return <section className="sod29-mistater-tension" dir="rtl" data-state="unverified" aria-live="polite">
      <div className="sod29-mistater-tension__result"><span>ממתין ל־trace קנוני מאומת</span></div>
    </section>;
  }

  const words=[...new Set(letters.map((letter)=>letter.ref?.wordIndex??0))].map((wordIndex)=>
    letters.filter((letter)=>(letter.ref?.wordIndex??0)===wordIndex).sort((a,b)=>(a.ref?.letterIndex??0)-(b.ref?.letterIndex??0))
  );
  const tensionByFrom=new Map(tensions.map((tension)=>[tension.from,tension]));


