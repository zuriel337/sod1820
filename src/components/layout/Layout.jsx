import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { C, F, GLOBAL_CSS } from "../../theme.js";
import { PALETTES } from "../../lib/palette.js";
import { supportsLight as routeSupportsLight, POST_SLUG_RE } from "../../lib/lightRoutes.js";
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

// 🌗 רשימת הראוטים התומכים בבהיר עברה ל-src/lib/lightRoutes.js (מקור-אמת יחיד),
// כדי שגם מתג התמה בנאבבר יוכל לדעת אם הדף הנוכחי תומך בבהיר — בלי תלות-מעגלית.

export default function Layout() {
  const { pathname, search } = useLocation();
  const globalMode = useThemeMode();                       // המצב הגלובלי מהמתג
  const stream = useStream();                              // עדשת התצוגה (kingdom/reality)
  const supportsLight = routeSupportsLight(pathname);
  // 📡 בדף הבית ובצ'אט: מוסתרת בועת מגירת-המספר, ובמקומה «פותח העדכונים» החי (LiveChannelFeed).
  //    (טיקר-החדשות LiveActivityBar מוצג בכל הדפים — הוחזר לבית+צ'אט 11.7.)
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
        {/* 📡 טיקר-החדשות — בכל האתר, כולל דף הבית והצ'אט (הוחזר לבקשת צוריאל 11.7). */}
        <LiveActivityBar />
        {/* רצועת «כלי ההיכל» הוסרה (הועברה לתפריט-הנפתח של היכל הגילוי בנאב) */}
        <main>
          <ErrorBoundary routeKey={pathname}>
            <React.Suspense fallback={<div style={{ minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: dark ? "#9a8a66" : P.ink, fontFamily: F.body }}>
              <img src="/crown.png" alt="" aria-hidden className="logo-animated" style={{ width: 62, height: 62, objectFit: "contain", opacity: 0.9, filter: "drop-shadow(0 0 16px rgba(233,200,74,0.4))" }} />
              <span style={{ fontFamily: F.heading, fontSize: 13, letterSpacing: 3, opacity: 0.7 }}>טוען…</span>
            </div>}>
              <Outlet />
            </React.Suspense>
          </ErrorBoundary>
        </main>
        {/* 🔠 בדף הדילוגים הכלי ממלא מסך-מלא (iframe) — בלי פוטר, כדי שלא ייווצר פס-גלילה שני בדף */}
        {pathname !== "/code" && <Footer />}
      </div>
      {/* מגירת המספר: הבועה הצפה מוסתרת בבית ובצ'אט (שם «פותח העדכונים» תופס את הפינה); המגירה עצמה עדיין נפתחת בהקשה על מספר. */}
      {/* 🔠 מגירת-המספר מוסתרת בדף הצופן (בקשת צוריאל) — /code + היכל?tool=els */}
      <NumberDrawer hideLauncher={liveChrome || /^\/code/.test(pathname) || (pathname === "/research" && /tool=els/.test(search))} />
      {liveChrome && <LiveChannelFeed />}
      <JoinCelebration />
    </div>
  );
}
