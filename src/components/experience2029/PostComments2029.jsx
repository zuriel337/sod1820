import React, { Suspense, lazy, useEffect, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { supabase } from "../../lib/supabase.js";
import { getCommentsByPostId } from "../../lib/supabaseApi2029.js";
import { mergePostComments, readPostCommentArchive, readPostCommunityComments } from "./postComments2029.js";
import "./royal2029.css";
import "./postComments2029.css";

const PostCommentComposer = lazy(() => import("./PostCommentComposer2029.jsx"));   // the writing tool: only when «רשום תגובה» is pressed
const dateFormat = new Intl.DateTimeFormat("he-IL", {
  day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
});

// The end of a Post (ZURIEL 25.11.2026): old and new comments in ONE list with their number; with none, ONLY the action «רשום תגובה». Writing happens here, in the Post
// (no move to the Community); the same record is the Community message (origin community_2029) and carries this post's id. The archive joins by the WordPress id only;
// the new comments are keyed by the canonical post id, so a post without a WordPress id has them too. A guest's comment waits for approval and says so.
export default function PostComments2029({ postId, postWpId = null, href = "", title = "" }) {
  const auth = useAuth();
  const ownUserId = auth?.user?.id || null;
  const [state, setState] = useState({ rows: [], loading: true, error: false });
  const [composing, setComposing] = useState(false), [note, setNote] = useState("");

  useEffect(() => {
    let alive = true;
    setState({ rows: [], loading: true, error: false });
    Promise.all([
      postWpId != null ? readPostCommentArchive(postWpId, getCommentsByPostId).catch(() => []) : [],
      readPostCommunityComments(postId, supabase, ownUserId),
    ]).then(([archive, community]) => { if (alive) setState({ rows: mergePostComments(archive, community), loading: false, error: false }); })
      .catch(() => { if (alive) setState({ rows: [], loading: false, error: true }); });
    return () => { alive = false; };
  }, [postId, postWpId, ownUserId]);

  const done = ({ id, text, guest, author }) => {
    setComposing(false);
    setNote(guest ? "התגובה נשלחה וממתינה לאישור. היא תופיע כאן ובקהילה אחרי שתאושר." : "התגובה פורסמה.");
    if (!guest) setState(prev => ({ ...prev, rows: mergePostComments(prev.rows, [{ id: `c:${id}`, parentId: null, author: author || auth?.user?.user_metadata?.name || "", text, date: new Date().toISOString(), source: "community" }]) }));
  };

  const rows = state.rows;
  return <section id="post-comments" className="sod29-post-comments r29" aria-label="תגובות" data-post-comment-archive={postWpId == null ? undefined : String(postWpId)}>
    {state.loading ? <p className="sod29-post-comments-status" role="status">טוען תגובות…</p>
      : state.error ? <p className="sod29-post-comments-status" role="alert">לא הצלחנו לטעון את התגובות. אפשר לרענן ולנסות שוב.</p> : null}
    {rows.length ? <details open>
      <summary>תגובות ({rows.length})</summary>
      <ol className="sod29-post-comment-list">
        {rows.map((comment, index) => <li
          key={comment.id || index}
          id={comment.id ? `post-comment-${comment.id}` : undefined}
          className={comment.parentId ? "is-reply" : undefined}
          data-comment-id={comment.id || undefined}
          data-comment-parent={comment.parentId || undefined}
        >
          <header><strong>{comment.author || "חבר הקהילה"}</strong>{comment.pending ? <em className="sod29-post-comment-pending">ממתינה לאישור</em> : null}{comment.date ? <time dateTime={comment.date}>{dateFormat.format(new Date(comment.date))}</time> : null}</header>
          {comment.parentId ? <span className="sod29-post-comment-parent">↩ תגובה לתגובה קודמת</span> : null}
          <p dir="auto">{comment.text}</p>
        </li>)}
      </ol>
    </details> : null}
    <div className="sod29-post-comments-add">
      {composing ? <Suspense fallback={<p className="sod29-post-comments-status" role="status">טוען…</p>}>
        <PostCommentComposer postId={postId} onDone={done} onCancel={() => setComposing(false)} />
      </Suspense> : <button type="button" className="r29-btn is-quiet" data-action="write" onClick={() => { setNote(""); setComposing(true); }} aria-describedby="post-comments-add-hint">רשום תגובה</button>}
      {note ? <p id="post-comments-add-hint" className="sod29-post-comments-hint" role="status">{note}</p> : <span id="post-comments-add-hint" hidden>נפתחת תיבת כתיבה בפוסט.</span>}
    </div>
  </section>;
}
