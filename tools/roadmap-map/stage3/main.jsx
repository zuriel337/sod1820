// Stage 3 dev-only entry point. Not part of the app build, not imported by
// anything under src/, not wired into any route. Served only by pointing a
// local `vite` dev server at the repo root and opening this file's path —
// see tools/roadmap-map/README.md for the exact command.
import React from "react";
import { createRoot } from "react-dom/client";
import RoadmapUniverse3D from "./RoadmapUniverse3D.jsx";

createRoot(document.getElementById("root")).render(<RoadmapUniverse3D />);
