import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import WorldZviApprovedFindings2029 from "../../src/components/research/WorldZviApprovedFindings2029.jsx";
import "../../src/pages/world2029-human.css";
import "../../src/pages/worldComposition2029.css";

createRoot(document.getElementById("root")).render(
  <BrowserRouter><main className="sod29-root" dir="rtl"><WorldZviApprovedFindings2029 /></main></BrowserRouter>
);
