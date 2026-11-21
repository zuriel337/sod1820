import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { supabase } from "../../lib/supabase.js";
import { publicPostUnitHref } from "../../lib/publicPostUrls.js";
import { readMapReviewValue, writeMapReviewValue } from "../../lib/research/mapIntegrationReviewStorage.js";
import { archiveCommentText } from "./postComments2029.js";
import "./postComments2029.css";

export default function PostDiscussionReview2029({ post, draftTarget, onDraftClosed, browserReview = false }) {
  const auth = useAuth();
  const input = useRef(null);
  const [rows, setRows] = useState([]);
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [revision, refresh] = useState(0);
  const [readError, setReadError] = useState(false);
  const [writeError, setWriteError] = useState(false);

  useEffect(() => {
    if (browserReview) {
      setRows(readMapReviewValue("discussion", post.id, []));
      return undefined;
    }
    let current = true;
    supabase.rpc("post_discussion_read_v1", { p_post_id: post.id }).then(({ data, error }) => {
      if (!current) return;
      setReadError(Boolean(error));
      if (!error) setRows(data || []);
    }).catch(() => { if (current) setReadError(true); });
    return () => { current = false; };
  }, [post.id, revision, browserReview]);

  useEffect(() => {
    if (draftTarget) {
      setDiscussionOpen(true);
      input.current?.focus();
    }
  }, [draftTarget]);

  async function submit(event) {
    event.preventDefault();
    if (!draftTarget || !body.trim() || sending) return;
    if (browserReview) {
      const next = [{ source_kind: "review", source_id: window.crypto.randomUUID(),
        author_name: "חשבון בדיקה", body: body.trim(), post_unit_id: draftTarget.unitId }, ...rows];
      if (!writeMapReviewValue("discussion", post.id, next)) { setWriteError(true); return; }
      setRows(next);
      setBody("");
      setWriteError(false);
      onDraftClosed();
      return;
    }
    if (auth.verified !== true || !auth.user?.id) return;
    setSending(true);
    setWriteError(false);
    try {
      const { error } = await supabase.rpc("post_discussion_publish_v1", {
        p_post_id: draftTarget.postId, p_unit_id: draftTarget.unitId, p_body: body.trim(),
      });
      if (error) throw error;
      setBody("");
      onDraftClosed();
      refresh(value => value + 1);
    } catch {
      setWriteError(true);
    } finally {
      setSending(false);
    }
  }

  return <section id="post-comments" className="sod29-post-comments" aria-label="דיון הפוסט">
    <details open={!browserReview || discussionOpen} onToggle={event => {
      if (browserReview) setDiscussionOpen(event.currentTarget.open);
    }}>
      <summary>תגובות ({rows.length})</summary>
      {browserReview ? <small>תגובות בדיקה בדפדפן הזה</small> : null}
      {readError ? <p role="alert">לא הצלחנו לטעון את הדיון.</p> : null}
      <ol className="sod29-post-comment-list">
        {rows.map(row => {
          const href = publicPostUnitHref(post, row.post_unit_id);
          return <li key={`${row.source_kind}:${row.source_id}`}>
            <strong>{row.author_name}</strong>
            <p dir="auto">{row.source_kind === "wordpress" ? archiveCommentText(row.body) : row.body}</p>
            {href ? <a href={href}>חזרה ליחידה</a> : null}
          </li>;
        })}
      </ol>
    </details>
    {draftTarget ? <form onSubmit={submit}>
      <label>תגובה ל{draftTarget.unitId ? "יחידה" : "פוסט"}<textarea ref={input} value={body}
        onChange={event => setBody(event.target.value)} required maxLength={6000} disabled={sending} /></label>
      <button type="submit" disabled={sending || (!browserReview && (auth.verified !== true || !auth.user?.id))}>שליחת תגובה</button>
      <button type="button" disabled={sending} onClick={() => { setBody(""); setWriteError(false); onDraftClosed(); }}>ביטול טיוטה</button>
      {writeError ? <p role="alert">התגובה לא נשלחה. הטיוטה נשמרה כאן לניסיון נוסף.</p> : null}
    </form> : null}
  </section>;
}
