import React, { useEffect, useState } from "react";
import { getCommentsByPostId } from "../../lib/supabase.js";
import { readPostCommentArchive } from "./postComments2029.js";
import "./postComments2029.css";

const dateFormat = new Intl.DateTimeFormat("he-IL", {
  day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
});

export default function PostComments2029({ postWpId }) {
  const [state, setState] = useState({ rows: [], loading: true, error: false });

  useEffect(() => {
    let alive = true;
    setState({ rows: [], loading: true, error: false });
    readPostCommentArchive(postWpId, getCommentsByPostId)
      .then((rows) => { if (alive) setState({ rows, loading: false, error: false }); })
      .catch(() => { if (alive) setState({ rows: [], loading: false, error: true }); });
    return () => { alive = false; };
  }, [postWpId]);

  return <section id="post-comments" className="sod29-post-comments" aria-label="תגובות מהאתר הקודם" data-post-comment-archive={String(postWpId)}>
    <details>
      <summary>תגובות{!state.loading && !state.error ? ` (${state.rows.length})` : ""}<span>ארכיון מהאתר הקודם</span></summary>
      {state.loading ? <p role="status">טוען תגובות…</p> : state.error ? <p role="alert">טעינת התגובות נכשלה. אפשר לרענן ולנסות שוב.</p> : !state.rows.length ? <p>אין תגובות בארכיון לפוסט הזה.</p> : <ol className="sod29-post-comment-list">
        {state.rows.map((comment, index) => <li
          key={comment.id || index}
          id={comment.id ? `post-comment-${comment.id}` : undefined}
          className={comment.parentId ? "is-reply" : undefined}
          data-comment-id={comment.id || undefined}
          data-comment-parent={comment.parentId || undefined}
        >
          <header><strong>{comment.author || "חבר הקהילה"}</strong>{comment.date ? <time dateTime={comment.date}>{dateFormat.format(new Date(comment.date))}</time> : null}</header>
          {comment.parentId ? <span className="sod29-post-comment-parent">↩ תגובה לתגובה קודמת</span> : null}
          <p dir="auto">{comment.text}</p>
        </li>)}
      </ol>}
    </details>
  </section>;
}
