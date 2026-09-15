import React from "react";
import { Navigate } from "react-router-dom";

// RETIRED BY HUMAN GATE (2026-09-15): the legacy 3D/convergence-tree Numbers surface is removed.
// Preserve the public entry by sending visitors to the canonical number entry.
export default function NumbersPage() {
  return <Navigate to="/number" replace />;
}
