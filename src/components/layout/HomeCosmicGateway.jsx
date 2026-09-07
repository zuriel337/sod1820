import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BUILD_PROGRESS } from "../../lib/knowledgeMap.js";
import { F, LOGO_URL } from "../../theme.js";

// Existing published cipher evidence. The Home preview is a lightweight projection of the
// already-stored/used matrix, not a second ELS engine or a new truth source.
const CIPHER_IMAGE = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/sod1820/ciphers/c-msol0z1q-iey6rh.png";
const CIPHER_URL = "/צופן-מדהים-בתורה-הקדושה";

const CIPHER_WORDS = [
  { label: "התגלה", cls: "gold", x: "48%", y: "24%" },
  { label: "אל בני ישראל", cls: "blue", x: "34%", y: "48%" },
  { label: "אשלים", cls: "gold", x: "58%", y: "42%" },
  { label: "מלאכה", cls: "violet", x: "53%", y: "63%" },
  { label: "התשפ״ו", cls: "gold", x: "62%", y: "78%" },
];

const SYSTEM_GROUPS = [
  {
    cls: "active",
    title: "פעיל עכשיו",
    copy: "פוסטים · ארכיון · דף המספר · בית המדרש · דילוגי אותיות",
  },
  {
    cls: "building",
    title: "בבנייה",
    copy: "העולם · המחקר שלי · מעקב ועדכונים",
  },
  {
    cls: "future",
    title: "בקרוב",
    copy: "עץ המשפחה · מסעות בתוך הצופן 3D · מסעות בתוך הרמזים 3D",
  },
];

function LiveCipherPreview() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    let reduce = false;
    try { reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches; } catch { /* noop */ }
    if (reduce) { setStep(CIPHER_WORDS.length); return undefined; }
    const id = window.setInterval(() => setStep((s) => (s + 1) % (CIPHER_WORDS.length + 2)), 1450);
    return () => window.clearInterval(id);
  }, []);

  return (
    <Link to={CIPHER_URL} className="hcg-cipher-link" aria-label="פתחו את הצופן אשלים מלאכה התשפ״ו">
      <div className="hcg-cipher-head">
        <div>
          <span className="hcg-live-dot" aria-hidden />
          <b>צופן חי מתוך המערכת</b>
        </div>
        <span>ELS · דילוג 637</span>
      </div>

      <div className="hcg-cipher-space">
        <div className="hcg-cipher-glow" aria-hidden />
        <div className="hcg-cipher-plane">
          <img src={CIPHER_IMAGE} alt="מטריצת הצופן אשלים מלאכה התשפ״ו" loading="eager" />
          <div className="hcg-cipher-shade" aria-hidden />
          <div className="hcg-scan" aria-hidden />
          {CIPHER_WORDS.map((word, i) => (
            <span
              key={word.label}
              className={`hcg-cipher-word ${word.cls} ${step >= i + 1 || step === 0 ? "on" : ""}`}
              style={{ left: word.x, top: word.y }}
            >
              {word.label}
            </span>
          ))}
        </div>
        <div className="hcg-cipher-depth d1" aria-hidden />
        <div className="hcg-cipher-depth d2" aria-hidden />
      </div>

      <div className="hcg-cipher-foot">
        <div><strong>אשלים מלאכה · התשפ״ו</strong><span>תצוגה מרחבית של צופן שכבר קיים במערכת</span></div>
        <span className="hcg-play" aria-hidden>▶</span>
      </div>
    </Link>
  );
}

function SystemDrawer({ onClose }) {
  useEffect(() => {
    const key = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  return (
    <div className="hcg-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="hcg-sheet" role="dialog" aria-modal="true" aria-labelledby="hcg-sheet-title">
        <div className="hcg-sheet-handle" aria-hidden />
        <button className="hcg-sheet-close" type="button" onClick={onClose} aria-label="סגור">×</button>
        <div className="hcg-sheet-top">
          <div className="hcg-sheet-ring" style={{ "--p": `${BUILD_PROGRESS * 3.6}deg` }}>
            <div><strong>{BUILD_PROGRESS}%</strong><span>מפת המערכת</span></div>
          </div>
          <div>
            <div className="hcg-kicker">מפת המערכת</div>
            <h3 id="hcg-sheet-title">מה כבר פתוח — ומה נבנה עכשיו</h3>
            <p>הכול מתחבר לאותו גוף ידע. הרשימה כאן היא מצב בנייה, לא דרגת אמת או חשיבות.</p>
          </div>
        </div>
        <div className="hcg-sheet-groups">
          {SYSTEM_GROUPS.map((g) => (
            <div className={`hcg-sheet-group ${g.cls}`} key={g.title}>
              <span className="hcg-sheet-dot" aria-hidden />
              <div><b>{g.title}</b><p>{g.copy}</p></div>
            </div>
          ))}
        </div>
        <div className="hcg-sheet-future">
          <span>✦</span>
          <div><b>השערים הבאים</b><p>עץ המשפחה · מסעות בתוך הצופן · מסעות בתוך הרמזים — כולם כעדשות עתידיות על אותה מערכת.</p></div>
        </div>
        <Link className="hcg-btn primary wide" to="/map" onClick={onClose}>פתחו את מפת המערכת ←</Link>
      </section>
    </div>
  );
}

export default function HomeCosmicGateway() {
  const [systemOpen, setSystemOpen] = useState(false);

  return (
    <section className="hcg" aria-labelledby="hcg-title" dir="rtl">
      <style>{CSS}</style>
      <div className="hcg-sky" aria-hidden>
        <span className="hcg-star s1" /><span className="hcg-star s2" /><span className="hcg-star s3" />
        <span className="hcg-star s4" /><span className="hcg-star s5" /><span className="hcg-star s6" />
        <span className="hcg-orbit o1" /><span className="hcg-orbit o2" />
        <span className="hcg-horizon" />
      </div>

      <div className="hcg-inner">
        <header className="hcg-brandline">
          <div className="hcg-logo"><img src={LOGO_URL} alt="SOD1820" /></div>
          <div><b>סוד 1820</b><span>כי לה׳ המלוכה</span></div>
        </header>

        <div className="hcg-layout">
          <div className="hcg-story">
            <div className="hcg-kicker"><span className="hcg-live-dot" aria-hidden /> המערכת מתפתחת בזמן אמת</div>
            <h2 id="hcg-title" className="hcg-title">לא עוד אתר.<br /><em>יקום של גילויים.</em></h2>
            <p className="hcg-lead">מספרים, צפנים, מקורות, אנשים וקשרים מתחברים בהדרגה למערכת מחקר אחת שאפשר להיכנס אליה מכל כיוון.</p>

            <button className="hcg-meter" type="button" onClick={() => setSystemOpen(true)} aria-haspopup="dialog">
              <span className="hcg-meter-ring" style={{ "--p": `${BUILD_PROGRESS * 3.6}deg` }}><strong>{BUILD_PROGRESS}%</strong></span>
              <span className="hcg-meter-copy"><b>המערכת נפתחת</b><small>עכשיו בבנייה: העולם</small></span>
              <span className="hcg-meter-arrow" aria-hidden>‹</span>
            </button>

            <div className="hcg-actions">
              <Link to="/start" className="hcg-btn primary">התחילו לגלות</Link>
              <button type="button" className="hcg-btn" onClick={() => setSystemOpen(true)}>מה בדרך?</button>
            </div>
          </div>

          <div className="hcg-demo">
            <LiveCipherPreview />
          </div>
        </div>

        <div className="hcg-micro-future" aria-label="בקרוב במערכת">
          <span>בקרוב</span>
          <b>עץ המשפחה</b>
          <i>·</i>
          <b>מסעות בתוך הצופן 3D</b>
          <i>·</i>
          <b>מסעות בתוך הרמזים 3D</b>
        </div>
      </div>

      {systemOpen && <SystemDrawer onClose={() => setSystemOpen(false)} />}
    </section>
  );
}

const CSS = `
  .hcg{position:relative;isolation:isolate;overflow:hidden;background:#05050a;color:#eee7d8;border-bottom:1px solid rgba(212,175,55,.22);padding:24px 18px 38px;min-height:650px;box-shadow:inset 0 -60px 120px rgba(0,0,0,.44)}
  .hcg-sky{position:absolute;inset:0;z-index:-2;pointer-events:none;background:radial-gradient(circle at 72% 32%,rgba(45,86,170,.18),transparent 25%),radial-gradient(circle at 22% 24%,rgba(119,70,168,.15),transparent 23%),radial-gradient(circle at 50% 40%,rgba(212,175,55,.09),transparent 28%),linear-gradient(180deg,#04050b 0%,#080711 58%,#04050a 100%)}
  .hcg-sky:after{content:"";position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,239,195,.9) 0 1px,transparent 1.4px),radial-gradient(circle,rgba(132,178,255,.52) 0 1px,transparent 1.4px);background-position:0 0,17px 29px;background-size:55px 55px,83px 83px;opacity:.15;mask-image:linear-gradient(#000 0 82%,transparent)}
  .hcg-horizon{position:absolute;left:-12%;right:-12%;height:280px;bottom:-205px;border-radius:50% 50% 0 0/100% 100% 0 0;background:radial-gradient(ellipse at 50% 0,rgba(32,82,170,.34),rgba(8,14,28,.92) 48%,#030409 70%);border-top:1px solid rgba(91,147,255,.52);box-shadow:0 -7px 34px rgba(42,110,244,.19),0 -1px 4px rgba(255,220,120,.45)}
  .hcg-inner{max-width:1160px;margin:0 auto;position:relative;z-index:1}
  .hcg-brandline{display:flex;align-items:center;gap:10px;width:max-content;margin:0 auto 18px}.hcg-logo{width:43px;height:43px;border-radius:50%;display:grid;place-items:center;background:rgba(212,175,55,.08);border:1px solid rgba(212,175,55,.28);box-shadow:0 0 28px rgba(212,175,55,.10)}.hcg-logo img{width:36px;height:36px;object-fit:contain}.hcg-brandline>div:last-child{display:flex;flex-direction:column;text-align:start}.hcg-brandline b{font-family:${F.display};color:#f2d470;font-size:17px;line-height:1}.hcg-brandline span{font-family:${F.ui};color:#a99462;font-size:9.5px;margin-top:4px;letter-spacing:.08em}
  .hcg-layout{display:grid;grid-template-columns:minmax(0,.78fr) minmax(430px,1.22fr);gap:48px;align-items:center;min-height:485px}.hcg-story{text-align:start;max-width:520px}.hcg-kicker{display:flex;align-items:center;gap:8px;font-family:${F.ui};font-size:10.5px;font-weight:900;letter-spacing:.12em;color:#cab15f}.hcg-live-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#59dc7a;box-shadow:0 0 0 0 rgba(89,220,122,.55);animation:hcgPulse 2s ease-out infinite}.hcg-title{font-family:${F.display};font-weight:900;font-size:clamp(38px,5vw,68px);line-height:.98;letter-spacing:-.02em;color:#f3e6be;margin:13px 0 0;text-wrap:balance;text-shadow:0 8px 38px rgba(0,0,0,.48)}.hcg-title em{font-style:normal;color:#f0ca5d;text-shadow:0 0 30px rgba(212,175,55,.18)}.hcg-lead{font-family:${F.body};font-size:15px;line-height:1.85;color:#aaa1b3;margin:18px 0 0;max-width:500px}
  .hcg-meter{margin-top:23px;width:min(100%,410px);min-height:76px;border:1px solid rgba(212,175,55,.38);border-radius:999px;padding:7px 14px 7px 9px;display:flex;align-items:center;gap:12px;text-align:start;direction:rtl;cursor:pointer;color:inherit;background:linear-gradient(100deg,rgba(26,18,8,.78),rgba(12,10,18,.78));box-shadow:0 14px 45px rgba(0,0,0,.26),inset 0 0 26px rgba(212,175,55,.03);backdrop-filter:blur(8px);transition:.2s}.hcg-meter:hover{border-color:rgba(244,211,103,.72);transform:translateY(-1px)}.hcg-meter-ring{--p:172deg;width:58px;height:58px;border-radius:50%;flex:0 0 auto;display:grid;place-items:center;background:conic-gradient(#f4d468 0 var(--p),rgba(255,255,255,.08) var(--p) 360deg);position:relative;box-shadow:0 0 22px rgba(212,175,55,.14);animation:hcgBreath 3.2s ease-in-out infinite}.hcg-meter-ring:after{content:"";position:absolute;inset:5px;border-radius:50%;background:#0a0910;border:1px solid rgba(255,255,255,.05)}.hcg-meter-ring strong{position:relative;z-index:1;font-family:${F.numeric};font-size:17px;color:#ffe897}.hcg-meter-copy{display:flex;flex-direction:column;min-width:0}.hcg-meter-copy b{font-family:${F.ui};font-size:13.5px;color:#f1d374}.hcg-meter-copy small{font-family:${F.body};font-size:11px;color:#9e95a6;margin-top:3px}.hcg-meter-arrow{margin-inline-start:auto;color:#e0bd52;font-size:24px}
  .hcg-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:16px}.hcg-btn{border:1px solid rgba(212,175,55,.31);border-radius:999px;text-decoration:none;font-family:${F.ui};font-size:12px;font-weight:900;color:#ded4c1;background:rgba(255,255,255,.035);padding:10px 18px;cursor:pointer}.hcg-btn.primary{color:#1b1100;background:linear-gradient(135deg,#f1d36d,#c89b2d);border-color:transparent;box-shadow:0 9px 28px rgba(212,175,55,.16)}.hcg-btn.wide{display:block;width:100%;box-sizing:border-box;text-align:center;margin-top:15px}
  .hcg-demo{perspective:1200px}.hcg-cipher-link{display:block;text-decoration:none;color:inherit;border:1px solid rgba(212,175,55,.29);border-radius:28px;padding:15px;background:linear-gradient(145deg,rgba(14,13,22,.90),rgba(5,7,13,.93));box-shadow:0 32px 90px rgba(0,0,0,.45),inset 0 0 60px rgba(63,86,154,.05);transition:.25s;overflow:hidden}.hcg-cipher-link:hover{transform:translateY(-3px);border-color:rgba(212,175,55,.55)}.hcg-cipher-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:1px 3px 9px;font-family:${F.ui}}.hcg-cipher-head>div{display:flex;align-items:center;gap:7px}.hcg-cipher-head b{font-size:12px;color:#e8d58c}.hcg-cipher-head>span{font-family:${F.numeric};font-size:9px;color:#6f7d98;letter-spacing:.08em}
  .hcg-cipher-space{position:relative;height:340px;perspective:1100px;display:grid;place-items:center;overflow:hidden;border-radius:20px;background:radial-gradient(circle at 50% 60%,rgba(39,80,170,.20),transparent 34%),linear-gradient(180deg,#05070e,#060611)}.hcg-cipher-space:after{content:"";position:absolute;left:-10%;right:-10%;bottom:-130px;height:190px;border-radius:50%;border-top:1px solid rgba(72,132,255,.44);background:radial-gradient(ellipse at center top,rgba(39,91,194,.32),transparent 62%);box-shadow:0 -7px 30px rgba(41,106,240,.18)}.hcg-cipher-glow{position:absolute;width:74%;height:60%;border-radius:50%;background:rgba(83,54,162,.11);filter:blur(36px)}.hcg-cipher-plane{position:relative;width:78%;aspect-ratio:1287/473;transform:rotateX(58deg) rotateZ(-2.5deg) translateY(-5px) translateZ(40px);transform-style:preserve-3d;border:1px solid rgba(220,190,91,.35);box-shadow:0 24px 55px rgba(0,0,0,.50),0 0 45px rgba(61,95,190,.13);overflow:hidden;background:#070810}.hcg-cipher-plane img{width:100%;height:100%;object-fit:cover;display:block;filter:grayscale(.78) brightness(.56) contrast(1.1)}.hcg-cipher-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.20),transparent 45%,rgba(0,0,0,.15))}.hcg-scan{position:absolute;top:0;bottom:0;width:2px;right:-3%;background:linear-gradient(transparent,#f0cf64,transparent);box-shadow:0 0 18px #f0cf64;animation:hcgScan 7s linear infinite}.hcg-cipher-word{position:absolute;z-index:4;transform:translate(-50%,-50%) translateZ(24px) scale(.88);opacity:0;padding:3px 8px;border:1px solid currentColor;border-radius:5px;font-family:${F.ui};font-size:clamp(8px,1vw,12px);font-weight:900;white-space:nowrap;background:rgba(5,5,10,.58);transition:opacity .55s,transform .55s,box-shadow .55s}.hcg-cipher-word.on{opacity:1;transform:translate(-50%,-50%) translateZ(24px) scale(1)}.hcg-cipher-word.gold{color:#ffd760;box-shadow:0 0 16px rgba(255,215,96,.45)}.hcg-cipher-word.blue{color:#64a7ff;box-shadow:0 0 17px rgba(67,137,255,.48)}.hcg-cipher-word.violet{color:#cf86ff;box-shadow:0 0 17px rgba(188,87,255,.45)}.hcg-cipher-depth{position:absolute;width:72%;aspect-ratio:1287/473;border:1px solid rgba(95,121,184,.12);transform:rotateX(58deg) rotateZ(-2.5deg) translateY(23px) translateZ(0);opacity:.55}.hcg-cipher-depth.d2{transform:rotateX(58deg) rotateZ(-2.5deg) translateY(44px) translateZ(-20px);opacity:.3}.hcg-cipher-foot{display:flex;justify-content:space-between;align-items:center;gap:12px;text-align:start;padding:12px 5px 2px}.hcg-cipher-foot>div{display:flex;flex-direction:column}.hcg-cipher-foot strong{font-family:${F.ui};font-size:14px;color:#f1d572}.hcg-cipher-foot span{font-family:${F.body};font-size:10.5px;color:#81798b;margin-top:3px}.hcg-play{width:42px;height:42px;border-radius:50%;display:grid!important;place-items:center;background:linear-gradient(135deg,#e6c45b,#ab7f1f);color:#161006!important;font-size:14px!important;padding-inline-start:2px;box-shadow:0 7px 25px rgba(212,175,55,.18)}
  .hcg-micro-future{display:flex;align-items:center;justify-content:center;gap:9px;flex-wrap:wrap;margin:20px auto 0;font-family:${F.ui};font-size:10.5px;color:#736b7c}.hcg-micro-future>span{color:#d3b755;border:1px solid rgba(212,175,55,.25);border-radius:999px;padding:3px 8px}.hcg-micro-future b{font-weight:700;color:#918694}.hcg-micro-future i{font-style:normal;color:#4f4957}
  .hcg-overlay{position:fixed;inset:0;z-index:2147482500;background:rgba(3,3,8,.75);backdrop-filter:blur(9px);display:flex;align-items:flex-end;justify-content:center;padding:18px;direction:rtl}.hcg-sheet{position:relative;width:min(720px,100%);max-height:min(82vh,760px);overflow:auto;border-radius:28px 28px 20px 20px;border:1px solid rgba(212,175,55,.40);background:linear-gradient(180deg,#12101a,#080810 70%);padding:30px 22px 22px;box-shadow:0 -30px 100px rgba(0,0,0,.65),inset 0 0 60px rgba(104,70,161,.05);animation:hcgSheetIn .34s cubic-bezier(.22,.8,.3,1)}.hcg-sheet-handle{position:absolute;top:9px;left:50%;transform:translateX(-50%);width:46px;height:4px;border-radius:999px;background:rgba(255,255,255,.18)}.hcg-sheet-close{position:absolute;top:15px;inset-inline-start:15px;width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#eee;font-size:24px;cursor:pointer}.hcg-sheet-top{display:grid;grid-template-columns:126px 1fr;gap:20px;align-items:center;text-align:start}.hcg-sheet-ring{--p:172deg;width:112px;height:112px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#f0cf64 0 var(--p),rgba(255,255,255,.07) var(--p) 360deg);box-shadow:0 0 36px rgba(212,175,55,.16);position:relative}.hcg-sheet-ring:after{content:"";position:absolute;inset:9px;border-radius:50%;background:#0c0b11}.hcg-sheet-ring>div{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center}.hcg-sheet-ring strong{font-family:${F.numeric};font-size:27px;color:#ffe596}.hcg-sheet-ring span{font-family:${F.ui};font-size:8.5px;color:#7e7687}.hcg-sheet-top h3{font-family:${F.display};font-size:24px;color:#f1d578;margin:5px 0 5px}.hcg-sheet-top p,.hcg-sheet-future p{font-family:${F.body};font-size:12px;line-height:1.65;color:#958c9d;margin:0}.hcg-sheet-groups{display:grid;gap:8px;margin-top:20px}.hcg-sheet-group{display:flex;align-items:flex-start;gap:10px;text-align:start;padding:12px 13px;border-radius:14px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025)}.hcg-sheet-dot{width:9px;height:9px;margin-top:5px;border-radius:50%;flex:0 0 auto}.hcg-sheet-group.active .hcg-sheet-dot{background:#59dc7a;box-shadow:0 0 15px rgba(89,220,122,.55)}.hcg-sheet-group.building .hcg-sheet-dot{background:#e8bd47;box-shadow:0 0 15px rgba(232,189,71,.45)}.hcg-sheet-group.future .hcg-sheet-dot{background:#ad74e6;box-shadow:0 0 15px rgba(173,116,230,.45)}.hcg-sheet-group b{font-family:${F.ui};font-size:12.5px;color:#ddd4c3}.hcg-sheet-group p{font-family:${F.body};font-size:11.5px;color:#8e8596;line-height:1.6;margin:3px 0 0}.hcg-sheet-future{display:flex;gap:11px;text-align:start;border-top:1px solid rgba(212,175,55,.14);margin-top:17px;padding-top:16px}.hcg-sheet-future>span{font-size:24px;color:#f2ce5c}.hcg-sheet-future b{font-family:${F.ui};font-size:13px;color:#ead17a}
  @keyframes hcgPulse{0%{box-shadow:0 0 0 0 rgba(89,220,122,.45)}100%{box-shadow:0 0 0 10px rgba(89,220,122,0)}}@keyframes hcgBreath{0%,100%{filter:brightness(.92)}50%{filter:brightness(1.15)}}@keyframes hcgScan{0%{right:-3%;opacity:0}7%{opacity:1}60%{opacity:.9}72%{opacity:0}100%{right:103%;opacity:0}}@keyframes hcgSheetIn{from{transform:translateY(35px);opacity:0}to{transform:none;opacity:1}}
  @media(max-width:760px){.hcg{min-height:0;padding:18px 12px 28px}.hcg-brandline{margin-bottom:12px}.hcg-layout{display:block;min-height:0}.hcg-story{text-align:center;margin:0 auto}.hcg-kicker{justify-content:center}.hcg-title{font-size:clamp(31px,10.5vw,47px);line-height:1.02;margin-top:10px}.hcg-lead{font-size:13px;line-height:1.72;margin-top:12px;padding:0 4px}.hcg-meter{margin:18px auto 0;min-height:68px;padding:6px 12px 6px 7px}.hcg-meter-ring{width:54px;height:54px}.hcg-actions{justify-content:center;margin-top:12px}.hcg-demo{margin-top:22px}.hcg-cipher-link{border-radius:22px;padding:11px}.hcg-cipher-space{height:238px;border-radius:15px}.hcg-cipher-plane{width:92%;transform:rotateX(57deg) rotateZ(-2deg) translateY(2px) translateZ(25px)}.hcg-cipher-depth{width:87%}.hcg-cipher-head b{font-size:11px}.hcg-cipher-head>span{font-size:8px}.hcg-cipher-foot{padding:9px 3px 2px}.hcg-cipher-foot strong{font-size:12.5px}.hcg-play{width:38px;height:38px}.hcg-micro-future{margin-top:15px;font-size:9.5px;padding:0 8px}.hcg-sheet{padding:29px 16px 18px;border-radius:25px 25px 18px 18px;max-height:86vh}.hcg-sheet-top{grid-template-columns:90px 1fr;gap:13px}.hcg-sheet-ring{width:82px;height:82px}.hcg-sheet-ring strong{font-size:21px}.hcg-sheet-top h3{font-size:19px;line-height:1.05}.hcg-sheet-top p{font-size:10.5px}.hcg-horizon{bottom:-220px}}
  @media(max-width:390px){.hcg-title{font-size:34px}.hcg-lead{font-size:12.5px}.hcg-cipher-space{height:215px}.hcg-meter-copy b{font-size:12.5px}.hcg-meter-copy small{font-size:10px}.hcg-micro-future i{display:none}.hcg-micro-future b{flex:1 1 42%}}
  @media(prefers-reduced-motion:reduce){.hcg-live-dot,.hcg-meter-ring,.hcg-scan{animation:none}.hcg-cipher-word{transition:none}.hcg-sheet{animation:none}}
`;
