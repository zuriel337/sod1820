import React from "react";
import { Navigate } from "react-router-dom";

// SEO_GATE_RETIRED_ROUTE: / — legacy room-entry compatibility redirect
// RETIRED BY HUMAN GATE (2026-09-15): legacy 3D room entry removed.
export default function RoomEnter() {
  return <Navigate to="/" replace />;
}
