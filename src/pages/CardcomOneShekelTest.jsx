import React, { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";

// Isolated admin-only UI. The server independently enforces admin_only package id 5.
// No automatic payment is initiated by opening the page.
export default function CardcomOneShekelTest() {
  const { user, profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("");
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (params.get("payment") === "failed") { setPaymentStatus("התשלום לא הושלם"); return; }
    if (params.get("payment") !== "success" || !/^SODC-[0-9a-f-]{36}$/.test(ref || "")) return;
    let active = true;
    (async () => {
      setPaymentStatus("מאמתים את העסקה מול השרת...");
      for (let i = 0; i < 12 && active; i++) {
        const { data } = await supabase.rpc("cardcom_purchase_status", { p_provider_ref: ref });
        if (data?.status === "approved") { setPaymentStatus("התשלום אומת והקרדיטים נוספו לחשבון"); return; }
        await new Promise(r => setTimeout(r, 1300));
      }
      if (active) setPaymentStatus("האימות עדיין בתהליך. אין לבצע תשלום נוסף לפני בדיקת העסקה.");
    })();
    return () => { active = false; };
  }, [user]);
  const isAdmin = profile?.role === "admin" || profile?.is_admin === true;
  async function start() {
    if (!user || !isAdmin || !confirmed || busy) return;
    setBusy(true); setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error("יש להתחבר מחדש");
      const response = await fetch("/api/cardcom-start", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ package_id: 5 })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.url) throw new Error("לא ניתן לפתוח תשלום: " + (result.error || response.status));
      const url = new URL(result.url);
      if (url.protocol !== "https:" || url.hostname !== "secure.cardcom.solutions") throw new Error("כתובת סליקה לא תקינה");
      window.location.assign(url.href);
    } catch (e) { setError(String(e.message || e)); setBusy(false); }
  }
  return <main dir="rtl" style={{maxWidth:520,margin:"60px auto",padding:28,border:"1px solid #a88b3d",borderRadius:18,color:"#f5e5b2",background:"#17131e",fontFamily:"Arial,sans-serif"}}>
    <h1>בדיקת סליקה · ₪1</h1>
    <p>דף זמני ומבודד למנהל בלבד. פתיחת הדף אינה מחייבת כסף.</p>
    {!user ? <p>יש להתחבר לחשבון מנהל לפני הבדיקה.</p> :
      !isAdmin ? <p>אין הרשאת מנהל לחשבון המחובר. לא ניתן להמשיך.</p> :
      <><p>בלחיצה תועבר לדף המאובטח של Cardcom לחיוב של שקל אחד. הקרדיט יינתן רק לאחר אימות העסקה בצד השרת.</p>
        <label style={{display:"block",marginBottom:20}}><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> אני מאשר פתיחת עמוד תשלום בסך ₪1</label>
        <button type="button" disabled={!confirmed || busy} onClick={start} style={{padding:"13px 24px",borderRadius:10,cursor:"pointer"}}>{busy?"פותח...":"לפתיחת תשלום ₪1"}</button></>}
    {paymentStatus && <p role="status">{paymentStatus}</p>}
    {error && <p role="alert" style={{color:"#ffb1b1"}}>{error}</p>}
    <p style={{fontSize:12,opacity:.8}}>לתשומת לב: חיוב יתבצע רק אם תאשר את העסקה אצל ספק הסליקה. תוצאת התשלום תוצג במסך הקרדיטים הקיים.</p>
  </main>;
}