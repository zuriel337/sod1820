import React, { useRef, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { addContribution } from "../../lib/contributions.js";
import "./royal2029.css";
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
      // A request that never answers must end in a visible failure, not an endless "שולח…" (the text stays in the box).
      const id = await Promise.race([
        addContribution({ intent: "תגובה", origin: POST_COMMENT_ORIGIN, body, targetType: "post", targetId: postId, authorName: user ? null : name.trim().slice(0, 60) || null }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("client_timeout")), 30000)),
      ]);
      onDone({ id, text: body, guest: !user, author: user ? null : name.trim() });
    } catch (e) {
      const reason = String(e?.message || e?.error || e?.code || "");
      setError(/rate_limited/.test(reason) ? "נשלחו כבר כמה תגובות בשעה האחרונה. אפשר לנסות שוב מאוחר יותר."
        : /client_timeout/.test(reason) ? "השרת לא ענה בזמן. הטקסט נשמר כאן; אפשר לנסות שוב."
        : /public_reading_operation_denied|public_post_unavailable|403|503/.test(reason) ? "לא ניתן להוסיף תגובה לפוסט הזה כרגע. הטקסט נשמר כאן; אפשר לנסות שוב מאוחר יותר."
        : "לא הצלחנו לשלוח את התגובה. הטקסט נשמר כאן; אפשר לנסות שוב.");
    } finally { sending.current = false; setBusy(false); }
  };
  return <form className="sod29-post-comment-form r29" onSubmit={send} aria-label="כתיבת תגובה" aria-busy={busy || undefined}>
    {!user ? <div className="r29-field"><label htmlFor="post-comment-name">שם (לא חובה)</label>
      <input id="post-comment-name" className="r29-input" type="text" value={name} maxLength={60} onChange={event => setName(event.target.value)} autoComplete="nickname" /></div> : null}
    <div className="r29-field"><label htmlFor="post-comment-text">התגובה שלך</label>
      <textarea id="post-comment-text" className="r29-input" value={text} maxLength={POST_COMMENT_MAX} rows={4} dir="auto" onChange={event => setText(event.target.value)} aria-invalid={error ? "true" : undefined} autoFocus /></div>
    {!user ? <p className="r29-hint">תגובת אורח מתפרסמת אחרי אישור.</p> : null}
    {error ? <p className="r29-status" data-state="error" role="alert">{error}</p> : null}
    <div className="r29-btn-group">
      <button type="submit" className="r29-btn is-primary" disabled={busy || !body} aria-busy={busy}>{busy ? "שולח…" : "שלח תגובה"}</button>
      <button type="button" className="r29-btn is-quiet" onClick={onCancel} disabled={busy}>ביטול</button>
    </div>
  </form>;
}
