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
          <small>מתוך פוסט חי</small>
          <strong>צורת יהלום</strong>
          <b>= 787</b>
          <em>פתח את הפוסט</em>
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
        .sod-now-map{position:relative;height:300px;margin-top:12px;border:1px solid rgba(212,175,55,.12);border-radius:14px;background:radial-gradient(circle at 50% 50%,rgba(212,175,55,.08),transparent 50%)}
        .sod-now-preview-diamond{position:absolute;z-index:4;left:50%;top:52%;transform:translate(-50%,-50%) rotate(45deg);width:122px;height:122px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-decoration:none;border:1px solid rgba(212,175,55,.8);background:linear-gradient(145deg,rgba(212,175,55,.18),rgba(62,166,255,.10),rgba(9,6,3,.96));box-shadow:0 0 34px rgba(212,175,55,.2)}
        .sod-now-preview-diamond>*{transform:rotate(-45deg)}.sod-now-preview-diamond small{color:${C.goldDim};font:700 8px ${F.heading}}.sod-now-preview-diamond strong{color:${C.goldBright};font:800 13px ${F.body};white-space:nowrap}.sod-now-preview-diamond b{color:${C.goldBright};font:900 22px ${F.mono}}.sod-now-preview-diamond em{color:${C.goldLight};font:700 8px ${F.heading};font-style:normal;margin-top:5px}
        .sod-now-preview-node{position:absolute;z-index:3;padding:8px 10px;border:1px solid rgba(212,175,55,.24);border-radius:11px;background:rgba(12,8,4,.9)}.sod-now-preview-node small{display:block;color:${C.goldDim};font:700 8px ${F.heading}}.sod-now-preview-node strong{display:block;color:${C.goldLight};font:800 11px ${F.body};white-space:nowrap}.sod-now-preview-node.year{top:18px;right:12px}.sod-now-preview-node.ronen{top:18px;left:12px}
        .sod-now-preview-locked{position:absolute;z-index:2;color:${C.goldDim};font:700 8px ${F.heading};opacity:.65}.sod-now-preview-locked.l1{bottom:52px;right:14px}.sod-now-preview-locked.l2{bottom:20px;right:70px}.sod-now-preview-locked.l3{bottom:20px;left:70px}.sod-now-preview-locked.l4{bottom:52px;left:14px}
        .sod-now-preview-pipe{position:absolute;z-index:1;left:50%;top:52%;height:1px;width:132px;transform-origin:0 50%;background:linear-gradient(90deg,rgba(212,175,55,.08),rgba(212,175,55,.55),rgba(62,166,255,.18));box-shadow:0 0 8px rgba(212,175,55,.2)}.sod-now-preview-pipe.p1{transform:rotate(-52deg)}.sod-now-preview-pipe.p2{transform:rotate(232deg)}.sod-now-preview-pipe.p3{transform:rotate(33deg)}.sod-now-preview-pipe.p4{transform:rotate(147deg)}.sod-now-preview-pipe.p5{transform:rotate(72deg)}.sod-now-preview-pipe.p6{transform:rotate(108deg)}
        .sod-now-preview-summary{display:grid;gap:3px;margin-top:10px;padding-top:10px;border-top:1px solid rgba(212,175,55,.14);text-align:center}.sod-now-preview-summary strong{color:${C.goldLight};font:800 11px ${F.heading}}.sod-now-preview-summary span{color:${C.muted};font:400 10px/1.5 ${F.body}}
        .sod-now-ronen{margin:12px 0 0;padding:12px 13px;border:1px solid rgba(212,175,55,.18);border-radius:12px;background:rgba(212,175,55,.035);color:${C.goldLight};font:400 11px/1.7 ${F.body}}.sod-now-ronen p{margin:7px 0}.sod-now-ronen strong{color:${C.goldBright}}.sod-now-ronen-title{color:${C.goldBright};font:800 12px ${F.heading}}.sod-now-ronen footer{margin-top:8px;color:${C.goldDim};font-weight:800}
        @media(max-width:560px){.sod-now-map{height:286px}.sod-now-preview-diamond{width:108px;height:108px}.sod-now-preview-node{padding:7px 8px}.sod-now-preview-node strong{font-size:10px}.sod-now-preview-locked{font-size:7px}}
      `}</style>
    </section>
  );
}
