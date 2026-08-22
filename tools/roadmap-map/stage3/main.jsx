// Dev-only harness for src/components/admin/RoadmapMap3D.jsx — the canonical
// component now lives in src/ (mounted for real inside RoadmapCommandCenter,
// the "🎛️ חדר המפקדה" admin tab). This file just gives it a bare full-height
// shell for isolated local smoke-testing, without needing an authenticated
// admin session. Not part of the app build, not wired into any route.
// Served only by pointing a local `vite` dev server at the repo root and
// opening this file's path — see tools/roadmap-map/stage3/README.md.
import React from "react";
import { createRoot } from "react-dom/client";
import RoadmapMap3D from "../../../src/components/admin/RoadmapMap3D.jsx";

createRoot(document.getElementById("root")).render(<RoadmapMap3D height="100vh" />);
