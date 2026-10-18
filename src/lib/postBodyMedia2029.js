const POST_BODY_MEDIA_STATE = "data-sod-post-media-state";
const POST_BODY_MEDIA_SRC = "data-sod-post-media-src";
const POST_BODY_MEDIA_SRCSET = "data-sod-post-media-srcset";

// Verified against the public FZ1073 post row and the exact public object bytes on
// 2026-10-18. Keep these exact: unrelated authored images do not inherit a
// guessed ratio. The first entry is the 2.09 MB opening-body bottleneck.
export const KNOWN_POST_BODY_MEDIA_DIMENSIONS_2029 = Object.freeze({
  "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/sod1820/posts/fz1073/plane-363-hamashiach-card-20261001.png": Object.freeze({
    width: 941,
    height: 1672,
  }),
  "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/sod1820/posts/fz1073/assaf-rajuan-evidence-frame-20261001.jpg": Object.freeze({
    width: 576,
    height: 1024,
  }),
  "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/sod1820/posts/fz1073/smit-machchhar-source-20261001.jpg": Object.freeze({
    width: 691,
    height: 1536,
  }),
});

function meaningful(value) {
  return typeof value === "string" && value.trim() !== "";
}

function moveToDeferredAttribute(element, sourceName, deferredName) {
  const value = element.getAttribute(sourceName);
  if (!meaningful(value)) {
    // An empty src asks some browsers for the document itself. Do not preserve
    // it as an activatable media request.
    element.removeAttribute(sourceName);
    return null;
  }
  element.setAttribute(deferredName, value);
  element.removeAttribute(sourceName);
  return value;
}

function applyKnownDimensions(image, source) {
  const intrinsic = KNOWN_POST_BODY_MEDIA_DIMENSIONS_2029[source];
  if (!intrinsic) return;
  if (!image.hasAttribute("width")) image.setAttribute("width", String(intrinsic.width));
  if (!image.hasAttribute("height")) image.setAttribute("height", String(intrinsic.height));
  image.setAttribute("data-sod-post-media-intrinsic", `${intrinsic.width}x${intrinsic.height}`);
}

/**
 * Turns authored Post images into inert markup before that markup enters the
 * live document. Text, links, captions, alt text, classes and source values are
 * retained. Only network-bearing image attributes move to private data attrs.
 *
 * A template is intentionally used: its subtree is inert, so moving src/srcset
 * happens before the browser can schedule an image request.
 */
export function preparePostBodyMedia2029(html, documentRef = globalThis.document) {
  const sourceHtml = String(html || "");
  if (!sourceHtml || !documentRef?.createElement) return sourceHtml;

  const template = documentRef.createElement("template");
  template.innerHTML = sourceHtml;

  for (const picture of template.content.querySelectorAll("picture")) {
    for (const source of picture.querySelectorAll("source")) {
      moveToDeferredAttribute(source, "srcset", POST_BODY_MEDIA_SRCSET);
    }
  }

  for (const image of template.content.querySelectorAll("img")) {
    // Remove only our own stale controls if authored content was round-tripped.
    image.removeAttribute(POST_BODY_MEDIA_STATE);
    image.removeAttribute("data-sod-post-media-intrinsic");
    const source = moveToDeferredAttribute(image, "src", POST_BODY_MEDIA_SRC);
    const sourceSet = moveToDeferredAttribute(image, "srcset", POST_BODY_MEDIA_SRCSET);
    if (!source && !sourceSet) continue;

    image.setAttribute(POST_BODY_MEDIA_STATE, "pending");
    // Native lazy loading is a conservative fallback after activation and in a
    // browser that has no IntersectionObserver.
    image.setAttribute("loading", "lazy");
    if (source) applyKnownDimensions(image, source);
  }

  return template.innerHTML;
}

function deferredPictureSources(image) {
  const picture = image.closest("picture");
  return picture ? [...picture.querySelectorAll(`source[${POST_BODY_MEDIA_SRCSET}]`)] : [];
}

function restoreDeferredAttribute(element, sourceName, deferredName) {
  const value = element.getAttribute(deferredName);
  if (!meaningful(value)) return false;
  if (element.getAttribute(sourceName) !== value) element.setAttribute(sourceName, value);
  return true;
}

function clearActiveSources(image) {
  image.removeAttribute("src");
  image.removeAttribute("srcset");
  for (const source of deferredPictureSources(image)) source.removeAttribute("srcset");
}

function sourceLinkValue(image) {
  const raw = image.getAttribute(POST_BODY_MEDIA_SRC);
  if (!meaningful(raw)) return null;
  try {
    const parsed = new URL(raw, image.ownerDocument?.baseURI || globalThis.location?.href);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? raw : null;
  } catch {
    return null;
  }
}

function failureInsertionPoint(image, root) {
  const picture = image.closest("picture");
  const media = picture && root.contains(picture) ? picture : image;
  const link = media.closest("a");
  return link && root.contains(link) ? link : media;
}

function removeFailureNotice(image) {
  const notice = image.__sodPostMediaFailureNotice;
  if (notice?.isConnected) notice.remove();
  image.__sodPostMediaFailureNotice = null;
}

function showFailureNotice(image, root, retry) {
  removeFailureNotice(image);
  const documentRef = image.ownerDocument;
  const notice = documentRef.createElement("span");
  notice.className = "sod29-post-body-media-failure";
  notice.setAttribute("data-sod-post-media-failure", "true");
  notice.setAttribute("role", "status");

  const message = documentRef.createElement("span");
  message.textContent = "התמונה לא נטענה.";
  notice.append(message);

  const retryButton = documentRef.createElement("button");
  retryButton.type = "button";
  retryButton.textContent = "נסו שוב";
  retryButton.setAttribute("data-sod-post-media-retry", "true");
  retryButton.addEventListener("click", retry);
  notice.append(retryButton);

  const href = sourceLinkValue(image);
  if (href) {
    const sourceLink = documentRef.createElement("a");
    sourceLink.href = href;
    sourceLink.target = "_blank";
    sourceLink.rel = "noopener noreferrer";
    sourceLink.textContent = "פתחו את המקור";
    sourceLink.setAttribute("data-sod-post-media-source", "true");
    notice.append(sourceLink);
  }

  failureInsertionPoint(image, root).after(notice);
  image.__sodPostMediaFailureNotice = notice;
  return () => retryButton.removeEventListener("click", retry);
}

function activateImage(image) {
  if (image.getAttribute(POST_BODY_MEDIA_STATE) !== "pending") return false;
  image.setAttribute(POST_BODY_MEDIA_STATE, "loading");
  // Picture candidates must exist before the fallback img source is restored so
  // the browser makes one normal selection instead of starting two candidates.
  for (const source of deferredPictureSources(image)) {
    restoreDeferredAttribute(source, "srcset", POST_BODY_MEDIA_SRCSET);
  }
  restoreDeferredAttribute(image, "srcset", POST_BODY_MEDIA_SRCSET);
  restoreDeferredAttribute(image, "src", POST_BODY_MEDIA_SRC);
  return true;
}

/**
 * Activates prepared Post-body images once they enter the 600px approach zone.
 * The returned cleanup is safe under React StrictMode: it removes observers and
 * listeners but never rewinds a request that already started.
 */
export function observePostBodyMedia2029(root, {
  rootMargin = "600px 0px",
  IntersectionObserverRef = globalThis.IntersectionObserver,
} = {}) {
  if (!root?.querySelectorAll) return () => {};
  const images = [...root.querySelectorAll(`img[${POST_BODY_MEDIA_STATE}]`)];
  if (!images.length) return () => {};

  let disposed = false;
  const listenerCleanup = [];
  let observer = null;

  for (const image of images) {
    let clearFailureListener = null;
    const retry = () => {
      if (disposed) return;
      clearFailureListener?.();
      clearFailureListener = null;
      removeFailureNotice(image);
      clearActiveSources(image);
      image.setAttribute(POST_BODY_MEDIA_STATE, "pending");
      // A separate task is queued so removing and restoring the exact same URL
      // is observable to the browser without adding a cache-busting URL.
      queueMicrotask(() => { if (!disposed) activateImage(image); });
    };
    const loaded = () => {
      image.setAttribute(POST_BODY_MEDIA_STATE, "loaded");
      clearFailureListener?.();
      clearFailureListener = null;
      removeFailureNotice(image);
    };
    const failed = () => {
      image.setAttribute(POST_BODY_MEDIA_STATE, "failed");
      clearFailureListener?.();
      clearFailureListener = showFailureNotice(image, root, retry);
    };
    image.addEventListener("load", loaded);
    image.addEventListener("error", failed);
    listenerCleanup.push(() => {
      image.removeEventListener("load", loaded);
      image.removeEventListener("error", failed);
      clearFailureListener?.();
    });

    if (image.getAttribute(POST_BODY_MEDIA_STATE) === "failed") {
      clearFailureListener = showFailureNotice(image, root, retry);
    }
  }

  const pending = images.filter((image) => image.getAttribute(POST_BODY_MEDIA_STATE) === "pending");
  if (typeof IntersectionObserverRef === "function") {
    observer = new IntersectionObserverRef((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer?.unobserve(entry.target);
        activateImage(entry.target);
      }
    }, { root: null, rootMargin, threshold: 0 });
    for (const image of pending) observer.observe(image);
  } else {
    // Capability wins in older browsers. Native loading=lazy still provides a
    // hint, while restoring immediately avoids a permanently blank article.
    queueMicrotask(() => {
      if (!disposed) for (const image of pending) activateImage(image);
    });
  }

  return () => {
    disposed = true;
    observer?.disconnect();
    for (const cleanup of listenerCleanup) cleanup();
  };
}

export const postBodyMedia2029Internals = Object.freeze({
  stateAttribute: POST_BODY_MEDIA_STATE,
  sourceAttribute: POST_BODY_MEDIA_SRC,
  sourceSetAttribute: POST_BODY_MEDIA_SRCSET,
});
