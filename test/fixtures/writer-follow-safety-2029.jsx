import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../../src/lib/AuthContext.jsx";
import WatchButton from "../../src/components/WatchButton.jsx";
function Review() {
  return <main dir="rtl">{["normal", "mini", "checkbox", "gate"].map(variant => <section key={variant} data-variant={variant}>
    <h2>{variant}</h2><WatchButton topic={`author:בדיקה-${variant}`} source="writer-follow-safety-fixture" label="מעקב בדיקה"
      variant={variant === "mini" ? "mini" : null} checkbox={variant === "checkbox"} gate={variant === "gate"} noPush />
  </section>)}</main>;
}
createRoot(document.getElementById("root")).render(<BrowserRouter><AuthProvider><Review /></AuthProvider></BrowserRouter>);
