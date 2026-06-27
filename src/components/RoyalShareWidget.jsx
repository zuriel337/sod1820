import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { trackShare } from "../lib/tracking.js";
import { withRid } from "../lib/propagation.js";
import { supabase } from "../lib/supabase.js";
import { shareNumberSmart } from "../lib/numberCard.js";

// 👑 RoyalShareWidget — לשונית שיתוף מלכותית צפה (ימין), נייד + מחשב.
// סגול-שחור עמוק + זהב + לוגו האתר. משתפת את העמוד הנוכחי (קישור + כותרת).
// שורת מותגים עם אייקוני SVG אמיתיים (וואטסאפ/טלגרם/פייסבוק/X/אימייל), פעולות
// (העתק קישור / תמונה מעוצבת / שיתוף מערכת), ובקרוב (סרטון מפוסט / רשת תמונות).
// מונה קהילתי מוצג רק מעל 20. כל שיתוף מתועד דרך trackShare.
const HIDE = /^\/(admin|login|profile|traffic|numbers-report|theme-preview|enter|stream|heichal|היכל|galaxy)/;

// אייקוני מותג — נתיבי SVG (simple-icons), מרונדרים בצבע לבן על רקע המותג.
const ICON_PATHS = {
  whatsapp: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z",
  telegram: "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z",
  facebook: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  x: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  email: "M1.5 5.25A2.25 2.25 0 0 1 3.75 3h16.5a2.25 2.25 0 0 1 2.25 2.25v.443l-10.5 6.3-10.5-6.3V5.25Zm0 2.19V18.75A2.25 2.25 0 0 0 3.75 21h16.5a2.25 2.25 0 0 0 2.25-2.25V7.44l-9.964 5.978a1.5 1.5 0 0 1-1.572 0L1.5 7.44Z",
};
function BrandSvg({ name }) {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor" aria-hidden focusable="false">
      <path d={ICON_PATHS[name]} />
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

  // קישור השיתוף נושא rid=<המשתף> למדידת ויראליות אמיתית
  const url = withRid(typeof window !== "undefined" ? window.location.href : "https://sod1820.co.il");
  const rawTitle = typeof document !== "undefined" ? document.title : "סוד 1820";
  const title = (rawTitle.split(/[|·–—-]/)[0] || "סוד 1820").trim();
  const text = `${title} 👑`;
  const slug = pathname.replace(/^\//, "") || "home";
  // מונה השיתופים הקהילתי מוצג רק בדף הבית — לא על פוסטים/דפים אחרים
  // (אחרת אותו מספר site-wide נראה כאילו הוא של הפוסט הנוכחי).
  const isHome = pathname === "/" || pathname === "/home-new" || pathname === "/בית-חדש";
  const numberId = (pathname.match(/^\/number\/(\d+)/) || [])[1] || null;
  const enc = encodeURIComponent;
  const canNative = typeof navigator !== "undefined" && !!navigator.share;

  const SOCIALS = [
    { key: "whatsapp", label: "וואטסאפ", href: `https://wa.me/?text=${enc(text + " " + url)}` },
    { key: "telegram", label: "טלגרם", href: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}` },
    { key: "facebook", label: "פייסבוק", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { key: "x", label: "X", href: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(text)}` },
    { key: "email", label: "אימייל", href: `mailto:?subject=${enc(title)}&body=${enc(text + "\n" + url)}` },
  ];

  // מגדיל את מונה השיתופים הויזואלי של הפוסט (אם הדף הנוכחי הוא פוסט) — no-op אחרת.
  const bumpPostShare = useCallback(() => {
    try { supabase?.rpc("increment_post_share_by_slug", { p_slug: slug }); } catch { /* noop */ }
  }, [slug]);

  const go = useCallback((platform, href) => {
    trackShare(platform, slug); bumpPostShare();
    window.open(href, "_blank", "noopener,noreferrer");
  }, [slug, bumpPostShare]);

  const copyLink = useCallback(() => {
    trackShare("copy", slug); bumpPostShare();
    try { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); }
    catch { window.prompt("העתיקו את הקישור:", url); }
  }, [slug, url, bumpPostShare]);

  const shareImage = useCallback(() => {
    if (numberId) shareNumberSmart(Number(numberId), []); // numberCard מתעד trackShare בעצמו
  }, [numberId]);

  const nativeShare = useCallback(() => {
    trackShare("native", slug); bumpPostShare();
    try { navigator.share?.({ title, text, url }).catch(() => {}); } catch { /* noop */ }
  }, [slug, title, text, url, bumpPostShare]);

  if (HIDE.test(pathname)) return null;

  return (
    <>
      {/* לשונית סגורה — כתר למעלה, צמודה לקצה הימני */}
      {!open && (
        <button className="rsw-tab" onClick={() => setOpen(true)} aria-label="שתפו את העמוד">
          <img className="rsw-tab-logo" src="/crown-icon.png" alt="" aria-hidden />
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
                <button key={s.key} className={`rsw-soc ${s.key}`} title={s.label} aria-label={s.label}
                  onClick={() => go(s.key, s.href)}>
                  <BrandSvg name={s.key} />
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
