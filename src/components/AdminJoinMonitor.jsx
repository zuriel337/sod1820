import React, { useEffect, useState } from "react";
import { C, F } from "../theme.js";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../lib/AuthContext.jsx";

// מוניטור אדמין חי — מונה מנויים (סה״כ + היום) שמתעדכן בזמן אמת ומקפיץ פרטים
// בכל הצטרפות חדשה. גלוי לאדמין בלבד; RLS מבטיח שרק אדמין מקבל את האירועים.
export default function AdminJoinMonitor() {
  const { isAdmin } = useAuth();
  const [total, setTotal] = useState(null);
  const [today, setToday] = useState(0);
  const [toast, setToast] = useState(null);   // הצטרפות חדשה: { email, name }
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;

    (async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const { count: tot } = await supabase.from("subscribers").select("id", { count: "exact", head: true });
      const { count: tod } = await supabase.from("subscribers").select("id", { count: "exact", head: true }).gte("created_at", start.toISOString());
      if (alive) { setTotal(tot ?? 0); setToday(tod ?? 0); }
    })();

    const ch = supabase
      .channel("admin-subs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "subscribers" }, ({ new: row }) => {
        setTotal(t => (t ?? 0) + 1);
        setToday(t => t + 1);
        setToast({ email: row?.email, name: row?.name });
        setPulse(true); setTimeout(() => setPulse(false), 2200);
        setTimeout(() => setToast(null), 9000);
      })
      .subscribe();

    return () => { alive = false; try { supabase.removeChannel(ch); } catch { /* ignore */ } };
  }, [isAdmin]);

  if (!isAdmin || total == null) return null;

  return (
    <div style={{ position: "fixed", left: 14, bottom: 14, zIndex: 380, direction: "rtl", display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
      {toast && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "linear-gradient(160deg, rgba(30,22,6,0.98), rgba(10,7,0,0.98))",
          border: `1px solid ${C.borderGold}`, borderRadius: 12, padding: "9px 14px",
          boxShadow: `0 12px 36px rgba(0,0,0,0.6), 0 0 22px rgba(212,175,55,0.3)`,
          animation: "ajm-in .45s cubic-bezier(.2,.8,.2,1)", maxWidth: "78vw",
        }}>
          <span style={{ fontSize: 18 }}>✉️</span>
          <span style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 13, fontWeight: 700 }}>
            הצטרפות חדשה: <span style={{ color: C.goldLight }} dir="ltr">{toast.name || toast.email || "מנוי חדש"}</span>
          </span>
        </div>
      )}
      <div title="מנויים — מתעדכן בזמן אמת" style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        background: "rgba(10,7,0,0.92)", border: `1px solid ${pulse ? C.gold : C.border}`,
        borderRadius: 999, padding: "7px 14px", backdropFilter: "blur(6px)",
        boxShadow: pulse ? `0 0 22px rgba(212,175,55,0.5)` : "0 6px 20px rgba(0,0,0,0.45)",
        transition: "border-color .3s, box-shadow .3s",
      }}>
        <span style={{ fontSize: 14, transition: "transform .3s", transform: pulse ? "scale(1.3)" : "none" }}>🔔</span>
        <span style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>
          מנויים: <b style={{ color: C.goldBright }}>{total.toLocaleString("he")}</b>
          <span style={{ color: C.goldDim }}> · היום {today.toLocaleString("he")}</span>
        </span>
      </div>
      <style>{`@keyframes ajm-in { from { opacity:0; transform: translateX(-12px) } to { opacity:1; transform:none } }`}</style>
    </div>
  );
}
