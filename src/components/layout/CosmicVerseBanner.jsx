import React, { useRef, useEffect } from "react";

// 🌌 באנר-העל הקוסמי — רצועת פסוק מתחת לתפריט, בכל האתר (פרט לבית המדרש/היכל הגילוי).
// שילוב שני קונספטים: «שמי כוכבים» (קנבס — נצנוץ, נדידה, כוכב-נופל) + «אור נגלה»
// (פס-אור זהב שרץ על הפסוק). מודע-תמה: לילה קוסמי · יום = אופק-שחר רך (city_background_dual_theme_law).
// הפסוק ניתן להחלפה כאן (VERSE) — בהמשך אפשר להזין מטבלת DB בלי פריסה.

const VERSE = {
  text: "וְהִנֵּה יְהֹוָה נִצָּב עָלָיו וַיֹּאמַר אֲנִי יְהֹוָה אֱלֹהֵי אַבְרָהָם אָבִיךָ וֵאלֹהֵי יִצְחָק הָאָרֶץ אֲשֶׁר אַתָּה שֹׁכֵב עָלֶיהָ לְךָ אֶתְּנֶנָּה וּלְזַרְעֶךָ",
  ref: "בראשית כח, יג",
};

const CSS = `
.cvb { position:relative; overflow:hidden; height:clamp(104px,15vw,148px); isolation:isolate;
  border-bottom:1px solid rgba(212,175,55,.28); }
.cvb-dark { background:radial-gradient(130% 150% at 50% -30%, #1a1338 0%, #0b0819 60%, #070512 100%); }
.cvb-light { background:linear-gradient(180deg,#e9ddc4 0%, #f3e4c4 45%, #f6ead0 72%, #fbf3df 100%); }
.cvb-stars { position:absolute; inset:0; width:100%; height:100%; display:block; z-index:1; }
.cvb-neb { position:absolute; inset:-30% -10%; z-index:2; pointer-events:none;
  animation:cvb-breath 9s ease-in-out infinite; }
.cvb-dark .cvb-neb { background:
    radial-gradient(38% 62% at 30% 40%, rgba(132,88,255,.42), transparent 62%),
    radial-gradient(42% 66% at 72% 62%, rgba(62,166,255,.26), transparent 60%); }
.cvb-light .cvb-neb { background:
    radial-gradient(46% 70% at 50% 120%, rgba(255,206,120,.7), transparent 62%),
    radial-gradient(40% 60% at 30% 30%, rgba(214,168,86,.28), transparent 64%); }
@keyframes cvb-breath { 0%,100%{transform:scale(1);opacity:.72} 50%{transform:scale(1.12);opacity:1} }

.cvb-inner { position:relative; z-index:4; height:100%; display:flex; flex-direction:column;
  align-items:center; justify-content:center; text-align:center; padding:0 clamp(16px,5vw,64px); gap:6px; }
.cvb-verse { margin:0; font-family:'Heebo','Assistant',system-ui,sans-serif; font-weight:600;
  font-size:clamp(14.5px,2.3vw,23px); line-height:1.45; letter-spacing:.4px; max-width:44ch;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
  background:linear-gradient(100deg,#d8ccec 34%, #f6e27a 47%, #fffbe9 51%, #f6e27a 55%, #d8ccec 68%);
  background-size:280% 100%; -webkit-background-clip:text; background-clip:text;
  -webkit-text-fill-color:transparent; color:transparent; animation:cvb-sweep 6.5s ease-in-out infinite; }
.cvb-light .cvb-verse { background:linear-gradient(100deg,#7a5410 34%, #b5871f 47%, #d8a53a 51%, #b5871f 55%, #7a5410 68%);
  background-size:280% 100%; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
@keyframes cvb-sweep { 0%,100%{background-position:120% 0} 50%{background-position:-20% 0} }
.cvb-ref { z-index:4; font-family:'Heebo',system-ui,sans-serif; font-size:11px; letter-spacing:2px;
  color:rgba(246,226,122,.6); }
.cvb-light .cvb-ref { color:rgba(122,84,16,.7); }

.cvb::after { content:""; position:absolute; inset:0; z-index:3; pointer-events:none;
  box-shadow:inset 0 -22px 40px rgba(0,0,0,.35), inset 0 0 60px rgba(0,0,0,.28); }
.cvb-light::after { box-shadow:inset 0 -18px 34px rgba(150,110,40,.16); }

@media (prefers-reduced-motion: reduce) {
  .cvb-neb, .cvb-verse { animation:none !important; }
  .cvb-verse { -webkit-text-fill-color:#f6e27a; color:#f6e27a; }
  .cvb-light .cvb-verse { -webkit-text-fill-color:#7a5410; color:#7a5410; }
}
`;

export default function CosmicVerseBanner({ mode = "dark" }) {
  const dark = mode !== "light";
  const cvRef = useRef(null);

  useEffect(() => {
    if (!dark) return;   // שדה-הכוכבים רק במצב לילה; ביום — אופק-שחר בלי כוכבים
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, stars = [], shoot = null, t = 0, raf = 0, alive = true;

    const size = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = [];
      const n = Math.min(200, Math.round((W * H) / 2500));
      for (let i = 0; i < n; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, z: Math.random(), p: Math.random() * 6.28 });
    };
    size();
    window.addEventListener("resize", size);

    const frame = () => {
      if (!alive) return;
      t += 0.02;
      ctx.clearRect(0, 0, W, H);
      for (const s of stars) {
        s.x -= (0.05 + s.z * 0.14);
        if (s.x < 0) { s.x = W; s.y = Math.random() * H; }
        const tw = 0.55 + 0.45 * Math.sin(t * 1.5 + s.p);
        const rad = 0.5 + s.z * 1.5;
        ctx.globalAlpha = tw * (0.35 + s.z * 0.6);
        ctx.fillStyle = s.z > 0.85 ? "#f6e27a" : "#eae4ff";
        ctx.beginPath(); ctx.arc(s.x, s.y, rad, 0, 6.28); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!shoot && Math.random() < 0.005) shoot = { x: Math.random() * W * 0.6 + W * 0.3, y: Math.random() * H * 0.4, l: 0 };
      if (shoot) {
        shoot.l += 13;
        const dx = shoot.x - shoot.l, dy = shoot.y + shoot.l * 0.5;
        const g = ctx.createLinearGradient(shoot.x, shoot.y, dx, dy);
        g.addColorStop(0, "rgba(246,226,122,.9)"); g.addColorStop(1, "rgba(246,226,122,0)");
        ctx.strokeStyle = g; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(shoot.x, shoot.y); ctx.lineTo(dx, dy); ctx.stroke();
        if (dx < 0 || dy > H) shoot = null;
      }
      if (!reduce) raf = requestAnimationFrame(frame);
    };
    if (reduce) frame(); else raf = requestAnimationFrame(frame);

    const onVis = () => {
      if (document.hidden) { cancelAnimationFrame(raf); }
      else if (!reduce && alive) { raf = requestAnimationFrame(frame); }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      alive = false; cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [dark]);

  return (
    <div className={`cvb ${dark ? "cvb-dark" : "cvb-light"}`} role="img" aria-label={`${VERSE.text} (${VERSE.ref})`}>
      <style>{CSS}</style>
      {dark && <canvas ref={cvRef} className="cvb-stars" aria-hidden="true" />}
      <div className="cvb-neb" aria-hidden="true" />
      <div className="cvb-inner">
        <p className="cvb-verse">{VERSE.text}</p>
        <span className="cvb-ref">{VERSE.ref}</span>
      </div>
    </div>
  );
}
