import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { LOGO_URL } from "../theme.js";
import { trackShare } from "../lib/tracking.js";
import { supabase } from "../lib/supabase.js";
import { shareNumberSmart } from "../lib/numberCard.js";

// 👑 RoyalShareWidget — לשונית שיתוף מלכותית צפה (ימין), נייד + מחשב.
// סגול-מלכותי + מסגרת זהב + לוגו האתר. משתפת את העמוד הנוכחי (קישור + כותרת).
// מונה קהילתי מוצג רק מעל 20. כל שיתוף מתועד דרך trackShare (פלטפורמה/מכשיר/מקור).
// בעמודי /number/:n מציעה גם "שתף כתמונה" ממותגת. שורת סרטונים — בקרוב.
const HIDE = /^\/(admin|login|profile|traffic|numbers-report|theme-preview|enter|stream|heichal|היכל|galaxy)/;

export default function RoyalShareWidget() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [count, setCount] = useState(0);

  // מונה שיתופים קהילתי (site-wide), נשמר ל-session כדי לא לשאול שוב ושוב
  useEffect(() => {
    let alive = true;
    try {
      const c = sessionStorage.getItem("sod_share_total");
      if (c != null) { setCount(parseInt(c, 10) || 0); return; }
    } catch { /* noop */ }
    if (!supabase) return;
    supabase.from("visitor_events").select("id", { count: "exact", head: true })
      .eq("event_type", "share")
      .then(({ count: c }) => {
        if (!alive || typeof c !== "number") return;
        setCount(c);
        try { sessionStorage.setItem("sod_share_total", String(c)); } catch { /* noop */ }
      });
    return () => { alive = false; };
  }, []);

  const url = typeof window !== "undefined" ? window.location.href : "https://sod1820.co.il";
  const rawTitle = typeof document !== "undefined" ? document.title : "סוד 1820";
  const title = (rawTitle.split(/[|·–—-]/)[0] || "סוד 1820").trim();
  const text = `${title} 👑`;
  const slug = pathname.replace(/^\//, "") || "home";
  const numberId = (pathname.match(/^\/number\/(\d+)/) || [])[1] || null;
  const enc = encodeURIComponent;

  const go = useCallback((platform, href) => {
    trackShare(platform, slug);
    window.open(href, "_blank", "noopener,noreferrer");
  }, [slug]);

  const copyLink = useCallback(() => {
    trackShare("copy", slug);
    try { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); }
    catch { window.prompt("העתיקו את הקישור:", url); }
  }, [slug, url]);

  const shareImage = useCallback(() => {
    if (numberId) shareNumberSmart(Number(numberId), []); // numberCard מתעד trackShare בעצמו
  }, [numberId]);

  if (HIDE.test(pathname)) return null;

  return (
    <>
      {/* לשונית סגורה — כתר למעלה, צמודה לקצה הימני */}
      {!open && (
        <button className="rsw-tab" onClick={() => setOpen(true)} aria-label="שתפו את העמוד">
          <img className="rsw-tab-logo" src={LOGO_URL} alt="" aria-hidden />
          <span className="rsw-tab-lbl">שתפו</span>
        </button>
      )}

      {/* פאנל פתוח */}
      {open && (
        <>
          <div className="rsw-scrim" onClick={() => setOpen(false)} />
          <div className="rsw-panel" role="dialog" aria-modal="true" aria-label="שיתוף">
            <button className="rsw-x" onClick={() => setOpen(false)} aria-label="סגירה">×</button>
            <img className="rsw-logo" src={LOGO_URL} alt="" aria-hidden />
            <h2 className="rsw-h2">הפיצו את האור</h2>
            <p className="rsw-sub">אם התוכן נגע בכם, שתפו אותו עם אחרים.</p>
            {count > 20 && <div className="rsw-cnt">✨ <b>{count.toLocaleString("he-IL")}</b> שיתופים בקהילה</div>}

            <button className="rsw-row" onClick={() => go("whatsapp", `https://wa.me/?text=${enc(text + " " + url)}`)}>
              <span className="rsw-ic wa">🟢</span><span className="rsw-t">וואטסאפ</span><span className="rsw-ar">‹</span>
            </button>
            <button className="rsw-row" onClick={() => go("telegram", `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`)}>
              <span className="rsw-ic tg">✈️</span><span className="rsw-t">טלגרם</span><span className="rsw-ar">‹</span>
            </button>
            <button className="rsw-row" onClick={() => go("facebook", `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`)}>
              <span className="rsw-ic fb">f</span><span className="rsw-t">פייסבוק</span><span className="rsw-ar">‹</span>
            </button>
            <button className="rsw-row" onClick={copyLink}>
              <span className="rsw-ic cp">🔗</span><span className="rsw-t">{copied ? "הקישור הועתק ✓" : "העתק קישור"}</span><span className="rsw-ar">‹</span>
            </button>
            {numberId && (
              <button className="rsw-row" onClick={shareImage}>
                <span className="rsw-ic im">🖼️</span><span className="rsw-t">שתף כתמונה ממותגת</span><span className="rsw-ar">‹</span>
              </button>
            )}
            <div className="rsw-row soon" aria-disabled="true">
              <span className="rsw-ic so">🎬</span><span className="rsw-t">שיתוף סרטונים</span><span className="rsw-soon">בקרוב</span>
            </div>
          </div>
        </>
      )}

      <style>{`
        .rsw-tab { position: fixed; top: 56%; right: 0; transform: translateY(-50%); z-index: 940;
          display: flex; flex-direction: column; align-items: center; gap: 7px; cursor: pointer;
          background: linear-gradient(135deg, #7b4cb0, #3d1f5c); color: #f3e9ff;
          border: 1px solid rgba(233,200,74,0.5); border-right: none; border-radius: 14px 0 0 14px;
          padding: 13px 8px; box-shadow: -6px 0 22px rgba(61,31,92,0.55), 0 0 16px rgba(123,76,176,0.4);
          animation: rsw-pulse 3s ease-in-out infinite; transition: padding .15s; }
        .rsw-tab:hover { padding-right: 12px; }
        .rsw-tab-logo { width: 30px; height: 30px; object-fit: contain; filter: drop-shadow(0 0 6px rgba(233,200,74,0.6)); }
        .rsw-tab-lbl { writing-mode: vertical-rl; text-orientation: mixed; font-family: 'Heebo', sans-serif;
          font-weight: 800; font-size: 17px; letter-spacing: 2px; }
        @keyframes rsw-pulse { 0%,100% { box-shadow: -6px 0 22px rgba(61,31,92,0.55), 0 0 12px rgba(123,76,176,0.35); }
          50% { box-shadow: -6px 0 22px rgba(61,31,92,0.55), 0 0 26px rgba(123,76,176,0.6); } }

        .rsw-scrim { position: fixed; inset: 0; z-index: 9998; background: rgba(6,4,14,0.55);
          backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); animation: rsw-fade .25s both; }
        .rsw-panel { position: fixed; top: 50%; right: 14px; transform: translateY(-50%); z-index: 9999;
          width: min(340px, 88vw); direction: rtl; text-align: center;
          background: linear-gradient(180deg, rgba(34,20,52,0.96), rgba(12,8,20,0.98));
          border: 1px solid rgba(233,200,74,0.34); border-radius: 22px; padding: 24px 20px 18px;
          box-shadow: 0 26px 80px rgba(0,0,0,0.75), inset 0 0 0 1px rgba(233,200,74,0.10), 0 0 50px rgba(123,76,176,0.22);
          animation: rsw-rise .32s cubic-bezier(.2,.8,.2,1) both; }
        .rsw-x { position: absolute; top: 11px; left: 14px; background: none; border: none; color: #b79ad6;
          font-size: 23px; line-height: 1; cursor: pointer; }
        .rsw-logo { width: 60px; height: 60px; object-fit: contain; margin: 2px auto 0; display: block;
          filter: drop-shadow(0 0 16px rgba(233,200,74,0.55)); }
        .rsw-h2 { font-family: 'Heebo', sans-serif; font-weight: 900; font-size: 25px; color: #f6e27a; margin: 8px 0 6px; }
        .rsw-sub { font-family: 'Heebo', sans-serif; font-size: 13.5px; color: #cbb8e6; line-height: 1.6; margin: 0 6px 12px; }
        .rsw-cnt { font-family: 'Heebo', sans-serif; font-size: 13px; color: #c9b6e6; margin-bottom: 16px; }
        .rsw-cnt b { color: #f6e27a; }
        .rsw-row { width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px 14px; margin-bottom: 9px;
          border-radius: 14px; cursor: pointer; background: rgba(123,76,176,0.10);
          border: 1px solid rgba(233,200,74,0.18); color: #ecdcf4; font-family: 'Heebo', sans-serif;
          font-size: 15.5px; font-weight: 600; transition: background .16s, transform .1s; }
        .rsw-row:hover { background: rgba(123,76,176,0.20); transform: translateY(-1px); }
        .rsw-ic { width: 33px; height: 33px; border-radius: 50%; display: inline-flex; align-items: center;
          justify-content: center; font-size: 17px; flex-shrink: 0; color: #fff; }
        .rsw-ic.wa { background: linear-gradient(135deg,#25d366,#0e8a3c); }
        .rsw-ic.tg { background: linear-gradient(135deg,#37aee2,#1c93c8); }
        .rsw-ic.fb { background: linear-gradient(135deg,#1877f2,#0a52b8); font-weight: 800; }
        .rsw-ic.cp { background: rgba(233,200,74,0.22); color: #f6e27a; }
        .rsw-ic.im { background: linear-gradient(135deg,#e9c84a,#9a7818); color: #1a0e00; }
        .rsw-ic.so { background: rgba(123,76,176,0.25); color: #d9c2f5; }
        .rsw-t { flex: 1; text-align: right; }
        .rsw-ar { color: #9a7fc0; font-size: 18px; }
        .rsw-row.soon { cursor: default; opacity: 0.62; border-style: dashed; }
        .rsw-row.soon:hover { background: rgba(123,76,176,0.10); transform: none; }
        .rsw-soon { background: rgba(107,63,160,0.4); border: 1px solid #6b3fa0; color: #e6d6ff;
          font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; }

        @keyframes rsw-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes rsw-rise { from { opacity: 0; transform: translateY(-50%) scale(0.96); } to { opacity: 1; transform: translateY(-50%) scale(1); } }
        @media (max-width: 600px) { .rsw-panel { right: 50%; transform: translate(50%, -50%); }
          @keyframes rsw-rise { from { opacity: 0; transform: translate(50%,-50%) scale(0.96); } to { opacity: 1; transform: translate(50%,-50%) scale(1); } } }
        @media (prefers-reduced-motion: reduce) { .rsw-tab, .rsw-panel, .rsw-scrim { animation: none !important; } }
      `}</style>
    </>
  );
}
