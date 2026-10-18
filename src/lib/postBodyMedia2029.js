const POST_BODY_MEDIA_STATE = "data-sod-post-media-state";
const POST_BODY_MEDIA_SRC = "data-sod-post-media-src";
const POST_BODY_MEDIA_SRCSET = "data-sod-post-media-srcset";
const POST_BODY_MEDIA_PLACEHOLDER = "data-sod-post-media-placeholder";
const APPROACH_INTENT_DISTANCE_PX = 24;
const APPROACH_INTENT_IDLE_MS = 600;

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

function positiveAuthoredDimension(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!/^[1-9]\d*$/.test(normalized)) return null;
  const numeric = Number(normalized);
  return Number.isSafeInteger(numeric) ? numeric : null;
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

function reserveImageSpace(image, source) {
  const authoredWidth = positiveAuthoredDimension(image.getAttribute("width"));
  const authoredHeight = positiveAuthoredDimension(image.getAttribute("height"));
  if (authoredWidth && authoredHeight) {
    return { width: authoredWidth, height: authoredHeight };
  }

  const intrinsic = KNOWN_POST_BODY_MEDIA_DIMENSIONS_2029[source];
  if (!intrinsic) return null;
  // A partial or invalid authored pair cannot reserve a stable box. Replace
  // both values together only when exact object dimensions were verified.
  image.setAttribute("width", String(intrinsic.width));
  image.setAttribute("height", String(intrinsic.height));
  image.setAttribute("data-sod-post-media-intrinsic", `${intrinsic.width}x${intrinsic.height}`);
  return intrinsic;
}

function transparentPlaceholderSource({ width, height }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function restoreTransparentPlaceholder(image) {
  const placeholder = image.getAttribute(POST_BODY_MEDIA_PLACEHOLDER);
  if (!meaningful(placeholder)) return false;
  if (image.getAttribute("src") !== placeholder) image.setAttribute("src", placeholder);
  return true;
}

/**
 * Turns eligible Post images with a provable reserved box into inert markup
 * before that markup enters the live document. Text, links, captions, alt
 * text, classes and source values are retained. Only network-bearing image
 * attributes move to private data attrs.
 *
 * A template is intentionally used: its subtree is inert, so moving src/srcset
 * happens before the browser can schedule an image request.
 */
export function preparePostBodyMedia2029(html, documentRef = globalThis.document) {
  const sourceHtml = String(html || "");
  if (!sourceHtml || !documentRef?.createElement) return sourceHtml;

  const template = documentRef.createElement("template");
  template.innerHTML = sourceHtml;

  let managedCount = 0;
  for (const image of template.content.querySelectorAll("img")) {
    const authoredSource = image.getAttribute("src");
    const authoredSourceSet = image.getAttribute("srcset");
    if (!meaningful(authoredSource) && !meaningful(authoredSourceSet)) continue;
    const reservation = reserveImageSpace(image, authoredSource);
    if (!reservation) continue;

    // A picture's candidates are deferred only with its managed fallback img.
    // This preserves source-only pictures and malformed-but-renderable markup.
    const picture = image.closest("picture");
    if (picture) {
      for (const source of picture.querySelectorAll("source")) {
        moveToDeferredAttribute(source, "srcset", POST_BODY_MEDIA_SRCSET);
      }
    }

    // Remove only our own stale state if managed content was round-tripped.
    image.removeAttribute(POST_BODY_MEDIA_STATE);
    const source = moveToDeferredAttribute(image, "src", POST_BODY_MEDIA_SRC);
    const sourceSet = moveToDeferredAttribute(image, "srcset", POST_BODY_MEDIA_SRCSET);
    if (!source && !sourceSet) continue;

    managedCount += 1;
    const placeholder = transparentPlaceholderSource(reservation);
    image.setAttribute(POST_BODY_MEDIA_PLACEHOLDER, placeholder);
    image.setAttribute(POST_BODY_MEDIA_STATE, "pending");
    // A local transparent replaced-image source gives the browser the exact
    // intrinsic ratio while retaining authored inline/block sizing semantics.
    // It performs no network request and is replaced only at activation.
    image.setAttribute("src", placeholder);
  }

  // Keep wholly ineligible authored HTML byte-for-byte equivalent to the
  // input, including unknown images for which no stable box can be proven.
  return managedCount ? template.innerHTML : sourceHtml;
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
  const restoredSource = restoreDeferredAttribute(image, "src", POST_BODY_MEDIA_SRC);
  if (!restoredSource && image.getAttribute("src") === image.getAttribute(POST_BODY_MEDIA_PLACEHOLDER)) {
    image.removeAttribute("src");
  }
  return true;
}

/**
 * Activates visible prepared images immediately. The 600px approach zone is
 * enabled only after significant trusted wheel or touch movement also produces
 * real page movement. Pointer and keyboard events never authorize prefetch;
 * their actual viewport movement is still handled by the 0px observer.
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
  let approachEnabled = false;
  let removeIntentListeners = () => {};

  for (const image of images) {
    let clearFailureListener = null;
    const retry = () => {
      if (disposed) return;
      clearFailureListener?.();
      clearFailureListener = null;
      removeFailureNotice(image);
      clearActiveSources(image);
      image.setAttribute(POST_BODY_MEDIA_STATE, "pending");
      restoreTransparentPlaceholder(image);
      // A separate task is queued so removing and restoring the exact same URL
      // is observable to the browser without adding a cache-busting URL.
      queueMicrotask(() => { if (!disposed) activateImage(image); });
    };
    const loaded = () => {
      if (image.getAttribute(POST_BODY_MEDIA_STATE) !== "loading") return;
      image.setAttribute(POST_BODY_MEDIA_STATE, "loaded");
      image.removeAttribute(POST_BODY_MEDIA_PLACEHOLDER);
      clearFailureListener?.();
      clearFailureListener = null;
      removeFailureNotice(image);
    };
    const failed = () => {
      if (image.getAttribute(POST_BODY_MEDIA_STATE) !== "loading") return;
      clearActiveSources(image);
      image.setAttribute(POST_BODY_MEDIA_STATE, "failed");
      restoreTransparentPlaceholder(image);
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

  if (typeof IntersectionObserverRef === "function") {
    const observePending = (margin) => {
      observer?.disconnect();
      const nextObserver = new IntersectionObserverRef((entries) => {
        if (disposed) return;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          nextObserver.unobserve(entry.target);
          activateImage(entry.target);
        }
      }, { root: null, rootMargin: margin, threshold: 0 });
      observer = nextObserver;
      for (const image of images) {
        if (image.getAttribute(POST_BODY_MEDIA_STATE) === "pending") nextObserver.observe(image);
      }
    };

    // First-frame work is limited to media that is actually in the viewport.
    observePending("0px");

    const view = root.ownerDocument?.defaultView;
    let intentMode = null;
    let intentDistance = 0;
    let intentScrollOrigin = null;
    let touchGesture = null;
    let intentResetTimer = null;
    let lastScrollPosition = { x: view?.scrollX || 0, y: view?.scrollY || 0 };

    const clearIntentTimer = () => {
      if (intentResetTimer !== null) view?.clearTimeout(intentResetTimer);
      intentResetTimer = null;
    };
    const resetIntent = () => {
      clearIntentTimer();
      intentMode = null;
      intentDistance = 0;
      intentScrollOrigin = null;
      touchGesture = null;
    };
    const scheduleIntentReset = () => {
      clearIntentTimer();
      intentResetTimer = view?.setTimeout(resetIntent, APPROACH_INTENT_IDLE_MS) ?? null;
    };
    const beginIntent = (mode) => {
      if (intentMode !== mode) resetIntent();
      intentMode = mode;
      if (!intentScrollOrigin) {
        // Compositor scrolling can update scrollX/scrollY before a window-level
        // wheel callback runs. The last observed scroll event is the reliable
        // pre-input origin; programmatic/hash/restoration scrolls update it
        // without creating intent.
        intentScrollOrigin = { ...lastScrollPosition };
      }
      scheduleIntentReset();
    };
    const scrollDistance = () => intentScrollOrigin
      ? Math.hypot((view?.scrollX || 0) - intentScrollOrigin.x, (view?.scrollY || 0) - intentScrollOrigin.y)
      : 0;
    const enableApproach = () => {
      if (disposed || approachEnabled) return;
      approachEnabled = true;
      resetIntent();
      removeIntentListeners();
      observePending(rootMargin);
    };
    const acceptProvenIntent = () => {
      if (intentDistance >= APPROACH_INTENT_DISTANCE_PX && scrollDistance() >= APPROACH_INTENT_DISTANCE_PX) {
        enableApproach();
      }
    };
    const onWheel = (event) => {
      if (event.isTrusted === false || event.defaultPrevented) return;
      beginIntent("wheel");
      intentDistance += Math.hypot(event.deltaX || 0, event.deltaY || 0);
      acceptProvenIntent();
    };
    const touchPoint = (event) => event.touches?.[0] || event.changedTouches?.[0] || null;
    const onTouchStart = (event) => {
      if (event.isTrusted === false || event.defaultPrevented) return;
      const point = touchPoint(event);
      if (!point) return;
      beginIntent("touch");
      touchGesture = { x: point.clientX, y: point.clientY };
    };
    const onTouchMove = (event) => {
      if (event.isTrusted === false || event.defaultPrevented || !touchGesture) return;
      const point = touchPoint(event);
      if (!point) return;
      intentDistance += Math.hypot(point.clientX - touchGesture.x, point.clientY - touchGesture.y);
      touchGesture.x = point.clientX;
      touchGesture.y = point.clientY;
      scheduleIntentReset();
      acceptProvenIntent();
    };
    const onTouchEnd = () => {
      touchGesture = null;
      if (intentDistance < APPROACH_INTENT_DISTANCE_PX) resetIntent();
      else scheduleIntentReset();
    };
    const onScroll = () => {
      if (intentMode) {
        scheduleIntentReset();
        acceptProvenIntent();
      }
      lastScrollPosition = { x: view?.scrollX || 0, y: view?.scrollY || 0 };
    };
    if (view?.addEventListener) {
      const intentListeners = [
        ["wheel", onWheel, { passive: true }],
        ["touchstart", onTouchStart, { passive: true }],
        ["touchmove", onTouchMove, { passive: true }],
        ["touchend", onTouchEnd, { passive: true }],
        ["touchcancel", onTouchEnd, { passive: true }],
        ["scroll", onScroll, { passive: true }],
      ];
      for (const [type, listener, options] of intentListeners) view.addEventListener(type, listener, options);
      removeIntentListeners = () => {
        for (const [type, listener, options] of intentListeners) view.removeEventListener(type, listener, options);
        resetIntent();
        removeIntentListeners = () => {};
      };
    }
  } else {
    // Capability wins in older browsers: restore immediately rather than leave
    // article media permanently blank.
    queueMicrotask(() => {
      if (!disposed) {
        for (const image of images) {
          if (image.getAttribute(POST_BODY_MEDIA_STATE) === "pending") activateImage(image);
        }
      }
    });
  }

  return () => {
    disposed = true;
    observer?.disconnect();
    removeIntentListeners();
    for (const cleanup of listenerCleanup) cleanup();
  };
}

export const postBodyMedia2029Internals = Object.freeze({
  stateAttribute: POST_BODY_MEDIA_STATE,
  sourceAttribute: POST_BODY_MEDIA_SRC,
  sourceSetAttribute: POST_BODY_MEDIA_SRCSET,
  placeholderAttribute: POST_BODY_MEDIA_PLACEHOLDER,
  approachIntentDistancePx: APPROACH_INTENT_DISTANCE_PX,
});
