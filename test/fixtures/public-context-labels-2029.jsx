import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../../src/lib/AuthContext.jsx";
import ResearchProvider, { useResearch } from "../../src/lib/research/ResearchProvider.jsx";
import Sod2029Shell, { use2029Shell } from "../../src/components/experience2029/Sod2029Shell.jsx";
const ID="00edc0d8-b792-45d9-aa86-d04b44600a3f", OTHER="10000000-0000-4000-8000-000000000002";
const LOCATOR="topic-discovery-wall--trump-#methods";
function Seed() {
  const research=useResearch(),shell=use2029Shell();
  const mode=new URLSearchParams(location.search).get("case") || "match";
  useEffect(()=>{
    research.setResearchContext({subject:{id:ID,type:"topic",label:mode==="unresolved"?ID:"משיח בן דוד",href:"/topic/exact"},selection:{entityId:mode==="foreign"?OTHER:ID,entityType:"topic",locator:LOCATOR},lens:"topic",returnTo:{href:"/world?source=exact#item"},dimensions:{surfaceSections:[{id:LOCATOR,label:"שיטות וחישובים"},{id:"sources",label:"מקורות"}],activeSectionId:LOCATOR,surfaceFocus:{locator:LOCATOR,sectionLabel:"שיטות וחישובים",label:ID}}});
  },[mode]);
  useEffect(()=>{window.__contextLabelSnapshot=JSON.stringify(research.context)},[research.context]);
  return <><button onClick={()=>shell.openRaziel()}>פתח שיחת רזיאל</button><section id={LOCATOR}><h2>שיטות וחישובים</h2><p>חומר המקור נשאר כפי שנכתב.</p></section></>;
}
createRoot(document.getElementById("root")).render(<AuthProvider><BrowserRouter><ResearchProvider><Sod2029Shell surface="topic" title="ציר" introVariant="hero"><Seed /></Sod2029Shell></ResearchProvider></BrowserRouter></AuthProvider>);
