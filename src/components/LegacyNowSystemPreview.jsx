import React from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";

export default function LegacyNowSystemPreview() {
  return (
    <section className="sod-now-preview" aria-label="הצצה מהמערכת החדשה — העת עכשיו">
      <div className="sod-now-preview-head">
        <div>
          <span className="sod-now-preview-kicker">✦ הצצה מהמערכת החדשה</span>
          <h3>העת עכשיו <b>· תשפ״ז · 787</b></h3>
        </div>
        <span className="sod-now-preview-badge">הצצה</span>
      </div>

      <div className="sod-now-map">
        <span className="sod-now-preview-pipe p1" /><span className="sod-now-preview-pipe p2" /><span className="sod-now-preview-pipe p3" />
        <span className="sod-now-preview-pipe p4" /><span className="sod-now-preview-pipe p5" /><span className="sod-now-preview-pipe p6" />

        <div className="sod-now-preview-node year"><small>השנה</small><strong>תשפ״ז = 787</strong></div>
        <div className="sod-now-preview-node ronen"><small>אבני רונן</small><strong>ושמחת בחגך = 787</strong></div>

        <Link to="/yam-hamelach-tiferet-geula" className="sod-now-preview-diamond">
          <span className="diamond-halo" aria-hidden />
          <span className="diamond-facet f1" aria-hidden />
          <span className="diamond-facet f2" aria-hidden />
          <span className="diamond-facet f3" aria-hidden />
          <span className="diamond-core" aria-hidden />
          <span className="diamond-copy">
            <strong>צורת יהלום</strong>
            <b>= 787</b>
          </span>
        </Link>

        <Link to="/yam-hamelach-tiferet-geula" className="sod-now-preview-source">
          <small>מתוך הפוסט</small>
          <strong>ים המלח הוא ספירת תפארת — ולכן משם תצא הגאולה</strong>
        </Link>

        <div className="sod-now-preview-locked l1">● עוד גימטריות 🔒</div>
        <div className="sod-now-preview-locked l2">● מקורות 🔒</div>
        <div className="sod-now-preview-locked l3">● צירים 🔒</div>
        <div className="sod-now-preview-locked l4">● חיבורים נוספים 🔒</div>
      </div>

      <div className="sod-now-preview-summary">
        <strong>2 מקורות · 3 ביטויים · אותו מספר · אותה עת</strong>
        <span>וזו רק שכבה אחת מתוך רשת החיבורים שנבנית במערכת החדשה.</span>
      </div>

      <blockquote className="sod-now-ronen">
        <div className="sod-now-ronen-title">👁️😊 המסר של אבני רונן</div>
        <p><strong>ושמחת בחגך</strong></p>
        <p>כניסת שנת <strong>תשפ״ז</strong> רומז לנו לחג הסוכות על המצווה השמחה המרכזית של חג הסוכות.</p>
        <p>😊 <strong>ושמחת בחגך</strong> 😊</p>
        <p>והרמז הוא.........</p>
        <p><strong>תשפ״ז = 787 בגימטריה</strong></p>
        <p>ובאותה גימטריה שימו לב ❗❗</p>
        <p>😊 <strong>ושמחת בחגך = 787</strong></p>
        <p>זה בעצם רמז שהשנה עצמה מזכירה לנו - להיכנס אל השנה החדשה מתוך שמחה, הודיה ואמונה ולקיים את מצוות <strong>ושמחת בחגך</strong> בלב שלם.</p>
        <p>🌿🛖 חג הסוכות זמן של שמחה, אחדות וברכה.</p>
        <p>שנזכה לשנה טובה, שמחה ומאושרת.</p>
        <p>😊 <strong>ושמחת בחגך</strong> 😊</p>
        <footer>ממני אבני רונן</footer>
      </blockquote>

      <style>{`
        .sod-now-preview{position:relative;overflow:hidden;margin:0 0 16px;padding:16px;border-radius:16px;border:1px solid ${C.borderGold};background:radial-gradient(circle at 50% 30%,rgba(62,166,255,.10),transparent 30%),linear-gradient(160deg,rgba(20,15,12,.94),rgba(8,5,2,.9));box-shadow:0 18px 55px rgba(0,0,0,.45)}
        .sod-now-preview-head{display:flex;justify-content:space-between;gap:10px}.sod-now-preview-kicker{color:${C.goldDim};font:900 10px ${F.heading};letter-spacing:1.2px}.sod-now-preview-head h3{margin:4px 0 0;color:${C.goldBright};font:700 21px ${F.regal}}.sod-now-preview-head h3 b{font-family:${F.mono};font-size:.85em}.sod-now-preview-badge{padding:4px 8px;border:1px solid ${C.borderGold};border-radius:999px;color:${C.goldLight};font:800 8px ${F.heading};height:max-content}
        .sod-now-map{position:relative;height:320px;margin-top:12px;border:1px solid rgba(212,175,55,.12);border-radius:14px;overflow:hidden;perspective:900px;background:radial-gradient(circle at 50% 52%,rgba(78,176,255,.12),transparent 24%),radial-gradient(circle at 50% 50%,rgba(212,175,55,.09),transparent 52%),linear-gradient(180deg,rgba(8,8,18,.64),rgba(8,5,2,.44))}
        .sod-now-map::before{content:"";position:absolute;inset:0;opacity:.18;background-image:linear-gradient(rgba(212,175,55,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(212,175,55,.08) 1px,transparent 1px);background-size:34px 34px;transform:perspective(420px) rotateX(62deg) scale(1.35) translateY(44px);transform-origin:center bottom}
        .sod-now-preview-diamond{position:absolute;z-index:4;left:50%;top:52%;width:142px;height:142px;transform-style:preserve-3d;transform:translate(-50%,-50%) rotateX(58deg) rotateZ(45deg);text-decoration:none;border:1px solid rgba(246,226,122,.9);background:linear-gradient(135deg,rgba(246,226,122,.24),rgba(62,166,255,.18) 48%,rgba(13,8,4,.9));box-shadow:0 0 18px rgba(246,226,122,.34),0 0 54px rgba(62,166,255,.16),inset 0 0 28px rgba(255,255,255,.10);animation:sodDiamondFloat 5.2s ease-in-out infinite}
        .sod-now-preview-diamond::before,.sod-now-preview-diamond::after{content:"";position:absolute;inset:12px;border:1px solid rgba(246,226,122,.32);background:linear-gradient(45deg,transparent 48%,rgba(255,255,255,.16) 49%,rgba(255,255,255,.04) 52%,transparent 53%)}
        .sod-now-preview-diamond::after{inset:27px;border-color:rgba(62,166,255,.34);transform:translateZ(18px);box-shadow:0 0 20px rgba(62,166,255,.16)}
        .diamond-halo{position:absolute;inset:-24px;border:1px solid rgba(212,175,55,.18);border-radius:50%;transform:translateZ(-30px);box-shadow:0 0 42px rgba(212,175,55,.14)}
        .diamond-facet{position:absolute;inset:0;pointer-events:none}.diamond-facet.f1{clip-path:polygon(0 0,50% 50%,0 100%);background:linear-gradient(90deg,rgba(246,226,122,.20),transparent)}.diamond-facet.f2{clip-path:polygon(0 0,100% 0,50% 50%);background:linear-gradient(180deg,rgba(255,255,255,.15),transparent)}.diamond-facet.f3{clip-path:polygon(100% 0,100% 100%,50% 50%);background:linear-gradient(270deg,rgba(62,166,255,.16),transparent)}
        .diamond-core{position:absolute;left:50%;top:50%;width:18px;height:18px;border-radius:50%;background:#fff3b0;transform:translate(-50%,-50%) translateZ(28px);box-shadow:0 0 12px #fff3b0,0 0 30px rgba(62,166,255,.75),0 0 55px rgba(212,175,55,.42);animation:sodCorePulse 2.6s ease-in-out infinite}
        .diamond-copy{position:absolute;z-index:5;left:50%;top:50%;width:120px;text-align:center;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-50%) rotateZ(-45deg) rotateX(-58deg) translateZ(42px);text-shadow:0 2px 12px #000}
        .diamond-copy strong{color:${C.goldBright};font:900 13px ${F.body};white-space:nowrap}.diamond-copy b{color:#fff3b0;font:900 25px ${F.mono};line-height:1.05;letter-spacing:1px}
        .sod-now-preview-diamond:hover{animation-play-state:paused;box-shadow:0 0 28px rgba(246,226,122,.5),0 0 72px rgba(62,166,255,.25),inset 0 0 34px rgba(255,255,255,.14)}
        @keyframes sodDiamondFloat{0%,100%{transform:translate(-50%,-50%) rotateX(58deg) rotateZ(45deg) translateY(0)}50%{transform:translate(-50%,-50%) rotateX(54deg) rotateZ(49deg) translateY(-7px)}}@keyframes sodCorePulse{0%,100%{opacity:.72;scale:.82}50%{opacity:1;scale:1.18}}
        .sod-now-preview-source{position:absolute;z-index:5;left:50%;bottom:48px;transform:translateX(-50%);width:min(88%,330px);display:grid;gap:2px;text-align:center;text-decoration:none;padding:7px 10px;border-radius:10px;background:rgba(7,5,3,.78);border:1px solid rgba(212,175,55,.16);backdrop-filter:blur(8px)}.sod-now-preview-source small{color:${C.goldDim};font:700 8px ${F.heading}}.sod-now-preview-source strong{color:${C.goldLight};font:800 9px/1.45 ${F.body}}.sod-now-preview-source:hover strong{color:${C.goldBright}}
        .sod-now-preview-node{position:absolute;z-index:3;padding:8px 10px;border:1px solid rgba(212,175,55,.24);border-radius:11px;background:rgba(12,8,4,.9)}.sod-now-preview-node small{display:block;color:${C.goldDim};font:700 8px ${F.heading}}.sod-now-preview-node strong{display:block;color:${C.goldLight};font:800 11px ${F.body};white-space:nowrap}.sod-now-preview-node.year{top:18px;right:12px}.sod-now-preview-node.ronen{top:18px;left:12px}
        .sod-now-preview-locked{position:absolute;z-index:2;color:${C.goldDim};font:700 8px ${F.heading};opacity:.65}.sod-now-preview-locked.l1{bottom:52px;right:14px}.sod-now-preview-locked.l2{bottom:20px;right:70px}.sod-now-preview-locked.l3{bottom:20px;left:70px}.sod-now-preview-locked.l4{bottom:52px;left:14px}
        .sod-now-preview-pipe{position:absolute;z-index:1;left:50%;top:52%;height:1px;width:142px;transform-origin:0 50%;background:linear-gradient(90deg,rgba(212,175,55,.05),rgba(246,226,122,.72),rgba(62,166,255,.22));box-shadow:0 0 9px rgba(212,175,55,.28);overflow:visible}.sod-now-preview-pipe::after{content:"";position:absolute;top:-2px;left:0;width:5px;height:5px;border-radius:50%;background:#fff3b0;box-shadow:0 0 10px rgba(62,166,255,.9);animation:sodSignal 2.8s linear infinite}@keyframes sodSignal{from{left:0;opacity:.15}20%{opacity:1}to{left:100%;opacity:.15}}.sod-now-preview-pipe.p1{transform:rotate(-52deg)}.sod-now-preview-pipe.p2{transform:rotate(232deg)}.sod-now-preview-pipe.p3{transform:rotate(33deg)}.sod-now-preview-pipe.p4{transform:rotate(147deg)}.sod-now-preview-pipe.p5{transform:rotate(72deg)}.sod-now-preview-pipe.p6{transform:rotate(108deg)}
        .sod-now-preview-summary{display:grid;gap:3px;margin-top:10px;padding-top:10px;border-top:1px solid rgba(212,175,55,.14);text-align:center}.sod-now-preview-summary strong{color:${C.goldLight};font:800 11px ${F.heading}}.sod-now-preview-summary span{color:${C.muted};font:400 10px/1.5 ${F.body}}
        .sod-now-ronen{margin:12px 0 0;padding:12px 13px;border:1px solid rgba(212,175,55,.18);border-radius:12px;background:rgba(212,175,55,.035);color:${C.goldLight};font:400 11px/1.7 ${F.body}}.sod-now-ronen p{margin:7px 0}.sod-now-ronen strong{color:${C.goldBright}}.sod-now-ronen-title{color:${C.goldBright};font:800 12px ${F.heading}}.sod-now-ronen footer{margin-top:8px;color:${C.goldDim};font-weight:800}
        @media(max-width:560px){.sod-now-map{height:306px}.sod-now-preview-diamond{width:122px;height:122px}.diamond-copy{width:104px}.diamond-copy b{font-size:25px}.sod-now-preview-node{padding:7px 8px}.sod-now-preview-node strong{font-size:10px}.sod-now-preview-locked{font-size:7px}}@media(prefers-reduced-motion:reduce){.sod-now-preview-diamond,.diamond-core,.sod-now-preview-pipe::after{animation:none}}
      `}</style>
    </section>
  );
}
