import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { applySeo } from "./lib/seo.js";
import { ROUTE_META } from "./routes.jsx";
import { initGA, trackPageview } from "./lib/analytics.js";
import { initMarketing, trackMarketingPageview } from "./lib/marketing.js";
import { trackVisit } from "./lib/visits.js";
import { initAppInstallTracking, captureArrivalSource } from "./lib/tracking.js";
import { initInstall } from "./lib/install.js";
import { captureArrival, captureRef } from "./lib/propagation.js";
import { initClarity } from "./lib/clarity.js";
import { startPresence, updatePresence } from "./lib/presence.js";
import { useAuth } from "./lib/AuthContext.jsx";
import RoyalShareWidget from "./components/RoyalShareWidget.jsx";
import LabDock from "./components/hub/LabDock.jsx";
import InstallPrompt from "./components/InstallPrompt.jsx";
import UpdatesBar from "./components/UpdatesBar.jsx";
import SitePromoPopup from "./components/SitePromoPopup.jsx";
import { Analytics } from "@vercel/analytics/react";

import Layout from "./components/layout/Layout.jsx";
import { AuthProvider } from "./lib/AuthContext.jsx";
import { useStream } from "./lib/stream.js";
import UpdateBanner from "./components/UpdateBanner.jsx";
import Locked from "./components/MaintenanceLock.jsx";
const OnboardingRitual = React.lazy(() => import("./components/OnboardingRitual.jsx"));

// ── דפים שנטענים מיד (landing + עמודי תוכן שאליהם מגיעים מגוגל = LCP חשוב) ──
import HomeNewPage from "./pages/HomeNewPage.jsx";
import ResearchProvider from "./lib/research/ResearchProvider.jsx";
import { UserCenterProvider } from "./lib/userCenter/UserCenterContext.jsx";
import UserCenter from "./components/userCenter/UserCenter.jsx";
import AiQuotaToast from "./components/AiQuotaToast.jsx";
import ProfileNudge from "./components/ProfileNudge.jsx";
import ResearchPage from "./pages/ResearchPage.jsx";
const EntityPage = React.lazy(() => import("./pages/EntityPage.jsx"));
import TopicPage from "./pages/TopicPage.jsx";
import PostsPage from "./pages/PostsPage.jsx";
import { TagPage, CategoryPage } from "./pages/TaxonomyPage.jsx";
import {
  MembersPage, CommunityPage,
  CommunityCommentsPage, MethodPage,
} from "./pages/placeholders.jsx";
import CommunityCalculatorPage from "./pages/CommunityCalculatorPage.jsx";
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
const PrivacyPage = React.lazy(() => import("./pages/PrivacyPage.jsx"));
const UnsubscribePage = React.lazy(() => import("./pages/UnsubscribePage.jsx"));
const JoinPage = React.lazy(() => import("./pages/JoinPage.jsx"));
const WelcomePage = React.lazy(() => import("./pages/WelcomePage.jsx"));
const NavigationCenterPage = React.lazy(() => import("./pages/NavigationCenterPage.jsx"));
const NumbersPage = React.lazy(() => import("./pages/NumbersPage.jsx"));
const NameLabPage = React.lazy(() => import("./pages/NameLabPage.jsx"));
const CodePage = React.lazy(() => import("./pages/CodePage.jsx"));
const ForumPage = React.lazy(() => import("./pages/ForumPage.jsx"));
const ForumThreadPage = React.lazy(() => import("./pages/ForumThreadPage.jsx"));
const CodeArchivePage = React.lazy(() => import("./pages/CodeArchivePage.jsx"));
const CipherPage = React.lazy(() => import("./pages/CipherPage.jsx"));
const CiphersLibraryPage = React.lazy(() => import("./pages/CiphersLibraryPage.jsx"));
const ResearchCodesPage = React.lazy(() => import("./pages/ResearchCodesPage.jsx"));
const BeitMidrashPage = React.lazy(() => import("./pages/BeitMidrashPage.jsx"));
const HomeReality = React.lazy(() => import("./pages/HomeReality.jsx"));
const StreamGate = React.lazy(() => import("./pages/StreamGate.jsx"));
const ThemePreviewPage = React.lazy(() => import("./pages/ThemePreviewPage.jsx"));
const TimelinePage = React.lazy(() => import("./pages/TimelinePage.jsx"));
const NumberSearchPage = React.lazy(() => import("./pages/NumberSearchPage.jsx"));
const NamePage = React.lazy(() => import("./pages/NamePage.jsx"));
const ArchivePage = React.lazy(() => import("./pages/ArchivePage.jsx"));
const VerifiedPostsPage = React.lazy(() => import("./pages/VerifiedPostsPage.jsx"));
const CrossMethodPage = React.lazy(() => import("./pages/CrossMethodPage.jsx"));
const VerseGematriaPage = React.lazy(() => import("./pages/VerseGematriaPage.jsx"));
const BroadcastsPage = React.lazy(() => import("./pages/BroadcastsPage.jsx"));
const SiteUpdatesPage = React.lazy(() => import("./pages/SiteUpdatesPage.jsx"));
const JourneyPage = React.lazy(() => import("./pages/JourneyPage.jsx"));
const JourneyPageV2 = React.lazy(() => import("./pages/JourneyPageV2.jsx")); // 🧪 גרסה-2 ניסיונית (נגן-אוטומטי/שם-ראשון/דופק) — /journey-beta, מגן-קרדיט פעיל
const LaddersDemo = React.lazy(() => import("./pages/LaddersDemo.jsx"));
const GalleryPage = React.lazy(() => import("./pages/GalleryPage.jsx"));
const AdminPage = React.lazy(() => import("./pages/AdminPage.jsx"));
const PostEditorPage = React.lazy(() => import("./pages/PostEditorPage.jsx"));
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
const LanguagesPage = React.lazy(() => import("./pages/LanguagesPage.jsx"));
const ContributorPage = React.lazy(() => import("./pages/ContributorPage.jsx"));
const ResearchersIndexPage = React.lazy(() => import("./pages/ResearchersIndexPage.jsx"));
// 🧪 מעבדה להבנת משמעות — דף עצמאי חבוי (מחוץ ל-Layout, לא בתפריט, לא מאונדקס). שכבה מבודדת lab_*.
const MeaningLabPage = React.lazy(() => import("./pages/MeaningLabPage.jsx"));

// ניהול SEO + גלילה לראש בכל מעבר route.
// דפי תוכן דינמיים (פוסט/קטגוריה/תגית/מספר) מגדירים SEO משלהם בעת טעינה.
function RouteEffects() {
  const { pathname, search } = useLocation();
  // 🔬 פילוח-מעבדה: שומרים את הכלי הפעיל (?tool=) בנתיב הנמדד, כך שכל כלי-מעבדה
  // נספר בנפרד ("/research?tool=midrash" · "…=els" · "…=gematria") ולא קורס ל-"/research" אחד.
  // כך גם כשהכל עובר תחת המעבדה — לא מאבדים את הפילוח לפי כלי.
  const labTool = pathname === "/research" ? new URLSearchParams(search).get("tool") : null;
  const trackPath = labTool ? `/research?tool=${labTool}` : pathname;
  const { user } = useAuth();
  useEffect(() => { initGA(); initMarketing(); initAppInstallTracking(); initInstall(); captureArrival(); captureRef(); captureArrivalSource(); initClarity(); }, []);
  // 🟢 נוכחות חיה — כל דפדפן פתוח מצטרף לערוץ אחד; מדווח uid (למחובר) + נתיב נוכחי.
  useEffect(() => { startPresence({ uid: user?.id || null, path: pathname }); }, [user?.id]);
  useEffect(() => { updatePresence({ uid: user?.id || null, path: pathname }); }, [pathname, user?.id]);
  useEffect(() => {
    // ⚓ ניווט עם עוגן (#one-tree וכד') — גוללים אל האלמנט אחרי שהדף נטען; אחרת לראש הדף.
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash && hash.length > 1) {
      let tries = 0;
      const tryScroll = () => {
        const el = document.getElementById(decodeURIComponent(hash.slice(1)));
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        else if (++tries < 20) setTimeout(tryScroll, 150);   // מחכים לרינדור אסינכרוני (עד ~3ש')
      };
      setTimeout(tryScroll, 120);
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
    const meta = ROUTE_META[pathname];
    if (meta) applySeo({ ...meta, path: pathname });
    // משהים מעט: כך דפים שמגדירים כותרת בעצמם (כולל אסינכרוני) מספיקים לעדכן
    // את document.title לפני ש-GA שולח את ה-page_view — מונע ייחוס לכותרת הקודמת.
    const t = setTimeout(() => { trackPageview(pathname); trackMarketingPageview(); }, 350);
    return () => clearTimeout(t);
  }, [pathname]);
  // מד-הכניסות הפנימי — אפקט נפרד על trackPath, כדי שייספר גם מעבר-בין-כלים במעבדה (שינוי ?tool=).
  useEffect(() => { trackVisit(trackPath); }, [trackPath]);
  return null;
}

// טקס הכניסה — אוטומטי למבקר חדש (פעם אחת) בעמוד הבית בלבד (לא חוטף דיפ-לינקים).
// תמיד נגיש דרך /enter וכפתור "כאן מתחילים".
// PARKED — דף הפתיחה האוטומטי כבוי בכוונה: מוקדם מדי להעמיס מערכת על טראפיק קר.
// הטקס נשאר נגיש ב-/enter (לא נכפה). להפעלה מחדש בעתיד (מסלולים יעודיים + פרסום):
// ראה work_log 'PARKED: מערכת השערים' ו-git history.
function OnboardingGate() { return null; }

// עמוד /enter — טקס הכניסה כעמוד מלא (תמיד נגיש, גם למשתמש חוזר).
function EnterRoute() {
  const navigate = useNavigate();
  return (
    <React.Suspense fallback={<div style={{ position: "fixed", inset: 0, background: "#05060A" }} />}>
      <OnboardingRitual onDone={() => navigate("/")} />
    </React.Suspense>
  );
}

// מחשבון יחיד (עץ אחד) — כל הקיצורים מובילים למחשבון הקנוני *במעבדה* (כלי 🧮).
// משמרים seed: /gematria?w=דוד → /research?tool=gematria&q=דוד
function GematriaToLab() {
  const { search } = useLocation();
  const p = new URLSearchParams(search);
  const w = p.get("w") || p.get("calc");
  return <Navigate to={`/research?tool=gematria${w ? `&q=${encodeURIComponent(w)}` : ""}`} replace />;
}

// בית-המדרש חי *בתוך* המעבדה (workspace_layout_standard) → כל כניסה ל-/beit-midrash
// נכנסת לשלד-המחקר. כוונת-מחשבון (tab=calc / w / n) → המחשבון האחד (כלי 🧮);
// אחרת → כלי 📖 בית-המדרש, עם שימור טאב-המדור אם נמסר. /beit-midrash נשאר כ-alias.
function BeitMidrashToLab() {
  const { search } = useLocation();
  const p = new URLSearchParams(search);
  const w = p.get("w") || p.get("calc");
  const n = p.get("n");
  const tab = p.get("tab");
  // כוונת-מחשבון (tab=calc / w / n) → המחשבון של בית-המדרש (בתוך המעבדה), עם שימור המילה.
  if (tab === "calc" || w || n) {
    const qs = [w ? `w=${encodeURIComponent(w)}` : "", n ? `n=${encodeURIComponent(n)}` : ""].filter(Boolean).join("&");
    return <Navigate to={`/research?tool=midrash&tab=calc${qs ? `&${qs}` : ""}`} replace />;
  }
  const valid = ["searches", "convergence", "crosses", "community", "submit", "methods", "verified", "sod1820"];
  return <Navigate to={`/research?tool=midrash${tab && valid.includes(tab) ? `&tab=${tab}` : ""}`} replace />;
}

// דף הבית ב-/ מתחלף לפי הזרם (root-swap): reality → בית-הקוד; אחרת → בית-המלוכה.
// ברירת מחדל (אין בחירה) = מלוכה, כך שציבור תמיד מקבל את בית-המלוכה.
function HomeRoute() {
  const stream = useStream();
  return stream === "reality" ? <HomeReality /> : <HomeNewPage />;
}

// 🔀 הפניות צד-לקוח לסלאגים ישנים/שבורים (גוגל) → יעד חדש. מפענח מפורשות (decodeURIComponent)
// כך שזה תופס גם כתובות עבריות מקודדות (%D7%…) — מה ש-Vercel redirects לא תמיד תופס.
const LEGACY_REDIRECTS = {
  "/משיח-בשנת-התשעו": "/code",
};
function LegacyRedirect() {
  const { pathname } = useLocation();
  let p = pathname;
  try { p = decodeURIComponent(pathname); } catch { /* ignore */ }
  p = p.replace(/\/+$/, "") || "/";
  const dest = LEGACY_REDIRECTS[p];
  return dest ? <Navigate to={dest} replace /> : null;
}

// 🔬 הצ'רום הצף הגלובלי (כפתור «שמע», פסי עדכון, באנרים) מוסתר בסביבת המחקר
// (/research) כדי שהמסך יישאר נקי לגמרי. האפקטים (אנליטיקס/הפניות) ממשיכים לרוץ.
function GlobalChrome({ children }) {
  const { pathname } = useLocation();
  // 🔬 מוסתר בסביבת המחקר (/research) ובדף הדילוגים (/code) — מסך נקי לגמרי לכלי במסך-מלא.
  if (pathname === "/research" || /^\/code(\/|$)/.test(pathname)) return null;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
        <ResearchProvider>
        <UserCenterProvider>
        <RouteEffects />
        <LegacyRedirect />
        <OnboardingGate />
        <Analytics />
        <GlobalChrome>
          <UpdateBanner />
          <SitePromoPopup />
          <RoyalShareWidget />
          {/* הוסר זמנית לבקשת צוריאל — נחזיר כשיחליט. <LabDock /> */}
          <InstallPrompt />
          {/* הוסר לבקשת צוריאל — בלי פוש «התראות דפדפן / הירשם לעדכונים» (בועת ימין בדסקטופ) */}
          {/* <UpdatesBar /> */}
        </GlobalChrome>
        <React.Suspense fallback={<div style={{ position: "fixed", inset: 0, background: "#0C0818" }} />}>
        <Routes>
          {/* דף ניסיון — מסך מלא, ללא Layout (בלי ניווט/פוטר); נטען עצמאית (three.js) */}
          {/* טקס הכניסה — עמוד מלא, תמיד נגיש */}
          <Route path="/enter" element={<EnterRoute />} />
          {/* שער הזרם — מסך מלא, מגודר לאדמין (StreamGate מפנה ציבור ל-/) */}
          <Route path="/stream" element={<React.Suspense fallback={<div style={{ position: "fixed", inset: 0, background: "#05060A" }} />}><StreamGate /></React.Suspense>} />
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
          {/* 🔬 סביבת המחקר — שלד חדש (שלב 1), מחוץ ל-Layout הקיים (סביבה בהירה נקייה) */}
          <Route path="/research" element={<ResearchPage />} />
          {/* 🧪 מעבדה להבנת משמעות — דף פרטי חבוי (מסך נקי, בלי צ'רום). לא מקושר בשום מקום. */}
          <Route path="/meaning-lab" element={<MeaningLabPage />} />
          <Route path="/מעבדת-משמעות" element={<MeaningLabPage />} />
          <Route element={<Layout />}>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/reality" element={<Locked flag="lock_reality"><HomeReality /></Locked>} />
          <Route path="/home-classic" element={<HomePage />} />
          <Route path="/start" element={<StartHerePage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/unsubscribe" element={<UnsubscribePage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/map" element={<NavigationCenterPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/numbers" element={<NumbersPage />} />
          <Route path="/name-lab" element={<NameLabPage />} />
          <Route path="/מעבדת-השם" element={<NameLabPage />} />
          <Route path="/code" element={<CodePage />} />
          <Route path="/code/ארכיון" element={<CodeArchivePage />} />
          <Route path="/code-archive" element={<CodeArchivePage />} />
          {/* הפרדה: /code = הכלי · /codes = ספרייה · /codes/:slug = עמוד קנוני לצופן (SEO, בלי התנגשות, מקום לגדול) */}
          <Route path="/codes" element={<CiphersLibraryPage />} />
          {/* 🔬 תיקיית-המחקר (unlisted) — לפני :slug כדי לא להיתפס כ-slug. לא מקושרת בשום מקום. */}
          <Route path="/codes/מחקר" element={<ResearchCodesPage />} />
          <Route path="/codes/:slug" element={<CipherPage />} />
          {/* 📚 בית המדרש — דף עצמאי (כמו שהיה): מי שנכנס — בבית המדרש, לא בשלד-המחקר */}
          <Route path="/beit-midrash" element={<BeitMidrashPage />} />
          <Route path="/beit-midrash/:method" element={<MethodPage />} />
          <Route path="/languages" element={<LanguagesPage />} />
          <Route path="/קשרי-שפות" element={<LanguagesPage />} />
          <Route path="/post" element={<PostsPage />} />
          {/* /archive = זרם המציאות: שער-רשומים ברמת הראוט (lock_reality mode=anon);
              טאבי הגלריות בפנים חסומים בנפרד גם לרשומים (lock_galleries, בתוך ArchivePage) */}
          <Route path="/archive" element={<Locked flag="lock_reality"><ArchivePage /></Locked>} />
          <Route path="/gallery" element={<Locked flag="lock_galleries"><GalleryPage /></Locked>} />
          <Route path="/gallery-updates" element={<Navigate to="/archive" replace />} />
          <Route path="/verified" element={<VerifiedPostsPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/community/chat" element={<SpotimChatRoute />} />
          <Route path="/community/calculator" element={<CommunityCalculatorPage />} />
          <Route path="/community/comments" element={<CommunityCommentsPage />} />
          <Route path="/community/researcher/:slug" element={<ContributorPage />} />
          <Route path="/community/researchers" element={<ResearchersIndexPage />} />
          {/* 888 — מספר-החתימה של עמית מייק רוב → קיצור לדף-החוקר שלו (החלטת צוריאל) */}
          <Route path="/888" element={<Navigate to="/community/researcher/888" replace />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/about" element={<Navigate to="/contact" replace />} />
          <Route path="/contact" element={<ContactRoute />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminPage />} />
          {/* ⛔ העורך מחוץ ל-/admin/ — vercel.json honeypot תופס /admin/(.*) ומחזיר 403. */}
          <Route path="/editor" element={<PostEditorPage />} />
          <Route path="/editor/:slug" element={<PostEditorPage />} />
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
          <Route path="/forum" element={<ForumPage />} />
          <Route path="/forum/:id" element={<ForumThreadPage />} />
          {/* ניסוי — מחשבון גימטריה לבן + קיר חי (לא בתפריט) */}
          <Route path="/gematria" element={<GematriaToLab />} />
          <Route path="/גימטריה" element={<GematriaToLab />} />
          {/* תצוגה מקדימה — דף בית חדש (לא מחליף את הקיים) */}
          <Route path="/home-new" element={<HomeNewPage />} />
          <Route path="/בית-חדש" element={<HomeNewPage />} />
          <Route path="/cross" element={<Locked flag="lock_cross"><CrossMethodPage /></Locked>} />
          <Route path="/verse-gematria" element={<VerseGematriaPage />} />
          <Route path="/פסוקים" element={<VerseGematriaPage />} />
          <Route path="/broadcasts" element={<BroadcastsPage />} />
          <Route path="/whats-new" element={<SiteUpdatesPage />} />
          <Route path="/הצלבה" element={<CrossMethodPage />} />
          <Route path="/journey" element={<JourneyPage />} />
          <Route path="/מסע" element={<JourneyPage />} />
          <Route path="/journey-beta" element={<JourneyPageV2 />} />
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
        <UserCenter />
        <AiQuotaToast />
        <ProfileNudge />
        </UserCenterProvider>
        </ResearchProvider>
    </BrowserRouter>
    </AuthProvider>
  );
}
