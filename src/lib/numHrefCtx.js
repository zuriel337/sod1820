import { createContext, useContext } from "react";

// 🔗 כתובת-מספר תלוית-הקשר (מודול זעיר נפרד כדי לא לגרור את EntityPage):
//   • עמוד עצמאי → /number/:n
//   • בתוך המעבדה → הקישורים נשארים בפנים (/research?tool=number&n=…)
// המודול קל → ניתן לייבא ב-NumberTool בלי לטעון את כל קוד דף-המספר (EntityPage נטען lazy).
export const NumHrefCtx = createContext((n) => `/number/${n}`);
export const useNumHref = () => useContext(NumHrefCtx);

// 🧭 כתובות-שלד מודעות-היכל — כדי שכל ניווט (מספר · מסע · מחשבון · מנוע-מספרים) יישאר בתוך
// «סביבת המחקר» כשנמצאים בה, ולא יזרוק החוצה. במצב עצמאי — הכתובות הרגילות. נגזר מה-numHref
// (בתוך המעבדה הוא מייצר «/research…» → hub=true).
export function useHubHrefs() {
  const numHref = useContext(NumHrefCtx);
  const hub = String(numHref("_")).includes("/research");
  return {
    num: numHref,
    hub,
    root: hub ? "/research?tool=number" : "/number",
    calc: hub ? "/research?tool=midrash&tab=calc" : "/beit-midrash?tab=calc",
    journey: (x) => hub ? `/research?tool=journey&q=${encodeURIComponent(x)}` : `/journey?from=${encodeURIComponent(x)}`,
    numbers: (x) => hub ? `/research?tool=number&n=${encodeURIComponent(x)}` : `/numbers?n=${encodeURIComponent(x)}`,
  };
}
