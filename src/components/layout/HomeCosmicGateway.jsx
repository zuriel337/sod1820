import React from "react";
import { Link } from "react-router-dom";
import { BUILD_PROGRESS } from "../../lib/knowledgeMap.js";
import { F, LOGO_URL } from "../../theme.js";

const CONSTELLATION = [
  { label: "היכל", state: "פעיל", cls: "active", to: "/research" },
  { label: "דף המספר", state: "פעיל", cls: "active", to: "/number" },
  { label: "העולם", state: "בבנייה", cls: "building" },
  { label: "המחקר שלי", state: "בבנייה", cls: "building", to: "/research" },
  { label: "עץ המשפחה", state: "בקרוב", cls: "future" },
  { label: "מסעות 3D", state: "בקרוב", cls: "future" },
];

const FUTURE_GATES = [
  {
    icon: "✦",
    title: "עץ המשפחה",
    text: "אנשים, שמות וקשרים לאורך דורות — כעדשה על אותו עץ ידע.",
  },
  {
    icon: "א",
    title: "מסעות בתוך הצופן · תלת־ממד",
    text: "לנוע בין אותיות, נתיבי ELS ומקורות בתוך מרחב מחקר אחד.",
  },
  {
    icon: "∞",
    title: "מסעות בתוך הרמזים · תלת־ממד",
    text: "לעבור בין מספרים, אירועים, מקורות וישויות כחוויית גילוי מרחבית.",
  },
];

function Node({ item, index }) {
  const body = (
    <>
      <span className={`hcg-dot ${item.cls}`} aria-hidden />
      <span className="hcg-node-label">{item.label}</span>
      <span className={`hcg-node-state ${item.cls}`}>{item.state}</span>
    </>
  );

  return item.to ? (
    <Link to={item.to} className={`hcg-node hcg-node-${index + 1}`}>{body}</Link>
  ) : (
    <div className={`hcg-node hcg-node-${index + 1}`} aria-label={`${item.label} — ${item.state}`}>{body}</div>
  );
}

export default function HomeCosmicGateway() {
  return (
    <section className="hcg" aria-labelledby="hcg-title" dir="rtl">
      <style>{CSS}</style>
      <div className="hcg-sky" aria-hidden>
        <span className="hcg-orbit o1" />
        <span className="hcg-orbit o2" />
        <span className="hcg-orbit o3" />
        <span className="hcg-star s1" /><span className="hcg-star s2" /><span className="hcg-star s3" />
        <span className="hcg-star s4" /><span className="hcg-star s5" /><span className="hcg-star s6" />
      </div>

      <div className="hcg-inner">
        <div className="hcg-kicker">המערכת מתפתחת בזמן אמת</div>
        <h2 id="hcg-title" className="hcg-title">היקום של SOD1820 ממשיך להיפתח</h2>
        <p className="hcg-lead">מערכת ידע חיה שמחברת מספרים, צפנים, מקורות, אנשים, נושאים וקשרים בתוך גוף ידע אחד.</p>

        <div className="hcg-stage" aria-label="מפת מערכת קוסמית">
          <div className="hcg-core">
            <div className="hcg-logo-wrap"><img src={LOGO_URL} alt="" aria-hidden /></div>
            <div className="hcg-brand">סוד 1820</div>
            <div className="hcg-tag">כי לה׳ המלוכה</div>
            <div className="hcg-progress"><strong>{BUILD_PROGRESS}%</strong><span>ממפת המערכת החדשה</span></div>
          </div>
          {CONSTELLATION.map((item, i) => <Node key={item.label} item={item} index={i} />)}
        </div>

        <div className="hcg-now">
          <span className="hcg-now-mark" aria-hidden>◐</span>
          <div><b>עכשיו בבנייה: העולם</b><span>מרכז הידע שמחבר ישויות, נושאים, מקורות וקשרים — אותה מציאות מחקרית, יותר דרכי כניסה.</span></div>
        </div>

        <div className="hcg-next-head">
          <span>בקרוב נפתחים שערים חדשים</span>
          <small>עתידי · עדיין לא פעיל</small>
        </div>
        <div className="hcg-future-grid">
          {FUTURE_GATES.map((gate) => (
            <article className="hcg-future" key={gate.title}>
              <div className="hcg-future-icon" aria-hidden>{gate.icon}</div>
              <div>
                <h3>{gate.title}</h3>
                <p>{gate.text}</p>
                <span>בקרוב</span>
              </div>
            </article>
          ))}
        </div>

        <div className="hcg-actions">
          <Link to="/map" className="hcg-btn primary">מפת המערכת ←</Link>
          <Link to="/start" className="hcg-btn">התחילו לגלות</Link>
        </div>
      </div>
    </section>
  );
}

const CSS = `
  .hcg{position:relative;isolation:isolate;overflow:hidden;background:#07060d;color:#eee5cf;border-bottom:1px solid rgba(212,175,55,.24);padding:34px 18px 42px;box-shadow:inset 0 -30px 80px rgba(0,0,0,.24);}
  .hcg-sky{position:absolute;inset:0;z-index:-2;pointer-events:none;background:
    radial-gradient(circle at 50% 36%,rgba(212,175,55,.18),transparent 24%),
    radial-gradient(circle at 20% 22%,rgba(100,70,160,.18),transparent 26%),
    radial-gradient(circle at 82% 62%,rgba(49,112,170,.13),transparent 24%),
    linear-gradient(180deg,#080711 0%,#0b0812 56%,#08060b 100%);}
  .hcg-sky:after{content:"";position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,236,182,.66) 0 1px,transparent 1.5px);background-size:43px 43px;opacity:.13;mask-image:linear-gradient(180deg,#000,transparent 92%);}
  .hcg-inner{max-width:1160px;margin:0 auto;text-align:center;position:relative;z-index:1;}
  .hcg-kicker{font-family:${F.ui};font-size:11px;font-weight:900;letter-spacing:.16em;color:#caa84c;text-transform:uppercase;}
  .hcg-title{font-family:${F.display};font-size:clamp(28px,5vw,54px);line-height:1.05;color:#f6df87;margin:7px 0 0;font-weight:900;text-wrap:balance;text-shadow:0 0 28px rgba(212,175,55,.12);}
  .hcg-lead{font-family:${F.body};font-size:clamp(13px,2vw,16px);line-height:1.8;color:#bdb4c6;max-width:720px;margin:11px auto 0;}

  .hcg-stage{position:relative;max-width:900px;height:390px;margin:26px auto 8px;border:1px solid rgba(212,175,55,.20);border-radius:34px;background:radial-gradient(circle at 50% 52%,rgba(212,175,55,.09),transparent 31%),rgba(6,5,11,.42);box-shadow:inset 0 0 90px rgba(75,48,112,.10),0 22px 70px rgba(0,0,0,.22);overflow:hidden;}
  .hcg-stage:before,.hcg-stage:after{content:"";position:absolute;left:50%;top:52%;border:1px solid rgba(212,175,55,.19);border-radius:50%;transform:translate(-50%,-50%) rotate(-12deg);}
  .hcg-stage:before{width:70%;height:44%;}.hcg-stage:after{width:86%;height:64%;transform:translate(-50%,-50%) rotate(13deg);border-color:rgba(134,102,186,.18);}
  .hcg-core{position:absolute;left:50%;top:51%;transform:translate(-50%,-50%);z-index:4;width:220px;height:220px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle,rgba(212,175,55,.16),rgba(12,9,14,.96) 62%,rgba(5,4,8,.98));border:1px solid rgba(212,175,55,.44);box-shadow:0 0 0 14px rgba(212,175,55,.025),0 0 70px rgba(212,175,55,.12);}
  .hcg-logo-wrap{width:58px;height:58px;border-radius:50%;display:grid;place-items:center;background:rgba(212,175,55,.08);box-shadow:0 0 28px rgba(212,175,55,.16);}.hcg-logo-wrap img{width:49px;height:49px;object-fit:contain;}
  .hcg-brand{font-family:${F.display};font-size:23px;font-weight:900;color:#f5db7b;margin-top:5px;}.hcg-tag{font-family:${F.ui};font-size:12.5px;font-weight:800;color:#cdbb89;margin-top:1px;}
  .hcg-progress{margin-top:10px;display:flex;align-items:baseline;gap:7px;justify-content:center;}.hcg-progress strong{font-family:${F.numeric};font-size:30px;color:#ffe88f;line-height:1}.hcg-progress span{font-family:${F.ui};font-size:9.5px;color:#81798a;max-width:72px;text-align:start;line-height:1.2;}

  .hcg-node{position:absolute;z-index:5;min-width:124px;padding:9px 10px;border-radius:14px;text-decoration:none;display:flex;align-items:center;gap:7px;text-align:start;background:rgba(12,9,18,.88);border:1px solid rgba(255,255,255,.10);box-shadow:0 8px 24px rgba(0,0,0,.22);backdrop-filter:blur(6px);}
  .hcg-node:hover{border-color:rgba(212,175,55,.52);transform:translateY(-1px);}.hcg-dot{width:8px;height:8px;border-radius:50%;flex:0 0 auto;box-shadow:0 0 12px currentColor}.hcg-dot.active{background:#72d7b0;color:#72d7b0}.hcg-dot.building{background:#e2bd52;color:#e2bd52}.hcg-dot.future{background:#8c78bd;color:#8c78bd}.hcg-node-label{font-family:${F.ui};font-size:12px;font-weight:900;color:#eee6d4;}.hcg-node-state{font-family:${F.ui};font-size:9px;margin-inline-start:auto}.hcg-node-state.active{color:#72d7b0}.hcg-node-state.building{color:#e2bd52}.hcg-node-state.future{color:#a896d4}
  .hcg-node-1{top:14%;right:12%}.hcg-node-2{bottom:16%;right:8%}.hcg-node-3{top:9%;left:41%}.hcg-node-4{top:24%;left:8%}.hcg-node-5{bottom:11%;left:12%}.hcg-node-6{bottom:8%;left:42%}

  .hcg-orbit{position:absolute;left:50%;top:54%;border:1px solid rgba(212,175,55,.16);border-radius:50%;transform:translate(-50%,-50%) rotate(-14deg);}.hcg-orbit.o1{width:620px;height:220px}.hcg-orbit.o2{width:780px;height:300px;transform:translate(-50%,-50%) rotate(17deg);border-color:rgba(115,83,166,.16)}.hcg-orbit.o3{width:470px;height:350px;transform:translate(-50%,-50%) rotate(72deg);opacity:.55}
  .hcg-star{position:absolute;width:4px;height:4px;border-radius:50%;background:#ffe99f;box-shadow:0 0 14px rgba(255,233,159,.85)}.hcg-star.s1{top:14%;left:17%}.hcg-star.s2{top:26%;right:21%}.hcg-star.s3{bottom:18%;left:31%}.hcg-star.s4{bottom:26%;right:16%}.hcg-star.s5{top:54%;left:8%}.hcg-star.s6{top:67%;right:37%}

  .hcg-now{max-width:780px;margin:14px auto 0;display:flex;align-items:flex-start;gap:12px;text-align:start;padding:14px 16px;border-radius:16px;border:1px solid rgba(212,175,55,.26);background:linear-gradient(90deg,rgba(212,175,55,.08),rgba(112,77,168,.06));}.hcg-now-mark{font-size:20px;color:#e0bd52;line-height:1}.hcg-now b{display:block;font-family:${F.ui};font-size:15px;color:#f2d87a}.hcg-now span{display:block;font-family:${F.body};font-size:12.5px;color:#a9a0b1;line-height:1.7;margin-top:3px}
  .hcg-next-head{margin:27px auto 10px;display:flex;align-items:end;justify-content:space-between;gap:12px;max-width:980px;text-align:start;border-bottom:1px solid rgba(212,175,55,.17);padding-bottom:9px}.hcg-next-head span{font-family:${F.display};font-size:22px;font-weight:900;color:#efda88}.hcg-next-head small{font-family:${F.ui};font-size:10px;color:#877d91}
  .hcg-future-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:11px;max-width:980px;margin:0 auto}.hcg-future{display:flex;gap:12px;text-align:start;min-height:126px;padding:16px;border-radius:18px;border:1px solid rgba(126,95,177,.24);background:linear-gradient(145deg,rgba(27,19,38,.82),rgba(10,8,15,.90));box-shadow:inset 0 0 38px rgba(88,59,132,.05)}.hcg-future-icon{width:42px;height:42px;border-radius:14px;flex:0 0 auto;display:grid;place-items:center;border:1px solid rgba(212,175,55,.32);color:#f5df8a;background:rgba(212,175,55,.07);font-family:${F.display};font-size:21px;font-weight:900}.hcg-future h3{font-family:${F.ui};font-size:14px;color:#ead894;margin:1px 0 0;font-weight:900}.hcg-future p{font-family:${F.body};font-size:11.5px;color:#9f96a7;line-height:1.6;margin:6px 0 7px}.hcg-future span{font-family:${F.ui};font-size:9px;color:#aa96d3;border:1px solid rgba(139,111,191,.30);border-radius:999px;padding:2px 7px}
  .hcg-actions{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:18px}.hcg-btn{text-decoration:none;font-family:${F.ui};font-size:12.5px;font-weight:900;color:#e7dac0;border:1px solid rgba(212,175,55,.33);border-radius:999px;padding:10px 18px;background:rgba(255,255,255,.035)}.hcg-btn.primary{background:linear-gradient(135deg,#e0bd52,#b58a22);color:#1b1100;border-color:transparent;box-shadow:0 7px 24px rgba(212,175,55,.14)}

  @media(max-width:760px){
    .hcg{padding:28px 12px 34px}.hcg-stage{height:auto;min-height:0;padding:24px 14px 16px;margin-top:20px}.hcg-stage:before,.hcg-stage:after,.hcg-orbit{display:none}.hcg-core{position:relative;left:auto;top:auto;transform:none;margin:0 auto 18px;width:190px;height:190px}.hcg-node{position:relative;inset:auto!important;width:100%;box-sizing:border-box;margin-top:7px}.hcg-future-grid{grid-template-columns:1fr}.hcg-next-head{align-items:flex-start;flex-direction:column}.hcg-next-head span{font-size:20px}.hcg-star{opacity:.45}
  }
  @media(prefers-reduced-motion:reduce){.hcg-star{box-shadow:none}}
`;
