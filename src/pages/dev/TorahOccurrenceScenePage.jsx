// src/pages/dev/TorahOccurrenceScenePage.jsx
// Admin gate ONLY — same pattern as AdminPage.jsx / prior spatial-slice dev pages (useAuth().isAdmin).
import React, { Suspense } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";

const TorahOccurrenceScene = React.lazy(() => import("../../components/spatial/TorahOccurrenceScene.jsx"));

function Center({ children }) {
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#e8dcb6", fontFamily: "system-ui" }}>
      {children}
    </div>
  );
}

export default function TorahOccurrenceScenePage() {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <Center>טוען…</Center>;
  if (!isAdmin) return <Center>אין לך הרשאת ניהול. (Torah Occurrence Spatial Adapter — dev/admin only)</Center>;
  return (
    <Suspense fallback={<Center>טוען קורפוס תורה מרחבי…</Center>}>
      <TorahOccurrenceScene />
    </Suspense>
  );
}
