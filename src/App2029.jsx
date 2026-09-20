import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { AuthProvider } from "./lib/AuthContext.jsx";
import ResearchProvider from "./lib/research/ResearchProvider.jsx";
import { initGA, trackPageview } from "./lib/analytics.js";
import { initMarketing, trackMarketingPageview } from "./lib/marketing.js";
import { trackVisit } from "./lib/visits.js";
import { startPageEngagement } from "./lib/engagement.js";
import { ensureIdentity } from "./lib/identity.js";
import TopicGematriaGoldenPilot, { GOLDEN_TOPIC_GEMATRIA_SLUG } from "./components/TopicGematriaGoldenPilot.jsx";

const Home2029Page = lazy(() => import("./pages/Home2029Page.jsx"));
const World2029Page = lazy(() => import("./pages/World2029Page.jsx"));
const Books2029Page = lazy(() => import("./pages/Books2029Page.jsx"));
const Els2029Page = lazy(() => import("./pages/Els2029Page.jsx"));
const Heichal2029Page = lazy(() => import("./pages/Heichal2029Page.jsx"));
const Researcher2029Page = lazy(() => import("./pages/Researcher2029Page.jsx"));
const Number2029Page = lazy(() => import("./pages/Number2029Page.jsx"));
const Topic2029Page = lazy(() => import("./pages/Topic2029Page.jsx"));

function Loading2029() {
  return <div aria-label="טוען" style={{ position: "fixed", inset: 0, background: "#0C0818" }} />;
}

// Same telemetry owners as the legacy runtime; only the renderer/runtime boundary differs.
function RouteEffects2029() {
  const location = useLocation();
  const { pathname, search } = location;

  useEffect(() => {
    initGA();
    initMarketing();
    ensureIdentity();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      trackPageview(pathname);
      trackMarketingPageview();
    }, 350);
    trackVisit(pathname);
    startPageEngagement(pathname);
    return () => clearTimeout(timer);
  }, [pathname]);

  let topicSlug = "";
  if (pathname.startsWith("/topic/")) {
    const raw = pathname.slice("/topic/".length).split("/")[0] || "";
    try { topicSlug = decodeURIComponent(raw); } catch { topicSlug = raw; }
  }
  const topicGematriaGoldenEnabled = topicSlug === GOLDEN_TOPIC_GEMATRIA_SLUG
    && new URLSearchParams(search).get("gematria2029") === "1";

  return <TopicGematriaGoldenPilot
    enabled={topicGematriaGoldenEnabled}
    topicSlug={topicSlug}
  />;
}

// A 2029 runtime never renders a legacy route inside the same React tree.
// Exact-return or an explicit navigation to a non-2029 URL crosses the document boundary instead.
function CanonicalBookAlias2029() {
  const { slug } = useParams();
  return <Navigate replace to={slug ? `/book/${slug}` : "/books"} />;
}

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
          <RouteEffects2029 />
          <Suspense fallback={<Loading2029 />}>
            <Routes>
              <Route path="/2029" element={<Home2029Page />} />
              <Route path="/world" element={<World2029Page />} />
              <Route path="/topic/:slug" element={<Topic2029Page />} />
              <Route path="/books" element={<Books2029Page />} />
              <Route path="/books/:slug" element={<CanonicalBookAlias2029 />} />
              <Route path="/book/:slug" element={<Books2029Page />} />
              <Route path="/els" element={<Els2029Page />} />
              <Route path="/heichal" element={<Heichal2029Page />} />
              <Route path="/היכל" element={<Heichal2029Page />} />
              <Route path="/researcher/:slug" element={<Researcher2029Page />} />
              <Route path="/2029/number/:value" element={<Number2029Page />} />
              <Route path="*" element={<LegacyDocumentHandoff />} />
            </Routes>
          </Suspense>
        </ResearchProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
