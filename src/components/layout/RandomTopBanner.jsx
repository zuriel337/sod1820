import React, { useState } from "react";
import PromoTicker from "./PromoTicker.jsx";
import CipherElulBanner from "../CipherElulBanner.jsx";

// 🎲 רצועה אקראית לפוסטים+צ'אט — «או את זה או את זה» (בקשת צוריאל 15.8.2026).
//   בכל טעינת-עמוד נבחר *אחד* מהשניים, והוא נשאר קבוע לאותה כניסה (בלי החלפה חיה):
//   פעם המבקר רואה את טיזר-הפרומו («בקרוב»), פעם את באנר-הצופן/אלול. 50/50.
export default function RandomTopBanner() {
  const [which] = useState(() => (Math.random() < 0.5 ? 0 : 1));   // נקבע פעם אחת בטעינה
  return which === 0
    ? <PromoTicker />
    : <div style={{ padding: "14px 16px 0" }}><CipherElulBanner /></div>;
}
