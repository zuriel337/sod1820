import React from "react";
import roadmapMd from "../../../SOD1820_MASTER_ROADMAP.md?raw";

// Legacy 3D roadmap visualization was intentionally retired by Human Gate.
// This component remains a read-only text projection of the canonical Roadmap only.
export default function RoadmapCommandCenter() {
  return (
    <section style={{
      direction: "rtl",
      background: "#11131b",
      color: "#dbe0ee",
      border: "1px solid rgba(232,200,74,.14)",
      borderRadius: 16,
      padding: 18,
      fontFamily: "Heebo, system-ui, sans-serif",
    }}>
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        alignItems: "center",
        marginBottom: 14,
        padding: "10px 13px",
        borderRadius: 12,
        border: "1px solid rgba(232,200,74,.3)",
        background: "rgba(232,200,74,.08)",
      }}>
        <strong style={{ color: "#e8c84a" }}>👁️ תצוגת אדמין · קריאה בלבד</strong>
        <span style={{ color: "#9aa2b6", fontSize: 13 }}>SOD1820_MASTER_ROADMAP.md · מקור יחיד</span>
        <a
          href="https://github.com/zuriel337/sod1820/blob/main/SOD1820_MASTER_ROADMAP.md"
          target="_blank"
          rel="noreferrer"
          style={{ marginInlineStart: "auto", color: "#8ab4ff", textDecoration: "none", fontSize: 12 }}
        >
          קובץ המקור ↗
        </a>
      </div>
      <pre style={{
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        margin: 0,
        padding: 14,
        borderRadius: 10,
        background: "#0b0d14",
        border: "1px solid rgba(255,255,255,.08)",
        color: "#cdd3e2",
        fontFamily: "Heebo, system-ui, sans-serif",
        fontSize: 13,
        lineHeight: 1.7,
      }}>
        {roadmapMd}
      </pre>
    </section>
  );
}
