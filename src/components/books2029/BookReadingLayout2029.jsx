import React from "react";
import "./bookReadingLayout2029.css";

export default function BookReadingLayout2029({ mode, onMode }) {
  return <nav className="books29-reading-layout-control" aria-label="רוחב הקריאה במחשב">
    <span>סידור הקריאה</span>
    <button type="button" aria-pressed={mode === "balanced"} onClick={() => onMode("balanced")}>מקור והסבר</button>
    <button type="button" aria-pressed={mode === "source"} onClick={() => onMode("source")}>מקור רחב</button>
  </nav>;
}
