import React from "react";
import { F } from "../theme.js";
import { useForumActivity } from "../lib/forumActivity.js";

// 🔴 באדג׳ קנוני יחיד ל«פעילות חדשה בפורום». withText=false → נקודה אדומה קטנה (ליד קישור);
//    withText=true → «💬 תגובה חדשה»/«🆕 חדש». אין חדש → לא מציג כלום. כל המשטחים משתמשים בזה.
const RED = "#e0483a";
export default function ForumActivityDot({ withText = false, style = {} }) {
  const { hasNew, wasReply } = useForumActivity();
  if (!hasNew) return null;
  const dot = (
    <span aria-hidden style={{ display: "inline-block", width: withText ? 7 : 8, height: withText ? 7 : 8, borderRadius: "50%", background: RED, boxShadow: `0 0 6px ${RED}`, animation: "sodForumPulse 1.6s ease-in-out infinite" }} />
  );
  const css = <style>{`@keyframes sodForumPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.55;transform:scale(1.25)}}`}</style>;
  if (!withText) {
    return <span style={{ display: "inline-flex", alignItems: "center", marginInlineStart: 5, verticalAlign: "middle", ...style }} aria-label="פעילות חדשה בפורום">{css}{dot}</span>;
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: RED, fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, ...style }}>
      {css}{dot}{wasReply ? "💬 תגובה חדשה" : "🆕 חדש בפורום"}
    </span>
  );
}
