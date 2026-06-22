import { useState, useEffect } from "react";

// hook קטן לשאילתת מדיה — מחזיר true/false ומתעדכן בשינוי גודל מסך.
// משמש להפרדת מודעות: אנקור תחתון = מובייל, מודעת צד 300×600 = דסקטופ רחב.
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    setMatches(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);
  return matches;
}
