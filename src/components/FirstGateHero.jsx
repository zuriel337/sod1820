import React from "react";
import { C, F } from "../theme.js";
import { FIRST_GATE_HOME_HASH, useFirstGateCountdown } from "../lib/firstGateMilestone.js";

const pad = n => String(n).padStart(2, "0");

export default function FirstGateHero() {
  const { open, d, h, m, s } = useFirstGateCountdown();
  const units = [[d,"ימים"],[h,"שעות"],[m,"דקות"],[s,"שניות"]];
  return (
    <section id={FIRST_GATE_HOME_HASH} className="fg-hero" aria-label="פתיחת השער הראשון של מערכת 2029">
      <div className="fg-glow" aria-hidden />
      <div className="fg-hourglass" aria-hidden><span>⌛</span></div>
      <div className="fg-kicker">כי לה׳ המלוכה · מערכת 2029</div>
      <h1>{open ? "השער הראשון נפתח" : "העולם החדש נבנה"}</h1>
      <p className="fg-lead">{open ? "המסע אל השלב הבא התחיל." : "פתיחת השער הראשון בעוד…"}</p>
      {!open && <div className="fg-count" dir="ltr">
        {units.map(([v,label]) => <div className="fg-unit" key={label}><b>{pad(v)}</b><span>{label}</span></div>)}
      </div>}
      <div className="fg-date">21.09.2026</div>
      <p className="fg-copy">רמזי הגאולה דרך כל המציאות מתחילים להתחבר לעולם אחד.</p>
      <style>{`
        .fg-hero{scroll-margin-top:90px;position:relative;isolation:isolate;overflow:hidden;max-width:1180px;margin:12px auto 22px;padding:34px 18px 30px;text-align:center;direction:rtl;border:1px solid ${C.borderGold};border-radius:24px;background:radial-gradient(circle at 50% 15%,rgba(246,226,122,.13),transparent 32%),linear-gradient(160deg,rgba(25,16,8,.9),rgba(8,5,2,.72));box-shadow:0 24px 80px rgba(0,0,0,.55),inset 0 1px rgba(246,226,122,.08)}
        .fg-glow{position:absolute;z-index:-1;width:380px;height:380px;border-radius:50%;left:50%;top:-230px;transform:translateX(-50%);background:rgba(212,175,55,.18);filter:blur(55px)}
        .fg-hourglass{height:150px;display:flex;align-items:center;justify-content:center}.fg-hourglass span{font-size:112px;line-height:1;filter:drop-shadow(0 0 24px rgba(246,226,122,.55));animation:fg-float 3.2s ease-in-out infinite}
        .fg-kicker{font:800 12px ${F.heading};letter-spacing:3px;color:${C.goldDim};margin-top:2px}.fg-hero h1{margin:8px 0 4px;color:${C.goldBright};font-family:${F.regal};font-size:clamp(30px,5vw,52px);text-shadow:0 0 34px rgba(212,175,55,.35)}
        .fg-lead{margin:0 0 18px;color:${C.goldLight};font:700 clamp(16px,2.5vw,21px) ${F.heading}}
        .fg-count{display:flex;justify-content:center;gap:10px;flex-wrap:wrap}.fg-unit{min-width:88px;padding:12px 10px;border:1px solid ${C.borderGold};border-radius:14px;background:rgba(0,0,0,.28);display:flex;flex-direction:column;gap:5px}.fg-unit b{font:800 clamp(26px,4vw,38px) ${F.mono};color:${C.goldBright};line-height:1}.fg-unit span{font:700 11px ${F.heading};color:${C.goldDim};letter-spacing:1px;direction:rtl}
        .fg-date{margin-top:15px;color:${C.goldBright};font:800 13px ${F.mono};letter-spacing:2px}.fg-copy{max-width:680px;margin:13px auto 0;color:${C.muted};font:400 15px/1.8 ${F.body}}
        @keyframes fg-float{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-8px) rotate(2deg)}}
        @media(prefers-reduced-motion:reduce){.fg-hourglass span{animation:none}}
        @media(max-width:520px){.fg-hero{margin:8px 12px 18px;padding-top:25px}.fg-hourglass{height:112px}.fg-hourglass span{font-size:82px}.fg-unit{min-width:64px;flex:1 1 64px;max-width:82px}}
      `}</style>
    </section>
  );
}
