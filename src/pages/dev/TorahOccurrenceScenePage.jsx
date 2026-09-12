// src/pages/dev/TorahOccurrenceScenePage.jsx
// Canonical dev scene remains admin-gated. Branch-only ?mockup=1 bypasses that gate ONLY on this
// unmerged preview branch so ZURIEL can inspect the interactive WebGL mockup from mobile without
// altering the public route/product. Do not merge this bypass to production.
import React, { Suspense } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";

const TorahOccurrenceScene = React.lazy(() => import("../../components/spatial/TorahOccurrenceScene.jsx"));
const CipherSpatialMockupPage = React.lazy(() => import("./CipherSpatialMockupPage.jsx"));

function Center({ children }) {
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#e8dcb6", fontFamily: "system-ui" }}>
      {children}
    </div>
  );
}

export default function TorahOccurrenceScenePage() {
  const isMockup = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mockup") === "1";
  const { isAdmin, loading } = useAuth();

  if (isMockup) {
    return (
      <Suspense fallback={<Center>טוען מוקאפ תלת־ממדי…</Center>}>
        <CipherSpatialMockupPage />
      </Suspense>
    );
  }

  if (loading) return <Center>טוען…</Center>;
  if (!isAdmin) return <Center>אין לך הרשאת ניהול. (Torah Occurrence Spatial Adapter — dev/admin only)</Center>;
  return (
    <Suspense fallback={<Center>טוען קורפוס תורה מרחבי…</Center>}>
      <TorahOccurrenceScene />
    </Suspense>
  );
}
