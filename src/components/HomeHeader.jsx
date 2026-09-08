import React from "react";
import HomeHeaderBase from "./HomeHeaderBase.jsx";

// 🚧 PUBLIC_TRAFFIC_SURFACE_PAUSE_EXPERIMENT_V1
// רק כותרת דופק-האתר מקבלת מצב-בנייה; שאר כותרות הבית נשארות קנוניות ללא שינוי.
export default function HomeHeader(props) {
  if (String(props.title || "").includes("דופק האתר")) {
    return (
      <HomeHeaderBase
        {...props}
        title="🚧 דופק האתר — אזור בבנייה"
        sub="אזור הפעילות עובר שדרוג. נתוני התנועה ממשיכים להימדד ברקע לצורך הבדיקה, אך אינם מוצגים כאן כרגע."
      />
    );
  }
  return <HomeHeaderBase {...props} />;
}
