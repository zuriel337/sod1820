import React, { useEffect, useRef, useState } from "react";
import { getPersonalAttention, PERSONAL_ATTENTION_REFRESH_EVENT } from "../../lib/notifications.js";
import "./personalAttentionBadge2029.css";

// The real unread mark on the profile picture (ZURIEL 26.11.2026): signed-in only, loaded lazily (never part of the always-loaded frame), ONE read per refresh, no polling.
// It shows what is addressed to the PERSON (private messages, replies, followers, approvals); a read error is shown as nothing (never as zero); the count is also said in words.
const MAX = 99;
let shared = null;   // the frame shows the picture in up to three places: they share ONE read
const readOnce = (userId, cause) => { if (!shared || shared.userId !== userId || cause && shared.cause !== cause) { const promise = getPersonalAttention({ userId }); shared = { userId, promise, cause }; setTimeout(() => { if (shared?.promise === promise) shared = null; }, 5000); } return shared.promise; };
export default function PersonalAttentionBadge2029({ userId }) {
  const [attention, setAttention] = useState(null), total = attention?.total ?? null, mark = useRef(null);
  useEffect(() => {
    if (!userId) return undefined;
    let alive = true, running = false;
    const load = (cause) => {
      if (running || document.visibilityState === "hidden") return;
      running = true;
      readOnce(userId, cause).then(result => { if (alive) setAttention(result); }).catch(() => { if (alive) setAttention(null); }).finally(() => { running = false; });
    };
    // An explicit refresh (a conversation was just read) never reuses an older answer; the instances that hear the same event together still share one read.
    const refresh = (event) => load(event);   // one read per event, shared by the instances that hear it
    load();
    window.addEventListener(PERSONAL_ATTENTION_REFRESH_EVENT, refresh);
    document.addEventListener("visibilitychange", load);
    return () => { alive = false; window.removeEventListener(PERSONAL_ATTENTION_REFRESH_EVENT, refresh); document.removeEventListener("visibilitychange", load); };
  }, [userId]);
  // The button that holds this mark goes straight to what is waiting (read by the frame on click): messages first, else notifications.
  useEffect(() => {
    const button = mark.current?.closest("button");
    if (!button) return undefined;
    if (total) button.dataset.attentionHref = attention.messages > 0 ? "/2029/me/messages" : "/2029/me/notifications"; else delete button.dataset.attentionHref;
    return () => { delete button.dataset.attentionHref; };
  }, [total, attention]);
  if (!userId || !total) return <i ref={mark} hidden />;
  return <span ref={mark} className="sod29-attention-badge" role="status"><span aria-hidden="true">{total > MAX ? `${MAX}+` : total}</span><span className="sod29-visually-hidden">{`${total} חדשים אליך: הודעות, תגובות ועדכונים`}</span></span>;
}
