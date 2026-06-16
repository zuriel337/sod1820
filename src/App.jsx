import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { applySeo } from "./lib/seo.js";
import { ROUTE_META } from "./routes.jsx";
import { initGA, trackPageview } from "./lib/analytics.js";
import { Analytics } from "@vercel/analytics/react";

import Layout from "./components/layout/Layout.jsx";
import HomePage from "./pages/HomePage.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import { AuthProvider } from "./lib/AuthContext.jsx";
import StartHerePage from "./pages/StartHerePage.jsx";
import NavigationCenterPage from "./pages/NavigationCenterPage.jsx";
import NumbersPage from "./pages/NumbersPage.jsx";
import CodePage from "./pages/CodePage.jsx";
import ThemePreviewPage from "./pages/ThemePreviewPage.jsx";
import TimelinePage from "./pages/TimelinePage.jsx";
import BeitMidrashPage from "./pages/BeitMidrashPage.jsx";
import EntityPage from "./pages/EntityPage.jsx";
import ArchivePage from "./pages/ArchivePage.jsx";
import VerifiedPostsPage from "./pages/VerifiedPostsPage.jsx";
import CrossMethodPage from "./pages/CrossMethodPage.jsx";
import JourneyPage from "./pages/JourneyPage.jsx";
import LaddersDemo from "./pages/LaddersDemo.jsx";
const ExperiencePage = React.lazy(() => import("./pages/ExperiencePage.jsx"));
const GematriaRevealPage = React.lazy(() => import("./pages/GematriaRevealPage.jsx"));
const RoomsExperience = React.lazy(() => import("./pages/RoomsExperience.jsx"));
import {
  MembersPage, CommunityPage,
  CommunityCalculatorPage, CommunityCommentsPage, MethodPage,
} from "./pages/placeholders.jsx";
import {
  PostBySlugRoute, GematriaRoute,
  LoginRoute, ContactRoute, SpotimChatRoute,
  TrafficRoute, NumbersReportRoute,
} from "./pages/legacyRoutes.jsx";
import { TagPage, CategoryPage } from "./pages/TaxonomyPage.jsx";
import PostsPage from "./pages/PostsPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import TopicPage from "./pages/TopicPage.jsx";
import ConvergenceGalaxy from "./components/ConvergenceGalaxy.jsx";

// ניהול SEO + גלילה לראש בכל מעבר route.
// דפי תוכן דינמיים (פוסט/קטגוריה/תגית/מספר) מגדירים SEO משלהם בעת טעינה.
function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => { initGA(); }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    const meta = ROUTE_META[pathname];
    if (meta) applySeo({ ...meta, path: pathname });
    // משהים מעט: כך דפים שמגדירים כותרת בעצמם (כולל אסינכרוני) מספיקים לעדכן
    // את document.title לפני ש-GA שולח את ה-page_view — מונע ייחוס לכותרת הקודמת.
    const t = setTimeout(() => trackPageview(pathname), 350);
    return () => clearTimeout(t);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
        <RouteEffects />
        <Analytics />
        <Routes>
          {/* דף ניסיון — מסך מלא, ללא Layout (בלי ניווט/פוטר); נטען עצמאית (three.js) */}
          <Route path="/ניסיון" element={<React.Suspense fallback={<div style={{ position: "fixed", inset: 0, background: "#05030d" }} />}><ExperiencePage /></React.Suspense>} />
          <Route path="/experience" element={<React.Suspense fallback={<div style={{ position: "fixed", inset: 0, background: "#05030d" }} />}><ExperiencePage /></React.Suspense>} />
          <Route path="/חישוב" element={<React.Suspense fallback={<div style={{ position: "fixed", inset: 0, background: "#05030d" }} />}><GematriaRevealPage /></React.Suspense>} />
          <Route path="/sulamot5" element={<React.Suspense fallback={<div style={{ position: "fixed", inset: 0, background: "#05030d" }} />}><RoomsExperience mode={5} /></React.Suspense>} />
          <Route path="/sulamot6" element={<React.Suspense fallback={<div style={{ position: "fixed", inset: 0, background: "#05030d" }} />}><RoomsExperience mode={6} /></React.Suspense>} />
          <Route path="/sulamot7" element={<React.Suspense fallback={<div style={{ position: "fixed", inset: 0, background: "#05030d" }} />}><RoomsExperience mode={7} /></React.Suspense>} />
          <Route path="/sulamot8" element={<React.Suspense fallback={<div style={{ position: "fixed", inset: 0, background: "#05030d" }} />}><RoomsExperience mode={8} /></React.Suspense>} />
          <Route path="/sulamot9" element={<React.Suspense fallback={<div style={{ position: "fixed", inset: 0, background: "#05030d" }} />}><RoomsExperience mode={9} /></React.Suspense>} />
          <Route path="/sulamot10" element={<React.Suspense fallback={<div style={{ position: "fixed", inset: 0, background: "#05030d" }} />}><RoomsExperience mode={10} /></React.Suspense>} />
          <Route path="/reveal" element={<React.Suspense fallback={<div style={{ position: "fixed", inset: 0, background: "#05030d" }} />}><GematriaRevealPage /></React.Suspense>} />
          <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/start" element={<StartHerePage />} />
          <Route path="/map" element={<NavigationCenterPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/numbers" element={<NumbersPage />} />
          <Route path="/code" element={<CodePage />} />
          <Route path="/beit-midrash" element={<BeitMidrashPage />} />
          <Route path="/beit-midrash/:method" element={<MethodPage />} />
          <Route path="/post" element={<PostsPage />} />
          <Route path="/archive" element={<ArchivePage />} />
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
          <Route path="/number/:phrase" element={<EntityPage />} />
          <Route path="/topic/:slug" element={<TopicPage />} />
          <Route path="/cross" element={<CrossMethodPage />} />
          <Route path="/הצלבה" element={<CrossMethodPage />} />
          <Route path="/journey" element={<JourneyPage />} />
          <Route path="/מסע" element={<JourneyPage />} />
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
    </BrowserRouter>
    </AuthProvider>
  );
}
