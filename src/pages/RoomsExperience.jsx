import React from "react";
import { Navigate } from "react-router-dom";

// SEO_GATE_RETIRED_ROUTE: / — legacy multi-room compatibility redirect
// RETIRED BY HUMAN GATE (2026-09-15): legacy multi-room 3D experience removed.
export default function RoomsExperience() {
  return <Navigate to="/" replace />;
}
