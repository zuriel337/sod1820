import React from "react";

// רקע גלובלי לכל הדפים הכהים (מרונדר ב-Layout): רקיע סגול-מלכותי עמום.
// שכבות: בסיס סגול-שחור → קו-רקיע לילי חינמי (CC0) בדואוטון סגול, עדין מאוד →
// זוהר זהב עדין למעלה. עדין כדי לא להפריע לקריאה.
// להחלפת התמונה: public/city-bg.jpg (קו-רקיע לילה). isolation:isolate מבודד את ה-blend.
export default function SpaceBackground() {
  return (
    <div aria-hidden style={{
      position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden", isolation: "isolate",
      background: "radial-gradient(120% 80% at 50% -8%, #1A1230 0%, #0C0818 55%, #07050e 100%)",
    }}>
      {/* קו-רקיע לילי עמום בתחתית */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "url(/city-bg.jpg)", backgroundSize: "cover", backgroundPosition: "center bottom",
        filter: "grayscale(1) contrast(1.05) brightness(0.5)", opacity: 0.16,
      }} />
      {/* גוון סגול-מלכותי (דואוטון) */}
      <div style={{
        position: "absolute", inset: 0, mixBlendMode: "color",
        background: "linear-gradient(180deg, #3a1f6e, #7b4cb0)", opacity: 0.5,
      }} />
      {/* זוהר זהב עדין למעלה (מתכתב עם שער הזהב) */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(70% 42% at 50% 0%, rgba(233,200,74,0.10), transparent 62%)",
      }} />
    </div>
  );
}
