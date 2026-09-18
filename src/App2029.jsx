import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "./lib/AuthContext.jsx";
import ResearchProvider from "./lib/research/ResearchProvider.jsx";

const Home2029Page = lazy(() => import("./pages/Home2029Page.jsx"));
const World2029Page = lazy(() => import("./pages/World2029Page.jsx"));
const Books2029Page = lazy(() => import("./pages/Books2029Page.jsx"));
const Els2029Page = lazy(() => import("./pages/Els2029Page.jsx"));
const Heichal2029Page = lazy(() => import("./pages/Heichal2029Page.jsx"));
const Researcher2029Page = lazy(() => import("./pages/Researcher2029Page.jsx"));

function Loading2029() {
  return <div aria-label="טוען" style={{ position: "fixed", inset: 0, background: "#0C0818" }} />;
}

// A 2029 runtime never renders a legacy route inside the same React tree.
// Exact-return or an explicit navigation to a non-2029 URL crosses the document boundary instead.
function LegacyDocumentHandoff() {
  const location = useLocation();
  const href = `${location.pathname}${location.search || ""}${location.hash || ""}`;
  useEffect(() => {
    window.location.assign(href);
  }, [href]);
  return <Loading2029 />;
}

export default function App2029() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ResearchProvider>
          <Suspense fallback={<Loading2029 />}>
            <Routes>
              <Route path="/2029" element={<Home2029Page />} />
              <Route path="/world" element={<World2029Page />} />
              <Route path="/books" element={<Books2029Page />} />
              <Route path="/books/:slug" element={<Books2029Page />} />
              <Route path="/els" element={<Els2029Page />} />
              <Route path="/heichal" element={<Heichal2029Page />} />
              <Route path="/היכל" element={<Heichal2029Page />} />
              <Route path="/researcher/:slug" element={<Researcher2029Page />} />
              <Route path="*" element={<LegacyDocumentHandoff />} />
            </Routes>
          </Suspense>
        </ResearchProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
