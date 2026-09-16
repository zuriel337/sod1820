import React from "react";
import NumberHubPage2029 from "./NumberHubPage2029.jsx";

const CONCEPT_IMAGE = "/golden/1237/number-hub-concept-2029.webp";

// Branch-only visual concept layer over the real 2029 Number Hub projection.
// The image is reference/atmosphere only; all live metrics, methods, Trace and Raziel remain real UI.
export default function EntityHubPreviewPage() {
  return <div className="number-concept-preview">
    <style>{`
      .number-concept-preview { min-height:100vh; background:radial-gradient(circle at 50% 0%, rgba(246,226,122,.08), transparent 24%),#07050d; }
      .number-concept-reference { max-width:780px; margin:0 auto; padding:14px 12px 0; direction:rtl; }
      .number-concept-reference__frame { position:relative; overflow:hidden; min-height:210px; border:1px solid rgba(212,175,55,.38); border-radius:24px; background:linear-gradient(90deg, rgba(6,5,12,.94) 0%, rgba(6,5,12,.66) 46%, rgba(6,5,12,.22) 100%),url(${CONCEPT_IMAGE}) center 36% / cover no-repeat; box-shadow:0 24px 70px rgba(0,0,0,.42), inset 0 0 50px rgba(212,175,55,.05); }
      .number-concept-reference__copy { position:relative; z-index:2; width:min(58%,430px); padding:28px 24px 24px; }
      .number-concept-reference__eyebrow { color:#c9a227; font-size:11px; font-weight:800; letter-spacing:2px; }
      .number-concept-reference__title { margin:8px 0 4px; color:#f6e27a; font-size:clamp(28px,7vw,44px); font-weight:900; line-height:1.05; }
      .number-concept-reference__text { color:#d7d1df; font-size:13px; line-height:1.7; max-width:360px; }
      .number-concept-reference__badge { display:inline-flex; margin-top:14px; padding:7px 12px; border:1px solid rgba(167,139,250,.44); border-radius:999px; color:#c4b5fd; background:rgba(76,29,149,.16); font-size:11px; font-weight:800; }
      .number-concept-preview main > div > section:first-of-type { position:relative; overflow:hidden; isolation:isolate; }
      .number-concept-preview main > div > section:first-of-type::before { content:""; position:absolute; inset:0; z-index:-2; background:linear-gradient(180deg, rgba(7,5,13,.42), rgba(7,5,13,.82) 48%, rgba(7,5,13,.97)),url(${CONCEPT_IMAGE}) center 18% / cover no-repeat; opacity:.42; transform:scale(1.04); }
      .number-concept-preview main > div > section:first-of-type::after { content:""; position:absolute; inset:0; z-index:-1; pointer-events:none; background:radial-gradient(circle at 50% 30%, rgba(246,226,122,.11), transparent 28%),linear-gradient(90deg, rgba(212,175,55,.04), transparent 40%, rgba(124,58,237,.05)); }
      .number-concept-preview .smart-dna-grid > * { backdrop-filter:blur(9px); box-shadow:inset 0 1px rgba(255,255,255,.025),0 8px 26px rgba(0,0,0,.12); }
      @media (max-width:680px){ .number-concept-reference{padding-top:8px}.number-concept-reference__frame{min-height:155px;border-radius:18px}.number-concept-reference__copy{width:72%;padding:18px 15px}.number-concept-reference__text{font-size:11px;line-height:1.55}.number-concept-reference__badge{margin-top:9px} }
    `}</style>
    <div className="number-concept-reference" aria-label="כיוון חזותי לפריוויו 1237"><div className="number-concept-reference__frame"><div className="number-concept-reference__copy"><div className="number-concept-reference__eyebrow">VISUAL DIRECTION · 2029</div><div className="number-concept-reference__title">1237 · התגלות</div><div className="number-concept-reference__text">הכיוון מהתמונה הועבר לפריוויו החי: עומק כהה, זהב, זוהר, Hero מרכזי וריבוע מחקר אחד — כשהנתונים והפעולות מתחת נשארים חיים ואמיתיים.</div><div className="number-concept-reference__badge">תמונה מנחה · UI חי מתחת</div></div></div></div>
    <NumberHubPage2029 />
  </div>;
}
