import React, { Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { SectionHeader } from "../components/ui.jsx";

const NumberTree = lazy(() => import("../features/numbertree/NumberTree.jsx"));

export default function NumbersPage() {
  return (
    <div style={{ direction: "rtl", maxWidth: 1100, margin: "0 auto", padding: "56px 18px 96px", position: "relative", zIndex: 1 }}>
      <SectionHeader eyebrow="מפת קשרים" title="🌳 עץ המספרים" />
      <p style={{ color: C.goldDim, fontFamily: F.body, fontSize: 16, lineHeight: 2, textAlign: "center", maxWidth: 640, margin: "-24px auto 36px" }}>
        כל מספר הוא צומת חי. גרור לסיבוב, התקרב, ולחץ על צומת כדי לחשוף את השורש, המשמעות והקשרים שלו —
        רשת אחת שמחברת מספרים, מושגים ואירועים.
      </p>
      <Suspense fallback={<div style={{ height: 560, borderRadius: 12, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.goldDim, fontFamily: F.heading, letterSpacing: 2 }}>טוען את עץ המספרים…</div>}>
        <NumberTree height={560} />
      </Suspense>
      <div style={{ textAlign: "center", marginTop: 28, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Link to="/timeline" style={{ color: C.goldBright, textDecoration: "none", fontFamily: F.heading, fontSize: 13, fontWeight: 700, border: `1px solid ${C.borderGold}`, borderRadius: 6, padding: "10px 18px" }}>חיבור למסע התדר →</Link>
        <Link to="/members" style={{ color: C.goldDim, textDecoration: "none", fontFamily: F.heading, fontSize: 13, fontWeight: 700, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 18px" }}>העץ המתקדם · בני ההיכל</Link>
      </div>
    </div>
  );
}
