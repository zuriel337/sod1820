import React, { useRef, useEffect } from "react";

// 🌌 שבילי שפה — גרפיקה חיה שמחליפה את תמונת-הרקע: אותיות מכל השפות
// (עברית · לטינית · יוונית · ערבית · קירילית · ספרות) נודדות בחלל ומתכנסות
// אל מספר אחד זוהר — הרעיון ש«כל השפות מתכנסות לאותו ערך». קנבס טהור (בלי
// תלויות), מודע prefers-reduced-motion, DPR, ומשהה כשהטאב נסתר.

// אותיות אמיתיות מכמה כתבים, כל כתב בגוון קוסמי משלו.
const SCRIPTS = [
  { chars: "אבגדהוזחטיכלמנסעפצקרשת", color: "#efe3b8" }, // עברית — זהב רך
  { chars: "ABCDEFGHKLMNRSTVW",      color: "#d6cfec" }, // אנגלית — סגול-חיוור
  { chars: "БГДЖЗИЛПФШЯЮ",           color: "#d0e6d8" }, // רוסית — ירוק-חיוור
  { chars: "0123456789",             color: "#e8e4f2" }, // ספרות — לבן-כוכבי
];
// 🔤 המרכז — סיפור-האל"ף (רצף, לא אקראי): האות הראשונה נפתחת ומגלה שהכל אחד.
// א → אֶלֶף (שמהּ) → פֶּלֶא (אנגרם של אלף!) → אֶחָד (א=1) → 1 → One → Один.
// ...כולל הגילוי: «אנגלית» = א + נגלית = «הָאָלֶ"ף נִגְלֵית» = הִתְגַּלּוּת.
const CENTER = ["א", "אֶלֶף", "פֶּלֶא", "אֶחָד", "1", "One", "אַנְגְּלִית", "א · נִגְלֵית", "Один"];
const SUBS   = ["הָאוֹת הָרִאשׁוֹנָה", "שְׁמָהּ: אֶלֶף", "אֶלֶף ↔ פֶּלֶא", "א = 1 = אֶחָד", "אֶחָד", "One · בְּאַנְגְּלִית", "אֲפִלּוּ «אנגלית»...", "א נִגְלֵית = הִתְגַּלּוּת", "Один · בְּרוּסִית"];
const FLAT = SCRIPTS.flatMap(s => [...s.chars].map(ch => ({ ch, color: s.color })));

const VERSE = "כִּי אָז אֶהְפֹּךְ אֶל עַמִּים שָׂפָה בְרוּרָה לִקְרֹא כֻלָּם בְּשֵׁם יְהוָה לְעָבְדוֹ שְׁכֶם אֶחָד";
const VERSE_REF = "צפניה ג, ט";

export default function LanguageCosmos({ title = "שבילי שפה", subtitle = "כל השפות מתכנסות אל מספר אחד" }) {
  const cvRef = useRef(null);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, cx = 0, cy = 0, maxR = 1, raf = 0, alive = true, t = 0;
    let parts = [], stars = [], numI = 0, numT = 0, introT = 0, introDone = reduce; // reduce → דלג על הפתיח

    const rnd = (a, b) => a + Math.random() * (b - a);
    const pick = () => FLAT[(Math.random() * FLAT.length) | 0];
    const ease = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; // easeInOutQuad

    // 🕎 פתיח: תשפ״ו (ת·ש·פ·ו) מסתדר-מחדש ל-שָׂפוֹת (ש·פ·ו·ת) — אותן אותיות בדיוק.
    // 4 אותיות, כל אחת נעה מהמיקום שלה בתשפ״ו למיקומה ב-שפות (RTL, שמאל→ימין ויזואלי).
    const YEAR = [
      { ch: "ת", s: 1.5, e: -1.5 }, // ת: מימין-קיצון → שמאל-קיצון (הקפיצה הגדולה)
      { ch: "ש", s: 0.5, e: 1.5 },
      { ch: "פ", s: -0.5, e: 0.5 },
      { ch: "ו", s: -1.5, e: -0.5 },
    ];
    const drawIntro = (it) => {
      const B0 = 2.1, C0 = 3.3, D0 = 5.0, END = 5.9;
      const p = it < B0 ? 0 : it < C0 ? ease((it - B0) / (C0 - B0)) : 1; // 0=תשפ״ו · 1=שפות
      const scatter = it > D0 ? Math.min(1, (it - D0) / (END - D0)) : 0;
      const fin = Math.min(1, it / 0.4);                                   // fade-in
      // מרווח > רוחב-הגליף כדי שהאותיות לא יידחסו («תשפו» מחובר). sp גדל, הגופן קטן מעט.
      const sp = Math.min(W, H) * 0.225, bfs = Math.min(W, H) * 0.225;
      const glow = (it >= C0 && it < D0) ? (0.55 + 0.45 * Math.sin((it - C0) * 3.2)) : 0.4;
      ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (const L of YEAR) {
        const slot = L.s + (L.e - L.s) * p;
        const arc = (p > 0 && p < 1) ? -Math.sin(p * Math.PI) * sp * (L.ch === "ת" ? 1.15 : 0.5) : 0;
        const x = cx + slot * sp * (1 + scatter * 2.4);
        const y = cy + arc + scatter * (L.ch === "ת" ? -sp : sp) * 0.6;
        ctx.globalAlpha = fin * (1 - scatter);
        ctx.font = `900 ${bfs * (1 + scatter * 0.4)}px 'Frank Ruhl Libre','Heebo',serif`;
        ctx.shadowColor = "#f6e27a"; ctx.shadowBlur = 26 + 34 * glow;
        ctx.fillStyle = "#fff7df"; ctx.fillText(L.ch, x, y);
      }
      // כותרת עליונה + תווית «= שפות» כשמגיע ליעד
      ctx.shadowBlur = 0;
      ctx.globalAlpha = fin * (1 - scatter) * (it < C0 ? 0.85 : 0);
      ctx.fillStyle = "rgba(246,226,122,.8)";
      ctx.font = `800 ${Math.min(W, H) * 0.05}px 'Heebo',system-ui,sans-serif`;
      ctx.fillText("שְׁנַת תשפ״ו", cx, cy - bfs * 0.85);
      ctx.globalAlpha = fin * (1 - scatter) * (it >= C0 ? Math.min(1, (it - C0) / 0.4) : 0);
      ctx.fillStyle = "rgba(246,226,122,.92)";
      ctx.font = `800 ${Math.min(W, H) * 0.052}px 'Heebo',system-ui,sans-serif`;
      ctx.fillText("אוֹתָן הָאוֹתִיּוֹת = שָׂפוֹת", cx, cy + bfs * 0.7);
      ctx.restore(); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      return it > END;
    };

    const spawn = () => {
      const g = pick();
      const ang = Math.random() * Math.PI * 2;
      return {
        ch: g.ch, color: g.color,
        ang, dist: rnd(0.82, 1.08) * maxR, // מתחיל בשוליים
        z: rnd(0.35, 1),                    // עומק → גודל
        vin: rnd(0.0016, 0.0042),           // מהירות התכנסות (יחסית ל-maxR)
        spin: rnd(-0.5, 0.5), rot: rnd(0, 6.28),
        sway: rnd(0.4, 1.3), swayP: Math.random() * 6.28,
        ft: rnd(4, 11), fl: 0, sw: false,   // 🔄 מונה-היפוך (ארוך → היפוכים נדירים) · התקדמות · האם הוחלף
      };
    };

    const size = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height; cx = W / 2; cy = H / 2;
      maxR = Math.hypot(W, H) / 2 || 1;
      cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const nP = Math.min(48, Math.max(20, Math.round((W * H) / 16000)));
      parts = Array.from({ length: nP }, spawn);
      const nS = Math.min(160, Math.round((W * H) / 3400));
      stars = Array.from({ length: nS }, () => ({ x: Math.random() * W, y: Math.random() * H, z: Math.random(), p: Math.random() * 6.28 }));
      return W > 0 && H > 0;
    };
    window.addEventListener("resize", size);

    const draw = () => {
      t += 0.016;
      // רקע קוסמי
      const bg = ctx.createRadialGradient(cx, cy * 0.7, 0, cx, cy, maxR * 1.1);
      bg.addColorStop(0, "#1a1338"); bg.addColorStop(0.55, "#0b0819"); bg.addColorStop(1, "#070512");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // כוכבים מנצנצים
      for (const s of stars) {
        const tw = 0.5 + 0.5 * Math.sin(t * 1.6 + s.p);
        ctx.globalAlpha = tw * (0.25 + s.z * 0.5);
        ctx.fillStyle = s.z > 0.85 ? "#f6e27a" : "#cfc8ff";
        ctx.fillRect(s.x, s.y, s.z > 0.9 ? 1.6 : 1, s.z > 0.9 ? 1.6 : 1);
      }
      ctx.globalAlpha = 1;

      // הילת-ההתכנסות המרכזית (נושמת)
      const pulse = 0.6 + 0.4 * Math.sin(t * 1.4);
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.42);
      halo.addColorStop(0, `rgba(246,226,122,${0.22 * pulse})`);
      halo.addColorStop(0.5, "rgba(132,88,255,0.10)");
      halo.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, maxR * 0.42, 0, 6.28); ctx.fill();

      // 🕎 פתיח פעם-אחת: תשפ״ו → שָׂפוֹת (אותן אותיות), ואז נפתח החלל המלא
      if (!introDone) { introT += 0.016; if (drawIntro(introT)) introDone = true; }
      else {

      // אותיות מתכנסות
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (const p of parts) {
        p.dist -= p.vin * maxR;
        p.ang += 0.0016 * (0.6 + p.z);            // סיבוב-גלקסיה עדין
        p.rot += p.spin * 0.01;
        const nearC = 1 - Math.max(0, p.dist) / maxR; // 0 בשוליים → 1 במרכז
        if (p.dist <= maxR * 0.06) { Object.assign(p, spawn()); continue; } // הגיע למרכז → נטמע ונולד מחדש
        // 🔄 היפוך-שפה: האות מתהפכת (scaleX) ובאמצע ההיפוך מתחלפת לכתב אחר — «אותיות
        // שהופכות לשפות». כמו flip ב-CSS, על קנבס: scaleX 1→0→1 עם החלפת-תו ב-0.
        if (p.fl > 0) {
          p.fl += 0.02;
          if (p.fl >= 0.5 && !p.sw) { const g = pick(); p.ch = g.ch; p.color = g.color; p.sw = true; }
          if (p.fl >= 1) { p.fl = 0; p.sw = false; p.ft = rnd(6, 13); }
        } else { p.ft -= 0.016; if (p.ft <= 0) p.fl = 0.0001; }
        const sx = p.fl > 0 ? Math.max(0.03, Math.abs(Math.cos(p.fl * Math.PI))) : 1;
        const wob = p.sway * 6 * Math.sin(t * 0.9 + p.swayP);
        const x = cx + Math.cos(p.ang) * p.dist + Math.cos(p.ang + 1.57) * wob;
        const y = cy + Math.sin(p.ang) * p.dist + Math.sin(p.ang + 1.57) * wob;
        const fs = (9 + 16 * p.z) * (0.6 + 0.4 * nearC);
        const fade = nearC < 0.12 ? nearC / 0.12 : (nearC > 0.86 ? (1 - nearC) / 0.14 : 1); // דוהה בשוליים ובמרכז
        // 🤫 עדין-עדין: אטימות נמוכה מאוד + כמעט בלי זוהר → אבק-אותיות ברקע, לא מתחרה במרכז.
        ctx.save();
        ctx.translate(x, y); ctx.rotate(Math.sin(p.rot) * 0.25); ctx.scale(sx, 1);
        ctx.globalAlpha = Math.max(0, Math.min(1, fade)) * (0.14 + 0.16 * p.z) * (0.6 + 0.4 * sx);
        ctx.font = `600 ${fs}px 'Heebo','Assistant',system-ui,sans-serif`;
        ctx.shadowBlur = 0; // 🔪 אותיות חדות (בלי הילה) — עדינות אך מכוונות, לא מרוחות
        ctx.fillStyle = p.color;
        ctx.fillText(p.ch, 0, 0);
        ctx.restore();
      }
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;

      // 🔤 המילה המרכזית — מתהפכת בין שפות כל ~2.9ש (flip: scaleX 1→0→1 עם החלפה)
      const DUR = 2.9, FZ = 0.42;
      numT += 0.016;
      if (numT > DUR) { numT = 0; numI = (numI + 1) % CENTER.length; }
      let csx = 1;
      if (numT > DUR - FZ) csx = Math.max(0.03, (DUR - numT) / FZ);   // מצטמצם לפני ההחלפה
      else if (numT < FZ) csx = Math.max(0.03, numT / FZ);            // נפתח אחרי
      const word = CENTER[numI];
      ctx.save();
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      // גודל מותאם — מילה ארוכה תקטן שתיכנס
      let nfs = Math.min(W, H) * 0.26;
      ctx.font = `900 ${nfs}px 'Heebo','Frank Ruhl Libre',system-ui,serif`;
      const tw = ctx.measureText(word).width;
      if (tw > W * 0.72) { nfs *= (W * 0.72) / tw; ctx.font = `900 ${nfs}px 'Heebo','Frank Ruhl Libre',system-ui,serif`; }
      ctx.translate(cx, cy); ctx.scale(csx, 1);
      ctx.globalAlpha = 0.95;
      ctx.shadowColor = "#f6e27a"; ctx.shadowBlur = 34 + 16 * pulse + (csx < 1 ? 22 * (1 - csx) : 0);
      ctx.fillStyle = "#fff7df";
      ctx.fillText(word, 0, 0);
      ctx.restore();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      // תת-כותרת תואמת מתחת למילה — מספרת את הסיפור (שמהּ: אלף · אלף↔פלא · א=1=אחד...)
      ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.globalAlpha = 0.8 * csx;
      ctx.font = `700 ${Math.min(W, H) * 0.058}px 'Heebo',system-ui,sans-serif`;
      ctx.fillStyle = "rgba(246,226,122,.9)";
      ctx.fillText(SUBS[numI] || "", cx, cy + nfs * 0.72);
      ctx.restore(); ctx.globalAlpha = 1;
      } // end else (post-intro)

      if (alive && !reduce) raf = requestAnimationFrame(draw);
    };
    // התחלה — מחכים שלקנבס יהיה גודל אמיתי (מונע «מסך שחור» כשה-layout עוד לא מוכן),
    // ובמצב reduce מציירים פריים סטטי מכובד במקום פריים-בודד שקורס לקצוות.
    const start = () => {
      if (!alive) return;
      if (!size()) { raf = requestAnimationFrame(start); return; }
      if (reduce) {
        introDone = true; numI = 3; numT = 1.0;                    // «אֶחָד» במלוא הרוחב
        parts.forEach(p => { p.dist = rnd(0.22, 0.78) * maxR; });  // אותיות בטבעת-אמצע נראות
        draw();
      } else {
        raf = requestAnimationFrame(draw);
      }
    };
    start();

    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else if (!reduce && alive) raf = requestAnimationFrame(draw);
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      alive = false; cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div className="lc-wrap" role="img" aria-label={`${title} — ${subtitle}`}>
      <style>{`
        .lc-wrap { position:relative; width:100%; aspect-ratio:1536/1024; border-radius:18px; overflow:hidden;
          background:#070512; box-shadow:0 0 0 1px rgba(212,175,55,.28), 0 18px 60px rgba(0,0,0,.5); }
        .lc-wrap canvas { position:absolute; inset:0; width:100%; height:100%; display:block; }
        .lc-cap { position:absolute; inset-inline:0; bottom:0; z-index:2; padding:16px clamp(16px,4vw,40px) clamp(16px,3vw,26px); text-align:center;
          background:linear-gradient(0deg, rgba(7,5,18,.92) 0%, rgba(7,5,18,.6) 45%, rgba(7,5,18,.15) 78%, transparent 100%); pointer-events:none; }
        .lc-eyebrow { margin:0 0 7px; font-family:'Heebo','Assistant',system-ui,sans-serif; font-weight:800;
          font-size:clamp(11px,1.5vw,14px); letter-spacing:3px; color:rgba(246,226,122,.72); text-transform:uppercase; }
        /* 👑 הפסוק — מלכותי מאוד: זהב עמוק עם ברק רץ, לפי גודל הריבוע (עוטף כמה שצריך) */
        .lc-verse { margin:0 auto; max-width:32ch; font-family:'Frank Ruhl Libre','Heebo',Georgia,serif; font-weight:700;
          font-size:clamp(15px,2.5vw,26px); line-height:1.5; letter-spacing:.3px;
          background:linear-gradient(100deg,#a9812a 20%,#e8c65a 42%,#fff3c8 50%,#e8c65a 58%,#a9812a 80%);
          background-size:250% 100%; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;
          color:transparent; text-shadow:0 1px 18px rgba(246,226,122,.25); animation:lc-sweep 7s ease-in-out infinite; }
        .lc-ref { margin:6px 0 0; font-family:'Heebo',system-ui,sans-serif; font-size:clamp(10.5px,1.4vw,13px);
          letter-spacing:2px; color:rgba(246,226,122,.55); }
        @keyframes lc-sweep { 0%,100%{background-position:120% 0} 50%{background-position:-20% 0} }
        @media (prefers-reduced-motion:reduce){ .lc-verse{ animation:none; -webkit-text-fill-color:#e8c65a; color:#e8c65a; } }
      `}</style>
      <canvas ref={cvRef} aria-hidden="true" />
      <div className="lc-cap">
        <p className="lc-verse">‹ {VERSE} ›</p>
        <p className="lc-ref">{VERSE_REF}</p>
      </div>
    </div>
  );
}
