import React, { useEffect, useState } from "react";
import UpgradeTicker from "./UpgradeTicker.jsx";
import LiveActivityBar from "./LiveActivityBar.jsx";

// 🔀 טיקר-על מתחלף (בקשת צוריאל) — רצועה גלובלית אחת שמתחלפת:
//    פעם «בונים את 2.0» (UpgradeTicker) ופעם טיקר-החדשות (LiveActivityBar —
//    עדכוני-אתר · רמזים מזרם המציאות · שידורי channel_updates כמו רמז שחר קנדרו).
//    מתחלף כל ~24ש׳ (זמן לקרוא); עוצר בטאב מוסתר. מתחיל מטיקר-הרמזים ואז בנייה (בקשת צוריאל).
const PERIOD_MS = 24000;

export default function AlternatingTicker() {
  const [showNews, setShowNews] = useState(true);
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) setShowNews(s => !s); }, PERIOD_MS);
    return () => clearInterval(t);
  }, []);
  return showNews ? <LiveActivityBar /> : <UpgradeTicker />;
}
