import React from "react";

const DISPLAY_VERSE = "והסרתי את כפי וראית את אחרי ופני לא יראו";
const TARGET_PHRASE = "וראית את אחרי";

function renderHighlightedVerse(text){
  const index=text.indexOf(TARGET_PHRASE);
  if(index<0) return text;
  return <>
    {text.slice(0,index)}
    <mark>{TARGET_PHRASE}</mark>
    {text.slice(index+TARGET_PHRASE.length)}
  </>;
}

export default function RegularVerseGolden2029({ scene, verseSource }) {
  const nodes=Array.isArray(scene?.sceneNodes)?scene.sceneNodes:[];
  const expression=nodes.find((node)=>node.kind==="expression");
  const result=nodes.find((node)=>node.kind==="engine_result");
  const letters=nodes.filter((node)=>node.kind==="visible_letter");
  const verified=result?.ref?.engine_verified===true;
  const sourceText=String(verseSource?.text||"");
  const sourceVerified=verseSource?.book==="שמות" && Number(verseSource?.chapter)===33 && Number(verseSource?.verse)===23 && sourceText.includes("והסרתי") && sourceText.includes("וראית אתאחרי") && sourceText.includes("ופני לא יראו");

  if(!expression||!verified||!letters.length||!sourceVerified){
    return <section className="sod29-regular-verse" dir="rtl" data-state="unverified" aria-live="polite">
      <p>ממתין ל־trace קנוני ולמקור הפסוק.</p>
    </section>;
  }

  return <section
    className="sod29-regular-verse"
    dir="rtl"
    data-experience-capability="regular-visible-ledger"
    aria-label={"רגיל — "+expression.label}
  >
    <header>
      <small>רגיל · מה שרואים באותיות</small>
      <h2>{expression.label}</h2>
      <p className="sod29-regular-verse__source">שמות לג:כג</p>
    </header>

    <blockquote className="sod29-regular-verse__verse">
      {renderHighlightedVerse(DISPLAY_VERSE)}
    </blockquote>

    <div className="sod29-regular-verse__ledger" role="list" aria-label="ערכי האותיות בשיטת רגיל">
      {letters.map((letter)=><span className="sod29-regular-verse__letter" role="listitem" key={letter.id}>
        <b>{letter.label}</b>
        <small>{letter.subtitle}</small>
      </span>)}
    </div>

    <div className="sod29-regular-verse__result" aria-label={"תוצאת המנוע "+result.label}>
      <span>{result.subtitle}</span>
      <strong>{result.label}</strong>
    </div>

    <p className="sod29-regular-verse__note">הפסוק הוא הקשר המקור; החישוב נעשה רק על הביטוי המסומן.</p>
  </section>;
}
