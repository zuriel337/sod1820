import { createContext, useContext } from "react";

// 🔗 כתובת-מספר תלוית-הקשר (מודול זעיר נפרד כדי לא לגרור את EntityPage):
//   • עמוד עצמאי → /number/:n
//   • בתוך המעבדה → הקישורים נשארים בפנים (/research?tool=number&n=…)
// המודול קל → ניתן לייבא ב-NumberTool בלי לטעון את כל קוד דף-המספר (EntityPage נטען lazy).
export const NumHrefCtx = createContext((n) => `/number/${n}`);
export const useNumHref = () => useContext(NumHrefCtx);
