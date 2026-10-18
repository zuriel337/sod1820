import React, { Suspense, lazy, useEffect, useLayoutEffect, useRef } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigationType, useParams } from "react-router-dom";
import { AuthProvider } from "./lib/AuthContext.jsx";
import ResearchProvider from "./lib/research/ResearchProvider.jsx";
import { initGA, trackPageview } from "./lib/analytics.js";
import { initMarketing, trackMarketingPageview } from "./lib/marketing.js";
import { trackVisit } from "./lib/visits.js";
import { startPageEngagement } from "./lib/engagement.js";
import { ensureIdentity } from "./lib/identity.js";
import { startWebVitals2029 } from "./lib/webVitals2029.js";
import { createScrollRestorer2029 } from "./lib/scrollRestore2029.js";
import { use2029Palette } from "./lib/palette.js";
import { TYPEFACE } from "./lib/designTokens.js";
import { parseCalculatorShareState } from "./lib/research/calculator2029Viral.js";
import Locked from "./components/MaintenanceLock.jsx";
import { useRuntimeSwitch } from "./lib/runtimeSwitches2029.js";
import {
  loadNumber2029RouteCode,
  loadWorld2029RouteCode,
  lockedRouteCodeLoaderForPath2029,
} from "./lib/lockedRouteCode2029.js";

const Calculator2029Page = lazy(() => import("./pages/Calculator2029Page.jsx"));
const CalculatorPro2029Page = lazy(() => import("./pages/CalculatorPro2029Page.jsx"));
const Home2029Page = lazy(() => import("./pages/Home2029Page.jsx"));
const LazyWorld2029Page = lazy(loadWorld2029RouteCode);
const Books2029Page = lazy(() => import("./pages/Books2029Page.jsx"));
const Els2029Page = lazy(() => import("./pages/Els2029Page.jsx"));
const Heichal2029Page = lazy(() => import("./pages/Heichal2029Page.jsx"));
const Researcher2029Page = lazy(() => import("./pages/Researcher2029Page.jsx"));
const LazyNumber2029Page = lazy(loadNumber2029RouteCode);
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
  return <Navigate replace to={`${location.pathname.replace(/^\/2029(?=\/|$)/, "") || "/"}${location.search || ""}${location.hash || ""}`} state={location.state} />;
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

function RouteCodeLoadFailure2029() {
  const palette = use2029Palette();
  const location = useLocation();
  const href = `${location.pathname}${location.search || ""}${location.hash || ""}`;
  return <div data-route-load-failure role="alert" dir="rtl" style={{ minHeight: "72vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center", background: palette.pageBg, color: palette.ink, fontFamily: TYPEFACE.ui }}>
    <div>
      <h1 style={{ fontSize: 24, margin: "0 0 12px" }}>לא הצלחנו לטעון את העמוד</h1>
      <p style={{ margin: "0 0 20px", lineHeight: 1.7 }}>החיבור נקטע בזמן טעינת קוד העמוד. אפשר לנסות שוב ברענון מפורש.</p>
      <a href={href} style={{ color: palette.accent || "#b58a16", fontWeight: 800 }}>טען מחדש את העמוד</a>
    </div>
  </div>;
}

class RouteCodeErrorBoundary2029 extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <RouteCodeLoadFailure2029 /> : this.props.children;
  }
}

function World2029Page() {
  return <RouteCodeErrorBoundary2029><LazyWorld2029Page /></RouteCodeErrorBoundary2029>;
}

function Number2029Page() {
  return <RouteCodeErrorBoundary2029><LazyNumber2029Page /></RouteCodeErrorBoundary2029>;
}

function LockedRouteCodePreparation2029() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    const loader = lockedRouteCodeLoaderForPath2029(pathname);
    if (loader) void loader().catch(() => {});
  }, [pathname]);
  return null;
}

// Same telemetry owners as the legacy runtime; only the renderer/runtime boundary differs.
function RouteEffects2029() {
  const { pathname, key, hash } = useLocation();
  const navType = useNavigationType();
  const restorer = useRef(null);

  // Scroll: the browser restores on back/forward; complete it (downwards only) when it could not,
  // start a new entry at the top, and leave hash/anchor locations to the page that owns them.
  useLayoutEffect(() => {
    if (!restorer.current) restorer.current = createScrollRestorer2029();
    restorer.current.start();
    return () => restorer.current?.stop();
  }, []);
  useLayoutEffect(() => {
    restorer.current?.onLocation({ key, pathname, hash, navType });
  }, [key]);
  // Owner switch fx_analytics (control panel): while OFF nothing below starts. Nothing starts before the switch is known.
  const analyticsSwitch = useRuntimeSwitch("fx_analytics");
  const analyticsOn = !analyticsSwitch.loading && analyticsSwitch.on;

  useEffect(() => {
    if (!analyticsOn) return undefined;
    if (integratedPreviewEnabled || (kingdomPreviewEnabled && pathname === "/kingdom")) return undefined;
    initGA();
    initMarketing();
    ensureIdentity();
    const stopWebVitals = startWebVitals2029();
    return () => { try { stopWebVitals?.(); } catch { /* observability never blocks runtime */ } };
  }, [analyticsOn]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!analyticsOn) return undefined;
    if (integratedPreviewEnabled || (kingdomPreviewEnabled && pathname === "/kingdom")) return undefined;
    // Internal Control Plane is operational/admin traffic, not public product analytics.
    if (pathname.startsWith("/control")) return undefined;
    const timer = setTimeout(() => {
      trackPageview(pathname);
      trackMarketingPageview();
    }, 350);
    trackVisit(pathname);
    startPageEngagement(pathname);
    return () => clearTimeout(timer);
  }, [pathname, analyticsOn]);

  return null;
}

// A 2029 runtime never renders a legacy route inside the same React tree.
// Exact-return or an explicit navigation to a non-2029 URL crosses the document boundary instead.
function CanonicalBookAlias2029() {
  const { slug } = useParams();
  const location = useLocation();
  return <Navigate replace to={`${slug ? `/book/${slug}` : "/books"}${location.search}${location.hash}`} state={location.state} />;
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
  const location = useLocation();
  const { search } = location;
  const params = new URLSearchParams(search);
  const oldExpression = params.get("w") || params.get("calc");
  if (!params.get("q") && oldExpression) {
    params.set("q", oldExpression);
    return <Navigate replace to={`${location.pathname}?${params.toString()}${location.hash}`} state={location.state} />;
  }
  // Existing shared result links retain their original result presentation.
  return parseCalculatorShareState(search).isShared
    ? <Calculator2029Page />
    : <CalculatorPro2029Page />;
}

export default function App2029() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <LockedRouteCodePreparation2029 />
        <ResearchProvider>
          <RouteEffects2029 />
          <Suspense fallback={<Loading2029 />}>
            <Routes>
              <Route path="/" element={<HomeEntry2029 />} />
              <Route path="/2029/*" element={<HomeAddressAlias2029 />} />
              {integratedPreviewEnabled && <Route path="/preview" element={<IntegratedPreview2029Page />} />}
              <Route path="/home-preview" element={<HomePreview2029Page />} />
              <Route path="/melech-hamisparim/718" element={<Campaign718Page2029 />} />
              <Route path="/early-access" element={<EarlyAccess2029Page />} />
              {kingdomPreviewEnabled && <Route path="/kingdom" element={<Kingdom2029Page />} />}
              <Route path="/gematria" element={<GematriaEntry2029 />} />
              <Route path="/gematria/viral" element={<Calculator2029Page />} />
              <Route path="/calculator" element={<CalculatorPro2029Page />} />
              <Route path="/world" element={<Locked flag="lock_world" homeHref="/"><World2029Page /></Locked>} />
              <Route path="/topic/:slug" element={<Locked flag="lock_world" homeHref="/"><Topic2029Page /></Locked>} />
              <Route path="/posts" element={<Posts2029Page />} />
              <Route path="/community/chat" element={<CommunityChatTransition2029Page />} />
              <Route path="/journey" element={<Locked flag="lock_life_journey" requireFlag homeHref="/"><LifeJourney2029Page /></Locked>} />
              <Route path="/post/:slug" element={<Post2029Page />} />
              <Route path="/video/:assetId" element={<Video2029Page />} />
              <Route path="/books" element={<Locked flag="lock_books" requireFlag homeHref="/"><Books2029Page /></Locked>} />
              <Route path="/books/:slug" element={<CanonicalBookAlias2029 />} />
              <Route path="/book/:slug" element={<Locked flag="lock_books" requireFlag homeHref="/"><Books2029Page /></Locked>} />
              <Route path="/code" element={<Els2029Page />} />
              <Route path="/els" element={<ElsAddressAlias2029 />} />
              <Route path="/heichal" element={<Locked flag="lock_heichal" requireFlag homeHref="/"><Heichal2029Page /></Locked>} />
              <Route path="/היכל" element={<Locked flag="lock_heichal" requireFlag homeHref="/"><Heichal2029Page /></Locked>} />
              <Route path="/researcher/:slug" element={<Locked flag="lock_world" homeHref="/"><Researcher2029Page /></Locked>} />
              <Route path="/number/:value" element={<Locked flag="lock_number" requireFlag homeHref="/"><Number2029Page /></Locked>} />
              <Route path="/entity-hub-preview/:type/:key" element={<EntityHubPreviewPage />} />
              <Route path="/control" element={<ControlPlane2029Page />} />
              <Route path="*" element={<LegacyDocumentHandoff />} />
            </Routes>
          </Suspense>
        </ResearchProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
