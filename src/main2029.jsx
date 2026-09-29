import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App2029 from "./App2029.jsx";
import { initRuntimeErrorCapture } from "./lib/tracking.js";

initRuntimeErrorCapture();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App2029 />
  </StrictMode>,
);
