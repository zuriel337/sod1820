import React from "react";
import { Navigate } from "react-router-dom";

// RETIRED BY HUMAN GATE (2026-09-15): legacy 3D room entry removed.
export default function RoomEnter() {
  return <Navigate to="/" replace />;
}
