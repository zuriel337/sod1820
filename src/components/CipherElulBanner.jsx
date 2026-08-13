import React, { useEffect, useRef, useState } from "react";

// 🎺📜 באנר ראש-עמוד מתחלף («פעם כזה פעם כזה» — התחלה אקראית בכל כניסה):
//   1) המלך בשדה — «אני לדודי ודודי לי» → ראשי-התיבות א-ל-ו-ל נדלקים → אֱלוּל.
//   2) הצופן «אשלים מלאכה» — המטריצה האמיתית שהמילים נחשפות עליה **שלב-אחרי-שלב**
//      (כל מילה נדלקת בצבע שלה על האותיות עצמן, בלי ריבועים/מסגרות).
// כפתור שופר מנגן הקלטה אמיתית (/shofar.mp3). מוצג בכל האתר חוץ מדף הבית ומההיכל (Layout).
const MX = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/sod1820/ciphers/c-msol0z1q-iey6rh.png";
const CIPHER_URL = "/צופן-מדהים-בתורה-הקדושה"; // הפוסט שבו הצופן + הסרטון

// מיקומי המילים (חושבו אוטומטית מהתמונה) — כל מילה = «חלון» שמראה את הפרוסה הצבועה במקומה המדויק.
const WORDS = [
  { c: "red",    L: 0.460, T: 0.250, w: 0.050, h: 0.420, label: "התגלה ↓",       lx: "39.5%", ly: "19.5%" },
  { c: "purple", L: 0.228, T: 0.485, w: 0.312, h: 0.102, label: "אל בני ישראל →", lx: "25.5%", ly: "62.5%" },
  { c: "green",  L: 0.516, T: 0.170, w: 0.052, h: 0.420, label: "אשלים",          lx: "57.5%", ly: "12.5%" },
  { c: "orange", L: 0.460, T: 0.530, w: 0.170, h: 0.170, label: "מלאכה",          lx: "46.5%", ly: "71.5%" },
  { c: "blue",   L: 0.545, T: 0.408, w: 0.050, h: 0.416, label: "התשפ״ו",         lx: "60.0%", ly: "70.5%" },
];
const pc = (x) => (x * 100).toFixed(2) + "%";
const winStyle = (w) => ({ left: pc(w.L), top: pc(w.T), width: pc(w.w), height: pc(w.h) });
// התמונה הפנימית פרושׂה לכל המסגרת ומוזזת כך שהפרוסה מתיישרת בדיוק על מקום המילה
const innerStyle = (w) => ({
  position: "absolute", maxWidth: "none",
  width: pc(1 / w.w), height: pc(1 / w.h),
  left: pc(-w.L / w.w), top: pc(-w.T / w.h),
});

const HORN = "M4 36 C4 25 18 20 31 22 C46 24 53 20 60 13 C58 27 51 35 38 37 C40 43 47 45 52 45 C45 50 34 50 27 45 C17 45 7 43 4 36 Z";

const CSS = `
.ceb{position:relative;display:grid;width:100%;max-width:960px;margin:0 auto 26px;border-radius:18px;overflow:hidden;
  border:1px solid rgba(233,200,74,.28);box-shadow:0 16px 46px rgba(0,0,0,.5);background:#07080f;
  font-family:'Heebo',system-ui,Arial,sans-serif;direction:rtl}
.ceb-slide{grid-area:1/1;display:flex;opacity:0;transition:opacity .8s ease;pointer-events:none}
.ceb-slide.on{opacity:1;pointer-events:auto}
.ceb-serif{font-family:'Frank Ruhl Libre','David Libre','Times New Roman',serif}
.ceb-dock{position:absolute;top:10px;left:10px;z-index:6;display:flex;align-items:center;gap:7px;
  background:rgba(10,10,18,.6);border:1px solid rgba(233,200,74,.32);border-radius:12px;padding:6px 10px;backdrop-filter:blur(8px)}
.ceb-dock svg{width:20px;height:20px;color:#e9c84a}
.ceb-dock button{border:1px solid rgba(233,200,74,.4);background:rgba(233,200,74,.08);color:#f0e4c4;font:inherit;
  font-weight:800;font-size:12.5px;padding:5px 11px;border-radius:8px;cursor:pointer;transition:.15s}
.ceb-dock button:hover{background:linear-gradient(180deg,#e9c84a,#c99b2e);color:#1b1405}
.ceb-dock button:focus-visible{outline:2px solid #e9c84a;outline-offset:2px}
/* Elul */
.ceb-elul{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;
  padding:30px 20px;text-align:center;min-height:270px;
  background:radial-gradient(130% 150% at 50% 135%,#4a3316,#241a34 55%,#07080f)}
.ceb-stars{position:absolute;inset:0;opacity:.5;pointer-events:none}
.ceb-stars i{position:absolute;width:2px;height:2px;border-radius:50%;background:#fff}
.ceb-verse{font-weight:700;font-size:clamp(23px,4.8vw,42px);line-height:1.35;z-index:1;color:#f5ecd4}
.ceb-ini{color:#e9c84a;text-shadow:0 0 18px rgba(233,200,74,.55);animation:ceb-glow 4.6s ease-in-out infinite}
.ceb-ini.i2{animation-delay:.4s}.ceb-ini.i3{animation-delay:.8s}
@keyframes ceb-glow{0%,72%,100%{filter:brightness(1)}10%,20%{filter:brightness(1.6)}}
.ceb-reveal{font-weight:800;font-size:clamp(26px,6vw,50px);letter-spacing:.12em;color:#e9c84a;text-shadow:0 0 24px rgba(233,200,74,.6);z-index:1}
.ceb-sub{font-size:13px;letter-spacing:.18em;color:#c7bc9c;z-index:1}
/* Cipher */
.ceb-cipher{flex:1;position:relative;display:flex;flex-direction:column;width:100%}
.ceb-frame{position:relative;width:100%;aspect-ratio:1287/473;overflow:hidden;background:#07080f}
.ceb-mx{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.ceb-mx.base{filter:grayscale(1) brightness(.5) contrast(1.02);transition:filter 1.1s ease}  /* מתחיל שחור */
.ceb-mx.base.ceb-full{filter:none}                                       /* בסוף — המטריצה הצבעונית המלאה (כמו המקור) */
.ceb-win{position:absolute;overflow:hidden;opacity:0;transition:opacity .7s ease}  /* חלון-מילה — הצבע האמיתי נכנס */
.ceb-win.lit{opacity:1}
.ceb-lbl{position:absolute;font-weight:800;font-size:clamp(10px,1.5vw,14px);padding:3px 8px;border-radius:8px;color:#0b0a06;
  opacity:0;transform:translateY(6px);transition:opacity .4s,transform .4s;white-space:nowrap;pointer-events:none;z-index:3}
.ceb-lbl.lit{opacity:1;transform:translateY(0)}
.ceb-lbl.red{background:#e5484d;color:#fff}.ceb-lbl.purple{background:#a78bfa}.ceb-lbl.green{background:#4ade80}
.ceb-lbl.orange{background:#fbbf24}.ceb-lbl.blue{background:#60a5fa}
.ceb-scan{position:absolute;top:0;bottom:0;width:2px;background:linear-gradient(180deg,transparent,rgba(233,200,74,.85),transparent);
  box-shadow:0 0 18px 3px rgba(233,200,74,.6);opacity:0;animation:ceb-scan 13s linear infinite;z-index:2}
@keyframes ceb-scan{0%{right:-2%;opacity:0}6%{opacity:.9}52%{opacity:.9}60%{opacity:0}100%{right:102%;opacity:0}}
.ceb-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;
  padding:11px 16px;background:rgba(10,10,18,.72);border-top:1px solid rgba(233,200,74,.2)}
.ceb-ttl{font-weight:800;font-size:clamp(15px,2.6vw,21px);color:#f3ead2}
.ceb-ttl b{color:#e9c84a}
.ceb-meta{font-size:13px;color:#c7bc9c}
.ceb-cta{display:inline-flex;align-items:center;gap:7px;background:linear-gradient(180deg,#e9c84a,#c99b2e);color:#1b1405;
  font-weight:800;font-size:14px;padding:9px 16px;border-radius:11px;text-decoration:none;box-shadow:0 6px 16px rgba(233,200,74,.3);transition:transform .15s}
.ceb-cta:hover{transform:translateY(-2px)}
.ceb-dots{position:absolute;bottom:9px;left:50%;transform:translateX(-50%);z-index:6;display:flex;gap:7px}
.ceb-dots button{width:9px;height:9px;border-radius:50%;border:0;background:rgba(233,200,74,.32);cursor:pointer;padding:0;transition:.2s}
.ceb-dots button[aria-current="true"]{background:#e9c84a;width:22px;border-radius:5px}
.ceb-credit{position:absolute;bottom:6px;right:10px;z-index:6;font-size:9.5px;color:rgba(199,188,156,.55)}
@media (prefers-reduced-motion:reduce){.ceb-scan,.ceb-ini{animation:none}}
`;

export default function CipherElulBanner() {
  const rootRef = useRef(null);
  const audioRef = useRef(null);
  // 🎲 התחלה אקראית בכל כניסה — «פעם כזה פעם כזה»
  const [slide, setSlide] = useState(() => (Math.random() < 0.5 ? 0 : 1));

  // מעבר אוטומטי בין שני הבאנרים (איטי — כדי לתת לצופן להיחשף במלואו)
  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % 2), 13000);
    return () => clearInterval(t);
  }, []);

  // חשיפת המטריצה שלב-אחרי-שלב — מתחיל שחור (אפור-כהה), והצבעים נכנסים בזו אחר זו.
  // רץ פעם אחת בכל הופעה של שקופית-הצופן, ומתאפס לשחור כשהיא נעלמת — כך בכניסה הבאה מתחיל שוב שחור,
  // בלי קפיצה גלויה מצבעוני→שחור מול העיניים.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const base = root.querySelector(".ceb-mx.base");
    const wins = Array.from(root.querySelectorAll(".ceb-win")).sort((a, b) => a.dataset.i - b.dataset.i);
    const labels = Array.from(root.querySelectorAll(".ceb-lbl")).sort((a, b) => a.dataset.i - b.dataset.i);
    const off = () => {
      wins.forEach((w) => w.classList.remove("lit"));
      labels.forEach((l) => l.classList.remove("lit"));
      base && base.classList.remove("ceb-full");   // חזרה לשחור
    };
    if (slide !== 1) { off(); return; }
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion:reduce)").matches;
    let timers = [];
    off();
    if (reduce) { wins.forEach((w) => w.classList.add("lit")); labels.forEach((l) => l.classList.add("lit")); base && base.classList.add("ceb-full"); return; }
    wins.forEach((w, k) =>
      timers.push(setTimeout(() => {
        w.classList.add("lit");
        labels[k] && labels[k].classList.add("lit");
      }, 700 + k * 1400))
    );
    // אחרי שכל המילים נחשפו → כל המטריצה הופכת צבעונית מלאה (כמו המקור)
    timers.push(setTimeout(() => { base && base.classList.add("ceb-full"); }, 700 + wins.length * 1400 + 200));
    return () => timers.forEach(clearTimeout);
  }, [slide]);

  const playShofar = () => {
    const a = audioRef.current;
    if (a) { try { a.currentTime = 0; a.play(); } catch { /* ignore */ } }
  };

  return (
    <div className="ceb" ref={rootRef}>
      <style>{CSS}</style>

      <div className="ceb-dock">
        <svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true"><path d={HORN} /></svg>
        <button type="button" onClick={playShofar} aria-label="השמע תקיעת שופר">🔊 תקיעת שופר</button>
      </div>

      {/* המלך בשדה */}
      <div className={"ceb-slide" + (slide === 0 ? " on" : "")}>
        <div className="ceb-elul ceb-serif">
          <div className="ceb-stars" aria-hidden="true">
            {Array.from({ length: 34 }).map((_, i) => (
              <i key={i} style={{ left: ((i * 37) % 100) + "%", top: ((i * 53) % 96) + "%", opacity: 0.25 + ((i * 17) % 55) / 100 }} />
            ))}
          </div>
          <div className="ceb-verse">אֲנִי <span className="ceb-ini i1">לְ</span>דוֹדִי <span className="ceb-ini i2">וְ</span>דוֹדִי <span className="ceb-ini i3">לִ</span>י</div>
          <div className="ceb-reveal">אֱלוּל</div>
          <div className="ceb-sub">חוֹדֶשׁ הָרַחֲמִים · הַמֶּלֶךְ בַּשָּׂדֶה</div>
        </div>
      </div>

      {/* הצופן */}
      <div className={"ceb-slide" + (slide === 1 ? " on" : "")}>
        <div className="ceb-cipher">
          <div className="ceb-frame">
            <img className="ceb-mx base" src={MX} alt="מטריצת הצופן אשלים מלאכה" loading="lazy" />
            {WORDS.map((w, i) => (
              <div key={i} className="ceb-win" data-i={i} style={winStyle(w)}>
                <img className="ceb-mx" src={MX} alt="" aria-hidden="true" style={innerStyle(w)} />
              </div>
            ))}
            {WORDS.map((w, i) => (
              <div key={i} className={"ceb-lbl " + w.c} data-i={i} style={{ left: w.lx, top: w.ly }}>{w.label}</div>
            ))}
            <div className="ceb-scan" />
          </div>
          <div className="ceb-bar">
            <span className="ceb-ttl ceb-serif">צופן: <b>אַשְׁלִים מְלָאכָה</b></span>
            <span className="ceb-meta">דילוג <b style={{ color: "#e9c84a" }}>637</b> · נריה דויטש</span>
            <a className="ceb-cta" href={CIPHER_URL}>🎬 לצפייה בצופן ובסרטון ←</a>
          </div>
        </div>
      </div>

      <div className="ceb-dots">
        <button type="button" aria-current={slide === 0} aria-label="המלך בשדה" onClick={() => setSlide(0)} />
        <button type="button" aria-current={slide === 1} aria-label="הצופן" onClick={() => setSlide(1)} />
      </div>
      <span className="ceb-credit">♪ שופר: OrangeFreeSounds · CC-BY</span>

      <audio ref={audioRef} src="/shofar.mp3" preload="auto" />
    </div>
  );
}
