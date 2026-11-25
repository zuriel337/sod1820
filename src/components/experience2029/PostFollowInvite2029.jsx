import React from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { publicReadingActionsLocked } from "../../lib/publicReadingRelease2029.js";
import { openPostFollow } from "../../lib/research/postFollowOpenStore2029.js";
import { usePostFollowTargets, usePostFollowing } from "./postFollowShared2029.js";
import "./royal2029.css";
import "./postFollowDialog2029.css";

// The gentle invitation at the end of the content, before the comments (ZURIEL 25.11.2026): ONE line, shown only when a follow can really deliver updates and only
// where follows are open; it opens the same panel as the bell and shows the same state.
export default function PostFollowInvite2029({ post }) {
  const auth = useAuth();
  const locked = publicReadingActionsLocked(auth.isAdmin);
  const { ready } = usePostFollowTargets(post);
  const following = usePostFollowing(ready.map(item => item.topic));
  if (locked || !ready.length) return null;
  return <div className="post-follow-invite r29" role="group" aria-label="מעקב">
    <span>{following ? "אתה עוקב אחרי הפוסטים האלה" : "רוצה לדעת כשמתפרסם עוד כמו זה?"}</span>
    <button type="button" className="r29-btn is-quiet" aria-haspopup="dialog" onClick={openPostFollow}>{following ? "ניהול המעקב" : "מעקב"}</button>
  </div>;
}
