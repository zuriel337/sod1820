// Explicit Human Gate approval for this one 2029 projection. The source remains a
// legacy draft; neither the shared source row nor other draft posts are promoted.
export function isApproved2029OnlyPost(post) {
  return String(post?.id) === "5113"
    && post?.slug === "bennett-melach-631-78"
    && post?.space === "core"
    // Approval is for the reviewed source revision; later edits require a new decision.
    && String(post?.modified || "").replace(/\+00(?::00)?$/, "Z") === "2026-10-12T14:06:54.127591Z"
    && Array.isArray(post?.tags)
    && post.tags.includes("טיוטה")
    && post.tags.includes("2029-golden-only")
    && !post.tags.includes("פורום")
    && post?._privateStage !== true
    && post?._previewSnapshot !== true;
}
