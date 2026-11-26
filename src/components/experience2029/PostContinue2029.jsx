import React from "react";
import { postContinueTarget2029 } from "../../lib/research/postContinueTarget2029.js";
import "./royal2029.css";

// ONE continue-reading line before the comments (ZURIEL 26.11.2026): the Post's series when it has one, otherwise its first category. One link, one secondary button of
// the Royal family; nothing when the Post has neither. The target is the existing posts list of that series/category.
export default function PostContinue2029({ post, onOpen }) {
  const target = postContinueTarget2029(post);
  if (!target) return null;
  return <nav className="post-continue r29" aria-label="המשך קריאה">
    <a className="r29-btn is-quiet" href={target.href} onClick={event => onOpen?.(event, target.href)}>{target.label} <span aria-hidden="true">←</span></a>
  </nav>;
}
