import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { getSiteFlags } from "../lib/supabase.js";
import { LOGO_URL } from "../theme.js";

// ===== שער-נעילה זמני (תחזוקה/שדרוגים) — מבוסס-דגל DB =====
// עוטף ראוט: אם הדגל (site_flags.<flag>.enabled) פעיל — מציג הודעת "נעול לשדרוגים"
// במקום התוכן. אדמין עוקף (רואה את התוכן). פתיחה = הפיכת enabled=false ב-DB, בלי פריסה.
// עיצוב theme-aware (בהיר+כהה) לפי post_theme_safe_colors_law.

const DEFAULT_MSG = "🔒 האזור נעול זמנית לצורך שדרוגים · חוזרים בקרוב";

export function MaintenanceLock({ message }) {
  return (
    <div className="mlock" role="status" aria-live="polite">
      <style>{`
        .mlock{min-height:72vh;display:flex;flex-direction:column;align-items:center;justify-content:center;
          text-align:center;padding:48px 22px;direction:rtl;
          font-family:'Heebo','Assistant',system-ui,sans-serif;}
        .mlock img{width:88px;height:88px;border-radius:20px;margin-bottom:22px;
          box-shadow:0 12px 36px rgba(0,0,0,.5);}
        .mlock h1{font-size:clamp(20px,5vw,28px);font-weight:800;margin:0 0 12px;color:#f0dc9a;line-height:1.4;}
        .mlock p{font-size:15.5px;line-height:1.95;max-width:470px;margin:0 auto;color:#cdbf9f;}
        .mlock .sub{font-size:13.5px;margin-top:18px;}
        .mlock a{color:#e8c84a;font-weight:800;text-decoration:none;}
        .mlock a:hover{text-decoration:underline;}
        @media (prefers-color-scheme:light){
          .mlock h1{color:#6d4e0b;} .mlock p{color:#33260a;} .mlock a{color:#8a5a0a;}
        }
        :root[data-theme="light"] .mlock h1{color:#6d4e0b;}
        :root[data-theme="light"] .mlock p{color:#33260a;}
        :root[data-theme="light"] .mlock a{color:#8a5a0a;}
        :root[data-theme="dark"] .mlock h1{color:#f0dc9a;}
        :root[data-theme="dark"] .mlock p{color:#cdbf9f;}
        :root[data-theme="dark"] .mlock a{color:#e8c84a;}
      `}</style>
      <img src={LOGO_URL} alt="סוד 1820" />
      <h1>{message || DEFAULT_MSG}</h1>
      <p>אנחנו משדרגים את המערכת כדי לשרת אתכם טוב יותר. האזור הזה יחזור לפעול בקרוב — תודה על הסבלנות.</p>
      <div className="sub"><Link to="/">← לעמוד הבית</Link></div>
    </div>
  );
}

// עטיפה ברמת-הראוט. flag = מפתח ב-site_flags (למשל "lock_reality" / "lock_galleries").
export default function Locked({ flag, children }) {
  const { isAdmin } = useAuth();
  const [st, setSt] = useState({ loading: true, lock: null });
  useEffect(() => {
    let alive = true;
    getSiteFlags()
      .then(f => { if (alive) setSt({ loading: false, lock: f[flag] || null }); })
      .catch(() => { if (alive) setSt({ loading: false, lock: null }); });
    return () => { alive = false; };
  }, [flag]);
  if (st.loading) return null;                         // הבהוב קצר עד שהדגל נטען
  if (st.lock?.enabled && !isAdmin) return <MaintenanceLock message={st.lock.message} />;
  return children;
}
