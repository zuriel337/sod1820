import React from "react";
import { Link } from "react-router-dom";
import { usePalette } from "../lib/palette.js";
import { F } from "../theme.js";
import "./TransitionAnnouncement.css";

const COPY = {
  home: {
    eyebrow: "SOD1820 · המעבר ל־2029",
    title: "אחרי 15 שנה הגיע הזמן להתחדש",
    body: "מחליפים תמונה, מחדשים את המיתוג, ומתקדמים לשפה חזותית חדשה. ממש עולם חדש הולך להיפתח.",
    links: [
      { to: "/world", label: "פתח את העולם החדש" },
      { to: "/heichal", label: "היכל 2029" },
    ],
  },
  number: {
    eyebrow: "דף המספר · 2029",
    title: "דף המספר הישן מתחדש",
    body: "בקרוב ייפתח דף המספר החדש — חישובים חכמים, הקשרים, שכבות עומק וחוויית 2029. המידע והמחקר נשארים; המעטפת נבנית מחדש.",
    links: [
      { to: "/2029/number/1237", label: "הצצה לדף המספר החדש" },
      { to: "/heichal", label: "העמק בהיכל" },
    ],
  },
  heichal: {
    eyebrow: "היכל · דור חדש",
    title: "ממש עולם חדש הולך להיפתח",
    body: "ההיכל הישן נסגר בהדרגה. היכל 2029 נבנה כמרחב של כלים, מחקר עומק, ELS, דף המספר ו־AI — סביב אותו מחקר ואותה אמת.",
    links: [
      { to: "/heichal", label: "פתח את היכל 2029" },
      { to: "/world", label: "עבור לעולם החדש" },
    ],
  },
  beit: {
    eyebrow: "בית המדרש · מעבר לעולם החדש",
    title: "בית המדרש הישן נסגר — התוכן ממשיך",
    body: "הפוסטים, הטופיקים, הספרים, המקורות וההתכנסויות עוברים למרחבים החדשים. לא מוחקים את המחקר — מסדרים אותו מחדש בתוך עולם אחד.",
    links: [
      { to: "/world", label: "פתח את העולם החדש" },
      { to: "/books", label: "ספרים ומקורות" },
      { to: "/heichal", label: "היכל 2029" },
    ],
  },
};

export default function TransitionAnnouncement({ context = "home", full = false }) {
  const P = usePalette();
  const copy = COPY[context] || COPY.home;
  const style = {
    "--ta-bg": P.card,
    "--ta-soft": P.cardSoft,
    "--ta-line": P.border,
    "--ta-line-strong": P.borderStrong,
    "--ta-ink": P.ink,
    "--ta-muted": P.inkSoft,
    "--ta-accent": P.accent,
    "--ta-accent-text": P.accentText,
    fontFamily: F.body,
  };

  return (
    <section className={`sod-transition-announcement${full ? " is-full" : ""}`} style={style} aria-label="הודעת מעבר למערכת 2029">
      <div className="sod-transition-orb" aria-hidden="true">✦</div>
      <div className="sod-transition-copy">
        <small>{copy.eyebrow}</small>
        <h2>{copy.title}</h2>
        <p>{copy.body}</p>
        <div className="sod-transition-actions">
          {copy.links.map((item, index) => (
            <Link key={item.to} className={`sod-transition-action${index === 0 ? " primary" : ""}`} to={item.to}>
              {item.label}
            </Link>
          ))}
        </div>
        <div className="sod-transition-foot">אחרי 15 שנה — גם התמונה, גם המיתוג וגם החוויה מתחדשים.</div>
      </div>
    </section>
  );
}
