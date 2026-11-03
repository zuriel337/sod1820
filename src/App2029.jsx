import React, { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthContext.jsx";
import { beginPostReadingSource, beginHomeReadingSource } from "./lib/supabase.js";
import ResearchProvider from "./lib/research/ResearchProvider.jsx";
import RazielSessionMount2029 from "./components/experience2029/RazielSessionMount2029.jsx";
import { initGA, trackPageview } from "./lib/analytics.js";
import { initMarketing, trackMarketingPageview } from "./lib/marketing.js";
import { startPageEngagement } from "./lib/engagement.js";
import { ensureIdentity } from "./lib/identity.js";
import { startWebVitals2029 } from "./lib/webVitals2029.js";
const Calculator2029Page = lazy(() => import("./pages/Calculator2029Page.jsx"));
import Opening2029 from "./components/experience2029/Opening2029.jsx";
const CalculatorPro2029Page = lazy(() => import("./pages/CalculatorPro2029Page.jsx"));
import { parseCalculatorShareState } from "./lib/research/calculator2029Viral.js";
import Locked from "./components/MaintenanceLock.jsx";
import FeatureClosedNotice from "./components/FeatureClosedNotice.jsx";
import { PUBLIC_READING_RELEASE, publicReadingPath, publicReadingContinuation, publicReadingCapability } from "./lib/publicReadingRelease2029.js";

// Admit Home's component code before preparing the first Post. The existing
// Post preparation still starts before a click, without blocking Home's module
// or starting any Post data read.
const loadPublicPostAddress = () => import("./pages/PublicPostAddress2029Page.jsx");
const Home2029Page = lazy(() => import("./pages/Home2029Page.jsx").then(module => {
  if (PUBLIC_READING_RELEASE) void loadPublicPostAddress().catch(() => {});
  return module;
}));
const World2029Page = lazy(() => import("./pages/World2029Page.jsx"));
const BeitMidrash2029Page = lazy(
  () => import("./pages/BeitMidrash2029Page.jsx")
);
const Books2029Page = lazy(() => import("./pages/Books2029Page.jsx"));
const Els2029Page = lazy(() => import("./pages/Els2029Page.jsx"));
const Heichal2029Page = lazy(() => import("./pages/Heichal2029Page.jsx"));
const PublicContributor2029Page = lazy(() => import("./pages/PublicContributor2029Page.jsx"));
const WriterPersonal2029Page = lazy(() => import("./pages/WriterPersonal2029Page.jsx"));
const WriterMe2029Redirect = lazy(() => import("./pages/WriterPersonal2029Page.jsx").then((module) => ({ default: module.WriterMe2029Redirect })));
const PublicContributorFrame2029 = lazy(() => import("./components/experience2029/Sod2029Shell.jsx"));
const Researcher2029Page = lazy(() => import("./pages/Researcher2029Page.jsx"));
const Number2029Page = lazy(() => import("./pages/Number2029Page.jsx"));
const Topic2029Page = lazy(() => import("./pages/Topic2029Page.jsx"));
const Gallery2029Page = lazy(() => import("./pages/Gallery2029Page.jsx"));
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
const AuthPage = lazy(() => import("./pages/Auth2029Page.jsx"));
const OAuthCallback2029 = lazy(() => import("./pages/OAuthCallback2029.jsx"));
const publicFoundationPreview = import.meta.env.VITE_PUBLIC_FOUNDATION_PREVIEW === "true" || PUBLIC_READING_RELEASE;
const PublicPostAddress2029Page = lazy(loadPublicPostAddress);
const NumberAddress2029Page = lazy(() => import("./pages/NumberAddress2029Page.jsx"));
const PublicServices2029Page = lazy(() => import("./pages/PublicServices2029Page.jsx"));
const PostsTaxonomy2029Page = lazy(() => import("./pages/PostsTaxonomy2029Page.jsx"));
const CommunityCalculator2029Page = lazy(() => import("./pages/CommunityCalculator2029Page.jsx"));
const PublicLibraryContinuity2029Page = lazy(() => import("./pages/PublicLibraryContinuity2029Page.jsx"));
const PublicContinuity2029Page = lazy(() => import("./pages/PublicContinuity2029Page.jsx"));

// Gallery pilot reuses the existing World document route and lock. No parallel
// document rewrite, global navigation change or Legacy route is introduced.
function WorldEntry2029() {
  const { search } = useLocation();
  return new URLSearchParams(search).get("view") === "gallery"
    ? <Gallery2029Page /> : <World2029Page />;
}

// Design review on an existing document route; does not open public Community
// navigation or require a competing edit to the deployment rewrite configuration.
function HomeEntry2029() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const identity = user?.id || "guest";
  const [source, setSource] = useState(null);
  useEffect(() => {
    if (!PUBLIC_READING_RELEASE || loading) return undefined;
    const request = beginHomeReadingSource({ readCards: options => import("./lib/research/homeLaunchPosts2029.js").then(module => module.getHomeLaunchPostCards(options)) });
    setSource({ key: location.key, identity, read: request.read });
    return () => request.cancel();
  }, [location.key, identity, loading]);
  if (!PUBLIC_READING_RELEASE) return new URLSearchParams(location.search).get("preview") === "community"
    ? <Community2029Page /> : <Home2029Page />;
  // Commit the route-owned read before suspending on Home/Shell component code.
  // No previous route or identity's promise is ever handed to the composition.
  if (loading || source?.key !== location.key || source?.identity !== identity) return <Loading2029 />;
  return <Home2029Page primaryReader={source.read} />;
}
// Only a real WordPress ?p= address needs its document identity adapter.
function PublicHomeEntry2029() {
  const { search } = useLocation();
  return new URLSearchParams(search).get("p")
    ? <PublicPostAddress2029Page home={<HomeEntry2029 />} />
    : <HomeEntry2029 />;
}
function PostEntry2029() {
  const { slug } = useParams();
  const { user, loading } = useAuth();
  const identity = user?.id || "guest";
  const [source, setSource] = useState(null);
  useEffect(() => {
    if (!PUBLIC_READING_RELEASE || loading) return undefined;
    const request = beginPostReadingSource(slug);
    setSource({ slug, identity, read: request.read });
    return () => request.cancel();
  }, [slug, identity, loading]);
  if (!PUBLIC_READING_RELEASE) return <Post2029Page />;
  if (loading || source?.slug !== slug || source.identity !== identity) return <Loading2029 />;
  return <Post2029Page sourceReader={source.read} />;
}
const HomePreview2029Page = lazy(() => import("./pages/HomePreview2029Page.jsx"));

// Branch-only prototype. Production builds do not register or import this surface
// unless explicitly enabled; no global navigation/route ownership is promoted.
const kingdomPreviewEnabled = import.meta.env.VITE_KINGDOM_PREVIEW === "true";
const Kingdom2029Page = kingdomPreviewEnabled
  ? lazy(() => import("./pages/Kingdom2029Page.jsx")) : null;
const followCenterPreviewEnabled = import.meta.env.VITE_FOLLOW_CENTER_PREVIEW === "true";
const FollowCenterPreview2029Page = followCenterPreviewEnabled
  ? lazy(() => import("./pages/FollowCenterPreview2029Page.jsx")) : null;
const integratedPreviewEnabled = import.meta.env.VITE_INTEGRATED_PREVIEW === "true";
const IntegratedPreview2029Page = integratedPreviewEnabled
  ? lazy(() => import("./pages/IntegratedPreview2029Page.jsx")) : null;
// Isolated, unlinked Books governance-review surface. Ordinary builds neither
// register nor import it; the existing /2029/control document route keeps the
// preview out of public navigation and avoids creating a production route.
const bookPublicationReviewPreviewEnabled = import.meta.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW === "true";
const BookPublicationReview2029Page = bookPublicationReviewPreviewEnabled
  ? lazy(() => import("./pages/BookPublicationReview2029Page.jsx")) : null;
const BentovFindingsProduct2029Page = bookPublicationReviewPreviewEnabled
  ? lazy(() => import("./pages/BentovFindingsProduct2029Page.jsx")) : null;
const BooksLibraryJourney2029Page = bookPublicationReviewPreviewEnabled
  ? lazy(() => import("./pages/BooksLibraryJourney2029Page.jsx")) : null;
const DaatTevunotTree2029Page = bookPublicationReviewPreviewEnabled
  ? lazy(() => import("./pages/DaatTevunotTree2029Page.jsx")) : null;
const AhavatTorahSystem2029Page = bookPublicationReviewPreviewEnabled
  ? lazy(() => import("./pages/AhavatTorahSystem2029Page.jsx")) : null;
const SeferYetzirahWorld2029Page = bookPublicationReviewPreviewEnabled
  ? lazy(() => import("./pages/SeferYetzirahWorld2029Page.jsx")) : null;

function Loading2029() { return <Opening2029 />; }

// Same telemetry owners as the legacy runtime; only the renderer/runtime boundary differs.
function RouteEffects2029() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (PUBLIC_READING_RELEASE || integratedPreviewEnabled || (kingdomPreviewEnabled && pathname === "/2029/kingdom")) return undefined;
    initGA();
    initMarketing();
    ensureIdentity();
    const stopWebVitals = startWebVitals2029();
    return () => { try { stopWebVitals?.(); } catch { /* observability never blocks runtime */ } };
  }, []);

  useEffect(() => {
    if (PUBLIC_READING_RELEASE || integratedPreviewEnabled || (kingdomPreviewEnabled && pathname === "/2029/kingdom")) return undefined;
    // Internal Control Plane is operational/admin traffic, not public product analytics.
    if (pathname.startsWith("/2029/control")) return undefined;
    const timer = setTimeout(() => {
      trackPageview(pathname);
      trackMarketingPageview();
    }, 350);
    // The reading release does not run visit telemetry. Keep its calendar/admin
    // dependencies out of that entry graph as well as skipping the operation.
    void import("./lib/visits.js").then(({ trackVisit }) => trackVisit(pathname)).catch(() => {});
    startPageEngagement(pathname);
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}

// A 2029 runtime never renders a legacy route inside the same React tree.
// Exact-return or an explicit navigation to a non-2029 URL crosses the document boundary instead.
function CanonicalBookAlias2029() {
  const { slug } = useParams();
  const location = useLocation();
  return <Navigate replace to={`${slug ? `/book/${encodeURIComponent(slug)}` : "/books"}${location.search}${location.hash}`} />;
}

function BooksEntry2029() {
  const { isAdmin, loading } = useAuth();
  if (PUBLIC_READING_RELEASE && (!isAdmin || loading)) return <PublicLibraryContinuity2029Page kind="books" />;
  return <Locked flag="lock_books" requireFlag allowAdminView homeHref="/2029"><Books2029Page /></Locked>;
}

function ElsAddressAlias2029() {
  const location = useLocation();
  return <Navigate replace to={`/code${location.search || ""}${location.hash || ""}`} />;
}

function LegacyDocumentHandoff() {
  const location = useLocation();
  const href = `${location.pathname}${location.search || ""}${location.hash || ""}`;
  const functionalPreview = import.meta.env.VITE_FUNCTIONAL_UNIFIED_PREVIEW === "true";
  useEffect(() => {
    if(!functionalPreview)window.location.assign(href);
  }, [href,functionalPreview]);
  if(functionalPreview)return <PublicContributorFrame2029 surface="community" title="העמוד באתר הוותיק" introVariant="none">
    <main dir="rtl" className="sod29-section"><h1>העמוד הזה זמין באתר הוותיק</h1>
      <p>אפשר להמשיך אליו או לחזור לבית.</p>
      <div className="sod29-actions"><a className="sod29-action" href={"https://sod1820.co.il"+href}>פתיחת העמוד באתר הוותיק</a><a className="sod29-action" href="/2029">חזרה לבית</a></div>
    </main>
  </PublicContributorFrame2029>;
  return <Loading2029 />;
}

function GematriaEntry2029() {
  const { search } = useLocation();
  // Existing shared result links retain their original result presentation.
  return parseCalculatorShareState(search).isShared
    ? <Calculator2029Page />
    : <CalculatorPro2029Page />;
}

function ControlEntry2029() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const reviewRequested = params.get("surface") === "books-publication-review";
  const findingsProductRequested = params.get("surface") === "bentov-findings-product";
  const libraryJourneyRequested = params.get("surface") === "books-library-journey";
  const daatTevunotTreeRequested = params.get("surface") === "daat-tevunot-tree";
  const ahavatTorahSystemRequested = params.get("surface") === "ahavat-torah-system";
  const seferYetzirahWorldRequested = params.get("surface") === "sefer-yetzirah-world";
  const unifiedBooksReaderRequested = params.get("surface") === "books-unified-reader";
  const slug = params.get("book") || "";
  if (bookPublicationReviewPreviewEnabled && unifiedBooksReaderRequested) {
    return <Books2029Page previewSlug={slug} />;
  }
  if (bookPublicationReviewPreviewEnabled && seferYetzirahWorldRequested && SeferYetzirahWorld2029Page) {
    return <SeferYetzirahWorld2029Page />;
  }
  if (bookPublicationReviewPreviewEnabled && ahavatTorahSystemRequested && AhavatTorahSystem2029Page) {
    return <AhavatTorahSystem2029Page />;
  }
  if (bookPublicationReviewPreviewEnabled && daatTevunotTreeRequested && DaatTevunotTree2029Page) {
    return <DaatTevunotTree2029Page />;
  }
  if (bookPublicationReviewPreviewEnabled && libraryJourneyRequested && BooksLibraryJourney2029Page) {
    return <BooksLibraryJourney2029Page />;
  }
  if (bookPublicationReviewPreviewEnabled && findingsProductRequested && BentovFindingsProduct2029Page) {
    return <BentovFindingsProduct2029Page />;
  }
  if (bookPublicationReviewPreviewEnabled && reviewRequested && BookPublicationReview2029Page) {
    return <BookPublicationReview2029Page key={slug} slug={slug} />;
  }
  return <ControlPlane2029Page />;
}

function FramedGate2029({ flag, surface, title, children }) {
  return <Locked flag={flag} requireFlag allowAdminView homeHref="/2029" renderBlocked={state =>
    <PublicContributorFrame2029 surface={surface} title={title} introVariant="compact"><FeatureClosedNotice state={state} title={title} to="/world" /></PublicContributorFrame2029>
  }>{children}</Locked>;
}

function PublicReadingBoundary({ children }) {
  const location = useLocation();
  const { isAdmin, loading } = useAuth();
  const continuation = PUBLIC_READING_RELEASE ? publicReadingContinuation(location.pathname, location.search, location.hash) : null;
  const state = PUBLIC_READING_RELEASE ? publicReadingPath(location.pathname, { isAdmin: !loading && isAdmin, search: location.search }) : null;
  if (continuation) return <Navigate replace to={continuation} />;
  const capability = PUBLIC_READING_RELEASE ? publicReadingCapability(location.pathname) : null;
  if (state === "closed" && capability) return <PublicContinuity2029Page kind="status" {...capability}
    links={capability.links.map(([href, label]) => [href === '/login' ? `/login?returnTo=${encodeURIComponent(location.pathname + location.search + location.hash)}` : href, label])} />;
  if (state === "closed") return <>
    {isAdmin && <aside role="status" className="sod29-card" data-admin-view="service-unavailable" dir="rtl">🔒 תצוגת מנהל · סגור לציבור. השירות באזור זה עדיין אינו זמין בגרסת הקריאה.</aside>}
    <PublicServices2029Page kind="launch-closed" />
  </>;
  if (state === "missing") return <PublicServices2029Page kind="not-found" />;
  if (state === "admin-view") return <div key={loading ? "loading" : "admin"}>
    <aside role="status" className="sod29-card" data-admin-view="full-access" dir="rtl">תצוגת מנהל · הכלים פתוחים עבורך. האזור סגור לציבור.</aside>
    {children}
  </div>;
  return children;
}

export default function App2029() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ResearchProvider>
          <RouteEffects2029 />
          {/* One temporary in-memory Raziel session is projected by both desktop and mobile chrome. */}
          <RazielSessionMount2029>
            <Suspense fallback={<Loading2029 />}>
              <PublicReadingBoundary><Routes>
              <Route path="/2029" element={<HomeEntry2029 />} />
              {publicFoundationPreview && <>
                <Route path="/" element={<PublicHomeEntry2029 />} />
                <Route path="/post" element={<Posts2029Page />} />
                <Route path="/number" element={<PublicServices2029Page kind="number-search" />} />
                <Route path="/number/:value" element={<Locked flag="lock_number" requireFlag homeHref="/2029"><NumberAddress2029Page /></Locked>} />
                <Route path="/gallery" element={<Locked flag="lock_world" homeHref="/2029"><Gallery2029Page /></Locked>} />
                <Route path="/gematria" element={<GematriaEntry2029 />} />
                <Route path="/tag/:slug" element={<PostsTaxonomy2029Page />} />
                <Route path="/category/:slug" element={<PostsTaxonomy2029Page />} />
                <Route path="/community" element={<Community2029Page />} />
                <Route path="/community/calculator" element={<CommunityCalculator2029Page />} />
                <Route path="/community/researchers" element={<PublicContinuity2029Page kind="people" />} />
                <Route path="/members" element={<PublicContinuity2029Page kind="people" />} />
                <Route path="/community/comments" element={<PublicContinuity2029Page kind="comments" />} />
                <Route path="/forum" element={<PublicContinuity2029Page kind="forum" />} />
                <Route path="/forum/:id" element={<PublicContinuity2029Page kind="forum" />} />
                <Route path="/or-geula" element={<PublicContinuity2029Page kind="or-geula" />} />
                <Route path="/or-geula/video/:id" element={<PublicContinuity2029Page kind="or-geula" />} />
                <Route path="/contact" element={<PublicContinuity2029Page kind="contact" />} />
                <Route path="/codes" element={<PublicLibraryContinuity2029Page kind="codes" />} />
                <Route path="/codes/:slug" element={<PublicLibraryContinuity2029Page kind="codes" />} />
                {["privacy", "unsubscribe", "updates", "map"].map(kind => <Route key={kind} path={`/${kind}`} element={<PublicServices2029Page kind={kind} />} />)}
                <Route path="/:slug" element={<PublicPostAddress2029Page />} />
              </>}
              {integratedPreviewEnabled && <Route path="/2029/preview" element={<IntegratedPreview2029Page />} />}
              {followCenterPreviewEnabled && <Route path="/2029/preview/follow-center" element={<PublicContributorFrame2029 surface="community" title="מרכז עדכונים" introVariant="none"><FollowCenterPreview2029Page /></PublicContributorFrame2029>} />}
              <Route path="/2029/home-preview" element={<HomePreview2029Page />} />
              <Route path="/melech-hamisparim/718" element={<Campaign718Page2029 />} />
              <Route path="/early-access" element={<EarlyAccess2029Page />} />
              {kingdomPreviewEnabled && <Route path="/2029/kingdom" element={<Kingdom2029Page />} />}
              <Route path="/2029/gematria" element={<GematriaEntry2029 />} />
              <Route path="/2029/gematria/viral" element={<Calculator2029Page />} />
              <Route path="/2029/calculator" element={<CalculatorPro2029Page />} />
              <Route
                path="/beit-midrash"
                element={<BeitMidrash2029Page />}
              />
              <Route
                path="/beit-midrash/:method"
                element={<BeitMidrash2029Page />}
              />
              <Route path="/world" element={<Locked flag="lock_world" homeHref="/2029"><WorldEntry2029 /></Locked>} />
              <Route path="/topic/:slug" element={<Locked flag="lock_world" homeHref="/2029"><Topic2029Page /></Locked>} />
              <Route path="/2029/posts" element={<Posts2029Page />} />
              {import.meta.env.VITE_FUNCTIONAL_UNIFIED_PREVIEW === "true" && <Route path="/posts" element={<Posts2029Page />} />}
              {(import.meta.env.VITE_FUNCTIONAL_UNIFIED_PREVIEW === "true" || PUBLIC_READING_RELEASE) && <Route path="/research" element={<GematriaEntry2029 />} />}
              <Route path="/login" element={<AuthPage />} />
              <Route path="/auth/callback" element={<OAuthCallback2029 />} />
              <Route path="/community/chat" element={<CommunityChatTransition2029Page />} />
              <Route path="/2029/journey" element={<FramedGate2029 flag="lock_life_journey" surface="journey" title="מסע החיים"><LifeJourney2029Page /></FramedGate2029>} />
              <Route path="/post/:slug" element={<PostEntry2029 />} />
              <Route path="/video/:assetId" element={<Video2029Page />} />
              <Route path="/books" element={<BooksEntry2029 />} />
              <Route path="/books/:slug" element={<CanonicalBookAlias2029 />} />
              <Route path="/book/:slug" element={<BooksEntry2029 />} />
              <Route path="/code" element={<FramedGate2029 flag="lock_els" surface="els" title="הצופן התנ״כי"><Els2029Page /></FramedGate2029>} />
              <Route path="/els" element={<ElsAddressAlias2029 />} />
              <Route path="/heichal" element={<Locked flag="lock_heichal" requireFlag allowAdminView homeHref="/2029"><Heichal2029Page /></Locked>} />
              <Route path="/היכל" element={<Locked flag="lock_heichal" requireFlag allowAdminView homeHref="/2029"><Heichal2029Page /></Locked>} />
              <Route path="/community/researcher/me" element={<PublicContributorFrame2029 surface="community" title="הדף שלי" introVariant="none"><WriterMe2029Redirect /></PublicContributorFrame2029>} />
              <Route path="/2029/me/:module" element={<PublicContributorFrame2029 surface="community" title="האזור האישי" introVariant="none"><WriterPersonal2029Page /></PublicContributorFrame2029>} />
              <Route path="/community/researcher/:slug" element={<PublicContributorFrame2029 surface="community" title="דף כותב" introVariant="none"><PublicContributor2029Page /></PublicContributorFrame2029>} />
              <Route path="/researcher/:slug" element={<Locked flag="lock_world" homeHref="/2029"><Researcher2029Page /></Locked>} />
              <Route path="/2029/number/:value" element={<Locked flag="lock_number" requireFlag homeHref="/2029">{publicFoundationPreview ? <NumberAddress2029Page /> : <Number2029Page />}</Locked>} />
              <Route path="/entity-hub-preview/:type/:key" element={<EntityHubPreviewPage />} />
              <Route path="/2029/control" element={<ControlEntry2029 />} />
              <Route path="*" element={publicFoundationPreview ? <PublicServices2029Page kind="not-found" /> : <LegacyDocumentHandoff />} />
              </Routes></PublicReadingBoundary>
            </Suspense>
          </RazielSessionMount2029>
        </ResearchProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
