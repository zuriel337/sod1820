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
      <div className="sod29-mistater-tension__result"><span>ממתין לאימות החישוב</span></div>
    </section>;
  }

  const words=[...new Set(letters.map((letter)=>letter.ref?.wordIndex??0))].map((wordIndex)=>
    letters.filter((letter)=>(letter.ref?.wordIndex??0)===wordIndex).sort((a,b)=>(a.ref?.letterIndex??0)-(b.ref?.letterIndex??0))
  );
  const tensionByFrom=new Map(tensions.map((tension)=>[tension.from,tension]));

  return <section
    className="sod29-mistater-tension"
    dir="rtl"
    data-experience-capability="mistater-tension"
    aria-label={`מסתתר — מתח בין האותיות של ${expressionNode.label}`}
  >
    <header>
      <small>מסתתר · מה שמתגלה בין האותיות</small>
      <h2>{expressionNode.label}</h2>
    </header>

    <div className="sod29-mistater-tension__chain" role="list" aria-label="שרשרת ההפרשים בין אותיות סמוכות">
      {words.map((wordLetters,wordIndex)=><span className="sod29-mistater-tension__word" key={wordIndex}>
        {wordLetters.map((letter)=>{
          const tension=tensionByFrom.get(letter.id)||null;
          return <React.Fragment key={letter.id}>
            <span className="sod29-mistater-tension__letter" role="listitem">
              <b>{letter.label}</b>
              <small>{letter.subtitle}</small>
            </span>
            {tension ? <span
              className="sod29-mistater-tension__edge"
              role="listitem"
              aria-label={tension.explanation}
              title={tension.explanation}
            >
              <i aria-hidden="true"/>
              <strong>{tension.ref?.difference}</strong>
            </span> : null}
          </React.Fragment>;
        })}
      </span>)}
    </div>

    <div className="sod29-mistater-tension__result" aria-label={`תוצאת המנוע ${resultNode.label}`}>
      <span>{resultNode.subtitle}</span>
      <strong>{resultNode.label}</strong>
    </div>
  </section>;
}
