import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { track, getVisitorId } from "../lib/tracking.js";
import { saveMatrix, saveMatrixAnon, getSavedMatrices, moderateMatrix } from "../lib/elsMatrices.js";
import { addContribution } from "../lib/contributions.js";
import { supabase } from "../lib/supabase.js";
import { thumb } from "../lib/img.js";
import SubscribeGate from "./SubscribeGate.jsx";

// 🔠 הצופן התנ״כי — כלי דילוגי-האותיות (ELS) העצמאי, מוטמע כ-iframe מ-public/tzofen.html.
// דפוס זהה ל-heichal.html. מקור-יחיד: אותו כלי ב-/code (מלא) ובהיכל (/research?tool=els).
//
// 🔐 שער-הרשמה (החלטת צוריאל): לא-רשום → עד 5 חיפושים רגילים · חיפוש-מוצלב = לרשומים בלבד.
//    רשום/אדמין → ללא הגבלה. הכלי (iframe) אוכף את הספירה ופולט postMessage; העוטף כאן:
//    (1) מעדכן את דרגת-המשתמש לכלי, (2) רושם כל חיפוש דרך track הקיים (events/visitor_events —
//    בלי טבלה מקבילה), (3) מציג את SubscribeGate הקיים כשמגיעים לשער.
// ממפה שורת els_records לפריט שהכלי מבין (loadMatrix)
function rowToItem(m) {
  if (!m) return null;
  return {
    id: m.id || null,   // 🆔 מזהה-הרשומה — כדי לצרוב חזרה מד-איכות (מונטה-קרלו) שחושב על צופן שמור
    slug: m.slug || "",  // 🔗 1ב — הקשר-צופן: כדי לשתף ממצא מהכלי כתגובת-מחקר על הצופן הזה
    name: m.title || m.search_term, term: m.search_term,
    skip: m.skip_distance || 0, scope: m.scope || "torah",
    words: Array.isArray(m.positions?.findings) ? m.positions.findings : [],
    postUrl: m.positions?.postUrl || "", postTitle: m.positions?.postTitle || "",
    desc: m.description || "",   // 📖 הסבר-הצופן → מוצג בכלי מתחת למטריצה
    // 🖼 תצוגה-מקדימה בגלריה = ממוזערת (thumb) ולא הכרטיס המלא — חיסכון ~5-6× Egress, טעינה קלה.
    //    (resize=contain בתוך thumb → בלי חיתוך. עמוד-הצופן הקנוני מושך את image_url המלא בנפרד.)
    image: thumb(m.image_url, 200) || "", author: m.author_name || "",
  };
}

export default function TzofenEmbed({ seed = "", full = false, matrix = null, fromTopic = null, onQuality = null }) {
  const { isAdmin, verified, user } = useAuth();
  const navigate = useNavigate();
  const tier = isAdmin ? "admin" : verified ? "registered" : "anon";
  const iframeRef = useRef(null);
  const lastKeyRef = useRef(null);   // זהות-הצופן שנטענה לאחרונה — מונע טעינה-חוזרת מיותרת (סרט חוזר) על שינויי-שדה
  const findingsRef = useRef({ id: null, sig: null });   // 🎯 חתימת-הממצאים — לשליחת update-findings בלי טעינה-מלאה
  const [gate, setGate] = useState(null); // { reason: 'limit' | 'cross' }

  const src =
    "/tzofen.html?embed=1" + (seed ? "&q=" + encodeURIComponent(seed) : "");

  const postTier = useCallback(() => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { source: "sod-host", type: "tier", tier },
        window.location.origin
      );
    } catch { /* noop */ }
  }, [tier]);

  // עדכון דרגת-המשתמש לכלי בכל שינוי אימות (הרשמה מבטלת מיד את השער)
  useEffect(() => {
    postTier();
    if (verified) setGate(null);
  }, [postTier, verified]);

  // 📏 מסך-מלא: מכוונים את גובה ה-iframe בדיוק לחלל שמתחת לסרגל — כך הדף עצמו לא נגלל,
  //    ורק הכלי (iframe) נגלל בפנים → פס-גלילה אחד במקום שניים.
  useEffect(() => {
    if (!full) return;
    const el = iframeRef.current;
    const fit = () => {
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      el.style.height = Math.max(560, Math.round(window.innerHeight - top)) + "px";
    };
    fit();
    const timers = [setTimeout(fit, 150), setTimeout(fit, 500)];
    window.addEventListener("resize", fit);
    return () => { window.removeEventListener("resize", fit); timers.forEach(clearTimeout); };
  }, [full]);

  // תשובה לכלי (iframe) — למשל תוצאת שמירה-לענן
  const postToTool = useCallback((msg) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { source: "sod-host", ...msg }, window.location.origin);
    } catch { /* noop */ }
  }, []);

  // 🖼️ שולף את מטריצות-הענן המאושרות (els_records published) ומזרים אותן לכלי לגלריה
  const pushSavedMatrices = useCallback(async () => {
    try {
      const rows = await getSavedMatrices(60);
      const items = (rows || []).map(rowToItem).filter(Boolean);
      postToTool({ type: "saved-matrices", items });
    } catch { /* noop */ }
  }, [postToTool]);

  // 🎴 מעלה את כרטיס-הצופן (dataURL מהכלי) ל-Storage (bucket gallery, קריאה-ציבורית) → מחזיר URL קבוע.
  //    מקור-אמת אחד לתמונה: שורה · ספרייה · OG-שיתוף, כולם מושכים את אותו image_url.
  const uploadCipherCard = useCallback(async (dataUrl) => {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const name = `sod1820/ciphers/c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.png`;
      const { error } = await supabase.storage.from("gallery").upload(name, blob, { contentType: "image/png", upsert: false });
      if (error) return null;
      return supabase.storage.from("gallery").getPublicUrl(name).data?.publicUrl || null;
    } catch { return null; }
  }, []);

  // 💾 שמירת-מטריצה לענן (els_records) — קלאוד בלבד, בלי שמירה-למכשיר.
  //    אדמין → מתפרסם מיד · משתמש רשום → ממתין לאישור · אנונימי → נשמר עם visitor_id, ממתין לאישור.
  //    (החלטת צוריאל: גם לא-רשום יכול לשמור — הצופן נכנס לתור-האישור באדמין, לא מתפרסם מיד.)
  const [dossierPrompt, setDossierPrompt] = useState(false);   // 🎉 הצעת הכנת-תיק אחרי שמירה ראשונה (כניסה 1)
  const [savedToast, setSavedToast] = useState(null);          // 💾 אישור-שמירה חוזר עם קישור לדף-המחקר (כל שמירה)
  // 🔔 טוסט-השמירה נעלם לבד אחרי 7ש' (המשתמש עדיין יכול ללחוץ «לדף המחקר»)
  useEffect(() => { if (!savedToast) return; const t = setTimeout(() => setSavedToast(null), 7000); return () => clearTimeout(t); }, [savedToast]);
  const saveToCloud = useCallback(async (d) => {
    try {
      const imageUrl = d.image ? await uploadCipherCard(d.image) : null;   // 🎴 כרטיס-הצופן → Storage
      const shapeUrl = d.shape ? await uploadCipherCard(d.shape) : null;   // 🔲 צורת-הצופן הגולמית → Storage (תצוגת «צורה בלבד»)
      // 🏆 מד-האיכות (מונטה-קרלו) + צורת-הצופן נצרבים בתוך positions — בלי שינוי-סכמה, נקראים בכל מקום.
      const positions = { findings: d.findings || [], postUrl: d.postUrl || "", postTitle: d.postTitle || "",
        quality: d.quality || null, shapeUrl: shapeUrl || null };

      // 🔄 #2 מניעת-כפילות (unified_graph_law): שמירה בזמן שצופן קיים פתוח — אותו מונח·דילוג·היקף —
      //    היא «עדכון הצופן», לא צופן חדש. אדמין → עדכון-במקום (preserve_linked_row). אחר → נשמר
      //    כ«גרסה» מקושרת למקור (variantOf) שממתינה לאישור — לעולם לא דורסים צופן קיים.
      const nrm = (s) => String(s || "").replace(/\s+/g, "").trim();
      const isReSave = !!(matrix?.id
        && nrm(d.term) === nrm(matrix.search_term)
        && Math.abs(d.skip || 0) === (matrix.skip_distance || 0)
        && (d.scope || "torah") === (matrix.scope || "torah"));

      // ✏️ עדכון-ממצא במקום (אפס כפילויות): הכלי שולח editId כשעורכים ממצא-קיים, או re-save
      //    בהקשר עמוד-הצופן. update_els_matrix מתיר אדמין *או* בעלים; אם לא-מורשה → נופל לשמירה חדשה.
      const editId = d.editId || (isReSave ? matrix.id : null);
      if (editId) {
        const { error } = await supabase.rpc("update_els_matrix", {
          p_id: editId, p_positions: positions,
          p_image_url: imageUrl || null, p_description: d.desc || null,
        });
        if (!error) {
          postToTool({ type: "saved", ok: true, status: "updated" });
          if (user) setSavedToast({ status: "updated" });   // 💾 קישור חוזר לדף-המחקר
          pushSavedMatrices();   // הצופן הקיים עודכן במקום → מרעננים את הגלריה בכלי
          return;
        }
        // עדכון נכשל: אם המשתמש התכוון *במפורש* לעדכן (editId מהכלי) — לא יוצרים כפילות שקטה, מדווחים כשל.
        if (d.editId) { postToTool({ type: "saved", ok: false }); return; }
        // אחרת (re-save היוריסטי לפי מונח/דילוג) → ממשיך לשמירה-חדשה/גרסה למטה
      }

      const common = {
        term: d.term, scope: d.scope || "torah",
        skip: d.skip != null ? Math.abs(d.skip) : null, direction: d.direction || null,
        // גרסה על צופן קיים (לא-אדמין) → מקושרת למקור כדי שהאדמין יראה «גרסה» ולא כפילות אקראית.
        positions: isReSave ? { ...positions, variantOf: matrix.id, variantOfSlug: matrix.slug || null } : positions,
        // 📝 «מה רואים בצופן» — חובה שנאכפת בכלי; נשמר כ-description (p_note→description ב-RPC).
        title: d.postTitle || d.term, note: d.desc || null, imageUrl,
      };
      if (user) {
        await saveMatrix({ ...common, fromTopic: fromTopic || null });   // 🔁 round-trip: צופן מהתכנסות חוזר אליה כראיה
        const st = isAdmin ? "published" : (isReSave ? "variant" : "pending");
        postToTool({ type: "saved", ok: true, status: st });
        // 🎉 כניסה 1: אחרי השמירה הראשונה — מודל-חגיגה להכנת-תיק. אחרת: טוסט-שמירה חוזר עם קישור לדף-המחקר.
        let firstTime = false;
        try { firstTime = !localStorage.getItem("sod_dossier_prompted_v1"); if (firstTime) localStorage.setItem("sod_dossier_prompted_v1", "1"); } catch { /* noop */ }
        if (firstTime) setDossierPrompt(true); else setSavedToast({ status: st });
        if (isAdmin) pushSavedMatrices();   // אדמין → פורסם מיד → מרעננים את הגלריה בכלי
      } else {
        // 👤 לא-רשום: שמירה עם visitor_id → «ממתין לאישור» (לא מתפרסם מיד)
        await saveMatrixAnon({ ...common, visitorId: getVisitorId(), authorName: d.author || null });
        postToTool({ type: "saved", ok: true, status: isReSave ? "variant" : "pending" });
      }
    } catch {
      postToTool({ type: "saved", ok: false });
    }
  }, [user, isAdmin, postToTool, pushSavedMatrices, fromTopic, uploadCipherCard, matrix]);

  // האזנה להודעות הכלי: לחיצת-יד (ready→שולח דרגה) + רישום חיפושים + בקשת-שער + שמירה
  useEffect(() => {
    function onMsg(e) {
      if (e.origin !== window.location.origin) return;
      const d = e.data;
      if (!d || d.source !== "tzofen") return;
      if (d.type === "ready") {
        postTier();   // 🤝 הכלי מוכן — עונים לו בדרגת-המשתמש (סוגר את מרוץ-הטעינה: מנהל לא נחסם)
        pushSavedMatrices();   // 🖼️ מזרים את מטריצות-הענן לגלריה בכלי
        if (matrix) postToTool({ type: "load-matrix", item: rowToItem(matrix) });   // 🔗 עמוד-צופן קנוני
        return;
      }
      if (d.type === "search") {
        try {
          track("els", (d.term || "").slice(0, 80),
            d.kind === "cross" ? "cross_search" : "search",
            { kind: d.kind, skip: d.skip || 0, scope: d.scope || "torah", uid: user?.id || null });
        } catch { /* noop */ }
      } else if (d.type === "save") {
        saveToCloud(d);
      } else if (d.type === "contribute" && d.slug) {
        // ➕ 1ב — שיתוף ממצא מתוך הכלי כתגובת-מחקר על הצופן הנוכחי (עץ אחד: לא צופן חדש, תרומה על הקיים).
        const words = Array.isArray(d.words) ? d.words.filter(Boolean) : [];
        if (!words.length) { postToTool({ type: "contributed", ok: false }); return; }
        const body = `🔭 מצאתי על קו-הצופן «${d.axis || ""}»: ${words.join(" · ")}`;
        addContribution({ intent: "חידוש", origin: "els", body, targetType: "els", targetId: d.slug, authorName: null })
          .then(() => postToTool({ type: "contributed", ok: true }))
          .catch(() => postToTool({ type: "contributed", ok: false }));
      } else if (d.type === "delete" && d.id) {
        // 🗑 מחיקת-צופן מהגלריה (אדמין בלבד) — הסתרה הפיכה (status=hidden) דרך moderate_els_matrix,
        //    ואז ריענון מיידי של מטריצות-הענן בכלי כך שהכרטיס נעלם.
        if (!isAdmin) { postToTool({ type: "deleted", ok: false }); return; }
        moderateMatrix(d.id, "hidden")
          .then(() => { postToTool({ type: "deleted", ok: true }); pushSavedMatrices(); })
          .catch(() => postToTool({ type: "deleted", ok: false }));
      } else if (d.type === "navigate" && typeof d.to === "string") {
        navigate(d.to);   // 📚 «כל הצפנים →» מהכלי → ניווט האתר לספריית /codes
      } else if (d.type === "quality" && d.quality && matrix?.id && isAdmin) {
        // 🏆 המשתמש חישב מונטה-קרלו על צופן שמור → צורבים את המד חזרה לרשומה (בלי כפילות),
        //    ומעדכנים מיד את ה-m של העמוד (onQuality) כך ש«רמת מחקר» וה-AI רואים את ה-MC בלי רענון-דף.
        try {
          // ⚠️ rpc מחזיר {error} (לא זורק) — בלי בדיקה onQuality היה נקרא גם כשהצריבה נכשלה,
          //    וה-MC "נראה שמור" עד רענון-דף שמגלה שנעלם. מעדכנים את ה-m רק על צריבה אמיתית.
          supabase.rpc("set_els_quality", { p_id: matrix.id, p_quality: d.quality })
            .then(({ error }) => { if (!error && onQuality) onQuality(d.quality); })
            .catch(() => { /* noop */ });
        } catch { /* noop */ }
      } else if (d.type === "gate") {
        if (!verified) setGate({ reason: d.reason || "limit" });
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [verified, postTier, saveToCloud, user, pushSavedMatrices, matrix, postToTool, navigate, isAdmin, onQuality]);

  // עמוד-צופן קנוני: אם ה-matrix מתחלף אחרי שהכלי כבר נטען — טוענים אותו מחדש.
  //    ⚠️ רק כשזהות-הצופן מתחלפת (id/מונח/דילוג/היקף) — לא על כל שינוי-שדה (סטטוס וכו'),
  //    אחרת שינוי-סטטוס היה מריץ מחדש את כל הצופן + סרט-הצופן ללא צורך.
  useEffect(() => {
    if (!matrix) { lastKeyRef.current = null; return; }
    const key = [matrix.id, matrix.search_term, matrix.skip_distance, matrix.scope].join("|");
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    postToTool({ type: "load-matrix", item: rowToItem(matrix) });
  }, [matrix, postToTool]);

  // 🎯 ממצאים עודכנו בפאנל-הניהול (הוסר/נוסף ממצא) — מרעננים את הצביעה בכלי בלי לטעון-מחדש 2.2MB.
  //    דילוג על הטעינה-הראשונה של כל צופן (load-matrix כבר צובע); שולחים רק כשהחתימה משתנה על אותו id.
  useEffect(() => {
    if (!matrix) { findingsRef.current = { id: null, sig: null }; return; }
    const sig = JSON.stringify((matrix.positions?.findings || []).map(f => [f.t, f.color]));
    if (findingsRef.current.id !== matrix.id) { findingsRef.current = { id: matrix.id, sig }; return; }
    if (findingsRef.current.sig === sig) return;
    findingsRef.current.sig = sig;
    postToTool({ type: "update-findings", findings: matrix.positions?.findings || [] });
  }, [matrix, postToTool]);

  const gateTitle =
    gate?.reason === "cross" ? "🔀 החיפוש המוצלב פתוח לרשומים"
      : gate?.reason === "tanakh" ? "חיפוש בכל התנ״ך פתוח לרשומים"
      : gate?.reason === "save" ? "שמירה לתיק המחקר פתוחה לרשומים"
      : "סיימת את חיפושי-הטעימה החינמיים";
  const gateSub =
    gate?.reason === "cross"
      ? "חיפוש-מוצלב — שתי מילים קצרות שנפגשות באותו ציר — הוא «החיפוש המוצלח», הצורה החזקה של העדות, ושמור לחוקרים רשומים. הרשמה חינם פותחת אותו + כל התנ״ך + שמירה."
      : gate?.reason === "tanakh"
      ? "חיפוש דילוגים בכל 24 ספרי התנ״ך (מעבר לתורה) שמור לחוקרים רשומים. הרשמה חינם פותחת אותו — וגם את החיפוש המוצלב והשמירה."
      : gate?.reason === "save"
      ? "שמירת מטריצות לתיק המחקר שלך — כדי לחזור אליהן ולשתף — שמורה לחוקרים רשומים. הרשמה חינם פותחת שמירה, חיפוש-מוצלב וכל התנ״ך."
      : "טעמת שהכלי עובד — עכשיו רישום חד-פעמי עם אימות במייל פותח את החיפוש המוצלב, כל התנ״ך, שמירות ושיתוף.";

  return (
    <div dir="rtl" style={{ position: "relative", width: "100%" }}>
      <iframe
        ref={iframeRef}
        onLoad={postTier}
        // 🔑 מפתח לפי זהות-הצופן: מעבר לצופן אחר (id שונה) → iframe נטען מחדש נקי, בלי מצב-כלי ישן דולף.
        //    כך צופן שנמחק ונוצר-מחדש עם אותו מונח/דילוג לא מציג את הגרסה הישנה שהכלי שמר בזיכרון.
        //    שינויי-שדה באותו צופן (סטטוס/איכות) לא מחליפים id → אין טעינה-מחדש מיותרת.
        key={matrix?.id ? "els-" + matrix.id : (seed || "els")}
        src={src}
        title="הצופן התנ״כי — דילוגי אותיות (ELS)"
        loading="lazy"
        allow="clipboard-write; clipboard-read"
        style={{
          width: "100%",
          height: full ? "calc(100dvh - 58px)" : "calc(100dvh - 130px)",
          minHeight: 620,
          border: "none",
          display: "block",
          borderRadius: full ? 0 : 14,
          background: "transparent",
        }}
      />

      {gate && !verified && (
        <div
          style={{
            position: "absolute", inset: 0, zIndex: 20,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "18px", overflow: "auto",
            background: "rgba(6,5,13,0.82)", backdropFilter: "blur(3px)",
          }}
        >
          <div style={{ maxWidth: 520, width: "100%" }}>
            <div style={{ textAlign: "center", marginBottom: 4, color: "#f4c84a", fontSize: 34 }}>
              {gate.reason === "cross" ? "🔀" : gate.reason === "tanakh" ? "📜" : "🔓"}
            </div>
            <div style={{ textAlign: "center", color: "#f4c84a", fontFamily: "'Frank Ruhl Libre', serif", fontSize: 21, fontWeight: 800, marginBottom: 6 }}>
              {gateTitle}
            </div>
            <p style={{ textAlign: "center", color: "#c3ac7d", fontSize: 14.5, lineHeight: 1.8, margin: "0 auto 6px", maxWidth: 440 }}>
              {gateSub}
            </p>
            <SubscribeGate source="code" onUnlock={() => setGate(null)} />
            <div style={{ textAlign: "center", marginTop: 10 }}>
              <button
                onClick={() => setGate(null)}
                style={{
                  background: "transparent", border: "none", color: "#8a7850",
                  fontFamily: "inherit", fontSize: 12.5, cursor: "pointer", textDecoration: "underline",
                }}
              >
                {gate.reason === "cross" ? "חזרה לחיפוש רגיל" : "סגירה"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎉 כניסה 1 — הצעת הכנת-תיק אחרי השמירה הראשונה */}
      {dossierPrompt && (
        <div style={{ position: "absolute", inset: 0, zIndex: 25, display: "flex", alignItems: "center", justifyContent: "center", padding: 18, background: "rgba(6,5,13,0.82)", backdropFilter: "blur(3px)" }}>
          <div style={{ maxWidth: 400, width: "100%", background: "#fff", borderRadius: 18, padding: "26px 24px", textAlign: "center", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
            <div style={{ color: "#1c4bbf", fontFamily: "'Frank Ruhl Libre',serif", fontSize: 21, fontWeight: 800, marginBottom: 8 }}>שמרת את הגילוי הראשון שלך!</div>
            <div style={{ color: "#5b6472", fontSize: 14.5, lineHeight: 1.7, marginBottom: 20 }}>
              בוא נכין את <b>תיק המחקר שלך</b> — הבית שיציג את הגילויים, הקשרים והיומן שלך לעולם.
            </div>
            <button onClick={() => { setDossierPrompt(false); navigate("/community/researcher/me"); }}
              style={{ width: "100%", background: "linear-gradient(135deg,#2f6df6,#4f86ff)", color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
              📁 בוא נכין את התיק שלי →
            </button>
            <button onClick={() => setDossierPrompt(false)}
              style={{ background: "none", border: "none", color: "#8a93a3", fontFamily: "inherit", fontSize: 13, cursor: "pointer", marginTop: 12, textDecoration: "underline" }}>
              אחר כך
            </button>
          </div>
        </div>
      )}

      {/* 💾 אישור-שמירה חוזר (כל שמירה, לא רק הראשונה) — קישור ישיר לדף-המחקר. «רואים לאן זה נשמר». */}
      {savedToast && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 16, zIndex: 26, display: "flex", justifyContent: "center", padding: "0 14px", pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto", maxWidth: 460, width: "100%", background: "#0f1830", color: "#fff", border: "1px solid #2f6df6", borderRadius: 14, padding: "11px 12px 11px 14px", display: "flex", alignItems: "center", gap: 11, boxShadow: "0 14px 36px rgba(0,0,0,0.5)" }}>
            <span style={{ fontSize: 20, flex: "none" }}>{savedToast.status === "published" ? "✓" : "💾"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Frank Ruhl Libre',serif", fontWeight: 800, fontSize: 14.5, lineHeight: 1.3 }}>
                {savedToast.status === "updated" ? "עודכן בתיק המחקר שלך"
                  : savedToast.status === "published" ? "פורסם לתיק המחקר — גלוי לחוקרים"
                  : savedToast.status === "variant" ? "נשמר כגרסה — ממתין לאישור"
                  : "נשמר לתיק המחקר שלך — ממתין לאישור לפומבי"}
              </div>
              <div style={{ color: "#9fb2e6", fontSize: 11.5, marginTop: 1 }}>הצופן שמור בדף החוקר שלך.</div>
            </div>
            <button onClick={() => { setSavedToast(null); navigate("/community/researcher/me"); }}
              style={{ flex: "none", background: "linear-gradient(135deg,#2f6df6,#4f86ff)", color: "#fff", border: "none", borderRadius: 999, padding: "8px 14px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 800, cursor: "pointer", minHeight: 36 }}>
              לדף המחקר →
            </button>
            <button onClick={() => setSavedToast(null)} aria-label="סגור"
              style={{ flex: "none", background: "none", border: "none", color: "#8a93a3", fontSize: 16, cursor: "pointer", padding: "0 2px" }}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
