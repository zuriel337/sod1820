import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import { communityChatHref } from "../../lib/community/communityPersonNavigation.js";
import { getCommentsByPostId } from "../../lib/supabaseApi2029.js";
import { readPostCommentArchive } from "./postComments2029.js";
import "./postComments2029.css";

const dateFormat = new Intl.DateTimeFormat("he-IL", {
  day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
});
const electionsThreadIds = [
  "81c5c66a-e32a-4b0e-bdfd-bbcad10b636e",
  "2c22eafe-5847-4c31-a510-2abfd1fa3291",
];
const communityThreadIdsByPost = new Map([[5107, electionsThreadIds], [5113, electionsThreadIds]]);

function CommunityCommentThread({ thread }) {
  const href = communityChatHref({ thread: thread.id }, `#message-${thread.id}`);
  const [replies, setReplies] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const pending = useRef(false);
  const readReplies = (event) => {
    if (!event.currentTarget.open || replies !== null || pending.current) return;
    pending.current = true;
    setLoadFailed(false);
    import("../../lib/community/communityArchive.js")
      .then(({ fetchCommunityReplies }) => fetchCommunityReplies(thread.id))
      .then(({ rows }) => setReplies(rows.filter(row => !row.isDeleted && row.body)))
      .catch(() => setLoadFailed(true))
      .finally(() => { pending.current = false; });
  };
  return <details className="sod29-post-community-thread" onToggle={readReplies} data-community-thread={thread.id}>
    <summary><strong>{thread.title || "דיון מהקהילה"}</strong> <span>{thread.authorName}</span></summary>
    <ol className="sod29-post-comment-list">
      <li><p dir="auto">{thread.body}</p></li>
      {replies?.map(reply => <li key={reply.id} className="is-reply">
        <strong>{reply.authorName}</strong><p dir="auto">{reply.body}</p>
      </li>)}
    </ol>
    {loadFailed ? <p role="status">אפשר לקרוא את התגובות בקהילה.</p> : null}
    <p><a href={href}>לשרשור המלא בקהילה</a></p>
  </details>;
}

// The end of a Post (ZURIEL 20.11.2026): comments that already exist for this Post are shown; when there are none, nothing about them is
// shown (no empty archive and no "previous site" wording). A reader who wants to add something writes it in the community: the button
// uses the EXISTING «שתפו בקהילה» path (communityShareDraft → the person's own community draft → the existing composer), so the reader's
// own words are required and nothing is sent from here.
export default function PostComments2029({ postWpId, communityPostId = null, href = "", title = "" }) {
  const navigate = useNavigate();
  const auth = useAuth();
  const [state, setState] = useState({ rows: [], loading: postWpId != null, error: false });
  const [communityThreads, setCommunityThreads] = useState([]);
  const [note, setNote] = useState(""), [opening, setOpening] = useState(false);

  useEffect(() => {
    if (postWpId == null) return undefined;
    let alive = true;
    setState({ rows: [], loading: true, error: false });
    readPostCommentArchive(postWpId, getCommentsByPostId)
      .then((rows) => { if (alive) setState({ rows, loading: false, error: false }); })
      .catch(() => { if (alive) setState({ rows: [], loading: false, error: true }); });
    return () => { alive = false; };
  }, [postWpId]);

  useEffect(() => {
    const ids = communityThreadIdsByPost.get(communityPostId);
    if (!ids) return undefined;
    const controller = new AbortController();
    import("../../lib/community/communityArchive.js")
      .then(({ fetchCommunityThread }) => Promise.allSettled(ids.map(id => fetchCommunityThread(id, { signal: controller.signal }))))
      .then(results => {
        if (!controller.signal.aborted) setCommunityThreads(results.flatMap(result =>
          result.status === "fulfilled" && result.value?.body && !result.value.isDeleted ? [result.value] : []));
      })
      .catch(() => { if (!controller.signal.aborted) setCommunityThreads([]); });
    return () => controller.abort();
  }, [communityPostId]);

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
  return <section id="post-comments" className="sod29-post-comments" aria-label="תגובות" data-post-comment-archive={postWpId ?? undefined}>
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
    {communityThreads.length ? <><h2>הודעות מהקהילה</h2>
      {communityThreads.map(thread => <CommunityCommentThread key={thread.id} thread={thread} />)}
    </> : null}
    {href ? <div className="sod29-post-comments-add">
      {communityPostId == null ? <p><strong>רוצים להוסיף משהו?</strong> כתבו כמה מילים משלכם, והן יעלו לקהילה יחד עם הקישור לפוסט.</p> : null}
      <button type="button" className="sod29-post-comments-button" data-action="community" onClick={toCommunity} aria-busy={opening} aria-describedby="post-comments-add-hint">
        {opening ? "פותחים את הקהילה…" : communityPostId == null ? "להוסיף בקהילה" : "להוסיף תגובה"}
      </button>
      {note ? <p id="post-comments-add-hint" className="sod29-post-comments-hint" role="status">{note}</p> : <span id="post-comments-add-hint" hidden>נפתח חלון כתיבה בקהילה עם הקישור לפוסט</span>}
    </div> : null}
  </section>;
}
