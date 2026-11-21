import React, { useEffect, useState } from "react";
import { readAdaptivePulse, pulseCount } from "../../lib/researchPulse2029.js";
import "./nowPulseLine2029.css";

// "Now" pulse (ZURIEL 21.11.2026): ONE thin line at the top of Now — what is strong on the site and what is new —
// from the one public reader, in the adaptive window, linking to /stats. Aggregates only; nothing here counts people.
function items(d) {
  const out = [];
  const n = d.numbers?.[0];
  if (n) out.push({ key: "n", text: `מספר חם: ${n.n.toLocaleString("he-IL")}`, href: "/number/" + n.n });
  const post = d.content?.[0];
  if (post?.title) out.push({ key: "p", text: `נקרא עכשיו: ${post.title}`, href: post.href });
  const c = d.computed?.[0];
  if (c) out.push({ key: "c", text: `מחושב עכשיו: ${c.n.toLocaleString("he-IL")}`, href: "/number/" + c.n });
  const a = d.added || {};
  if (pulseCount(a.posts)) out.push({ key: "ap", text: `${pulseCount(a.posts)} פוסטים חדשים`, href: "/post" });
  if (pulseCount(a.community_messages)) out.push({ key: "am", text: `${pulseCount(a.community_messages)} הודעות בקהילה`, href: "/community/chat" });
  if (pulseCount(a.codes)) out.push({ key: "ac", text: `${pulseCount(a.codes)} צפנים חדשים`, href: "/codes" });
  return out;
}

export default function NowPulseLine2029({ read = readAdaptivePulse }) {
  const [r, setR] = useState(null);
  useEffect(() => { let live = true; read().then(x => live && setR(x), () => {}); return () => { live = false; }; }, [read]);
  const list = r?.data ? items(r.data) : [];
  return <nav className="nowpulse29" dir="rtl" aria-label="מה חזק ומה חדש באתר">
    {list.length ? <span className="nowpulse29-items">{list.map((x, i) => <React.Fragment key={x.key}>{i ? <span aria-hidden="true"> · </span> : null}<a href={x.href}>{x.text}</a></React.Fragment>)}</span>
      : <span className="nowpulse29-items">מה קורה באתר</span>}
    <a className="nowpulse29-more" href="/stats">סטטיסטיקה ›</a>
  </nav>;
}
