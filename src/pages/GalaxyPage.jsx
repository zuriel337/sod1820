import React from "react";
import { Navigate } from "react-router-dom";

// SEO_GATE_RETIRED_ROUTE: /research — legacy galaxy/3D compatibility redirect
// RETIRED BY HUMAN GATE (2026-09-15): legacy galaxy/3D presentation removed.
export default function GalaxyPage() {
  return <Navigate to="/research" replace />;
}
