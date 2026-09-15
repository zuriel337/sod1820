import React from "react";
import { Navigate } from "react-router-dom";

// SEO_GATE_RETIRED_ROUTE: /research — legacy galaxy room compatibility redirect
// RETIRED BY HUMAN GATE (2026-09-15): legacy galaxy room removed.
export default function GalaxyRoom() {
  return <Navigate to="/research" replace />;
}
