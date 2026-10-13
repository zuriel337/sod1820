import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { AuthProvider } from "./lib/AuthContext.jsx";
import ResearchProvider from "./lib/research/ResearchProvider.jsx";
import { initGA, trackPageview } from "./lib/analytics.js";
import { initMarketing, trackMarketingPageview } from "./lib/marketing.js";
import { trackVisit } from "./lib/visits.js";
import { startPageEngagement } from "./lib/engagement.js";
import { ensureIdentity } from "./lib/identity.js";
import { startWebVitals2029 } from "./lib/webVitals2029.js";
import Calculator2029Page from "./pages/Calculator2029Page.jsx";
import { use2029Palette } from "./lib/palette.js";
import { TYPEFACE } from "./lib/designTokens.js";
import CalculatorPro2029Page from "./pages/CalculatorPro2029Page.jsx";
import { parseCalculatorShareState } from "./lib/research/calculator2029Viral.js";
import Locked from "./components/MaintenanceLock.jsx";

const Home2029Page = lazy(() => import("./pages/Home2029Page.jsx"));
const World2029Page = lazy(() => import("./pages/World2029Page.jsx"));
const Books2029Page = lazy(() => import("./pages/Books2029Page.jsx"));
const Els2029Page = lazy(() => import("./pages/Els2029Page.jsx"));
const Heichal2029Page = lazy(() => import("./pages/Heichal2029Page.jsx"));
const Researcher2029Page = lazy(() => import("./pages/Researcher2029Page.jsx"));
const Number2029Page = lazy(() => import("./pages/Number2029Page.jsx"));
const Topic2029Page = lazy(() => import("./pages/Topic2029Page.jsx"));
const Posts2029Page = lazy(() => import("./pages/Posts2029Page.jsx"));
const LifeJourney2029Page = lazy(() => import("./pages/LifeJourney2029Page.jsx"));
const Post2029Page = lazy(() => import("./pages/Post2029Page.jsx"));
const Video2029Page = lazy(() => import("./pages/Video2029Page.jsx"));
const ControlPlane2029Page = lazy(() => import("./pages/ControlPlane2029Page.jsx"));
const EntityHubPreviewPage = lazy(() => import("./pages/EntityHubPreviewPage.jsx"));
const Campaign718Page2029 = lazy(() => import("./pages/Campaign718Page2029.jsx"));
const EarlyAccess2029Page = lazy(() => import("./pages/EarlyAccess2029Page.jsx"));
const Community2029Page = lazy(() => import("./pages/Community2029Page.jsx"));
const CommunityChatTransition2029Page = lazy(() => import("./pages/CommunityChatTransition2029Page.jsx"));

// Design review on an existing document route; does not open public Community
// navigation or require a competing edit to the deployment rewrite configuration.
function HomeEntry2029() {
  const { search } = useLocation();
  return new URLSearchParams(search).get("preview") === "community"
    ? <Community2029Page />
    : <Home2029Page />;
}

function HomeAddressAlias2029() {
  const location = useLocation();
  return <Navigate replace to={`/${location.search || ""}${location.hash || ""}`} />;
}
const HomePreview2029Page = lazy(() => import("./pages/HomePreview2029Page.jsx"));

// Branch-only prototype. Production builds do not register or import this surface
// unless explicitly enabled; no global navigation/route ownership is promoted.
const kingdomPreviewEnabled = import.meta.env.VITE_KINGDOM_PREVIEW === "true";
const Kingdom2029Page = kingdomPreviewEnabled
  ? lazy(() => import("./pages/Kingdom2029Page.jsx")) : null;
const integratedPreviewEnabled = import.meta.env.VITE_INTEGRATED_PREVIEW === "true";
const IntegratedPreview2029Page = integratedPreviewEnabled
  ? lazy(() => import("./pages/IntegratedPreview2029Page.jsx")) : null;

function Loading2029() {
  const palette = use2029Palette();
  return <div role="status" dir="rtl" style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: palette.pageBg, color: palette.ink, fontFamily: TYPEFACE.ui, fontSize: 18 }}>
    <span>טוען את התוכן…</span>
  </div>;
}

// Same telemetry owners as the legacy runtime; only the renderer/runtime boundary differs.
function RouteEffects2029() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (integratedPreviewEnabled || (kingdomPreviewEnabled && pathname === "/2029/kingdom")) return undefined;
    initGA();
    initMarketing();
    ensureIdentity();
    const stopWebVitals = startWebVitals2029();
    return () => { try { stopWebVitals?.(); } catch { /* observability never blocks runtime */ } };
  }, []);

  useEffect(() => {
    if (integratedPreviewEnabled || (kingdomPreviewEnabled && pathname === "/2029/kingdom")) return undefined;
    // Internal Control Plane is operational/admin traffic, not public product analytics.
    if (pathname.startsWith("/2029/control")) return undefined;
    const timer = setTimeout(() => {
      trackPageview(pathname);
      trackMarketingPageview();
    }, 350);
    trackVisit(pathname);
    startPageEngagement(pathname);
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}

// A 2029 runtime never renders a legacy route inside the same React tree.
// Exact-return or an explicit navigation to a non-2029 URL crosses the document boundary instead.
function CanonicalBookAlias2029() {
  const { slug } = useParams();
  return <Navigate replace to={slug ? `/book/${slug}` : "/books"} />;
}

function ElsAddressAlias2029() {
  const location = useLocation();
  return <Navigate replace to={`/code${location.search || ""}${location.hash || ""}`} />;
}

function LegacyDocumentHandoff() {
  const location = useLocation();
  const href = `${location.pathname}${location.search || ""}${location.hash || ""}`;
  useEffect(() => {
    window.location.assign(href);
  }, [href]);
  return <Loading2029 />;
}

function GematriaEntry2029() {
  const { search } = useLocation();
  // Existing shared result links retain their original result presentation.
  return parseCalculatorShareState(search).isShared
    ? <Calculator2029Page />
    : <CalculatorPro2029Page />;
}

export default function App2029() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ResearchProvider>
          <RouteEffects2029 />
          <Suspense fallback={<Loading2029 />}>
            <Routes>
              <Route path="/" element={<HomeEntry2029 />} />
              <Route path="/2029" element={<HomeAddressAlias2029 />} />
              {integratedPreviewEnabled && <Route path="/2029/preview" element={<IntegratedPreview2029Page />} />}
              <Route path="/2029/home-preview" element={<HomePreview2029Page />} />
              <Route path="/melech-hamisparim/718" element={<Campaign718Page2029 />} />
              <Route path="/early-access" element={<EarlyAccess2029Page />} />
              {kingdomPreviewEnabled && <Route path="/2029/kingdom" element={<Kingdom2029Page />} />}
              <Route path="/2029/gematria" element={<GematriaEntry2029 />} />
              <Route path="/2029/gematria/viral" element={<Calculator2029Page />} />
              <Route path="/2029/calculator" element={<CalculatorPro2029Page />} />
              <Route path="/world" element={<Locked flag="lock_world" homeHref="/2029"><World2029Page /></Locked>} />
              <Route path="/topic/:slug" element={<Locked flag="lock_world" homeHref="/2029"><Topic2029Page /></Locked>} />
              <Route path="/2029/posts" element={<Posts2029Page />} />
              <Route path="/community/chat" element={<CommunityChatTransition2029Page />} />
              <Route path="/2029/journey" element={<Locked flag="lock_life_journey" requireFlag homeHref="/2029"><LifeJourney2029Page /></Locked>} />
              <Route path="/post/:slug" element={<Post2029Page />} />
              <Route path="/video/:assetId" element={<Video2029Page />} />
              <Route path="/books" element={<Locked flag="lock_books" requireFlag homeHref="/2029"><Books2029Page /></Locked>} />
              <Route path="/books/:slug" element={<CanonicalBookAlias2029 />} />
              <Route path="/book/:slug" element={<Locked flag="lock_books" requireFlag homeHref="/2029"><Books2029Page /></Locked>} />
              <Route path="/code" element={<Els2029Page />} />
              <Route path="/els" element={<ElsAddressAlias2029 />} />
              <Route path="/heichal" element={<Locked flag="lock_heichal" requireFlag homeHref="/2029"><Heichal2029Page /></Locked>} />
              <Route path="/היכל" element={<Locked flag="lock_heichal" requireFlag homeHref="/2029"><Heichal2029Page /></Locked>} />
              <Route path="/researcher/:slug" element={<Locked flag="lock_world" homeHref="/2029"><Researcher2029Page /></Locked>} />
              <Route path="/2029/number/:value" element={<Locked flag="lock_number" requireFlag homeHref="/2029"><Number2029Page /></Locked>} />
              <Route path="/entity-hub-preview/:type/:key" element={<EntityHubPreviewPage />} />
              <Route path="/2029/control" element={<ControlPlane2029Page />} />
              <Route path="*" element={<LegacyDocumentHandoff />} />
            </Routes>
          </Suspense>
        </ResearchProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
