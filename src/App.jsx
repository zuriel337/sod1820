import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { applySeo } from "./lib/seo.js";
import { ROUTE_META } from "./routes.jsx";

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
import LaddersDemo from "./pages/LaddersDemo.jsx";
import {
  MembersPage, CommunityPage,
  CommunityCalculatorPage, CommunityCommentsPage, MethodPage,
} from "./pages/placeholders.jsx";
import {
  PostsRoute, PostBySlugRoute, GematriaRoute,
  AboutRoute, LoginRoute, ContactRoute, ChatRoute,
  TrafficRoute, NumbersReportRoute, AdminRoute,
} from "./pages/legacyRoutes.jsx";
import { TagPage, CategoryPage } from "./pages/TaxonomyPage.jsx";

// ניהול SEO + גלילה לראש בכל מעבר route.
// דפי תוכן דינמיים (פוסט/קטגוריה/תגית/מספר) מגדירים SEO משלהם בעת טעינה.
function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    const meta = ROUTE_META[pathname];
    if (meta) applySeo({ ...meta, path: pathname });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
        <RouteEffects />
        <Routes>
          <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/start" element={<StartHerePage />} />
          <Route path="/map" element={<NavigationCenterPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/numbers" element={<NumbersPage />} />
          <Route path="/code" element={<CodePage />} />
          <Route path="/beit-midrash" element={<BeitMidrashPage />} />
          <Route path="/beit-midrash/:method" element={<MethodPage />} />
          <Route path="/post" element={<PostsRoute />} />
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/community/chat" element={<ChatRoute />} />
          <Route path="/community/calculator" element={<CommunityCalculatorPage />} />
          <Route path="/community/comments" element={<CommunityCommentsPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/about" element={<AboutRoute />} />
          <Route path="/contact" element={<ContactRoute />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminRoute />} />
          <Route path="/traffic" element={<TrafficRoute />} />
          <Route path="/numbers-report" element={<NumbersReportRoute />} />
          <Route path="/theme-preview" element={<ThemePreviewPage />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/tag/:slug" element={<TagPage />} />
          <Route path="/number/:phrase" element={<EntityPage />} />
          <Route path="/sulamot" element={<LaddersDemo />} />

          {/* הפניות מכתובות ישנות (שמירת קישורים) */}
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
