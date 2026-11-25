import React, { useRef, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { addContribution } from "../../lib/contributions.js";
import { POST_COMMENT_MAX, POST_COMMENT_ORIGIN } from "./postComments2029.js";

// The writing tool of a Post (ZURIEL 25.11.2026): loaded only when «רשום תגובה» is pressed. It writes ONE contribution through the existing add_contribution
// (server-enforced: a signed-in comment is approved at once, a guest comment waits for approval, guests are rate limited). Nothing is sent without the reader's words.
export default function PostCommentComposer2029({ postId, onDone, onCancel }) {
  const { user } = useAuth();
  const [text, setText] = useState(""), [name, setName] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const sending = useRef(false);   // one send at a time: a second press while the first is in flight is ignored
  const body = text.trim();
  const send = async (event) => {
    event.preventDefault();
    if (sending.current || !body || body.length > POST_COMMENT_MAX) return;
    sending.current = true; setBusy(true); setError("");
    try {
      const id = await addContribution({ intent: "תגובה", origin: POST_COMMENT_ORIGIN, body, targetType: "post", targetId: postId,
        authorName: user ? null : name.trim().slice(0, 60) || null });
      onDone({ id, text: body, guest: !user, author: user ? null : name.trim() });
    } catch (e) {
      setError(/rate_limited/.test(String(e?.message)) ? "נשלחו כבר כמה תגובות בשעה האחרונה. אפשר לנסות שוב מאוחר יותר." : "לא הצלחנו לשלוח את התגובה. הטקסט נשמר כאן; אפשר לנסות שוב.");
    } finally { sending.current = false; setBusy(false); }
  };
  return <form className="sod29-post-comment-form" onSubmit={send} aria-label="כתיבת תגובה">
    {!user ? <input className="sod29-post-comment-name" type="text" value={name} maxLength={60} onChange={event => setName(event.target.value)} placeholder="שם (לא חובה)" autoComplete="nickname" aria-label="שם" /> : null}
    <textarea className="sod29-post-comment-text" value={text} maxLength={POST_COMMENT_MAX} rows={4} dir="auto" onChange={event => setText(event.target.value)} placeholder="התגובה שלך" aria-label="התגובה שלך" autoFocus />
    {!user ? <p className="sod29-post-comments-hint">תגובת אורח מתפרסמת אחרי אישור.</p> : null}
    {error ? <p className="sod29-post-comments-hint" role="alert">{error}</p> : null}
    <div className="sod29-post-comment-actions">
      <button type="submit" className="sod29-post-comments-button" disabled={busy || !body} aria-busy={busy}>{busy ? "שולח…" : "שלח תגובה"}</button>
      <button type="button" className="sod29-post-comments-quiet" onClick={onCancel} disabled={busy}>ביטול</button>
    </div>
  </form>;
}
