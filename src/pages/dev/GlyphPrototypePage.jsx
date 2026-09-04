// src/pages/dev/GlyphPrototypePage.jsx
// Admin gate ONLY — same pattern as AdminPage.jsx (`useAuth().isAdmin`).
// Real scene logic lives in components/dev/GlyphPrototypeScene.jsx (kept separate,
// no auth inside it), per Spatial 3D Slice 0 frozen contract, work_log 64651438 BEFORE.
import React, { Suspense } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";

const GlyphPrototypeScene = React.lazy(() => import("../../components/dev/GlyphPrototypeScene.jsx"));

function Center({ children }) {
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#e8dcb6", fontFamily: "system-ui" }}>
      {children}
    </div>
  );
}

export default function GlyphPrototypePage() {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <Center>טוען…</Center>;
  if (!isAdmin) return <Center>אין לך הרשאת ניהול. (10K Glyph Runtime Prototype — dev/admin only)</Center>;
  return (
    <Suspense fallback={<Center>טוען אב-טיפוס…</Center>}>
      <GlyphPrototypeScene />
    </Suspense>
  );
}
