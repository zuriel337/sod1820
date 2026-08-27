import React, { useEffect, useState } from "react";
import UpgradeTicker from "./UpgradeTicker.jsx";
import LiveActivityBar from "./LiveActivityBar.jsx";

// 🔀 טיקר-על מתחלף (בקשת צוריאל) — רצועה גלובלית אחת שמתחלפת:
//    פעם «בונים את 2.0» (UpgradeTicker) ופעם טיקר-החדשות (LiveActivityBar —
//    עדכוני-אתר · רמזים מזרם המציאות · שידורי channel_updates כמו רמז שחר קנדרו).
//    מתחלף כל ~14ש׳; עוצר בטאב מוסתר. מתחיל מרצועת-הבנייה.
const PERIOD_MS = 14000;

export default function AlternatingTicker() {
  const [showNews, setShowNews] = useState(false);
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) setShowNews(s => !s); }, PERIOD_MS);
    return () => clearInterval(t);
  }, []);
  return showNews ? <LiveActivityBar /> : <UpgradeTicker />;
}
