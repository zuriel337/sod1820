import { normalizeResearchContext } from "./researchContext.js";

// A reference in the existing Context, never a media copy or an access grant.
export function selectedTopicSourceReturn(context) {
  const current = normalizeResearchContext(context);
  const selection = current?.selection;
  if (current?.subject?.type !== "topic" || selection?.entityType !== "image"
    || !selection.sourceRef || !/^#topic-source-[a-zA-Z0-9-]+$/.test(selection.locator || "")) return null;
  const href = `/topic/${encodeURIComponent(current.subject.id)}${selection.locator}`;
  return { href, label: current.subject.label, subject: { ...current.subject, href },
    selection, lens: "topic", dimensions: current.dimensions, journey: current.journey };
}

export function retainTopicSourceReturn(current, next) {
  if (next?.subject?.type !== "number") return next;
  const source = selectedTopicSourceReturn(current);
  return source ? normalizeResearchContext({ ...next, returnTo: source }) : next;
}

// Restore a Path's precise viewport while the existing Topic loads its images.
// Stop immediately on reader interaction; this is not a new scroll/history store.
export function restoreJourneySourceViewport(locator) {
  if (!/^#topic-source-[a-zA-Z0-9-]+$/.test(locator || "")) return () => {};
  let stopped = false, frame = null;
  const align = () => {
    if (stopped || frame != null) return;
    frame = window.requestAnimationFrame(() => {
      frame = null;
      if (stopped) return;
      const element = document.getElementById(locator.slice(1));
      if (!element) return;
      element.scrollIntoView({ block: "center", behavior: "instant" });
      element.focus({ preventScroll: true });
    });
  };
  const observer = new MutationObserver(align);
  const stop = () => {
    stopped = true;
    observer.disconnect();
    if (frame != null) window.cancelAnimationFrame(frame);
    window.clearTimeout(timer);
    document.removeEventListener("load", align, true);
    for (const event of ["wheel", "touchstart", "pointerdown", "keydown"]) window.removeEventListener(event, stop, true);
  };
  const timer = window.setTimeout(stop, 10000);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener("load", align, true);
  for (const event of ["wheel", "touchstart", "pointerdown", "keydown"]) window.addEventListener(event, stop, { capture: true, passive: true, once: true });
  align();
  return stop;
}

// The source owner re-reads current publication/access, deduplicates media and
// restores original placements. A saved locator alone cannot authorize display.
export async function resolveJourneySourceReturn(context, readSourceContext) {
  const source = selectedTopicSourceReturn(context);
  if (!source) return { ok: false, error: "source_unavailable" };
  try {
    const data = await readSourceContext({ topicSlug: source.subject.id });
    const item = data?.access?.available === true && data.items?.find((entry) =>
      entry.reopen?.selection?.sourceRef === source.selection.sourceRef
      && entry.reopen?.selection?.locator === source.selection.locator
      && (!source.dimensions.surfaceFocus?.reference
        || entry.sourceIdentity?.ref === source.dimensions.surfaceFocus.reference));
    if (!item) return { ok: false, error: "source_unavailable" };
    return { ok: true, href: item.reopen.topicHref, source };
  } catch { return { ok: false, error: "source_unavailable" }; }
}

// ── Exact return to a post index card and its open context-depth map (existing Research Context only) ──────────
// Leaving a card (to a reviewed source region or a map neighbour) records where it was: the card anchor and, when a
// number was open, that number. `buildExactReturnPatch` restores `selection` on return and the card reopens from it.
export const cardDepthSourceRef = (postId) => `posts:${postId}#depth-card`;
export function cardReturnTo({ post, number = null, listHref }) {
  const origin = `${String(listHref || "/posts").split("#")[0]}#post-card-${post.id}`;
  return {
    href: origin, label: post.title,
    subject: { id: String(post.id), type: "post", label: post.title, href: origin },
    selection: { entityId: number != null ? String(number) : String(post.id), entityType: number != null ? "number" : "post",
      sourceRef: cardDepthSourceRef(post.id), locator: `#post-card-${post.id}` },
  };
}
export function cardRestoreFor(context, postId) {
  const selection = normalizeResearchContext(context)?.selection;
  if (!selection || selection.sourceRef !== cardDepthSourceRef(postId) || selection.locator !== `#post-card-${postId}`) return null;
  const number = selection.entityType === "number" ? Number(selection.entityId) : null;
  return { number: Number.isSafeInteger(number) ? number : null };
}
