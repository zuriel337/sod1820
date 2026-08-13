import React, { useEffect, useRef, useState } from "react";

// 🎺📜 באנר ראש דף-הצ'אט — מתחלף בין שניים («פעם כזה פעם כזה»):
//   1) אלול — «אני לדודי ודודי לי» → ראשי-התיבות א-ל-ו-ל נדלקים → אֱלוּל.
//   2) הצופן «אשלים מלאכה» — המטריצה האמיתית שהמילים נחשפות עליה אחת-אחרי-השנייה.
// כפתור שופר מנגן הקלטה אמיתית (/shofar.mp3, Orange Free Sounds · CC-BY 4.0).
// עצמאי-כהה (לא תלוי תמה). מטריצה מ-Supabase Storage; אודיו מוגש מ-public/.
const MX = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/sod1820/ciphers/c-msol0z1q-iey6rh.png";
const CIPHER_URL = "/צופן-מדהים-בתורה-הקדושה"; // הפוסט שבו הצופן + הסרטון

const CSS = `
.ceb{position:relative;width:100%;max-width:960px;margin:0 auto 26px;min-height:270px;border-radius:18px;overflow:hidden;
  border:1px solid rgba(233,200,74,.28);box-shadow:0 16px 46px rgba(0,0,0,.5);background:#07080f;
  font-family:'Heebo',system-ui,Arial,sans-serif;direction:rtl}
.ceb-slide{position:absolute;inset:0;opacity:0;transition:opacity .8s ease;pointer-events:none}
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
.ceb-elul{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:10px;
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
.ceb-cipher{position:relative;height:100%;min-height:270px;display:flex;flex-direction:column}
.ceb-frame{position:relative;flex:1;overflow:hidden;min-height:190px}
.ceb-frame img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(.55) brightness(.6);transition:filter 1.1s}
.ceb-frame.alive img{filter:saturate(1) brightness(1)}
.ceb-scrim{position:absolute;inset:0;background:rgba(6,7,14,var(--dim,.58));transition:background .7s;pointer-events:none}
.ceb-hl{position:absolute;border-radius:7px;opacity:0;transform:scale(1.25);transition:opacity .45s,transform .45s;pointer-events:none}
.ceb-hl.lit{opacity:1;transform:scale(1)}
.ceb-hl.red{box-shadow:0 0 0 2px #e5484d,0 0 24px 4px rgba(229,72,77,.7)}
.ceb-hl.purple{box-shadow:0 0 0 2px #a78bfa,0 0 24px 4px rgba(167,139,250,.65)}
.ceb-hl.green{box-shadow:0 0 0 2px #4ade80,0 0 24px 4px rgba(74,222,128,.65)}
.ceb-hl.orange{box-shadow:0 0 0 2px #fbbf24,0 0 24px 4px rgba(251,191,36,.68)}
.ceb-hl.blue{box-shadow:0 0 0 2px #60a5fa,0 0 24px 4px rgba(96,165,250,.68)}
.ceb-lbl{position:absolute;font-weight:800;font-size:clamp(10px,1.5vw,14px);padding:3px 8px;border-radius:8px;color:#0b0a06;
  opacity:0;transform:translateY(6px);transition:opacity .4s,transform .4s;white-space:nowrap;pointer-events:none}
.ceb-lbl.lit{opacity:1;transform:translateY(0)}
.ceb-lbl.red{background:#e5484d;color:#fff}.ceb-lbl.purple{background:#a78bfa}.ceb-lbl.green{background:#4ade80}
.ceb-lbl.orange{background:#fbbf24}.ceb-lbl.blue{background:#60a5fa}
.ceb-scan{position:absolute;top:0;bottom:0;width:2px;background:linear-gradient(180deg,transparent,rgba(233,200,74,.85),transparent);
  box-shadow:0 0 18px 3px rgba(233,200,74,.6);opacity:0;animation:ceb-scan 9.4s linear infinite}
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
.ceb-credit{position:absolute;bottom:6px;right:10px;z-index:6;font-size:9.5px;color:rgba(199,188,156,.55);letter-spacing:.02em}
@media (prefers-reduced-motion:reduce){.ceb-scan,.ceb-ini{animation:none}}
`;

const HORN = "M4 36 C4 25 18 20 31 22 C46 24 53 20 60 13 C58 27 51 35 38 37 C40 43 47 45 52 45 C45 50 34 50 27 45 C17 45 7 43 4 36 Z";
const BOXES = [
  { c: "red", s: { left: "46.0%", top: "25.2%", width: "4.8%", height: "41.4%" } },
  { c: "purple", s: { left: "23.0%", top: "48.6%", width: "30.8%", height: "10.2%" } },
  { c: "green", s: { left: "51.8%", top: "17.2%", width: "4.8%", height: "41.4%" } },
  { c: "orange", s: { left: "47.0%", top: "53.0%", width: "15.5%", height: "16.5%" } },
  { c: "blue", s: { left: "54.7%", top: "40.8%", width: "4.6%", height: "41.6%" } },
];
const LABELS = [
  { c: "red", t: "התגלה ↓", s: { left: "39.5%", top: "19.5%" } },
  { c: "purple", t: "אל בני ישראל →", s: { left: "25.5%", top: "62.5%" } },
  { c: "green", t: "אשלים", s: { left: "57.5%", top: "12.5%" } },
  { c: "orange", t: "מלאכה", s: { left: "46.5%", top: "71.5%" } },
  { c: "blue", t: "התשפ״ו", s: { left: "60.0%", top: "70.5%" } },
];

export default function CipherElulBanner() {
  const rootRef = useRef(null);
  const audioRef = useRef(null);
  const [slide, setSlide] = useState(0);

  // מעבר אוטומטי בין שני הבאנרים
  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % 2), 9600);
    return () => clearInterval(t);
  }, []);

  // חשיפת מילות המטריצה אחת-אחרי-השנייה (לולאה)
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion:reduce)").matches;
    const frame = root.querySelector(".ceb-frame");
    const scrim = root.querySelector(".ceb-scrim");
    const boxes = Array.from(root.querySelectorAll(".ceb-hl")).sort((a, b) => a.dataset.i - b.dataset.i);
    const labels = Array.from(root.querySelectorAll(".ceb-lbl")).sort((a, b) => a.dataset.i - b.dataset.i);
    let timers = [];
    const dim = (n) => scrim && scrim.style.setProperty("--dim", (0.58 - n * 0.092).toFixed(3));
    const run = () => {
      timers.forEach(clearTimeout);
      timers = [];
      boxes.forEach((b) => b.classList.remove("lit"));
      labels.forEach((l) => l.classList.remove("lit"));
      frame && frame.classList.remove("alive");
      dim(0);
      if (reduce) {
        boxes.forEach((b) => b.classList.add("lit"));
        labels.forEach((l) => l.classList.add("lit"));
        frame && frame.classList.add("alive");
        dim(5);
        return;
      }
      boxes.forEach((b, k) =>
        timers.push(setTimeout(() => {
          b.classList.add("lit");
          labels[k] && labels[k].classList.add("lit");
          frame && frame.classList.add("alive");
          dim(k + 1);
        }, 600 + k * 950))
      );
    };
    run();
    const loop = setInterval(run, 9500);
    return () => { clearInterval(loop); timers.forEach(clearTimeout); };
  }, []);

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

      {/* אלול */}
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
            <img src={MX} alt="מטריצת הצופן אשלים מלאכה" loading="lazy" />
            <div className="ceb-scrim" />
            {BOXES.map((b, i) => (
              <div key={i} className={"ceb-hl " + b.c} data-i={i} style={b.s} />
            ))}
            {LABELS.map((l, i) => (
              <div key={i} className={"ceb-lbl " + l.c} data-i={i} style={l.s}>{l.t}</div>
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
        <button type="button" aria-current={slide === 0} aria-label="אלול" onClick={() => setSlide(0)} />
        <button type="button" aria-current={slide === 1} aria-label="הצופן" onClick={() => setSlide(1)} />
      </div>
      <span className="ceb-credit">♪ שופר: OrangeFreeSounds · CC-BY</span>

      <audio ref={audioRef} src="/shofar.mp3" preload="auto" />
    </div>
  );
}
