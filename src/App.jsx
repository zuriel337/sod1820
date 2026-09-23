import React, { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { applySeo } from "./lib/seo.js";
import { ROUTE_META } from "./routes.jsx";
import { initGA, trackPageview } from "./lib/analytics.js";
import { initMarketing, trackMarketingPageview } from "./lib/marketing.js";
import { trackVisit } from "./lib/visits.js";
import { startPageEngagement } from "./lib/engagement.js";
import { initAppInstallTracking, captureArrivalSource, captureAcquisition, trackStreamEntry } from "./lib/tracking.js";
import { initInstall } from "./lib/install.js";
import { captureArrival, captureRef } from "./lib/propagation.js";
import { initClarity } from "./lib/clarity.js";
import { ensureIdentity } from "./lib/identity.js";
import { startPresence, updatePresence } from "./lib/presence.js";
import { useAuth } from "./lib/AuthContext.jsx";
import RoyalShareWidget from "./components/RoyalShareWidget.jsx";
import LabDock from "./components/hub/LabDock.jsx";
import InstallPrompt from "./components/InstallPrompt.jsx";
import UpdatesBar from "./components/UpdatesBar.jsx";
import SitePromoPopup from "./components/SitePromoPopup.jsx";

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
const BeitMidrashPage = React.lazy(() => import("./pages/BeitMidrashPage.jsx"));
// Torah Occurrence -> Spatial Runtime Adapter (dev/admin only) — work_log task
// TORAH_OCCURRENCE_SPATIAL_ADAPTER_V1, frozen Spatial Slice-0 contract, builds on the Spatial
// Gematria Golden Slice's Semantic Scene Compiler pattern (work_log 7f0d8ac8).
const TorahOccurrenceScenePage = React.lazy(() => import("./pages/dev/TorahOccurrenceScenePage.jsx"));
import TopicPage from "./pages/TopicPage.jsx";
import PostsPage from "./pages/PostsPage.jsx";
import { TagPage, CategoryPage } from "./pages/TaxonomyPage.jsx";
import {
  MembersPage, CommunityPage,
  CommunityCommentsPage,
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
const CreditsBuyPage = React.lazy(() => import("./pages/CreditsBuyPage.jsx"));
const StartHerePage = React.lazy(() => import("./pages/StartHerePage.jsx"));
const PrivacyPage = React.lazy(() => import("./pages/PrivacyPage.jsx"));
const UnsubscribePage = React.lazy(() => import("./pages/UnsubscribePage.jsx"));
const JoinPage = React.lazy(() => import("./pages/JoinPage.jsx"));
const WelcomePage = React.lazy(() => import("./pages/WelcomePage.jsx"));
const NavigationCenterPage = React.lazy(() => import("./pages/NavigationCenterPage.jsx"));
const NumbersPage = React.lazy(() => import("./pages/NumbersPage.jsx"));
const NameLabPage = React.lazy(() => import("./pages/NameLabPage.jsx"));
const Gematria3DPage = React.lazy(() => import("./pages/Gematria3DPage.jsx"));
const ThemePage = React.lazy(() => import("./pages/ThemePage.jsx"));
const CodePage = React.lazy(() => import("./pages/CodePage.jsx"));
const ForumPage = React.lazy(() => import("./pages/ForumPage.jsx"));
const OrGeulaPage = React.lazy(() => import("./pages/OrGeulaPage.jsx"));
const ForumThreadPage = React.lazy(() => import("./pages/ForumThreadPage.jsx"));
const CipherPage = React.lazy(() => import("./pages/CipherPage.jsx"));
const CiphersLibraryPage = React.lazy(() => import("./pages/CiphersLibraryPage.jsx"));
const ResearchCodesPage = React.lazy(() => import("./pages/ResearchCodesPage.jsx"));
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
const ResearchViewerV0Page = React.lazy(() => import("./components/admin/ResearchViewerV0Page.jsx"));
const EntityHubPreviewPage = React.lazy(() => import("./pages/EntityHubPreviewPage.jsx")); // 🌳 Universal Entity Hub golden-case preview // 🔬 Research Viewer v0 — פנימי, לא-מקושר, admin gate ברכיב עצמו
const ExplorerPreviewPage = React.lazy(() => import("./pages/ExplorerPreviewPage.jsx")); // 🧪 Universal Explorer Slice 2 — פנימי, לא-מקושר, שם-זמני עד Human-Gate שם
const ElsWorkAreaPage = React.lazy(() => import("./pages/ElsWorkAreaPage.jsx"));   // 🧭 /lab/els — Work Area על אותו מנוע קנוני
const ConvergenceGalaxy = React.lazy(() => import("./components/ConvergenceGalaxy.jsx"));
// 2029 greenfield core surfaces — shared shell, shared Research Context, one Raziel.
const Home2029Page = React.lazy(() => import("./pages/Home2029Page.jsx"));
const World2029Page = React.lazy(() => import("./pages/World2029Page.jsx"));
const Els2029Page = React.lazy(() => import("./pages/Els2029Page.jsx"));
const Heichal2029Page = React.lazy(() => import("./pages/Heichal2029Page.jsx"));
// מסכים מלאים כבדים (three.js / קנבס) — נטענים עצמאית
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
const WaInboxPage = React.lazy(() => import("./pages/WaInboxPage.jsx"));
// 🧪 מעבדה להבנת משמעות — דף עצמאי חבוי (מחוץ ל-Layout, לא בתפריט, לא מאונדקס). שכבה מבודדת lab_*.
const MeaningLabPage = React.lazy(() => import("./pages/MeaningLabPage.jsx"));

// 🏛️ Legacy Research/Heichal access is governed by the canonical site_flags owner.
// lock_research mode=anon => anonymous visitors see free registration/login; registered users and admin pass.
function ResearchEntryRoute() {
  return <Locked flag="lock_research"><ResearchPage /></Locked>;
}

// ניהול SEO + גלילה לראש בכל מעבר route.
// דפי תוכן דינמיים (פוסט/קטגוריה/תגית/מספר) מגדירים SEO משלהם בעת טעינה.
function RouteEffects() {
  const { pathname, search } = useLocation();
  const prevPathRef = useRef(null); // הנתיב-הקודם — למעקב «מאיפה נכנסו לזרם»
  // 🔬 פילוח-מעבדה: שומרים את הכלי הפעיל (?tool=) בנתיב הנמדד, כך שכל כלי-מעבדה
  // נספר בנפרד ("/research?tool=midrash" · "…=els" · "…=gematria") ולא קורס ל-"/research" אחד.
  // כך גם כשהכל עובר תחת המעבדה — לא מאבדים את הפילוח לפי כלי.
  const labTool = pathname === "/research" ? new URLSearchParams(search).get("tool") : null;
  const trackPath = labTool ? `/research?tool=${labTool}` : pathname;
  const { user } = useAuth();
  useEffect(() => { initGA(); initMarketing(); initAppInstallTracking(); initInstall(); captureArrival(); captureRef(); captureArrivalSource(); captureAcquisition(); initClarity(); ensureIdentity(); }, []);
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
    // את document.title לפני ש-GA שולח ה-page_view — מונע ייחוס לכותרת הקודמת.
    const t = setTimeout(() => { trackPageview(pathname); trackMarketingPageview(); }, 350);
    // 🌊 כניסה לזרם המציאות — «מאיפה נכנסו» (הנתיב-הקודם), מרכזית לכל הכניסות. prevPathRef
    // מתעדכן *אחרי* השימוש → deterministic, בלי תלות בסדר-אפקטים של רכיב-הילד.
    if (pathname === "/archive") { try { trackStreamEntry(prevPathRef.current); } catch { /* noop */ } }
    prevPathRef.current = pathname;
    return () => clearTimeout(t);
  }, [pathname]);
  // מד-הכניסות הפנימי — אפקט נפרד על trackPath, כדי שייספר גם מעבר-בין-כלים במעבדה (שינוי ?tool=).
  useEffect(() => { trackVisit(trackPath); }, [trackPath]);
  // ⏱️ Engagement Time v1 — flush את ה-page-instance הקודם (route_change) ופותח חדש על trackPath.
  //    pagehide נתפס גלובלית בתוך engagement.js עצמו (לא כאן) — ר' src/lib/engagement.js.
  useEffect(() => { startPageEngagement(trackPath); }, [trackPath]);
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

function Book2029DocumentHandoff() {
  const location = useLocation();
  const raw = `${location.pathname}${location.search || ""}${location.hash || ""}`;
  const href = location.pathname === "/book"
    ? `/books${location.search || ""}${location.hash || ""}`
    : raw;
  useEffect(() => {
    window.location.assign(href);
  }, [href]);
  return <div aria-label="טוען" style={{ position: "fixed", inset: 0, background: "#0C0818" }} />;
}

// דף הבית ב-/ מתחלף לפי הזרם (root-swap): reality → בית-הקוד; אחרת → בית-המלוכה.
// ברירת מחדל (אין בחירה) = מלוכה, כך שציבור תמיד מקבל את בית-המלוכה.
function HomeRoute() {
  const stream = useStream();
  return stream === "reality" ? <HomeReality /> : <HomeNewPage />;
}

function LegacyNumberTransitionRoute() {
  return <EntityPage />;
}

function LegacyBeitMidrashTransitionRoute() {
  return <BeitMidrashPage />;
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

// Legacy floating chrome stays out of greenfield 2029 surfaces. The 2029 shell owns orientation,
// navigation, Raziel and Workspace there. Legacy production remains untouched until explicit cutover.
function GlobalChrome({ children }) {
  const { pathname } = useLocation();
  const is2029 = pathname === "/2029"
    || pathname === "/world"
    || pathname === "/els"
    || pathname === "/heichal"
    || pathname === "/היכל"
    || /^\/books?(\/|$)/.test(pathname);
  if (is2029 || pathname === "/research" || /^\/code(\/|$)/.test(pathname)) return null;
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
        <GlobalChrome>
          <UpdateBanner />
          <SitePromoPopup />
          <RoyalShareWidget />
          {/* 🧭 RoyalContextBar (הסרגל השחור, admin-only) הוסר — כל היכולות שלו (הקשר/עדשה/הוסף-למחקר/
              שורש/חזרה/מחקר-חדש-מכאן) עברו ל-Bottom Bar (components/layout/BottomBar.jsx, slot «⌖ כאן»),
              עכשיו זמינות לכולם ולא רק לאדמין. «דופק» ו-«רזיאל» היו placeholder-ים לא-מחוברים שם
              (ר' capability-parity audit, work_log task=BOTTOM_BAR_FINAL_RECONCILIATION_V1) — הוחלפו
              ב-slots אמיתיים («◉ עכשיו» מ-LiveChannelFeed הקיים, «✦ רזיאל» שמנווט ל-/research הציבורי
              שבו RazielChat כבר חי). הקובץ עצמו נשמר בהיסטוריית git, לא נמחק מהעולם. */}
          {/* הוסר זמנית לבקשת צוריאל — נחזיר כשיחליט. <LabDock /> */}
          <InstallPrompt />
          {/* הוסר לבקשת צוריאל — בלי פוש «התראות דפדפן / הירשם לעדכונים» (בועת ימין בדסקטופ) */}
          {/* <UpdatesBar /> */}
        </GlobalChrome>
        <React.Suspense fallback={<div style={{ position: "fixed", inset: 0, background: "#0C0818" }} />}>
        <Routes>
          {/* 2029 greenfield — real routes on one shared shell. Branch-only until Human Gate release. */}
          <Route path="/2029" element={<Home2029Page />} />
          <Route path="/world" element={<World2029Page />} />
          <Route path="/books" element={<Book2029DocumentHandoff />} />
          <Route path="/books/:slug" element={<Book2029DocumentHandoff />} />
          <Route path="/book" element={<Book2029DocumentHandoff />} />
          <Route path="/book/:slug" element={<Book2029DocumentHandoff />} />
          <Route path="/els" element={<Els2029Page />} />
          <Route path="/היכל" element={<Heichal2029Page />} />
          <Route path="/heichal" element={<Heichal2029Page />} />

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
          {/* גלקסיות — namespace מערכתי קבוע למסך-מלא (מדור לכל סלאג) */}
          <Route path="/galaxy" element={<GalaxyRoom />} />
          <Route path="/galaxy/:slug" element={<GalaxyPage />} />
          {/* 🔬 סביבת המחקר — שלד חדש (שלב 1), מחוץ ל-Layout הקיים (סביבה בהירה נקייה) */}
          <Route path="/research" element={<ResearchEntryRoute />} />
          {/* 🧪 מעבדה להבנת משמעות — דף פרטי חבוי (מסך נקי, בלי צ'רום). לא מקושר בשום מקום. */}
          <Route path="/meaning-lab" element={<MeaningLabPage />} />
          {/* 🔬 Research Viewer v0 — Projection בלבד, פנימי לא-מקושר. אדמין-גייט ברכיב עצמו. מחוץ ל-/admin/ (honeypot Vercel תופס /admin/(.*)). */}
          <Route path="/research-viewer" element={<ResearchViewerV0Page />} />
          {/* 🌳 Universal Entity Hub — internal golden-case projection, no public-nav replacement yet. */}
          <Route path="/entity-hub-preview" element={<Navigate to="/entity-hub-preview/number/1237" replace />} />
          <Route path="/entity-hub-preview/:type/:key" element={<EntityHubPreviewPage />} />
          {/* 🧪 Universal Explorer — Slice 2 shell/facet composition preview, internal/unlinked, no public-nav replacement. Naming provisional until Human-Gate (checkpoint 0fa2f0e8). */}
          <Route path="/explorer-preview" element={<ExplorerPreviewPage />} />
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
          {/* 🧊 גימטריה מרחבית — «הגיאומטריה של העץ»: ענף מחקר (4 שכבות/מודל, מתכנס ל-1820).
              /gematria-3d + /גימטריה-תלת-ממדית נשמרים כ-alias (קישורים קיימים/פוסט 1020). */}
          <Route path="/spatial-gematria" element={<Gematria3DPage />} />
          <Route path="/גימטריה-מרחבית" element={<Gematria3DPage />} />
          <Route path="/gematria-3d" element={<Gematria3DPage />} />
          <Route path="/גימטריה-תלת-ממדית" element={<Gematria3DPage />} />
          <Route path="/code" element={<CodePage />} />
          {/* הפרדה: /code = הכלי · /codes = ספרייה · /codes/:slug = עמוד קנוני לצופן (SEO, בלי התנגשות, מקום לגדול) */}
          <Route path="/codes" element={<CiphersLibraryPage />} />
          {/* 🔬 תיקיית-המחקר (unlisted) — לפני :slug כדי לא להיתפס כ-slug. לא מקושרת בשום מקום. */}
          <Route path="/codes/מחקר" element={<ResearchCodesPage />} />
          <Route path="/codes/:slug" element={<CipherPage />} />
          {/* Human Gate correction: keep the legacy Beit Midrash open for now.
              Show only the transition notice; do not route users into World yet. */}
          <Route path="/beit-midrash" element={<LegacyBeitMidrashTransitionRoute />} />
          <Route path="/beit-midrash/:method" element={<LegacyBeitMidrashTransitionRoute />} />
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
          <Route path="/community/whatsapp" element={<WaInboxPage />} />
          {/* 888 — מספר-החתימה של עמית מייק רוב → קיצור לדף-החוקר שלו (החלטת צוריאל) */}
          <Route path="/888" element={<Navigate to="/community/researcher/888" replace />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/about" element={<Navigate to="/contact" replace />} />
          <Route path="/contact" element={<ContactRoute />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/credits" element={<CreditsBuyPage />} />
          <Route path="/buy" element={<CreditsBuyPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/dev/torah-occurrence-scene" element={<TorahOccurrenceScenePage />} />
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
          <Route path="/number/:phrase" element={<LegacyNumberTransitionRoute />} />
          <Route path="/topic/:slug" element={<TopicPage />} />
          {/* 🗂️ עמוד-נושא — עדשה חוצה-תוכן (theme_links): צפני שבת, פוסטי שבת, מספרים ומודלים במקום אחד */}
          <Route path="/theme/:slug" element={<ThemePage />} />
          {/* 🔒 lock_forum: הפורום בבנייה — נעול לכולם חוץ מאדמין עד להשקה (mode='all') */}
          <Route path="/forum" element={<Locked flag="lock_forum"><ForumPage /></Locked>} />
          <Route path="/or-geula" element={<OrGeulaPage />} />
          <Route path="/or-geula/video/:id" element={<OrGeulaPage />} />
          <Route path="/אור-הגאולה" element={<OrGeulaPage />} />
          <Route path="/forum/:id" element={<Locked flag="lock_forum"><ForumThreadPage /></Locked>} />
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
          {/* 🧭 Work Area של הצופן — אותו TzofenEmbed ואותו /tzofen.html?embed=1. קריאה-בלבד. */}
          <Route path="/lab/els" element={<ElsWorkAreaPage />} />
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
