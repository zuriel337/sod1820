import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { C, F, GLOBAL_CSS } from "../../theme.js";
import { PALETTES } from "../../lib/palette.js";
import { effectiveMode, POST_SLUG_RE } from "../../lib/lightRoutes.js";
import { useThemeMode } from "../../lib/themeMode.js";
import { useStream } from "../../lib/stream.js";
import SpaceBackground from "./SpaceBackground.jsx";
import RandomTopBanner from "./RandomTopBanner.jsx"; // 🎲 רצועה אקראית (טיזר או צופן/אלול) — פוסטים+צ'אט
import Navbar from "./Navbar.jsx";
import CosmicVerseBanner from "./CosmicVerseBanner.jsx"; // 🌌 באנר-על קוסמי עם פסוק (מתחת לתפריט)
import LiveActivityBar from "./LiveActivityBar.jsx"; // 📡 טיקר «עכשיו באתר» — פעיל
import CelestialPinnedBar from "./CelestialPinnedBar.jsx"; // 🌌 שורה נעוצה גלובלית — «שלושה דברים שמימיים בערב ראש חודש אלול»
import PromoTicker from "./PromoTicker.jsx"; // 🎗️ טיקר יחיד מתחלף «בקרוב» (ציר ההתגלות · ציר אישי · דילוגי-אותיות · תשפ״ו · English) — מחליף את כל הטיקרים הישנים
import Footer from "./Footer.jsx";
import RevelationAxis from "../axis/RevelationAxis.jsx";
import NumberDrawer from "../NumberDrawer.jsx";
import LiveChannelFeed from "../LiveChannelFeed.jsx";
import ErrorBoundary from "../ErrorBoundary.jsx";
import JoinCelebration from "../JoinCelebration.jsx";
import DimensionFiveFeed from "../DimensionFiveFeed.jsx"; // 🎬 נגן-רצף מימד חמש (Shorts) — גלובלי

// 🌗 רשימת הראוטים התומכים בבהיר עברה ל-src/lib/lightRoutes.js (מקור-אמת יחיד),
// כדי שגם מתג התמה בנאבבר יוכל לדעת אם הדף הנוכחי תומך בבהיר — בלי תלות-מעגלית.

export default function Layout() {
  const { pathname, search } = useLocation();
  const globalMode = useThemeMode();
  const stream = useStream();
  const liveChrome = [/^\/$/, /^\/home-new$/, /^\/בית-חדש$/, /^\/community\/chat$/].some(re => re.test(pathname));
  const isHome = [/^\/$/, /^\/home-new$/, /^\/בית-חדש$/].some(re => re.test(pathname));
  const isHeichal = [/^\/research/, /^\/beit-midrash/, /^\/code/, /^\/heichal/].some(re => re.test(pathname));
  const showBanner = /^\/post$/.test(pathname) || /^\/community\/chat$/.test(pathname) || POST_SLUG_RE.test(pathname);
  const showAxis = /^\/timeline$/.test(pathname) || POST_SLUG_RE.test(pathname);
  const mode = effectiveMode(pathname, globalMode);
  const P = PALETTES[mode];
  const dark = mode === "dark";

  useEffect(() => {
    try { document.body.style.background = dark ? "#0C0818" : "#f6f1e6"; } catch { /* ignore */ }
  }, [dark]);

  return (
    <div data-theme={mode} data-stream={stream || "none"} style={{ background: dark ? C.bg : P.pageBg, minHeight: "100vh", color: dark ? "#ede4d3" : P.ink, fontFamily: F.body, fontSize: 16, position: "relative" }}>
      <style>{GLOBAL_CSS}</style>
      {/* רקע קנוני: הקוסמוס/עיר נשארים. שכבת פסוק/אותיות דקורטיבית הוסרה במפורש — רקע ≠ תוכן. */}
      {dark && <SpaceBackground />}
      {showAxis && <RevelationAxis />}
      <div style={{ position: "relative", zIndex: 1 }}>
        <Navbar />
        {/* 🎗️ טיקר יחיד מתחלף «בקרוב» — סרגל אחד גלובלי שמחליף כל 7ש׳ בין הפרומואים:
            🌅 ציר ההתגלות (תאריכים 0→6000 נגללים ימין→שמאל) · ✦ ציר התגלות אישי ·
            🔠 חיפוש בתורה בדילוגי-אותיות (+שעון-חול לשבועיים) · 📅 שנת תשפ״ו (786) ·
            🌍 English (רק לדוברי-אנגלית, בסבב). מחליף את כל הטיקרים הישנים —
            EnglishSoonBar + YearTicker + CelestialPinnedBar + CipherElulBanner (מושבתים). */}
        {/* 🚫 באנר הצופן/אלול הוסר מהכרום הגלובלי. הצפנים והסרטונים שלהם חיים בדף הבית/אזורי התוכן הייעודיים. */}
        {false && <CelestialPinnedBar />}
        {false && showBanner && <CosmicVerseBanner mode={mode} />}
        {false && !isHome && <LiveActivityBar />}
        {/* רצועת «כלי ההיכל» הוסרה (הועברה לתפריט-הנפתח של היכל הגילוי בנאב) */}
        {/* באנר הצופן/אלול משולב עכשיו בתוך RotatingTopBanner למעלה (מתחלף עם הטיזר) — לא מוצג כאן בנפרד. */}
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
        {pathname !== "/code" && <Footer />}
      </div>
      <NumberDrawer hideLauncher={liveChrome || /^\/code/.test(pathname) || (pathname === "/research" && /tool=els/.test(search))} />
      {liveChrome && <LiveChannelFeed />}
      <JoinCelebration />
      <DimensionFiveFeed />
    </div>
  );
}
