import React, { useCallback, useEffect, useRef, useState } from "react";
import Sod2029Shell, { FrameState } from "../components/experience2029/Sod2029Shell.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";

const PILOT_PATH = "/2029/membership-pilot";
const REF_PATTERN = /^SODM-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const STATUS_LABELS = {
  none: "אין מנוי פעיל", pending: "ממתין לאימות העסקה", active: "פעיל",
  renewing: "חיוב נמצא בעיבוד", past_due: "נדרשת בדיקת חיוב", cancelled: "בוטל",
};

function recordDate(value) {
  const date = new Date(value);
  if (!value || !Number.isFinite(date.getTime())) return "—";
  const options = { dateStyle: "medium", timeZone: "Asia/Jerusalem" };
  return new Intl.DateTimeFormat("he-IL-u-ca-hebrew", options).format(date) + " · " +
    new Intl.DateTimeFormat("he-IL", { ...options, timeStyle: "short" }).format(date);
}

export default function MembershipPilotPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const principal = useRef(null);
  principal.current = isAdmin && !authLoading ? user?.id : null;
  const [snapshot, setSnapshot] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const status = snapshot?.userId === principal.current ? snapshot.data : null;

  const loadStatus = useCallback(async (providerRef = null) => {
    const userId = user?.id;
    if (!supabase || !isAdmin || !userId || principal.current !== userId) return null;
    const { data, error } = await supabase.rpc("membership_pilot_status", { p_provider_ref: providerRef });
    if (error) throw error;
    if (principal.current !== userId) return null;
    setSnapshot({ userId, data: data || null });
    return data;
  }, [isAdmin, user?.id]);

  // Cardcom's redirect is not proof of payment. On a protected Preview the
  // external webhook may be denied by Vercel; the returning owner's browser can
  // invoke the same GetLpResult verifier without exposing any token or card data.
  const reconcile = useCallback(async (current) => {
    const userId = user?.id;
    if (!current?.low_profile_id || current.status !== "pending" || principal.current !== userId) return;
    const { data } = await supabase.auth.getSession();
    if (principal.current !== userId || !data?.session?.access_token) return;
    await fetch("/api/cardcom-subscription-webhook", {
      method: "POST",
      headers: { Authorization: "Bearer " + data.session.access_token, "Content-Type": "application/json" },
      body: JSON.stringify({ LowProfileId: current.low_profile_id }),
    });
  }, [user?.id]);

  useEffect(() => {
    setSnapshot(null);
    setMessage("");
    setBusy(false);
    setLoadFailed(false);
    if (authLoading || !isAdmin || !user?.id) return;
    const userId = user.id;
    let stopped = false;
    const params = new URLSearchParams(window.location.search);
    const providerRef = params.get("ref");
    const payment = params.get("payment");
    (async () => {
      try {
        let current = await loadStatus(REF_PATTERN.test(providerRef || "") ? providerRef : null);
        if (stopped || principal.current !== userId) return;
        if (payment === "success" && REF_PATTERN.test(providerRef || "")) {
          setMessage("מאמתים את העסקה מול Cardcom. החזרה לאתר לבדה אינה אישור תשלום.");
          await reconcile(current);
          for (let index = 0; index < 12 && !stopped && principal.current === userId; index += 1) {
            current = await loadStatus(providerRef);
            if (stopped || principal.current !== userId) return;
            if (current?.status === "active") {
              setMessage("העסקה אומתה והמנוי הופעל.");
              window.history.replaceState({}, "", PILOT_PATH);
              return;
            }
            await new Promise(resolve => setTimeout(resolve, 1250));
          }
          if (!stopped && principal.current === userId) setMessage("האימות טרם הושלם. אפשר לבדוק שוב; לא נפתח תשלום נוסף.");
        } else if (payment === "failed") {
          setMessage("דף התשלום דיווח שלא הושלם. מצב המנוי נקבע רק לפי אימות השרת.");
          window.history.replaceState({}, "", PILOT_PATH);
        }
      } catch {
        if (!stopped && principal.current === userId) {
          setLoadFailed(true);
          setMessage("נתוני הפיילוט אינם זמינים עדיין. לא נפתח דף תשלום.");
        }
      }
    })();
    return () => { stopped = true; };
  }, [authLoading, isAdmin, user?.id, loadStatus, reconcile]);

  async function start() {
    if (busy || status?.status !== "none" || !principal.current) return;
    const userId = principal.current;
    setBusy(true);
    setMessage("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token || principal.current !== userId) return;
      const response = await fetch("/api/cardcom-subscription-start", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      });
      const data = await response.json().catch(() => ({}));
      if (principal.current !== userId) return;
      if (response.status === 409) {
        await loadStatus(data?.ref || null);
        setMessage("כבר קיימת בדיקת מנוי בחשבון הזה. לא ייפתח תשלום נוסף.");
        return;
      }
      if (data?.error === "pilot_not_ready") {
        setMessage("הפיילוט סגור עד להשלמת אישור המסוף והגדרות הבטיחות.");
        return;
      }
      if (!response.ok || !data?.url) throw new Error("start_failed");
      const target = new URL(data.url);
      if (target.origin !== "https://secure.cardcom.solutions" || target.username || target.password) throw new Error("unsafe_payment_url");
      window.location.assign(target.href);
    } catch {
      if (principal.current === userId) setMessage("לא ניתן לפתוח כעת את דף Cardcom. אפשר לבדוק שוב את מצב הפיילוט.");
    } finally {
      if (principal.current === userId) setBusy(false);
    }
  }

  async function refresh() {
    if (busy || !principal.current) return;
    const userId = principal.current;
    setBusy(true);
    try {
      const current = await loadStatus();
      await reconcile(current);
      await loadStatus();
      if (principal.current === userId) {
        setLoadFailed(false);
        setMessage("מצב המנוי נקרא מחדש מהשרת.");
      }
    } catch {
      if (principal.current === userId) setMessage("לא ניתן לאמת כעת את מצב המנוי.");
    } finally {
      if (principal.current === userId) setBusy(false);
    }
  }

  async function cancel() {
    if (busy || !principal.current || !window.confirm("לבטל את החידוש הבא של מנוי הבדיקה?")) return;
    const userId = principal.current;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("membership_pilot_cancel");
      if (error) throw error;
      await loadStatus();
      if (principal.current === userId) setMessage("הביטול נשמר. החידוש הבא לא יחויב.");
    } catch {
      if (principal.current === userId) setMessage("הביטול לא אושר. יש לבדוק שוב את מצב המנוי.");
    } finally {
      if (principal.current === userId) setBusy(false);
    }
  }

  if (authLoading) return <div dir="rtl" role="status">בודקים את הרשאת הכניסה…</div>;
  if (!user || !isAdmin) return <Sod2029Shell title="פיילוט סגור למנהל בלבד" eyebrow="2029 · גישה מוגבלת" surface="home">
    <section className="sod29-section" data-membership-pilot-access="denied">
      <p>הפיילוט אינו פתוח להרשמה ציבורית.</p>
      {!user ? <p>אפשר להתחבר לחשבון מנהל דרך האזור האישי שבסרגל, ולהישאר במסך הזה.</p> : null}
    </section>
  </Sod2029Shell>;

  const active = ["active", "past_due"].includes(status?.status);
  return <Sod2029Shell title="מנוי ניסיון · ₪4 לחודש" eyebrow="2029 · פיילוט מנהל סגור"
    description="בדיקת הצטרפות מאובטחת. אין שינוי במחירי המוצר או פתיחה לציבור."
    surface="home" status="ADMIN · CLOSED">
    <section className="sod29-section" data-membership-pilot="2029">
      <div className="sod29-card">
        <h2>₪4 היום, ולאחר מכן ₪4 מדי חודש עד לביטול</h2>
        <p>את פרטי הכרטיס מזינים רק בדף המאובטח של Cardcom. מספר הכרטיס וקוד האבטחה אינם נשמרים ב־SOD1820.</p>
        <p>יש להשתמש בכרטיס אשראי רגיל. Bit, Apple Pay ו־Google Pay אינם מסלולי הפיילוט.</p>
        <p>זהו פיילוט מנהל סגור. החידוש החודשי פועל רק בפריסת Production שאושרה במפורש; בכל Preview הוא חסום. אפשר לבטל את החידוש הבא מהמסך הזה.</p>
        {!status ? <FrameState kind={loadFailed ? "error" : "loading"} title={loadFailed ? "הפיילוט עדיין אינו זמין" : "ממתינים לנתוני הפיילוט"}>פתיחת התשלום חסומה עד שהשרת יאשר את המצב.</FrameState> :
          <dl aria-label="מצב המנוי">
            <dt>מצב</dt><dd>{STATUS_LABELS[status.status] || "נדרשת בדיקה"}</dd>
            {status.current_period_end ? <><dt>סוף התקופה</dt><dd>{recordDate(status.current_period_end)}</dd></> : null}
            {status.next_charge_at && !status.cancel_at_period_end ? <><dt>מועד החיוב הבא המתוכנן</dt><dd>{recordDate(status.next_charge_at)}</dd></> : null}
            {status.cancel_at_period_end ? <><dt>חידוש</dt><dd>בוטל; לא יתבצע חיוב נוסף.</dd></> : null}
          </dl>}
        <div className="sod29-actions">
          {status?.status === "none" ? <button type="button" className="sod29-action" onClick={start} disabled={busy}>
            {busy ? "פותחים דף מאובטח…" : "פתיחת מנוי ניסיון ב־₪4"}
          </button> : null}
          {active && !status?.cancel_at_period_end ? <button type="button" className="sod29-action" onClick={cancel} disabled={busy}>ביטול החידוש הבא</button> : null}
          <button type="button" className="sod29-action" onClick={refresh} disabled={busy}>בדיקת מצב ואימות עסקה</button>
        </div>
        {message ? <p role="status">{message}</p> : null}
      </div>
    </section>
  </Sod2029Shell>;
}
