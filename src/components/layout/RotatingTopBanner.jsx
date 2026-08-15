import React, { useState, useEffect, useRef } from "react";
import PromoTicker from "./PromoTicker.jsx";
import CipherElulBanner from "../CipherElulBanner.jsx";

// 🔁 רצועה מתחלפת לפוסטים+צ'אט — «או את זה או את זה, לא שניהם» (בקשת צוריאל 15.8.2026).
//   מציג לסירוגין: פעם טיזר-הפרומו («בקרוב») ופעם באנר-הצופן/אלול — אחד בכל רגע, עם דהייה.
//   הטיזר לא מתחלף פנימית (rotate=false) — כל הופעה שלו בוחרת טיזר אקראי; לא מתחלף בזמן שהמודאל פתוח.
const SWAP_MS = 9000;

export default function RotatingTopBanner() {
  const [which, setWhich] = useState(() => Math.floor(Math.random() * 2));   // 0=פרומו · 1=צופן
  const [show, setShow] = useState(true);
  const pausedRef = useRef(false);   // המודאל פתוח → לא מחליפים באמצע

  useEffect(() => {
    const t = setInterval(() => {
      if (pausedRef.current) return;
      setShow(false);
      setTimeout(() => { setWhich(w => (w + 1) % 2); setShow(true); }, 400);
    }, SWAP_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ transition: "opacity .4s ease", opacity: show ? 1 : 0 }}>
      {which === 0
        ? <PromoTicker rotate={false} onOpenChange={(o) => { pausedRef.current = o; }} />
        : <div style={{ padding: "14px 16px 0" }}><CipherElulBanner /></div>}
    </div>
  );
}
