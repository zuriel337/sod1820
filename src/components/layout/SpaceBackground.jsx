import React from "react";

// רקע גלובלי לכל הדפים הכהים (מרונדר ב-Layout): מעוף-ציפור סגול-מלכותי, עדין.
// שכבות: בסיס סגול-שחור → תמונה אווירית (CC BY-SA, public/city-bg.jpg) בדואוטון
// סגול כהה → כיסוי כהה במרכז (איפה שהטקסט) כך שהבניינים מציצים רק בצדדים → זוהר
// זהב עדין למעלה. כך התוכן תמיד קריא והעיר מרחפת בשוליים.
// קרדיט תמונה: "Nighttime Downtown Atlanta Aerial" · Wikimedia Commons · CC BY-SA 2.0.
export default function SpaceBackground() {
  return (
    <div aria-hidden style={{
      position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden", isolation: "isolate",
      background: "radial-gradient(120% 80% at 50% -8%, #1A1230 0%, #0C0818 55%, #07050e 100%)",
    }}>
      {/* תמונה אווירית, כהה מאוד */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "url(/city-bg.jpg)", backgroundSize: "cover", backgroundPosition: "center",
        filter: "grayscale(1) contrast(1.1) brightness(0.32)", opacity: 0.30,
      }} />
      {/* גוון סגול-מלכותי (דואוטון) */}
      <div style={{
        position: "absolute", inset: 0, mixBlendMode: "color",
        background: "linear-gradient(180deg, #3a1f6e, #7b4cb0)", opacity: 0.5,
      }} />
      {/* כיסוי כהה במרכז (טור התוכן) — הבניינים מציצים רק בצדדים */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(90deg, transparent 0%, rgba(12,8,24,0.5) 10%, #0C0818 28%, #0C0818 72%, rgba(12,8,24,0.5) 90%, transparent 100%)",
      }} />
      {/* זוהר זהב עדין למעלה */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(70% 42% at 50% 0%, rgba(233,200,74,0.10), transparent 62%)",
      }} />
    </div>
  );
}
