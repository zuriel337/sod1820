import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { C, F, GLOBAL_CSS } from "../../theme.js";
import { PALETTES } from "../../lib/palette.js";
import { useThemeMode } from "../../lib/themeMode.js";
import { useStream } from "../../lib/stream.js";
import SpaceBackground from "./SpaceBackground.jsx";
import Navbar from "./Navbar.jsx";
import LiveActivityBar from "./LiveActivityBar.jsx"; // 📡 טיקר «עכשיו באתר» — פעיל
import Footer from "./Footer.jsx";
import RevelationAxis from "../axis/RevelationAxis.jsx";
import NumberDrawer from "../NumberDrawer.jsx";
import ErrorBoundary from "../ErrorBoundary.jsx";
import JoinCelebration from "../JoinCelebration.jsx";

// דפים שכבר הוסבו לפלטה (תומכים במצב בהיר). שאר הדפים נשארים כהים *בכוח* —
// כך מתג התמה גלובלי, בלי לשבור דפים שעוד לא מוגרו (בית-מדרש/טופיק/ארכיון/...).
// להוספת דף מוגר חדש (למשל /post, /archive) — להוסיף כאן שורת regex.
const LIGHT_ROUTES = [
  /^\/$/, /^\/home-new$/, /^\/בית-חדש$/,
  /^\/number(\/|$)/, /^\/name$/, /^\/שם$/,
  /^\/cross$/, /^\/topic(\/|$)/,
  /^\/post$/, /^\/community\/chat$/,
  /^\/verified$/, /^\/code$/, /^\/map$/, /^\/start$/,
  /^\/category(\/|$)/, /^\/tag(\/|$)/, /^\/journey$/, /^\/מסע$/,
];

export default function Layout() {
  const { pathname } = useLocation();
  const globalMode = useThemeMode();                       // המצב הגלובלי מהמתג
  const stream = useStream();                              // עדשת התצוגה (kingdom/reality)
  const supportsLight = LIGHT_ROUTES.some(re => re.test(pathname));
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
        {/* 📡 הטיקר («עכשיו באתר») — פעיל. שליטה ידנית דרך ticker_messages ב-DB. */}
        <LiveActivityBar />
        {/* רצועת «כלי ההיכל» הוסרה (הועברה לתפריט-הנפתח של היכל הגילוי בנאב) */}
        <main>
          <ErrorBoundary routeKey={pathname}>
            <React.Suspense fallback={<div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", color: dark ? "#9a8a66" : P.ink, fontFamily: F.body, opacity: 0.55 }}>טוען…</div>}>
              <Outlet />
            </React.Suspense>
          </ErrorBoundary>
        </main>
        <Footer />
      </div>
      <NumberDrawer />
      <JoinCelebration />
    </div>
  );
}
