import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { C, F, GLOBAL_CSS } from "../../theme.js";
import { PALETTES } from "../../lib/palette.js";
import { effectiveMode, POST_SLUG_RE } from "../../lib/lightRoutes.js";
import { useThemeMode } from "../../lib/themeMode.js";
import { useStream } from "../../lib/stream.js";
import SpaceBackground from "./SpaceBackground.jsx";
import VerseBackground from "./VerseBackground.jsx"; // 📜 «כתובת החומה» — זכריה יג,ט חקוק ברקע (כל עמוד חוץ מהבית)
import RandomTopBanner from "./RandomTopBanner.jsx"; // 🎲 רצועה אקראית (טיזר או צופן/אלול) — פוסטים+צ'אט
import Navbar from "./Navbar.jsx";
import CosmicVerseBanner from "./CosmicVerseBanner.jsx"; // 🌌 באנר-על קוסמי עם פסוק (מתחת לתפריט)
import LiveActivityBar from "./LiveActivityBar.jsx"; // 📡 טיקר «עכשיו באתר» — פעיל
import MaintenanceTicker from "./MaintenanceTicker.jsx"; // 🚧 רצועת «האתר בבנייה» — שורה זזה גלובלית
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
  const globalMode = useThemeMode();                       // המצב הגלובלי מהמתג
  const stream = useStream();                              // עדשת התצוגה (kingdom/reality)
  // 📡 בדף הבית ובצ'אט: מוסתרת בועת מגירת-המספר, ובמקומה «פותח העדכונים» החי (LiveChannelFeed).
  //    (טיקר-החדשות LiveActivityBar מוצג בכל הדפים — הוחזר לבית+צ'אט 11.7.)
  const liveChrome = [/^\/$/, /^\/home-new$/, /^\/בית-חדש$/, /^\/community\/chat$/].some(re => re.test(pathname));
  // 📡 טיקר-החדשות הזז (LiveActivityBar) מוסתר בדף הבית (בקשת צוריאל 30.7.2026) — נשאר בשאר האתר.
  const isHome = [/^\/$/, /^\/home-new$/, /^\/בית-חדש$/].some(re => re.test(pathname));
  // 🏛️ אזור ההיכל (מחקר/דילוגים) — שם מעולם לא היה באנר, ולא מציגים אותו (בקשת צוריאל).
  const isHeichal = [/^\/research/, /^\/beit-midrash/, /^\/code/, /^\/heichal/].some(re => re.test(pathname));
  // 🌌 באנר-העל הקוסמי — רק בפוסטים (עמוד פוסט /:slug + רשימת /post) ובדף הצ'אט. לא במספר/מסע/מחקר וכו'.
  const showBanner = /^\/post$/.test(pathname) || /^\/community\/chat$/.test(pathname) || POST_SLUG_RE.test(pathname);
  // 🌅 ציר ההתגלות (הפס הקבוע בצד) — מוצג בעמוד הציר עצמו (/timeline) ובעמודי-פוסט (בקשת צוריאל).
  //    בעמוד-פוסט הרכיב עצמו מחליט אם זה «פוסט של הציר» (מאומת-AI) ואחרת מחזיר null.
  const showAxis = /^\/timeline$/.test(pathname) || POST_SLUG_RE.test(pathname);
  // 🌗 המצב האפקטיבי — מקור-אמת אחד עם usePalette (lightRoutes.effectiveMode) → אין חצי-בהיר-חצי-כהה.
  const mode = effectiveMode(pathname, globalMode);
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
      {/* 📜 «כתובת החומה» — הפסוק זכריה יג,ט חקוק ברקע בכל עמוד חוץ מהבית (שומר על זהות המלכות של הבית) */}
      {!isHome && <VerseBackground dark={dark} />}
      {showAxis && <RevelationAxis />}
      <div style={{ position: "relative", zIndex: 1 }}>
        <Navbar />
        {/* 🎗️ טיקר יחיד מתחלף «בקרוב» — סרגל אחד גלובלי שמחליף כל 7ש׳ בין הפרומואים:
            🌅 ציר ההתגלות (תאריכים 0→6000 נגללים ימין→שמאל) · ✦ ציר התגלות אישי ·
            🔠 חיפוש בתורה בדילוגי-אותיות (+שעון-חול לשבועיים) · 📅 שנת תשפ״ו (786) ·
            🌍 English (רק לדוברי-אנגלית, בסבב). מחליף את כל הטיקרים הישנים —
            EnglishSoonBar + YearTicker + CelestialPinnedBar + CipherElulBanner (מושבתים). */}
        {/* דף הבית + פוסטים + צ'אט: בכל טעינה נבחר אקראית אחד — טיזר-הפרומו או באנר-הצופן/אלול
            (לא שניהם). כך «כל כניסה» מתחלפת. שאר האתר: טיזר-הפרומו הרגיל. (בקשת צוריאל 15.8.2026) */}
        {(isHome || showBanner) ? <RandomTopBanner /> : <PromoTicker />}
        {/* 🌌 שורה נעוצה גלובלית — הושבתה לטובת טיקר-הפרומו (בקשת צוריאל 15.8.2026). להחזרה: הסר את false. */}
        {false && <CelestialPinnedBar />}
        {/* 🚧 רצועת «האתר בבנייה» — שורה זזה, בכל האתר. מוסתרת כרגע בכל האתר (בקשת צוריאל 6.8.2026). להחזרה: הסר את false. */}
        {false && <MaintenanceTicker />}
        {/* 🌌 באנר-העל הקוסמי הישן (פסוק + נגן-רקע) — הוחלף בבאנר המתחלף (המלך בשדה ↔ צופן).
            להחזרה: הסר את false. */}
        {false && showBanner && <CosmicVerseBanner mode={mode} />}
        {/* 📡 טיקר-החדשות «עכשיו באתר» — מוסתר כרגע (בקשת צוריאל 4.8.2026). להחזרה: הסר את false. */}
        {false && !isHome && <LiveActivityBar />}
        {/* רצועת «כלי ההיכל» הוסרה (הועברה לתפריט-הנפתח של היכל הגילוי בנאב) */}
        {/* 🎺📜 באנר מתחלף (המלך בשדה ↔ צופן «אשלים מלאכה») — בכל עמוד חוץ מהבית ומההיכל.
            מחליף את באנר-הפסוק הקוסמי הישן (הוסתר למטה). התחלה אקראית בכל כניסה. */}
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
        {/* 🔠 בדף הדילוגים הכלי ממלא מסך-מלא (iframe) — בלי פוטר, כדי שלא ייווצר פס-גלילה שני בדף */}
        {pathname !== "/code" && <Footer />}
      </div>
      {/* מגירת המספר: הבועה הצפה מוסתרת בבית ובצ'אט (שם «פותח העדכונים» תופס את הפינה); המגירה עצמה עדיין נפתחת בהקשה על מספר. */}
      {/* 🔠 מגירת-המספר מוסתרת בדף הצופן (בקשת צוריאל) — /code + היכל?tool=els */}
      <NumberDrawer hideLauncher={liveChrome || /^\/code/.test(pathname) || (pathname === "/research" && /tool=els/.test(search))} />
      {liveChrome && <LiveChannelFeed />}
      <JoinCelebration />
      {/* 🎬 נגן-רצף «מימד חמש» (Shorts) — גלובלי, נפתח מכל כרטיס-מימד-חמש */}
      <DimensionFiveFeed />
    </div>
  );
}
