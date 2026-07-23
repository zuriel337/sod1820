import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { trackShare } from "../lib/tracking.js";
import { taggedShareUrl } from "../lib/propagation.js";
import { supabase } from "../lib/supabase.js";
import { shareNumberSmart } from "../lib/numberCard.js";
import { canNativeShare, nativeShare as sNativeShare, copyLink as sCopyLink, floatingShareShown, CHANNELS } from "../lib/share.js";

// 👑 RoyalShareWidget — לשונית שיתוף מלכותית צפה (ימין), נייד + מחשב.
// סגול-שחור עמוק + זהב + לוגו האתר. משתפת את העמוד הנוכחי (קישור + כותרת).
// שורת מותגים עם אייקוני SVG אמיתיים (וואטסאפ/טלגרם/פייסבוק/X/אימייל), פעולות
// (העתק קישור / תמונה מעוצבת / שיתוף מערכת), ובקרוב (סרטון מפוסט / רשת תמונות).
// מונה קהילתי מוצג רק מעל 20. כל שיתוף מתועד דרך trackShare.
// /number — לדף המספר יש שיתוף-הירו עשיר משלו (תמונת-מספר), אז הצף מוסתר שם (בלי כפילות).
// ⛔ היכן הצף מוסתר = מקור-האמת היחיד `floatingShareShown` ב-lib/share.js (share_placement_law).
//    ShareActions קורא לאותה פונקציה ועושה את ההיפך → מנגנון אחד, אפס כפילות, אפס הגדרה-לכל-דף.

// אייקוני-מותג מגיעים מ-CHANNELS ב-lib/share.js (מקור-אמת יחיד המשותף עם ShareActions).
function BrandSvg({ path }) {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor" aria-hidden focusable="false">
      <path d={path} />
    </svg>
  );
}

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
    // RPC במקום SELECT ישיר — אנונימי חסום מ-visitor_events (היה מפיל שגיאות בלוג).
    supabase.rpc("community_share_count")
      .then(({ data }) => {
        const c = typeof data === "number" ? data : parseInt(data, 10);
        if (!alive || !Number.isFinite(c)) return;
        setCount(c);
        try { sessionStorage.setItem("sod_share_total", String(c)); } catch { /* noop */ }
      });
    return () => { alive = false; };
  }, []);

  // בסיס-הקישור; כל ערוץ מקבל תיוג rid+src משלו דרך taggedShareUrl (מקור-אמת משותף עם ShareActions)
  const base = typeof window !== "undefined" ? window.location.href : "https://sod1820.co.il";
  const rawTitle = typeof document !== "undefined" ? document.title : "סוד 1820";
  const title = (rawTitle.split(/[|·–—-]/)[0] || "סוד 1820").trim();
  const text = `${title} 👑`;
  const slug = pathname.replace(/^\//, "") || "home";
  // מונה השיתופים הקהילתי מוצג רק בדף הבית — לא על פוסטים/דפים אחרים
  // (אחרת אותו מספר site-wide נראה כאילו הוא של הפוסט הנוכחי).
  const isHome = pathname === "/" || pathname === "/home-new" || pathname === "/בית-חדש";
  const numberId = (pathname.match(/^\/number\/(\d+)/) || [])[1] || null;
  const canNative = canNativeShare();

  // כל הערוצים מ-CHANNELS (מקור-אמת יחיד, משותף עם ShareActions) — הוספה/עריכה שם מתעדכנת כאן וגם בשורה
  const SOCIALS = Object.entries(CHANNELS).map(([key, m]) => ({ key, label: m.label, svg: m.svg, brand: m.brand, href: m.href(taggedShareUrl(base, key), text) }));

  // מגדיל את מונה השיתופים הויזואלי של הפוסט (אם הדף הנוכחי הוא פוסט) — no-op אחרת.
  const bumpPostShare = useCallback(() => {
    try { supabase?.rpc("increment_post_share_by_slug", { p_slug: slug }); } catch { /* noop */ }
  }, [slug]);

  const go = useCallback((platform, href) => {
    trackShare(platform, slug); bumpPostShare();
    window.open(href, "_blank", "noopener,noreferrer");
  }, [slug, bumpPostShare]);

  const copyLink = useCallback(async () => {
    trackShare("copy", slug); bumpPostShare();
    const copyUrl = taggedShareUrl(base, "copy");
    if (await sCopyLink(copyUrl)) { setCopied(true); setTimeout(() => setCopied(false), 1600); }
    else window.prompt("העתיקו את הקישור:", copyUrl);
  }, [slug, base, bumpPostShare]);

  const shareImage = useCallback(() => {
    if (numberId) shareNumberSmart(Number(numberId), []); // numberCard מתעד trackShare בעצמו
  }, [numberId]);

  const nativeShare = useCallback(() => {
    trackShare("native", slug); bumpPostShare();
    sNativeShare({ title, text, url: taggedShareUrl(base, "native") });   // לוגיקת-שיתוף קנונית (lib/share.js)
  }, [slug, title, text, base, bumpPostShare]);

  if (!floatingShareShown(pathname)) return null;

  return (
    <>
      {/* לשונית סגורה — כתר למעלה, צמודה לקצה הימני */}
      {!open && (
        <button className="rsw-tab" onClick={() => setOpen(true)} aria-label="שתפו את העמוד">
          <img className="rsw-tab-logo" src="/logo.png" alt="" aria-hidden />
          <span className="rsw-tab-lbl">שתפו</span>
        </button>
      )}

      {/* פאנל פתוח */}
      {open && (
        <>
          <div className="rsw-scrim" onClick={() => setOpen(false)} />
          <div className="rsw-panel" role="dialog" aria-modal="true" aria-label="שיתוף">
            <button className="rsw-x" onClick={() => setOpen(false)} aria-label="סגירה">×</button>
            <img className="rsw-logo" src="/crown.png" alt="" aria-hidden />
            <h2 className="rsw-h2">הפיצו את האור</h2>
            <p className="rsw-sub">אם התוכן נגע בכם, שתפו אותו עם אחרים.</p>
            {isHome && count > 20 && <div className="rsw-cnt">✨ <b>{count.toLocaleString("he-IL")}</b> שיתופים בקהילה</div>}

            {/* שורת מותגים — אייקונים אמיתיים */}
            <div className="rsw-strip">
              {SOCIALS.map(s => (
                <button key={s.key} className="rsw-soc" style={{ background: s.brand }} title={s.label} aria-label={s.label}
                  onClick={() => go(s.key, s.href)}>
                  <BrandSvg path={s.svg} />
                </button>
              ))}
            </div>

            {/* פעולות פעילות */}
            <button className="rsw-row" onClick={copyLink}>
              <span className="rsw-ic cp">🔗</span><span className="rsw-t">{copied ? "הקישור הועתק ✓" : "העתק קישור"}</span><span className="rsw-ar">‹</span>
            </button>
            {numberId && (
              <button className="rsw-row" onClick={shareImage}>
                <span className="rsw-ic im">🖼️</span><span className="rsw-t">צור תמונה מעוצבת</span><span className="rsw-ar">‹</span>
              </button>
            )}
            {canNative && (
              <button className="rsw-row" onClick={nativeShare}>
                <span className="rsw-ic mo">📲</span><span className="rsw-t">עוד אפליקציות…</span><span className="rsw-ar">‹</span>
              </button>
            )}

            {/* בקרוב */}
            <div className="rsw-soon-h">בקרוב ✨</div>
            <div className="rsw-row soon" aria-disabled="true">
              <span className="rsw-ic so">🎬</span><span className="rsw-t">צור סרטון מפוסט</span><span className="rsw-soon">בקרוב</span>
            </div>
            <div className="rsw-row soon" aria-disabled="true">
              <span className="rsw-ic so">🕸️</span><span className="rsw-t">רשת תמונות</span><span className="rsw-soon">בקרוב</span>
            </div>
          </div>
        </>
      )}

      <style>{`
        .rsw-tab { position: fixed; top: 56%; right: 0; transform: translateY(-50%); z-index: 940;
          display: flex; flex-direction: column; align-items: center; gap: 7px; cursor: pointer;
          background: linear-gradient(135deg, #5a3494, #2a1244); color: #f3e9ff;
          border: 1px solid rgba(233,200,74,0.55); border-right: none; border-radius: 14px 0 0 14px;
          padding: 13px 8px; box-shadow: -6px 0 22px rgba(20,10,40,0.6), 0 0 16px rgba(123,76,176,0.35);
          animation: rsw-pulse 3s ease-in-out infinite; transition: padding .15s; }
        .rsw-tab:hover { padding-right: 12px; }
        .rsw-tab-logo { width: 30px; height: 30px; object-fit: contain; filter: drop-shadow(0 0 6px rgba(233,200,74,0.6)); }
        .rsw-tab-lbl { writing-mode: vertical-rl; text-orientation: mixed; font-family: 'Heebo', sans-serif;
          font-weight: 800; font-size: 17px; letter-spacing: 2px; }
        @keyframes rsw-pulse { 0%,100% { box-shadow: -6px 0 22px rgba(20,10,40,0.6), 0 0 12px rgba(123,76,176,0.3); }
          50% { box-shadow: -6px 0 22px rgba(20,10,40,0.6), 0 0 26px rgba(233,200,74,0.4); } }
        /* 📱 מובייל: מציגים רק את המילה «שתפו» (בלי הכתר) — הכתר נקרא כמו לוגו ולא כמו
           שיתוף, והמילה צרה מהכתר אז הטאב נשאר קומפקטי ולא מכסה טקסט (members/verse/
           reveal/cross/map). בדסקטופ (מעל 560px) נשאר כתר + «שתפו» כרגיל. */
        @media (max-width:560px){
          .rsw-tab { padding:13px 6px; gap:0; border-radius:11px 0 0 11px; opacity:.94; }
          .rsw-tab-logo { display:none; }
          .rsw-tab-lbl { font-size:14px; letter-spacing:1.5px; }
        }

        .rsw-scrim { position: fixed; inset: 0; z-index: 9998; background: rgba(6,4,14,0.62);
          backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); animation: rsw-fade .25s both; }
        .rsw-panel { position: fixed; top: 50%; right: 14px; transform: translateY(-50%); z-index: 9999;
          width: min(346px, 89vw); max-height: 92vh; overflow-y: auto; direction: rtl; text-align: center;
          background: linear-gradient(180deg, rgba(22,14,36,0.985), rgba(8,5,15,0.99));
          border: 1px solid rgba(233,200,74,0.4); border-radius: 22px; padding: 22px 18px 16px;
          box-shadow: 0 26px 80px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(233,200,74,0.12), 0 0 60px rgba(90,52,148,0.22);
          animation: rsw-rise .32s cubic-bezier(.2,.8,.2,1) both; }
        .rsw-x { position: absolute; top: 11px; left: 14px; background: none; border: none; color: #b79ad6;
          font-size: 23px; line-height: 1; cursor: pointer; }
        .rsw-logo { width: 56px; height: 56px; object-fit: contain; margin: 2px auto 0; display: block;
          filter: drop-shadow(0 0 16px rgba(233,200,74,0.55)); }
        .rsw-h2 { font-family: 'Heebo', sans-serif; font-weight: 900; font-size: 24px; color: #f6e27a; margin: 7px 0 5px;
          text-shadow: 0 1px 14px rgba(233,200,74,0.25); }
        .rsw-sub { font-family: 'Heebo', sans-serif; font-size: 13.5px; color: #cbb8e6; line-height: 1.6; margin: 0 6px 10px; }
        .rsw-cnt { font-family: 'Heebo', sans-serif; font-size: 13px; color: #c9b6e6; margin-bottom: 12px; }
        .rsw-cnt b { color: #f6e27a; }

        /* שורת מותגים */
        .rsw-strip { display: flex; justify-content: center; gap: 11px; margin: 6px 0 16px; flex-wrap: wrap; }
        .rsw-soc { width: 46px; height: 46px; border-radius: 50%; display: inline-flex; align-items: center;
          justify-content: center; cursor: pointer; color: #fff; border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 3px 12px rgba(0,0,0,0.4); transition: transform .14s, box-shadow .14s, filter .14s; }
        .rsw-soc:hover { transform: translateY(-2px); filter: brightness(1.08);
          box-shadow: 0 6px 18px rgba(0,0,0,0.5), 0 0 0 2px rgba(233,200,74,0.5); }
        .rsw-soc.whatsapp { background: linear-gradient(135deg,#25d366,#0e8a3c); }
        .rsw-soc.telegram { background: linear-gradient(135deg,#37aee2,#1c84c6); }
        .rsw-soc.facebook { background: linear-gradient(135deg,#1877f2,#0a52b8); }
        .rsw-soc.x        { background: linear-gradient(135deg,#26262b,#000); }
        .rsw-soc.email    { background: linear-gradient(135deg,#b8901f,#7d5e10); }

        /* שורות פעולה */
        .rsw-row { width: 100%; display: flex; align-items: center; gap: 12px; padding: 11px 14px; margin-bottom: 8px;
          border-radius: 13px; cursor: pointer; background: rgba(123,76,176,0.10);
          border: 1px solid rgba(233,200,74,0.20); color: #ecdcf4; font-family: 'Heebo', sans-serif;
          font-size: 15px; font-weight: 600; transition: background .16s, transform .1s, border-color .16s; }
        .rsw-row:hover { background: rgba(123,76,176,0.2); border-color: rgba(233,200,74,0.4); transform: translateY(-1px); }
        .rsw-ic { width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center;
          justify-content: center; font-size: 16px; flex-shrink: 0; color: #fff; }
        .rsw-ic.cp { background: rgba(233,200,74,0.22); color: #f6e27a; }
        .rsw-ic.im { background: linear-gradient(135deg,#e9c84a,#9a7818); color: #1a0e00; }
        .rsw-ic.mo { background: rgba(123,76,176,0.3); color: #e6d6ff; }
        .rsw-ic.so { background: rgba(123,76,176,0.22); color: #d9c2f5; }
        .rsw-t { flex: 1; text-align: right; }
        .rsw-ar { color: #9a7fc0; font-size: 18px; }

        .rsw-soon-h { font-family: 'Heebo', sans-serif; font-size: 11.5px; font-weight: 700; letter-spacing: 1px;
          color: #8f76b8; text-align: right; margin: 10px 4px 8px; border-top: 1px solid rgba(233,200,74,0.12); padding-top: 12px; }
        .rsw-row.soon { cursor: default; opacity: 0.6; border-style: dashed; }
        .rsw-row.soon:hover { background: rgba(123,76,176,0.10); border-color: rgba(233,200,74,0.2); transform: none; }
        .rsw-soon { background: rgba(107,63,160,0.4); border: 1px solid #6b3fa0; color: #e6d6ff;
          font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; }

        @keyframes rsw-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes rsw-rise { from { opacity: 0; transform: translateY(-50%) scale(0.96); } to { opacity: 1; transform: translateY(-50%) scale(1); } }
        @media (max-width: 600px) { .rsw-panel { right: 50%; transform: translate(50%, -50%); }
          @keyframes rsw-rise { from { opacity: 0; transform: translate(50%,-50%) scale(0.96); } to { opacity: 1; transform: translate(50%,-50%) scale(1); } }
          .rsw-tab { padding: 9px 5px; gap: 5px; border-radius: 11px 0 0 11px; }
          .rsw-tab-logo { width: 21px; height: 21px; }
          .rsw-tab-lbl { font-size: 13px; letter-spacing: 1px; }
          .rsw-strip { gap: 9px; }
          .rsw-soc { width: 43px; height: 43px; } }
        @media (prefers-reduced-motion: reduce) { .rsw-tab, .rsw-panel, .rsw-scrim { animation: none !important; } }
      `}</style>
    </>
  );
}
