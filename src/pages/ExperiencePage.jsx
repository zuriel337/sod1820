import React from "react";
import { Navigate } from "react-router-dom";

// SEO_GATE_RETIRED_ROUTE: / — legacy 3D experience compatibility redirect
// RETIRED BY HUMAN GATE (2026-09-15): legacy 3D experience removed.
export default function ExperiencePage() {
  return <Navigate to="/" replace />;
}
