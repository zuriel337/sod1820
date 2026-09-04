// src/pages/dev/NumberEntityScenePage.jsx
// Admin gate ONLY — same pattern as AdminPage.jsx / GlyphPrototypePage.jsx (useAuth().isAdmin).
// Scene logic lives in components/spatial/NumberEntityGoldenScene.jsx (no auth inside it).
import React, { Suspense } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";

const NumberEntityGoldenScene = React.lazy(() => import("../../components/spatial/NumberEntityGoldenScene.jsx"));

function Center({ children }) {
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#e8dcb6", fontFamily: "system-ui" }}>
      {children}
    </div>
  );
}

export default function NumberEntityScenePage() {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <Center>טוען…</Center>;
  if (!isAdmin) return <Center>אין לך הרשאת ניהול. (Number/Entity Spatial Golden Scene — dev/admin only)</Center>;
  return (
    <Suspense fallback={<Center>טוען עולם מחקר מרחבי…</Center>}>
      <NumberEntityGoldenScene />
    </Suspense>
  );
}
