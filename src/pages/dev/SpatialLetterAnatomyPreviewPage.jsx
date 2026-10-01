import React,{useState} from "react";
import LetterAnatomyGolden2029 from "../../components/experience2029/LetterAnatomyGolden2029.jsx";
import "../../components/experience2029/letterAnatomyGolden2029.css";

export default function SpatialLetterAnatomyPreviewPage(){
 const [mode,setMode]=useState("visible");
 return <main dir="rtl" style={{minHeight:"100vh",padding:"24px 12px"}}>
  <meta name="robots" content="noindex,nofollow" />
  <nav aria-label="עומק האות" style={{display:"flex",justifyContent:"center",gap:8,flexWrap:"wrap"}}>
   {[["visible","גלוי"],["full","מלא"],["hidden","נסתר"]].map(([key,label])=><button key={key} type="button" aria-pressed={mode===key} onClick={()=>setMode(key)}>{label}</button>)}
  </nav>
  <LetterAnatomyGolden2029 mode={mode}/>
 </main>;
}
