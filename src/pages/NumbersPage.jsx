import React, { Suspense } from "react";
import { C, F } from "../theme.js";

// 🌳 עץ המספרים — כרגע מציג את *עץ ההתכנסויות* העשיר (כל ההתכנסויות החזקות עם חוטים),
// עד שנסדר את המספרים ונחבר את התצוגה הממוקדת-למספר לגרף החי.
// התצוגה הממוקדת הישנה נשמרה ב-features/numbertree/NumberGraph.jsx לחזרה עתידית.
const ConvergenceGalaxy = React.lazy(() => import("../components/ConvergenceGalaxy.jsx"));

export default function NumbersPage() {
  return (
    <Suspense fallback={
      <div style={{ height: "calc(100vh - 120px)", minHeight: 520, display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle at 50% 40%, #0d0a04, #05030a)", color: C.goldDim, fontFamily: F.heading, fontSize: 14, letterSpacing: 2 }}>
        טוען את עץ ההתכנסויות…
      </div>
    }>
      <ConvergenceGalaxy level={3} clean />
    </Suspense>
  );
}
