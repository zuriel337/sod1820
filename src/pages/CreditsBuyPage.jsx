import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";

// 💳 רכישת קרדיטים — תשלום ידני (ביט/פייבוקס או העברה בנקאית).
// הגולש בוחר חבילה → רואה פרטי-תשלום → מעביר → לוחץ «העברתי» → נוצרת בקשה ממתינה,
// וצוריאל מאשר בטאב-האדמין «💳 אישורי תשלום» → הקרדיטים נזקפים אוטומטית.
export default function CreditsBuyPage() {
  const { user, profile } = useAuth();
  const [pkgs, setPkgs] = useState([]);
  const [pay, setPay] = useState(null);
  const [sel, setSel] = useState(null);          // חבילה נבחרת
  const [method, setMethod] = useState("bit");
  const [ref, setRef] = useState("");
  const [proofUrl, setProofUrl] = useState("");  // צילום התשלום (URL)
  const [uploading, setUploading] = useState(false);
  const [state, setState] = useState("idle");    // idle | sending | sent
  const [err, setErr] = useState("");

  async function onProof(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) { setErr("קובץ תמונה בלבד"); return; }
    if (f.size > 8 * 1024 * 1024) { setErr("התמונה גדולה מדי (עד 8MB)"); return; }
    setErr(""); setUploading(true);
    try {
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `sod1820/payments/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("gallery").upload(path, f, { contentType: f.type, upsert: false });
      if (error) throw error;
      setProofUrl(supabase.storage.from("gallery").getPublicUrl(path).data?.publicUrl || "");
    } catch { setErr("ההעלאה נכשלה, נסו שוב"); }
    setUploading(false);
  }

  useEffect(() => {
    if (!supabase) return;
    supabase.rpc("credit_packages_list").then(({ data }) => {
      setPkgs(data?.packages || []);
      setPay(data?.pay || null);
    }).catch(() => {});
  }, []);

  async function submit() {
    if (!sel) return;
    setErr(""); setState("sending");
    const { error } = await supabase.rpc("credit_purchase_request", {
      p_package_id: sel.id, p_method: method, p_reference: ref || null, p_proof_url: proofUrl || null,
    });
    if (error) { setErr(error.message || "אירעה שגיאה, נסו שוב"); setState("idle"); return; }
    setState("sent");
  }

  const box = { background: "linear-gradient(170deg,#141021,#0b0814)", border: `1px solid ${C.border}`, borderRadius: 18, padding: "clamp(18px,4vw,30px)" };
  const rowBtn = (active) => ({
    cursor: "pointer", textAlign: "right", width: "100%", display: "flex", alignItems: "center", gap: 12,
    background: active ? "rgba(212,175,55,0.14)" : "transparent",
    border: `1.5px solid ${active ? C.gold : C.border}`, borderRadius: 14, padding: "14px 16px",
    color: C.goldLight, fontFamily: F.body, transition: "all .15s",
  });

  return (
    <div style={{ direction: "rtl", maxWidth: 640, margin: "0 auto", padding: "clamp(20px,5vw,44px) 16px 90px", boxSizing: "border-box" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 4, marginBottom: 8 }}> סוד 1820</div>
        <h1 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(24px,5vw,38px)", fontWeight: 700, margin: 0 }}>💎 רכישת קרדיטים</h1>
        {user && profile && (
          <div style={{ color: C.muted, fontFamily: F.heading, fontSize: 14, marginTop: 10 }}>
            היתרה שלך: <b style={{ color: C.gold }}>{profile.credits ?? 0} קרדיטים</b>
          </div>
        )}
      </div>

      {/* לא מחובר → שער הרשמה */}
      {!user && (
        <div style={{ ...box, textAlign: "center", marginBottom: 20 }}>
          <div style={{ color: C.goldLight, fontFamily: F.body, fontSize: 15, lineHeight: 1.7, marginBottom: 14 }}>
            כדי לרכוש קרדיטים צריך חשבון (חינם). נרשמים ומקבלים מיד <b style={{ color: C.gold }}>200 קרדיטים מתנה</b> 🎁
          </div>
          <Link to="/join?src=credits" style={{ display: "inline-block", background: `linear-gradient(135deg,${C.gold},${C.goldLight})`, color: "#1a0e00", textDecoration: "none", fontFamily: F.heading, fontWeight: 800, borderRadius: 999, padding: "12px 30px" }}>הרשמה חינם ←</Link>
        </div>
      )}

      {/* אחרי שליחה */}
      {state === "sent" ? (
        <div style={{ ...box, textAlign: "center" }}>
          <div style={{ fontSize: 44 }}>✅</div>
          <h2 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 22, margin: "10px 0" }}>הבקשה נשלחה!</h2>
          <p style={{ color: C.goldLight, fontFamily: F.body, fontSize: 15, lineHeight: 1.8 }}>
            אחרי שנוודא את התשלום, <b style={{ color: C.gold }}>{sel?.credits} הקרדיטים</b> ייזקפו לחשבונך.
            בדרך-כלל תוך זמן קצר. תודה! 🙏
          </p>
          <Link to="/profile" style={{ color: C.gold, fontFamily: F.heading, fontSize: 14 }}>לאזור האישי ←</Link>
        </div>
      ) : (
        <>
          {/* חבילות */}
          <div style={{ display: "grid", gap: 12, marginBottom: 22 }}>
            {pkgs.map(p => (
              <button key={p.id} onClick={() => setSel(p)} style={rowBtn(sel?.id === p.id)}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${sel?.id === p.id ? C.gold : C.border}`, flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {sel?.id === p.id && <div style={{ width: 11, height: 11, borderRadius: "50%", background: C.gold }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 18, fontWeight: 800 }}>{p.credits.toLocaleString()} קרדיטים</div>
                  {p.label && <div style={{ color: C.gold, fontFamily: F.heading, fontSize: 12 }}>{p.label}</div>}
                </div>
                <div style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 22, fontWeight: 700 }}>₪{p.price_ils}</div>
              </button>
            ))}
          </div>

          {/* פרטי-תשלום — מוצג אחרי בחירת חבילה */}
          {sel && pay && (
            <div style={{ ...box, marginBottom: 18 }}>
              <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
                שלב 1 · שלמו ₪{sel.price_ils}
              </div>

              {/* בחירת אמצעי */}
              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                {[["bit", "🟣 ביט / פייבוקס"], ["bank", "🏦 העברה בנקאית"]].map(([m, lbl]) => (
                  <button key={m} onClick={() => setMethod(m)} style={{
                    flex: 1, cursor: "pointer", borderRadius: 12, padding: "10px 8px", fontFamily: F.heading, fontSize: 13.5, fontWeight: 700,
                    border: `1.5px solid ${method === m ? C.gold : C.border}`,
                    background: method === m ? "rgba(212,175,55,0.14)" : "transparent",
                    color: method === m ? C.goldBright : C.muted,
                  }}>{lbl}</button>
                ))}
              </div>

              {method === "bit" ? (
                <div style={{ background: "rgba(212,175,55,0.06)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, marginBottom: 4 }}>ביט / פייבוקס למספר:</div>
                  <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 26, fontWeight: 700, letterSpacing: 1, direction: "ltr" }}>{pay.bit_number}</div>
                  <div style={{ color: C.gold, fontFamily: F.body, fontSize: 13, marginTop: 4 }}>על שם {pay.account_name}</div>
                </div>
              ) : (
                <div style={{ background: "rgba(212,175,55,0.06)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", display: "grid", gap: 6 }}>
                  <PayLine label="בנק" val={pay.bank_name} />
                  <PayLine label="סניף" val={pay.bank_branch} />
                  <PayLine label="חשבון" val={pay.bank_account} ltr />
                  <PayLine label="על שם" val={pay.account_name} />
                </div>
              )}
              {pay.note && <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, marginTop: 10 }}>{pay.note}</div>}

              {/* שלב 2 — אישור */}
              <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 15, fontWeight: 700, margin: "20px 0 10px" }}>
                שלב 2 · לאחר התשלום
              </div>
              {/* צירוף צילום התשלום */}
              <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", border: `1.5px dashed ${proofUrl ? C.gold : C.border}`, borderRadius: 12, padding: "13px", marginBottom: 12, color: proofUrl ? C.gold : C.goldLight, fontFamily: F.heading, fontSize: 14, background: proofUrl ? "rgba(212,175,55,0.08)" : "transparent" }}>
                {uploading ? "⏳ מעלה…" : proofUrl ? "✅ צילום התשלום צורף — אפשר להחליף" : "📎 צרפו צילום של התשלום (ביט/העברה)"}
                <input type="file" accept="image/*" onChange={onProof} style={{ display: "none" }} disabled={uploading} />
              </label>
              {proofUrl && (
                <div style={{ textAlign: "center", marginBottom: 12 }}>
                  <img src={proofUrl} alt="צילום תשלום" style={{ maxWidth: 180, maxHeight: 180, borderRadius: 10, border: `1px solid ${C.border}` }} />
                </div>
              )}
              <input
                value={ref} onChange={e => setRef(e.target.value)} dir="rtl"
                placeholder="הערה / אסמכתא (אופציונלי) — למשל 4 ספרות אחרונות"
                style={{ width: "100%", boxSizing: "border-box", background: "#0d0a16", border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 14px", color: C.goldLight, fontFamily: F.body, fontSize: 15, marginBottom: 12 }}
              />
              {err && <div style={{ color: "#e08a8a", fontFamily: F.heading, fontSize: 13, marginBottom: 10 }}>{err}</div>}
              <button
                disabled={!user || state === "sending"}
                onClick={submit}
                style={{
                  width: "100%", cursor: user ? "pointer" : "not-allowed",
                  background: user ? `linear-gradient(135deg,${C.gold},${C.goldLight})` : "#2a2233",
                  color: user ? "#1a0e00" : C.muted, border: "none", borderRadius: 14, padding: "15px", fontFamily: F.heading, fontSize: 16, fontWeight: 800,
                  opacity: state === "sending" ? 0.6 : 1,
                }}
              >
                {state === "sending" ? "שולח…" : user ? "✅ שילמתי — שלחו לאישור" : "התחברו כדי להמשיך"}
              </button>
              <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12, textAlign: "center", marginTop: 10, lineHeight: 1.6 }}>
                אין חיוב אוטומטי — הקרדיטים ייזקפו ידנית לאחר אימות התשלום.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PayLine({ label, val, ltr }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <span style={{ color: C.muted, fontFamily: F.body, fontSize: 13 }}>{label}</span>
      <b style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 15, direction: ltr ? "ltr" : "rtl" }}>{val}</b>
    </div>
  );
}
