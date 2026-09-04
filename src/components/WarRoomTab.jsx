import React, { useState } from "react";
import CommandRoomUniversalDesk from "./admin/CommandRoomUniversalDesk.jsx";
import CommandRoomOneTree from "./admin/CommandRoomOneTree.jsx";
import KnowledgeControlCenterTab from "./admin/KnowledgeControlCenterTab.jsx";
import WarRoomLegacy from "./WarRoomLegacy.jsx";
import "./admin/CommandRoomDesk.theme.css";

const TAB = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  minHeight: 42,
  padding: "9px 13px",
  borderRadius: 12,
  border: "1px solid rgba(120,145,175,.18)",
  background: "rgba(12,24,40,.75)",
  color: "#aeb9c9",
  cursor: "pointer",
  fontWeight: 900,
  fontSize: 12,
};

export default function WarRoomTab() {
  const [view, setView] = useState("desk");
  return (
    <div dir="rtl" style={{ minWidth: 0 }}>
      <div className="cc-command-tabs" style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <button className="cc-tab-desk" data-active={view === "desk"} onClick={() => setView("desk")} style={{ ...TAB, color: view === "desk" ? "#e3c46d" : TAB.color, borderColor: view === "desk" ? "rgba(227,196,109,.48)" : TAB.border }}>🎛️ עכשיו</button>
        <button className="cc-tab-tree" data-active={view === "tree"} onClick={() => setView("tree")} style={{ ...TAB, color: view === "tree" ? "#70d9a2" : TAB.color, borderColor: view === "tree" ? "rgba(112,217,162,.48)" : TAB.border }}>🌳 העץ האחד</button>
        <button className="cc-tab-gate" data-active={view === "gate"} onClick={() => setView("gate")} style={{ ...TAB, color: view === "gate" ? "#7fb0ff" : TAB.color, borderColor: view === "gate" ? "rgba(127,176,255,.48)" : TAB.border }}>⚖️ שולחן צוריאל</button>
        <button className="cc-tab-advanced" data-active={view === "advanced"} onClick={() => setView("advanced")} style={{ ...TAB, color: view === "advanced" ? "#88d8b1" : TAB.color, borderColor: view === "advanced" ? "rgba(136,216,177,.45)" : TAB.border }}>🧰 מתקדם</button>
        <span className="cc-command-caption" style={{ marginInlineStart: "auto", color: "#7e8999", fontSize: 10.5 }}>אותו Research Intake · אותם מנועים · Reality Graph אחד · Human Gate אחד</span>
      </div>
      {view === "desk" && <CommandRoomUniversalDesk onOpenGate={() => setView("gate")} onOpenAdvanced={() => setView("advanced")} />}
      {view === "tree" && <CommandRoomOneTree onOpenGate={() => setView("gate")} />}
      {view === "gate" && <KnowledgeControlCenterTab />}
      {view === "advanced" && <WarRoomLegacy />}
    </div>
  );
}
