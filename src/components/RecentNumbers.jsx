import React from "react";
import RecentNumbersBase from "./RecentNumbersBase.jsx";

// 🚧 PUBLIC_TRAFFIC_SURFACE_PAUSE_EXPERIMENT_V1
// בעמוד הבית לא מרנדרים את רשימת המספרים שנפתחו ולכן אין polling ואין רשימת קישורים דינמית.
// בשאר המשטחים הרכיב הקיים נשמר ללא שינוי.
function isHomeSurface() {
  if (typeof window === "undefined") return false;
  const p = window.location.pathname;
  return p === "/" || p === "/home-new" || p === "/בית-חדש";
}

export default function RecentNumbers(props) {
  if (isHomeSurface()) return null;
  return <RecentNumbersBase {...props} />;
}
