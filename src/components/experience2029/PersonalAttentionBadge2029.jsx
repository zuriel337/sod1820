import React, { useEffect, useState } from "react";
import { getPersonalAttention, PERSONAL_ATTENTION_REFRESH_EVENT } from "../../lib/notifications.js";
import "./personalAttentionBadge2029.css";

// The real unread mark on the profile picture (ZURIEL 26.11.2026): signed-in only, loaded lazily (never part of the always-loaded frame), ONE read per refresh, no polling.
// It shows what is addressed to the PERSON (private messages, replies, followers, approvals); a read error is shown as nothing (never as zero); the count is also said in words.
const MAX = 99;
let shared = null;   // the frame shows the picture in up to three places: they share ONE read
const readOnce = (userId) => { if (!shared || shared.userId !== userId) { const promise = getPersonalAttention({ userId }); shared = { userId, promise }; setTimeout(() => { if (shared?.promise === promise) shared = null; }, 5000); } return shared.promise; };
export default function PersonalAttentionBadge2029({ userId }) {
  const [total, setTotal] = useState(null);
  useEffect(() => {
    if (!userId) return undefined;
    let alive = true, running = false;
    const load = () => {
      if (running || document.visibilityState === "hidden") return;
      running = true;
      readOnce(userId).then(result => { if (alive) setTotal(result.total); }).catch(() => { if (alive) setTotal(null); }).finally(() => { running = false; });
    };
    load();
    window.addEventListener(PERSONAL_ATTENTION_REFRESH_EVENT, load);
    document.addEventListener("visibilitychange", load);
    return () => { alive = false; window.removeEventListener(PERSONAL_ATTENTION_REFRESH_EVENT, load); document.removeEventListener("visibilitychange", load); };
  }, [userId]);
  if (!userId || !total) return null;
  return <span className="sod29-attention-badge" role="status"><span aria-hidden="true">{total > MAX ? `${MAX}+` : total}</span><span className="sod29-visually-hidden">{`${total} חדשים אליך: הודעות, תגובות ועדכונים`}</span></span>;
}
