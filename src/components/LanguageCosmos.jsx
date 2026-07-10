import React, { useRef, useEffect } from "react";

// 🌌 שבילי שפה — גרפיקה חיה שמחליפה את תמונת-הרקע: אותיות מכל השפות
// (עברית · לטינית · יוונית · ערבית · קירילית · ספרות) נודדות בחלל ומתכנסות
// אל מספר אחד זוהר — הרעיון ש«כל השפות מתכנסות לאותו ערך». קנבס טהור (בלי
// תלויות), מודע prefers-reduced-motion, DPR, ומשהה כשהטאב נסתר.

// אותיות אמיתיות מכמה כתבים, כל כתב בגוון קוסמי משלו.
const SCRIPTS = [
  { chars: "אבגדהוזחטיכלמנסעפצקרשת", color: "#f6e27a" }, // עברית — זהב
  { chars: "ABCDEFGHKLMNRSTW",       color: "#b9a7ff" }, // לטינית — סגול
  { chars: "ΑΒΓΔΘΛΞΠΣΦΨΩ",           color: "#7fd3ff" }, // יוונית — תכלת
  { chars: "ابتثجحخدرسصطعفقكلمنهوي", color: "#ffb3c8" }, // ערבית — ורוד
  { chars: "БГДЖЗИЛПФШЯ",            color: "#a7f0c0" }, // קירילית — ירוק
  { chars: "0123456789",             color: "#eae4ff" }, // ספרות — לבן-כוכבי
];
const CORE_NUMBERS = ["1820", "26", "358", "541", "611", "314", "137"];
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
    let parts = [], stars = [], numI = 0, numT = 0;

    const rnd = (a, b) => a + Math.random() * (b - a);
    const pick = () => FLAT[(Math.random() * FLAT.length) | 0];

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
      };
    };

    const size = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height; cx = W / 2; cy = H / 2;
      maxR = Math.hypot(W, H) / 2;
      cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const nP = Math.min(90, Math.max(38, Math.round((W * H) / 9000)));
      parts = Array.from({ length: nP }, spawn);
      const nS = Math.min(160, Math.round((W * H) / 3400));
      stars = Array.from({ length: nS }, () => ({ x: Math.random() * W, y: Math.random() * H, z: Math.random(), p: Math.random() * 6.28 }));
    };
    size();
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

      // אותיות מתכנסות
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (const p of parts) {
        p.dist -= p.vin * maxR;
        p.ang += 0.0016 * (0.6 + p.z);            // סיבוב-גלקסיה עדין
        p.rot += p.spin * 0.01;
        const nearC = 1 - Math.max(0, p.dist) / maxR; // 0 בשוליים → 1 במרכז
        if (p.dist <= maxR * 0.06) { Object.assign(p, spawn()); continue; } // הגיע למרכז → נטמע ונולד מחדש
        const wob = p.sway * 6 * Math.sin(t * 0.9 + p.swayP);
        const x = cx + Math.cos(p.ang) * p.dist + Math.cos(p.ang + 1.57) * wob;
        const y = cy + Math.sin(p.ang) * p.dist + Math.sin(p.ang + 1.57) * wob;
        const fs = (12 + 30 * p.z) * (0.6 + 0.4 * nearC);
        const fade = nearC < 0.12 ? nearC / 0.12 : (nearC > 0.86 ? (1 - nearC) / 0.14 : 1); // דוהה בשוליים ובמרכז
        ctx.save();
        ctx.translate(x, y); ctx.rotate(Math.sin(p.rot) * 0.25);
        ctx.globalAlpha = Math.max(0, Math.min(1, fade)) * (0.5 + 0.5 * p.z);
        ctx.font = `700 ${fs}px 'Heebo','Assistant',system-ui,sans-serif`;
        ctx.shadowColor = p.color; ctx.shadowBlur = 12 * nearC + 4;
        ctx.fillStyle = p.color;
        ctx.fillText(p.ch, 0, 0);
        ctx.restore();
      }
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;

      // המספר המרכזי — מתחלף רך כל ~4.6ש
      numT += 0.016;
      if (numT > 4.6) { numT = 0; numI = (numI + 1) % CORE_NUMBERS.length; }
      const appear = Math.min(1, numT / 0.6) * Math.min(1, (4.6 - numT) / 0.6);
      const num = CORE_NUMBERS[numI];
      ctx.save();
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.globalAlpha = 0.9 * Math.max(0.15, appear);
      const nfs = Math.min(W, H) * 0.30;
      ctx.font = `900 ${nfs}px 'Heebo',system-ui,sans-serif`;
      ctx.shadowColor = "#f6e27a"; ctx.shadowBlur = 34 + 16 * pulse;
      ctx.fillStyle = "#fff7df";
      ctx.fillText(num, cx, cy);
      ctx.restore();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;

      if (alive && !reduce) raf = requestAnimationFrame(draw);
    };
    if (reduce) draw(); else raf = requestAnimationFrame(draw);

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
        <p className="lc-eyebrow">{title}</p>
        <p className="lc-verse">‹ {VERSE} ›</p>
        <p className="lc-ref">{VERSE_REF}</p>
      </div>
    </div>
  );
}
