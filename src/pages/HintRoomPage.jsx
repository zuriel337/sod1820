import React from "react";
import { Navigate } from "react-router-dom";

// SEO_GATE_RETIRED_ROUTE: / — legacy hint-room compatibility redirect
// RETIRED BY HUMAN GATE (2026-09-15): legacy 3D hint room removed.
export default function HintRoomPage() {
  return <Navigate to="/" replace />;
}
