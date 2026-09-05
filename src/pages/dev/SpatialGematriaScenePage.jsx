// src/pages/dev/SpatialGematriaScenePage.jsx
// Admin gate ONLY — same pattern as AdminPage.jsx / NumberEntityScenePage.jsx (useAuth().isAdmin).
// Scene logic lives in components/spatial/SpatialGematriaScene.jsx (no auth inside it).
import React, { Suspense } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";

const SpatialGematriaScene = React.lazy(() => import("../../components/spatial/SpatialGematriaScene.jsx"));

function Center({ children }) {
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#e8dcb6", fontFamily: "system-ui" }}>
      {children}
    </div>
  );
}

export default function SpatialGematriaScenePage() {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <Center>טוען…</Center>;
  if (!isAdmin) return <Center>אין לך הרשאת ניהול. (Spatial Gematria Golden Slice — dev/admin only)</Center>;
  return (
    <Suspense fallback={<Center>טוען מציאות מחקרית מרחבית…</Center>}>
      <SpatialGematriaScene />
    </Suspense>
  );
}
