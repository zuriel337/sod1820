import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useLocation } from "react-router-dom";
import { AuthProvider } from "../../src/lib/AuthContext.jsx";
import ResearchProvider, { useResearch } from "../../src/lib/research/ResearchProvider.jsx";
import Sod2029Shell from "../../src/components/experience2029/Sod2029Shell.jsx";
import World2029Page from "../../src/pages/World2029Page.jsx";

// The fixture controls only the research subject. All shell UI, providers and the
// World source section are real app components; no alternate chat is mounted.
function ShellScenario() {
  const research = useResearch();
  const location = useLocation();
  if (location.pathname === "/world") return <World2029Page />;
  const selectSubject = (id) => research.updateResearchContext({
    subject: { id, type: "topic", label: `נושא בדיקה ${id}`, href: `/topic/${id}` },
    lens: "world",
  });
  return <Sod2029Shell surface="home" title="בדיקת מסגרת" introVariant="none">
    <div style={{ padding: 24 }}>
      <h1>בדיקת מסגרת</h1>
      <button type="button" onClick={() => selectSubject("first")}>נושא ראשון</button>
      <button type="button" onClick={() => selectSubject("second")}>נושא שני</button>
    </div>
  </Sod2029Shell>;
}

createRoot(document.getElementById("root")).render(
  <AuthProvider><BrowserRouter><ResearchProvider><ShellScenario /></ResearchProvider></BrowserRouter></AuthProvider>
);
