import React from "react";

// 🏙️ רקע-עיר למצב-בהיר (city_background_dual_theme_law §2) — הדפוס הקנוני מ-ProfilePage,
// מוצא לרכיב משותף כדי שכל דף בהיר חדש יישב מתחת לאותה תמונת-עיר בעיבוד בהיר (לא רקע-קרם שטוח).
// במצב כהה הרקע הקוסמי הגלובלי כבר קיים → מרנדרים רק כשהדף בהיר. inset:0 fixed, z-index:0, ללא-אירועים.
export default function LightCityBackdrop({ show = true }) {
  if (!show) return null;
  return (
    <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "url(/city-bg.jpg)", backgroundSize: "cover", backgroundPosition: "center", filter: "grayscale(0.45) brightness(1.55) contrast(0.85)", opacity: 0.14 }} />
      <div style={{ position: "absolute", inset: 0, mixBlendMode: "multiply", background: "linear-gradient(180deg, rgba(184,134,11,0.07), rgba(123,76,176,0.06))" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 0%, rgba(246,241,230,0.55) 12%, #f6f1e6 30%, #f6f1e6 70%, rgba(246,241,230,0.55) 88%, transparent 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(70% 40% at 50% 0%, rgba(184,134,11,0.10), transparent 60%)" }} />
    </div>
  );
}
