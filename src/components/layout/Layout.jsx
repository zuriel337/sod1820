import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { C, F, GLOBAL_CSS } from "../../theme.js";
import { PALETTES } from "../../lib/palette.js";
import { useThemeMode } from "../../lib/themeMode.js";
import SpaceBackground from "./SpaceBackground.jsx";
import Navbar from "./Navbar.jsx";
import LiveActivityBar from "./LiveActivityBar.jsx";
import Footer from "./Footer.jsx";
import RevelationAxis from "../axis/RevelationAxis.jsx";
import NumberDrawer from "../NumberDrawer.jsx";
import ErrorBoundary from "../ErrorBoundary.jsx";
import JoinCelebration from "../JoinCelebration.jsx";
import AdminJoinMonitor from "../AdminJoinMonitor.jsx";

// דפים שכבר הוסבו לפלטה (תומכים במצב בהיר). שאר הדפים נשארים כהים *בכוח* —
// כך מתג התמה גלובלי, בלי לשבור דפים שעוד לא מוגרו (בית-מדרש/טופיק/ארכיון/...).
// להוספת דף מוגר חדש (למשל /post, /archive) — להוסיף כאן שורת regex.
const LIGHT_ROUTES = [
  /^\/$/, /^\/home-new$/, /^\/בית-חדש$/,
  /^\/number(\/|$)/, /^\/name$/, /^\/שם$/,
  /^\/cross$/, /^\/topic(\/|$)/,
  /^\/post$/, /^\/community\/chat$/,
];

export default function Layout() {
  const { pathname } = useLocation();
  const globalMode = useThemeMode();                       // המצב הגלובלי מהמתג
  const supportsLight = LIGHT_ROUTES.some(re => re.test(pathname));
  const mode = (supportsLight && globalMode === "light") ? "light" : "dark"; // אחרת — כהה בכוח
  const P = PALETTES[mode];
  const dark = mode === "dark";

  // רקע ה-body (אזורי overscroll/גלילה) לפי המצב האפקטיבי
  useEffect(() => {
    try { document.body.style.background = dark ? "#080500" : "#f6f1e6"; } catch { /* ignore */ }
  }, [dark]);

  return (
    <div data-theme={mode} style={{ background: dark ? C.bg : P.pageBg, minHeight: "100vh", color: dark ? "#ede4d3" : P.ink, fontFamily: F.body, fontSize: 16, position: "relative" }}>
      <style>{GLOBAL_CSS}</style>
      {/* הקוסמוס הגלובלי — רק במצב כהה (במצב בהיר הרקע הוא קלף קרם נקי) */}
      {dark && <SpaceBackground />}
      <RevelationAxis />
      <div style={{ position: "relative", zIndex: 1 }}>
        <Navbar />
        <LiveActivityBar />
        <main>
          <ErrorBoundary routeKey={pathname}><Outlet /></ErrorBoundary>
        </main>
        <Footer />
      </div>
      <NumberDrawer />
      <JoinCelebration />
      <AdminJoinMonitor />
    </div>
  );
}
