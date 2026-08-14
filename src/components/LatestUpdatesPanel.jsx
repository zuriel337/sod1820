import React, { useEffect, useState } from "react";
import { fetchHomeUpdates } from "../lib/homeUpdates.js";
import LatestUpdatesRail from "./LatestUpdatesRail.jsx";

// 📜 «עדכונים אחרונים» לשימוש-חוזר בפוסט/צ'אט — עדשה על אותו source/visibility בדיוק כמו הבית
// (fetchHomeUpdates → LatestUpdatesRail הקנוני). אין feed/query/visibility מקבילים: אם הבית מסתיר
// פריט, הוא מוסתר גם כאן. ברירת-מחדל 10 פריטים + «פתח עוד» (limit מועבר לרכיב הקנוני).
export default function LatestUpdatesPanel({ limit = 10 }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    let alive = true;
    fetchHomeUpdates()
      .then((r) => { if (alive) setD(r); })
      .catch(() => { if (alive) setD({ posts: [], hints: [], researchers: [], ciphers: [] }); });
    return () => { alive = false; };
  }, []);
  if (!d) return null;
  return (
    <LatestUpdatesRail heading posts={d.posts} convergences={[]} hints={d.hints}
      researchers={d.researchers} ciphers={d.ciphers} limit={limit} />
  );
}
