import React from "react";

// 2029 cleanup (ZURIEL Human Gate, 15.9.2026):
// The legacy "Latest Updates" projection is no longer shown inside the historical chat page
// or beside legacy Post pages. The canonical Home/Global Now surface owns current system updates.
// Keep this component as a compatibility no-op so the legacy page structure can remain intact
// while the ten-year OpenWeb/Spot.IM conversation and post routes are preserved untouched.
//
// Chat needs one extra compatibility rule: its desktop grid used to reserve a 320px column whose
// only remaining content was this panel. Collapse that empty column without changing the chat
// module, route, post id, OpenWeb launcher, or stored conversation history.
export default function LatestUpdatesPanel() {
  return (
    <style>{`
      .side-updates { display: none !important; }
      .sod-chat-latest-mobile { display: none !important; }
      .sod-chat-videos { display: none !important; }
      .sod-chat-grid { display: block !important; }
    `}</style>
  );
}
