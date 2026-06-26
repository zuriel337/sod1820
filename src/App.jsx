import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { applySeo } from "./lib/seo.js";
import { ROUTE_META } from "./routes.jsx";
import { initGA, trackPageview } from "./lib/analytics.js";
import { initMarketing, trackMarketingPageview } from "./lib/marketing.js";
import { trackVisit } from "./lib/visits.js";
import { initAppInstallTracking } from "./lib/tracking.js";
import { Analytics } from "@vercel/analytics/react";

import Layout from "./components/layout/Layout.jsx";
import { AuthProvider } from "./lib/AuthContext.jsx";
import UpdateBanner from "./components/UpdateBanner.jsx";
const OnboardingRitual = React.lazy(() => import("./components/OnboardingRitual.jsx"));

// ── דפים שנטענים מיד (landing + עמודי תוכן שאליהם מגיעים מגוגל = LCP חשוב) ──
import HomeNewPage from "./pages/HomeNewPage.jsx";
import BeitMidrashPage from "./pages/BeitMidrashPage.jsx";
const EntityPage = React.lazy(() => import("./pages/EntityPage.jsx"));
import TopicPage from "./pages/TopicPage.jsx";
import PostsPage from "./pages/PostsPage.jsx";
import { TagPage, CategoryPage } from "./pages/TaxonomyPage.jsx";
import {
  MembersPage, CommunityPage,
  CommunityCalculatorPage, CommunityCommentsPage, MethodPage,
} from "./pages/placeholders.jsx";
import {
  PostBySlugRoute, GematriaRoute,
  LoginRoute, ContactRoute, SpotimChatRoute,
  TrafficRoute, NumbersReportRoute,
} from "./pages/legacyRoutes.jsx";

// ── טעינה עצלה (code-splitting) — מקטין דרמטית את החבילה הראשונית ──
// כל דף נטען רק כשנכנסים אליו. שיפור ישיר ל-Core Web Vitals (מהירות בנייד).
const HomePage = React.lazy(() => import("./pages/HomePage.jsx"));
const AuthPage = React.lazy(() => import("./pages/AuthPage.jsx"));
const ProfilePage = React.lazy(() => import("./pages/ProfilePage.jsx"));
const StartHerePage = React.lazy(() => import("./pages/StartHerePage.jsx"));
const NavigationCenterPage = React.lazy(() => import("./pages/NavigationCenterPage.jsx"));
const NumbersPage = React.lazy(() => import("./pages/NumbersPage.jsx"));
const CodePage = React.lazy(() => import("./pages/CodePage.jsx"));
const ThemePreviewPage = React.lazy(() => import("./pages/ThemePreviewPage.jsx"));
const TimelinePage = React.lazy(() => import("./pages/TimelinePage.jsx"));
const NumberSearchPage = React.lazy(() => import("./pages/NumberSearchPage.jsx"));
const NamePage = React.lazy(() => import("./pages/NamePage.jsx"));
const ArchivePage = React.lazy(() => import("./pages/ArchivePage.jsx"));
const VerifiedPostsPage = React.lazy(() => import("./pages/VerifiedPostsPage.jsx"));
const CrossMethodPage = React.lazy(() => import("./pages/CrossMethodPage.jsx"));
const JourneyPage = React.lazy(() => import("./pages/JourneyPage.jsx"));
const LaddersDemo = React.lazy(() => import("./pages/LaddersDemo.jsx"));
const GalleryPage = React.lazy(() => import("./pages/GalleryPage.jsx"));
const AdminPage = React.lazy(() => import("./pages/AdminPage.jsx"));
const LabIndex = React.lazy(() => import("./pages/LabIndex.jsx"));
const ConvergenceGalaxy = React.lazy(() => import("./components/ConvergenceGalaxy.jsx"));
// מסכים מלאים כבדים (three.js / קנבס) — נטענים עצמאית
const HeichalPage = React.lazy(() => import("./pages/HeichalPage.jsx"));
const GalaxyPage = React.lazy(() => import("./pages/GalaxyPage.jsx"));
const GalaxyRoom = React.lazy(() => import("./pages/GalaxyRoom.jsx"));
const ExperiencePage = React.lazy(() => import("./pages/ExperiencePage.jsx"));
const GematriaRevealPage = React.lazy(() => import("./pages/GematriaRevealPage.jsx"));
const RoomsExperience = React.lazy(() => import("./pages/RoomsExperience.jsx"));
const RoomEnter = React.lazy(() => import("./pages/RoomEnter.jsx"));
const HintRoomPage = React.lazy(() => import("./pages/HintRoomPage.jsx"));

// ניהול SEO + גלילה לראש בכל מעבר route.
// דפי תוכן דינמיים (פוסט/קטגוריה/תגית/מספר) מגדירים SEO משלהם בעת טעינה.
function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => { initGA(); initMarketing(); initAppInstallTracking(); }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    const meta = ROUTE_META[pathname];
    if (meta) applySeo({ ...meta, path: pathname });
    // משהים מעט: כך דפים שמגדירים כותרת בעצמם (כולל אסינכרוני) מספיקים לעדכן
    // את document.title לפני ש-GA שולח את ה-page_view — מונע ייחוס לכותרת הקודמת.
    const t = setTimeout(() => { trackPageview(pathname); trackMarketingPageview(); }, 350);
    trackVisit(pathname);   // מד-כניסות פנימי (SOD1820) — נאסף ישירות אלינו
    return () => clearTimeout(t);
  }, [pathname]);
  return null;
}

// טקס הכניסה — אוטומטי למבקר חדש (פעם אחת) בעמוד הבית בלבד (לא חוטף דיפ-לינקים).
// תמיד נגיש דרך /enter וכפתור "כאן מתחילים".
function OnboardingGate() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [show, setShow] = React.useState(false);
  useEffect(() => {
    if (pathname !== "/") return;
    try { if (localStorage.getItem("sod_onboarded")) return; } catch { return; }
    setShow(true);
  }, []);  // פעם אחת בעליית האפליקציה
  if (!show) return null;
  return (
    <React.Suspense fallback={null}>
      <OnboardingRitual onDone={() => { setShow(false); navigate("/"); }} />
    </React.Suspense>
  );
}

// עמוד /enter — טקס הכניסה כעמוד מלא (תמיד נגיש, גם למשתמש חוזר).
function EnterRoute() {
  const navigate = useNavigate();
  return (
    <React.Suspense fallback={<div style={{ position: "fixed", inset: 0, background: "#05060A" }} />}>
      <OnboardingRitual onDone={() => navigate("/")} />
    </React.Suspense>
  );
}

// מחשבון יחיד — /גימטריה ו-/gematria מובילים למחשבון הקנוני בבית המדרש (עץ אחד, בלי כפילות).
// משמרים seed: /gematria?w=דוד → /beit-midrash?tab=calc&w=דוד
function GematriaToBeitMidrash() {
  const { search } = useLocation();
  const p = new URLSearchParams(search);
  const w = p.get("w") || p.get("calc");
  return <Navigate to={`/beit-midrash?tab=calc${w ? `&w=${encodeURIComponent(w)}` : ""}`} replace />;
}

export default function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
        <RouteEffects />
        <OnboardingGate />
        <Analytics />
        <UpdateBanner />
        <React.Suspense fallback={<div style={{ position: "fixed", inset: 0, background: "#05030d" }} />}>
        <Routes>
          {/* דף ניסיון — מסך מלא, ללא Layout (בלי ניווט/פוטר); נטען עצמאית (three.js) */}
          {/* טקס הכניסה — עמוד מלא, תמיד נגיש */}
          <Route path="/enter" element={<EnterRoute />} />
          <Route path="/ניסיון" element={<ExperiencePage />} />
          <Route path="/experience" element={<ExperiencePage />} />
          <Route path="/חישוב" element={<GematriaRevealPage />} />
          <Route path="/sulamot5" element={<RoomsExperience mode={5} />} />
          <Route path="/sulamot6" element={<RoomsExperience mode={6} />} />
          <Route path="/sulamot7" element={<RoomsExperience mode={7} />} />
          <Route path="/sulamot8" element={<RoomsExperience mode={8} />} />
          <Route path="/sulamot9" element={<RoomsExperience mode={9} />} />
          <Route path="/sulamot10" element={<RoomsExperience mode={10} />} />
          <Route path="/sulamot11" element={<RoomEnter />} />
          <Route path="/cheder/:n" element={<HintRoomPage />} />
          <Route path="/reveal" element={<GematriaRevealPage />} />
          {/* היכל השערים — חוויה מלאה (מסך מלא, מעבר חדר-לחדר) */}
          <Route path="/היכל" element={<HeichalPage />} />
          <Route path="/heichal" element={<HeichalPage />} />
          {/* גלקסיות — namespace מערכתי קבוע למסך-מלא (מדור לכל סלאג) */}
          <Route path="/galaxy" element={<GalaxyRoom />} />
          <Route path="/galaxy/:slug" element={<GalaxyPage />} />
          <Route element={<Layout />}>
          <Route path="/" element={<HomeNewPage />} />
          <Route path="/home-classic" element={<HomePage />} />
          <Route path="/start" element={<StartHerePage />} />
          <Route path="/map" element={<NavigationCenterPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/numbers" element={<NumbersPage />} />
          <Route path="/code" element={<CodePage />} />
          <Route path="/beit-midrash" element={<BeitMidrashPage />} />
          <Route path="/beit-midrash/:method" element={<MethodPage />} />
          <Route path="/post" element={<PostsPage />} />
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/gallery-updates" element={<Navigate to="/archive" replace />} />
          <Route path="/verified" element={<VerifiedPostsPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/community/chat" element={<SpotimChatRoute />} />
          <Route path="/community/calculator" element={<CommunityCalculatorPage />} />
          <Route path="/community/comments" element={<CommunityCommentsPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/about" element={<Navigate to="/contact" replace />} />
          <Route path="/contact" element={<ContactRoute />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/traffic" element={<TrafficRoute />} />
          <Route path="/numbers-report" element={<NumbersReportRoute />} />
          <Route path="/theme-preview" element={<ThemePreviewPage />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/tag/:slug" element={<TagPage />} />
          <Route path="/number" element={<NumberSearchPage />} />
          <Route path="/name" element={<NamePage />} />
          <Route path="/שם" element={<NamePage />} />
          <Route path="/number/:phrase" element={<EntityPage />} />
          <Route path="/topic/:slug" element={<TopicPage />} />
          {/* ניסוי — מחשבון גימטריה לבן + קיר חי (לא בתפריט) */}
          <Route path="/gematria" element={<GematriaToBeitMidrash />} />
          <Route path="/גימטריה" element={<GematriaToBeitMidrash />} />
          {/* תצוגה מקדימה — דף בית חדש (לא מחליף את הקיים) */}
          <Route path="/home-new" element={<HomeNewPage />} />
          <Route path="/בית-חדש" element={<HomeNewPage />} />
          <Route path="/cross" element={<CrossMethodPage />} />
          <Route path="/הצלבה" element={<CrossMethodPage />} />
          <Route path="/journey" element={<JourneyPage />} />
          <Route path="/מסע" element={<JourneyPage />} />
          <Route path="/lab" element={<LabIndex />} />
          <Route path="/sulamot" element={<LaddersDemo />} />
          <Route path="/sulamot2" element={<ConvergenceGalaxy level={2} />} />
          <Route path="/sulamot3" element={<ConvergenceGalaxy level={3} />} />
          <Route path="/sulamot4" element={<ConvergenceGalaxy level={4} />} />

          {/* הפניות מכתובות ישנות (שמירת קישורים) */}
          <Route path="/פוסטים-אחרונים-2" element={<Navigate to="/post" replace />} />
          <Route path="/פוסטים-אחרונים" element={<Navigate to="/post" replace />} />
          <Route path="/צור-קשר" element={<Navigate to="/contact" replace />} />
          <Route path="/דף-צאט-ראשי" element={<Navigate to="/community/chat" replace />} />
          <Route path="/chat" element={<Navigate to="/community/chat" replace />} />

          {/* קנוני: כתובת שורש = סלאג של פוסט (1,200 פוסטים מאונדקסים) */}
          <Route path="/:slug" element={<PostBySlugRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
        </Routes>
        </React.Suspense>
    </BrowserRouter>
    </AuthProvider>
  );
}
