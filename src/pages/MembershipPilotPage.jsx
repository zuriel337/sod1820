import React, { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { C, F } from "../theme.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";

const REF_PATTERN = /^SODM-[0-9a-f-]{36}$/;

export default function MembershipPilotPage() {
  const { user, isAdmin } = useAuth();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const loadStatus = useCallback(async (providerRef = null) => {
    if (!supabase || !user) return null;
    const { data, error } = await supabase.rpc("membership_pilot_status", { p_provider_ref: providerRef });
    if (error) throw error;
    setStatus(data || null);
    return data;
  }, [user]);

  useEffect(() => {
    if (!user || !isAdmin || !supabase || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const providerRef = params.get("ref") || "";
    if (payment === "failed") {
      setMessage("התשלום לא הושלם ולא נוצר מנוי.");
      window.history.replaceState({}, "", "/membership-pilot");
      loadStatus().catch(() => {});
      return;
    }
    if (payment !== "success" || !REF_PATTERN.test(providerRef)) {
      loadStatus().catch(() => {});
      return;
    }

    let cancelled = false;
    setMessage("התשלום חזר בהצלחה. מאמתים את העסקה ואת ה־Token מול Cardcom…");
    (async () => {
      for (let index = 0; index < 12 && !cancelled; index += 1) {
        const current = await loadStatus(providerRef).catch(() => null);
        if (current?.status === "active") {
          setMessage("המנוי הופעל בהצלחה.");
          window.history.replaceState({}, "", "/membership-pilot");
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 1250));
      }
      if (!cancelled) setMessage("האימות עדיין בעיבוד. אפשר לרענן בעוד רגע.");
    })();
    return () => { cancelled = true; };
  }, [isAdmin, loadStatus, user]);

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  async function start() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("no_session");
      const response = await fetch("/api/cardcom-subscription-start", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 409) {
        await loadStatus(data?.ref || null);
        setMessage("כבר קיימת בדיקת מנוי בחשבון הזה.");
        return;
      }
      if (!response.ok || !data?.url) throw new Error(data?.error || "start_failed");
      window.location.assign(data.url);
    } catch {
      setMessage("לא הצלחנו לפתוח את דף Cardcom. לא בוצע חיוב.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (busy) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("membership_pilot_cancel");
      if (error) throw error;
      setStatus(current => ({ ...(current || {}), ...data }));
      setMessage("הביטול נרשם. לא יתבצע חיוב נוסף לאחר סוף התקופה הנוכחית.");
    } catch {
      setMessage("הביטול לא נשמר. לא בוצע שינוי.");
    } finally {
      setBusy(false);
    }
  }

  const active = status?.status === "active" || status?.status === "past_due";
  const box = { background: "linear-gradient(170deg,#141021,#0b0814)", border: `1px solid ${C.border}`, borderRadius: 18, padding: "24px" };
  return (
    <main dir="rtl" style={{ maxWidth: 620, margin: "0 auto", padding: "40px 16px 100px", color: C.goldLight }}>
      <section style={box}>
        <div style={{ color: C.gold, fontFamily: F.heading, fontSize: 12, letterSpacing: 2 }}>בדיקת מנהל סגורה</div>
        <h1 style={{ color: C.goldBright, fontFamily: F.regal, marginBottom: 8 }}>מנוי בדיקה · ₪2 לחודש</h1>
        <p style={{ fontFamily: F.body, lineHeight: 1.8, color: C.muted }}>
          ₪2 יחויבו היום. לאחר מכן ₪2 יחויבו אוטומטית מדי חודש, עד לביטול. הכרטיס מוזן רק בדף המאובטח של Cardcom ואינו נשמר ב־SOD1820.
        </p>
        <p style={{ fontFamily: F.body, lineHeight: 1.7, color: "#e8c98c" }}>
          לצורך הבדיקה יש להזין כרטיס אשראי רגיל. אין לבחור Bit, Apple Pay או Google Pay, מפני שהפיילוט דורש יצירת Token לחידוש.
        </p>

        {status?.status && status.status !== "none" ? (
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, margin: "18px 0" }}>
            <div>מצב: <b>{status.status}</b></div>
            {status.current_period_end ? <div>סוף התקופה: {new Date(status.current_period_end).toLocaleString("he-IL")}</div> : null}
            {status.next_charge_at && !status.cancel_at_period_end ? <div>חיוב הבא: {new Date(status.next_charge_at).toLocaleString("he-IL")}</div> : null}
            {status.cancel_at_period_end ? <div>החידוש בוטל לסוף התקופה.</div> : null}
          </div>
        ) : null}

        {!active && status?.status !== "pending" ? (
          <button onClick={start} disabled={busy} style={{ width: "100%", border: 0, borderRadius: 14, padding: 15, cursor: busy ? "wait" : "pointer", background: `linear-gradient(135deg,${C.gold},${C.goldLight})`, color: "#1a0e00", fontFamily: F.ui, fontSize: 17, fontWeight: 900 }}>
            {busy ? "פותח Cardcom…" : "פתיחת מנוי בדיקה ב־₪2"}
          </button>
        ) : null}
        {active && !status?.cancel_at_period_end ? (
          <button onClick={cancel} disabled={busy} style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 14, padding: 13, cursor: busy ? "wait" : "pointer", background: "transparent", color: "#e7b0b0", fontFamily: F.ui, fontWeight: 800 }}>
            ביטול החידוש הבא
          </button>
        ) : null}
        {message ? <div role="status" style={{ marginTop: 14, fontFamily: F.body, lineHeight: 1.7 }}>{message}</div> : null}
      </section>
    </main>
  );
}
