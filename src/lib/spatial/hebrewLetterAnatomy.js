// Renderer-independent Hebrew Letter Anatomy V1.
// Projection data only: no numeric gematria truth is stored here.
export const HEBREW_LETTER_NAMES_ENGINE_DEFAULT = Object.freeze({
  "א":"אלף","ב":"בית","ג":"גימל","ד":"דלת","ה":"הי","ו":"ויו","ז":"זין","ח":"חית","ט":"טית","י":"יוד",
  "כ":"כף","ך":"כף","ל":"למד","מ":"מם","ם":"מם","נ":"נון","ן":"נון","ס":"סמך","ע":"עין","פ":"פא","ף":"פא",
  "צ":"צדי","ץ":"צדי","ק":"קוף","ר":"ריש","ש":"שין","ת":"תיו"
});
export const FINAL_BASE = Object.freeze({"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"});

export function buildLetterAnatomySpec(letter,{variantSource="engine_default"}={}) {
  const spelling=HEBREW_LETTER_NAMES_ENGINE_DEFAULT[letter];
  if(!spelling) return null;
  return {
    spec_id:`hebrew-letter:${letter}:milui:${variantSource}:v1`,
    schema_v:1,
    letter:{codepoint:letter,is_final:Boolean(FINAL_BASE[letter]),base_codepoint:FINAL_BASE[letter]||null},
    glyph_ref:{asset_id:null,kind:"none",font_agnostic:true},
    expansions:[{method_key:"מילוי",variant_source:variantSource,spelling,letters:[...spelling],value_ref:{kind:"engine_runtime"}}],
    parts:[],
    tiers:{T0:true,T1:true,T2:true,T3:true,T4:{glyph_mesh_ref:null}},
    a11y:{label:`${letter} — מילוי ${spelling}`,list_alternative:`${letter} → ${spelling}`},
    provenance:{representation_only:true,numeric_truth_stored:false}
  };
}

export function buildWordLetterAnatomySpecs(text,opts={}) {
  return [...String(text||"")].filter(ch=>HEBREW_LETTER_NAMES_ENGINE_DEFAULT[ch]).map((letter,index)=>({index, ...buildLetterAnatomySpec(letter,opts)}));
}
