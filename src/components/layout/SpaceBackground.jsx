import React from "react";

// רקע החלל הראשי של האתר — תמונת SVG חללית (public/cosmos-bg.svg):
// מרכז כהה (לקריאוּת התוכן + כיסוי פוסטים ישנים), כוכבים מתרכזים בצדדים,
// זוהר זהב למעלה + סגול מלכותי למטה — מתכתב עם שער הזהב בדף הבית.
// להחלפת הרקע: מחליפים את הקובץ cosmos-bg.svg (לחידוש: node scripts/gen-cosmos.mjs).
export default function SpaceBackground() {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden",
      backgroundColor: "#0C0818",
      backgroundImage: "url(/cosmos-bg.svg)",
      backgroundSize: "cover",
      backgroundPosition: "center center",
    }} />
  );
}
