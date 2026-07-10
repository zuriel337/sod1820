import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { C, F, GLOBAL_CSS } from "../../theme.js";
import { PALETTES } from "../../lib/palette.js";
import { useThemeMode } from "../../lib/themeMode.js";
import { useStream } from "../../lib/stream.js";
import SpaceBackground from "./SpaceBackground.jsx";
import Navbar from "./Navbar.jsx";
import CosmicVerseBanner from "./CosmicVerseBanner.jsx"; // 🌌 באנר-על קוסמי עם פסוק (מתחת לתפריט)
import LiveActivityBar from "./LiveActivityBar.jsx"; // 📡 טיקר «עכשיו באתר» — פעיל
import Footer from "./Footer.jsx";
import RevelationAxis from "../axis/RevelationAxis.jsx";
import NumberDrawer from "../NumberDrawer.jsx";
import LiveChannelFeed from "../LiveChannelFeed.jsx";
import ErrorBoundary from "../ErrorBoundary.jsx";
import JoinCelebration from "../JoinCelebration.jsx";

// דפים שכבר הוסבו לפלטה (תומכים במצב בהיר). שאר הדפים נשארים כהים *בכוח* —
// כך מתג התמה גלובלי, בלי לשבור דפים שעוד לא מוגרו (בית-מדרש/טופיק/ארכיון/...).
// להוספת דף מוגר חדש (למשל /post, /archive) — להוסיף כאן שורת regex.
// 🔒 חקוק: נתיבי-מערכת בעלי-מקטע-אחד שנשארים כהים (לא מוגרו). כל השאר (/:slug) = פוסט → תומך בבהיר.
const RESERVED_ROUTES = [
  "about", "admin", "archive", "beit-midrash", "broadcasts", "chat", "code", "community", "contact",
  "cross", "enter", "experience", "galaxy", "gallery", "gallery-updates", "gematria", "heichal",
  "home-classic", "home-new", "journey", "lab", "languages", "login", "map", "members", "name", "number", "numbers",
  "numbers-report", "post", "profile", "reality", "research", "reveal", "start", "stream", "sulamot",
  "theme-preview", "timeline", "traffic", "verified",
  "בית-חדש", "גימטריה", "דף-צאט-ראשי", "היכל", "הצלבה", "חישוב", "מסע", "ניסיון", "פוסטים-אחרונים", "פוסטים-אחרונים-2", "קשרי-שפות",
].join("|");
// פוסט = מקטע-אחד שאינו נתיב-מערכת שמור. (sulamot\d* מכסה sulamot2..11)
const POST_SLUG_RE = new RegExp(`^\\/(?!(?:${RESERVED_ROUTES}|sulamot\\d+)(?:\\/|$))[^\\/]+$`);

const LIGHT_ROUTES = [
  /^\/$/, /^\/home-new$/, /^\/בית-חדש$/,
  /^\/number(\/|$)/, /^\/name$/, /^\/שם$/,
  /^\/cross$/, /^\/topic(\/|$)/,
  /^\/post$/, /^\/community\/chat$/,
  /^\/verified$/, /^\/code$/, /^\/map$/, /^\/start$/,
  /^\/category(\/|$)/, /^\/tag(\/|$)/, /^\/journey$/, /^\/מסע$/,
  /^\/languages$/, /^\/קשרי-שפות$/,   // 🌍 קשרי-שפות — מרחב מחקר בהיר-נקי
  POST_SLUG_RE,   // 🔒 פוסטים (/:slug) — תומכים בבהיר מערכתית (תוקן: רקע-לילה שחור בפוסט בהיר)
];

export default function Layout() {
  const { pathname } = useLocation();
  const globalMode = useThemeMode();                       // המצב הגלובלי מהמתג
  const stream = useStream();                              // עדשת התצוגה (kingdom/reality)
  const supportsLight = LIGHT_ROUTES.some(re => re.test(pathname));
  // 📡 בדף הבית ובצ'אט: מוסרים את הטיקר-העליון ואת בועת מגירת-המספר, ובמקומם «פותח העדכונים» החי (LiveChannelFeed).
  const liveChrome = [/^\/$/, /^\/home-new$/, /^\/בית-חדש$/, /^\/community\/chat$/].some(re => re.test(pathname));
  // 🌌 באנר-העל הקוסמי — רק בפוסטים (עמוד פוסט /:slug + רשימת /post) ובדף הצ'אט. לא במספר/מסע/מחקר וכו'.
  const showBanner = /^\/post$/.test(pathname) || /^\/community\/chat$/.test(pathname) || POST_SLUG_RE.test(pathname);
  const mode = (supportsLight && globalMode === "light") ? "light" : "dark"; // אחרת — כהה בכוח
  const P = PALETTES[mode];
  const dark = mode === "dark";

  // רקע ה-body (אזורי overscroll/גלילה) לפי המצב האפקטיבי
  useEffect(() => {
    try { document.body.style.background = dark ? "#0C0818" : "#f6f1e6"; } catch { /* ignore */ }
  }, [dark]);

  return (
    <div data-theme={mode} data-stream={stream || "none"} style={{ background: dark ? C.bg : P.pageBg, minHeight: "100vh", color: dark ? "#ede4d3" : P.ink, fontFamily: F.body, fontSize: 16, position: "relative" }}>
      <style>{GLOBAL_CSS}</style>
      {/* הקוסמוס הגלובלי — רק במצב כהה (במצב בהיר הרקע הוא קלף קרם נקי) */}
      {dark && <SpaceBackground />}
      <RevelationAxis />
      <div style={{ position: "relative", zIndex: 1 }}>
        <Navbar />
        {/* 🌌 באנר-העל הקוסמי (פסוק + שמי-כוכבים + אור-נגלה + נגן-רקע) — רק בפוסטים ובצ'אט. */}
        {showBanner && <CosmicVerseBanner mode={mode} />}
        {/* 📡 הטיקר («עכשיו באתר») — בכל האתר, פרט לבית ולצ'אט (שם «פותח העדכונים» תופס את מקומו). */}
        {!liveChrome && <LiveActivityBar />}
        {/* רצועת «כלי ההיכל» הוסרה (הועברה לתפריט-הנפתח של היכל הגילוי בנאב) */}
        <main>
          <ErrorBoundary routeKey={pathname}>
            <React.Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: dark ? "#9a8a66" : P.ink, fontFamily: F.body, opacity: 0.55 }}>טוען…</div>}>
              <Outlet />
            </React.Suspense>
          </ErrorBoundary>
        </main>
        <Footer />
      </div>
      {/* מגירת המספר: הבועה הצפה מוסתרת בבית ובצ'אט (שם «פותח העדכונים» תופס את הפינה); המגירה עצמה עדיין נפתחת בהקשה על מספר. */}
      <NumberDrawer hideLauncher={liveChrome} />
      {liveChrome && <LiveChannelFeed />}
      <JoinCelebration />
    </div>
  );
}
