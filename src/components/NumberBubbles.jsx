import React from "react";
import NumberBubblesBase from "./NumberBubblesBase.jsx";

// 🚧 PUBLIC_TRAFFIC_SURFACE_PAUSE_EXPERIMENT_V1
// משטח "המספרים החמים באתר עכשיו" מושעה זמנית כדי שלא ליצור אינדקס קישורים דינמי בזמן הניסוי.
// כל שימוש אחר ב-NumberBubbles נשאר זהה.
export default function NumberBubbles(props) {
  if (String(props.title || "").includes("המספרים החמים באתר עכשיו")) return null;
  return <NumberBubblesBase {...props} />;
}
