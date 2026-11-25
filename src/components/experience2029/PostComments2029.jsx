import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import { getCommentsByPostId } from "../../lib/supabaseApi2029.js";
import { readPostCommentArchive } from "./postComments2029.js";
import "./postComments2029.css";

const dateFormat = new Intl.DateTimeFormat("he-IL", {
  day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
});

// The end of a Post (ZURIEL 20.11.2026, restated 25.11.2026): the public comments that already exist for this Post are shown, one way for every Post, with their
// number; when there are none, ONLY the action "רשום תגובה" is shown (no empty archive, no "previous site" or "WordPress" wording, no old/new labels). The action
// uses the EXISTING «שתפו בקהילה» path (communityShareDraft → the person's own community draft → the existing composer): the reader's own words are required and
// nothing is sent from here. New comments live in the community; they are not part of this archive projection.
export default function PostComments2029({ postWpId, href = "", title = "" }) {
  const navigate = useNavigate();
  const auth = useAuth();
  const [state, setState] = useState({ rows: [], loading: true, error: false });
  const [note, setNote] = useState(""), [opening, setOpening] = useState(false);

  useEffect(() => {
    let alive = true;
    setState({ rows: [], loading: true, error: false });
    readPostCommentArchive(postWpId, getCommentsByPostId)
      .then((rows) => { if (alive) setState({ rows, loading: false, error: false }); })
      .catch(() => { if (alive) setState({ rows: [], loading: false, error: true }); });
    return () => { alive = false; };
  }, [postWpId]);

  // Loaded on press, like the share window: the draft code lives with the community composer (speed law).
  const toCommunity = () => {
    if (opening || !href) return;
    setOpening(true);
    import("../community2029/CommunityLive2029.jsx")
      .then(({ communityShareDraft }) => communityShareDraft({ auth, href, title }))
      .catch(() => ({ ok: false, message: "לא הצלחנו לפתוח את הקהילה. בדקו את החיבור ונסו שוב." }))
      .then((result) => { setOpening(false); if (result.ok) navigate("/community/chat"); else setNote(result.message); });
  };

  const rows = state.rows;
  return <section id="post-comments" className="sod29-post-comments" aria-label="תגובות" data-post-comment-archive={String(postWpId)}>
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
          <header><strong>{comment.author || "חבר הקהילה"}</strong>{comment.date ? <time dateTime={comment.date}>{dateFormat.format(new Date(comment.date))}</time> : null}</header>
          {comment.parentId ? <span className="sod29-post-comment-parent">↩ תגובה לתגובה קודמת</span> : null}
          <p dir="auto">{comment.text}</p>
        </li>)}
      </ol>
    </details> : null}
    {href ? <div className="sod29-post-comments-add">
      <button type="button" className="sod29-post-comments-button" data-action="community" onClick={toCommunity} aria-busy={opening} aria-describedby="post-comments-add-hint">
        {opening ? "פותחים את הקהילה…" : "רשום תגובה"}
      </button>
      {note ? <p id="post-comments-add-hint" className="sod29-post-comments-hint" role="status">{note}</p> : <span id="post-comments-add-hint" hidden>נפתח חלון כתיבה בקהילה עם הקישור לפוסט</span>}
    </div> : null}
  </section>;
}
