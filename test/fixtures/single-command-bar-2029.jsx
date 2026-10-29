import React, { useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useLocation } from "react-router-dom";
import { AuthProvider } from "../../src/lib/AuthContext.jsx";
import ResearchProvider, { useResearch } from "../../src/lib/research/ResearchProvider.jsx";
import Sod2029Shell from "../../src/components/experience2029/Sod2029Shell.jsx";
import { useSystemToolDock2029 } from "../../src/components/experience2029/SystemToolDock2029.jsx";
const paths = { post: "/post/test", topic: "/topic/test", world: "/world", books: "/books", community: "/community/chat", number: "/2029/number/73", els: "/code", home: "/2029", heichal: "/heichal", journey: "/2029/journey" };
function Tool() {
  const projection = useMemo(() => ({ surface: "els", actions: ["חיפוש צופן", "ממצאים", "תוצאות", "שמירה"].map((label,i) => ({ id: `tool-${i}`,label,icon:"els",onSelect:()=>{window.__toolAction=i;} })) }), []);
  useSystemToolDock2029(projection); return null;
}
function Scenario() {
  const location = useLocation(), research = useResearch();
  const surface = Object.keys(paths).find(key => paths[key] === location.pathname) || "home";
  useEffect(() => {
    research.setResearchContext({ subject: { id: surface === "number" ? "73" : "fixture",type: surface === "number" ? "number" : surface,label: "מוקד הבדיקה",href: location.pathname }, dimensions: { bottomTrail: [{id:"test",label:"מסלול בדיקה"}],surfaceSections:[{id:"first",label:"פתיחה"},{id:"second",label:"מקורות"}],activeSectionId:"first",surfaceFocus:{type:surface,label:"מוקד הבדיקה",number:73} } });
  }, [surface]);
  return <Sod2029Shell surface={surface} title={surface} introVariant="none">
    {surface === "els" ? <Tool /> : null}
    <section id="first" style={{minHeight:1000}}><h1>פתיחה</h1><p>תוכן הבדיקה והמקור נשארים בעמוד.</p></section>
    <section id="second" style={{minHeight:1000}}><h2>מקורות</h2></section>
  </Sod2029Shell>;
}
createRoot(document.getElementById("root")).render(<AuthProvider><BrowserRouter><ResearchProvider><Scenario /></ResearchProvider></BrowserRouter></AuthProvider>);
