import React, { useState, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { CHANNELS as CH, SHARE_SITE as SITE, canNativeShare, nativeShare, copyLink, floatingShareShown, canShareFile, shareImageFile } from "../lib/share.js";
import { createShareIntent, resolveModality } from "../lib/share/shareObject.js";
import { emitShare, shareSlug, attributedShareUrl } from "../lib/share/shareTelemetry.js";
import Control from "./controls/Control.jsx";

// 🔗 ShareActions — רכיב-השיתוף הקנוני היחיד באתר (canonical_ui_components_law).
// כל מסך (מספר/צופן/פוסט/גלריה/כל ישות) מעביר פרמטרים בלבד — לא משכפל קוד שיתוף.
//   type   — סוג הישות (number/code/post/gallery…) — לתיוג ואנליטיקס
//   url    — ה-URL הקנוני לשיתוף (ברירת-מחדל: הכתובת הנוכחית)
//   title  — הכותרת/טקסט השיתוף
//   image  — תמונת ה-OG (הרובוטים מושכים אותה דרך /api/og; משמשת גם לשיתוף-קובץ)
//   channels — אילו ערוצים להציג (ברירת-מחדל: כולם) · compact — אייקונים בלבד · extra — פעולות נוספות
//   force — לכפות הצגה גם היכן שהווידג׳ט-הצף קיים (חריג נדיר; ברירת-מחדל: כבוי)
// שינוי אייקון/טקסט/ערוץ/באג = פעם אחת כאן → מתעדכן בכל האתר.
// 👑 share_placement_law: הבלוק מרנדר את עצמו **רק היכן שהווידג׳ט-הצף נעדר** (floatingShareShown=false)
//    → אפס כפילות עם הלשונית הצפה, ושורה-אחת נקייה. אף דף לא צריך להחליט — זה קורה לבד.
// הערוצים באים מ-CHANNELS (lib/share.js) — אותו מקור-אמת של הלשונית הצפה. עריכה שם → מתעדכן בשניהם.
//
// 🆕 W1 Slice 2 — Share Object (תוספתי, תואם-לאחור לחלוטין):
//   entityId · sourceSurface · subtype · locale · exactState · context · video · poster
// כולם **אופציונליים**. קריאה קיימת שלא מעבירה אותם מתנהגת בדיוק כמו קודם, כולל הטלמטריה.
// הם רק מעשירים את ה-evidence הנשמר תחת meta.share_object (ראה lib/share/shareTelemetry.js).
const ALL = ["native", ...Object.keys(CH), "copy"];

export default function ShareActions({
  type = "page", url, title = "", image = null, channels = ALL, compact = false, extra = null, force = false, style,
  // Share Object (all optional, additive)
  entityId = null, sourceSurface = null, subtype = "share", locale = null, exactState = null, context = null,
  video = null, poster = null,
}) {
  const P = usePalette();
  const { pathname } = useLocation();
  const [copied, setCopied] = useState(false);
  const fullUrl = url || (typeof window !== "undefined" ? window.location.href : SITE);
  const text = title || (typeof document !== "undefined" ? document.title : "SOD1820");
  const canNative = canNativeShare();

  // 🔑 Sharing Foundation repair (Human-Gate 2026-09-05) — תוכן≠יעד: slug=יעד-אמיתי
  // (אותו נירמול בדיוק כמו captureArrival) וזהות-התוכן ב-meta.content_type. הלוגיקה עברה
  // ל-lib/share/shareTelemetry.js כדי שכל משטח-שיתוף יחשב את אותו slug — בלי העתקים.
  const destSlug = useCallback(() => shareSlug(fullUrl, type), [fullUrl, type]);

  // 🧾 Share Intent — תיאור אחד של «מה משותף, מאיפה, ואיך». לא חנות ולא owner.
  const intent = useMemo(() => createShareIntent({
    entityType: type, entityId, canonicalUrl: fullUrl, sourceSurface, subtype, locale,
    title: text, image, video, poster, exactState, context,
  }), [type, entityId, fullUrl, sourceSurface, subtype, locale, text, image, video, poster, exactState, context]);

  // חוזה-שיתוף קנוני: event_type='share' + הערוץ ב-meta.platform (זהה ל-trackShare ולדשבורד
  // האדמין). ⚠️ נשאר track() ולא trackShare() בכוונה — לא מוסיפים קריאת-קרדיט חדשה.
  // ⛔ כל השדות שהאנליטיקס קורא היום נשארים זהים-לחלוטין; ה-evidence העשיר נוסף תוספתית
  //    תחת meta.share_object בלבד (SHARE_ATTRIBUTION_CONTRACT_SYNC).
  const logShare = useCallback((channel, resolved = null) => {
    emitShare({ channel, slug: destSlug(), url: fullUrl, image, contentType: type, intent, resolved });
  }, [type, destSlug, fullUrl, image, intent]);

  const native = useCallback(async () => {
    logShare("native", resolveModality({ ...intent, modality: "link" }, {}));
    await nativeShare({ title: text, url: attributedShareUrl(fullUrl, "native") });
  }, [text, fullUrl, logShare, intent]);

  const copy = useCallback(async () => {
    logShare("copy", resolveModality({ ...intent, modality: "link" }, {}));
    if (await copyLink(attributedShareUrl(fullUrl, "copy"))) { setCopied(true); setTimeout(() => setCopied(false), 1600); }
  }, [fullUrl, logShare, intent]);

  // 🖼️ שיתוף התמונה עצמה כקובץ (הבאנר 1200×630) — כך התצוגה-המקדימה מגיעה מיד, בלי תלות ב-OG.
  //    נתמך בעיקר במובייל (Web Share files). לא-נתמך → נפילה **כנה** להורדת-התמונה, וה-modality
  //    שנרשם הוא זה שבוצע בפועל (resolveModality), לא זה שביקשנו.
  const [imgBusy, setImgBusy] = useState(false);
  const shareImg = useCallback(async () => {
    if (!image || imgBusy) return;
    setImgBusy(true);
    let file = null;
    let blob = null;
    try {
      const res = await fetch(image, { mode: "cors" });
      blob = await res.blob();
      file = new File([blob], "sod1820.png", { type: blob.type || "image/png" });
    } catch { /* נטפל למטה כנפילה */ }
    const resolved = resolveModality({ ...intent, modality: "image_file" }, { canShareFile: Boolean(file && canShareFile(file)) });
    // ⚠️ meta.platform="image" נשמר כפי-שהיה (סמנטיקה היסטורית של האנליטיקס) — ההפרדה
    //    האמיתית בין ערוץ למודאליות נרשמת רק ב-meta.share_object, בלי לשנות פרשנות קיימת.
    logShare("image", resolved);
    try {
      if (file && canShareFile(file)) { await shareImageFile(file, { title: text, text }); setImgBusy(false); return; }
      const a = document.createElement("a"); a.href = image; a.download = "sod1820.png";
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e) {
      if (e && e.name === "AbortError") { setImgBusy(false); return; }
      try { const a = document.createElement("a"); a.href = image; a.download = "sod1820.png"; document.body.appendChild(a); a.click(); a.remove(); } catch { /* noop */ }
    }
    setImgBusy(false);
  }, [image, imgBusy, text, logShare, intent]);

  // 👑 share_placement_law — הבלוק מופיע רק היכן שהווידג׳ט-הצף נעדר (אלא אם force). אפס כפילות.
  if (!force && floatingShareShown(pathname)) return null;

  const label = (t) => compact ? null : <span>{t}</span>;

  return (
    // שורה אחת: לא נשבר; במסך צר נגלל אופקית עדין (WebkitOverflowScrolling) במקום להתפזר ל-2-3 שורות
    <div dir="rtl" style={{ display: "flex", gap: 8, flexWrap: "nowrap", overflowX: "auto", WebkitOverflowScrolling: "touch", alignItems: "center", scrollbarWidth: "none", ...style }}>
      {channels.includes("native") && canNative && (
        <Control role="primary" compact={compact} fontFamily={F.heading} onClick={native} title="שתף">🔗 {label("שתף")}</Control>
      )}
      {/* 🖼️ שתף-תמונה — רק כשיש תמונה ואפשר לשתף בכלל (מובייל). שולח את הכרטיס/באנר עצמו. */}
      {image && canNative && (
        <Control compact={compact} fontFamily={F.heading} state={imgBusy ? "loading" : "default"} onClick={shareImg} title="שתף כתמונה">
          🖼️ {label(imgBusy ? "…" : "תמונה")}
        </Control>
      )}
      {channels.filter(c => CH[c]).map(c => {
        const m = CH[c];
        // אייקון-מותג SVG בתוך תג-צבע (זהה ללשונית הצפה) — נשען על CHANNELS (svg+brand) כמקור-אמת יחיד.
        return (
          <Control key={c} compact={compact} fontFamily={F.heading} href={m.href(attributedShareUrl(fullUrl, c), text)}
            onClick={() => logShare(c, resolveModality({ ...intent, modality: "link" }, {}))} title={m.label}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: m.brand, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden focusable="false"><path d={m.svg} /></svg>
            </span> {label(m.label)}
          </Control>
        );
      })}
      {channels.includes("copy") && (
        <Control compact={compact} fontFamily={F.heading} onClick={copy} title="העתק קישור">
          {copied ? "✓ הועתק" : "📋"} {label(copied ? "" : "העתק")}
        </Control>
      )}
      {extra}
    </div>
  );
}
