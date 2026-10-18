// Pure DOM projection for 2029 RUM readiness. This module never writes telemetry;
// it only answers whether the current route contains visible, real primary content.

function elementRendered(element, win) {
  if (!element || !element.getClientRects?.().length) return false;
  try {
    const style = win.getComputedStyle(element);
    if (element.hidden || element.inert || style.display === "none" || style.visibility !== "visible"
      || style.contentVisibility === "hidden") return false;
    return !element.closest('[aria-busy="true"], [aria-hidden="true"], .h29-skel, .dg29-skeleton, .is-loading');
  } catch { return false; }
}

function elementVisible(element, win) {
  if (!elementRendered(element, win)) return false;
  try {
    let opacity = 1;
    for (let node = element; node; node = node.parentElement) {
      const style = win.getComputedStyle(node);
      if (node.hidden || node.inert || style.display === "none" || style.visibility !== "visible"
        || style.contentVisibility === "hidden") return false;
      opacity *= Number(style.opacity || 1);
    }
    if (opacity < 0.9) return false;
    const viewportWidth = win.document?.documentElement?.clientWidth || win.innerWidth || 0;
    const viewportHeight = win.innerHeight || win.document?.documentElement?.clientHeight || 0;
    return [...element.getClientRects()].some((rect) => {
      if (rect.width <= 0 || rect.height <= 0) return false;
      const left = Math.max(rect.left, 0);
      const right = Math.min(rect.right, viewportWidth);
      const top = Math.max(rect.top, 0);
      const bottom = Math.min(rect.bottom, viewportHeight);
      if (right <= left || bottom <= top) return false;
      if ((right - left) * (bottom - top) < 0.4 * rect.width * rect.height) return false;
      const hit = win.document?.elementFromPoint?.((left + right) / 2, (top + bottom) / 2);
      return Boolean(hit && element.contains(hit));
    });
  } catch { return false; }
}

function visibleText(element, win) {
  return elementVisible(element, win) && Boolean(String(element.textContent || "").trim());
}

function renderedText(element, win) {
  return elementRendered(element, win) && Boolean(String(element.textContent || "").trim());
}

function routeFamily(pathname) {
  if (pathname === "/") return "home";
  if (pathname === "/world") return "world";
  if (pathname.startsWith("/post/")) return "post";
  if (pathname.startsWith("/number/")) return "number";
  if (pathname === "/gematria" || pathname === "/calculator") return "calculator";
  if (pathname === "/posts") return "posts";
  if (pathname === "/code" || pathname === "/els") return "els";
  if (pathname.startsWith("/topic/")) return "topic";
  if (pathname.startsWith("/book/") || pathname === "/books") return "books";
  return "other";
}

function homeReady(doc, win) {
  const home = doc.querySelector('[data-experience-capability="home-composition"]');
  if (!home) return false;
  const readable = (container, titleSelector) => {
    if (!elementVisible(container, win) || container.closest(".is-unavailable, .h29-notice")) return false;
    const title = container.querySelector(titleSelector);
    return visibleText(title, win)
      && [...container.querySelectorAll('a[href^="/post/"]')].some((link) => elementVisible(link, win));
  };
  return [...home.querySelectorAll(".h29-hero")].some((hero) => readable(hero, "h1"))
    || [...home.querySelectorAll(".h29-card")].some((card) => readable(card, ".h29-card-t"));
}

function worldReady(doc, win) {
  const story = doc.querySelector('[data-flight-story="world"] .sod29-flight-feature');
  if (story && elementRendered(story, win) && renderedText(story.querySelector("h2"), win)
    && renderedText(story.querySelector(".sod29-flight-meta"), win)
    && elementRendered(story.querySelector(".sod29-actions button, .sod29-actions a"), win)) return true;

  const entry = doc.querySelector('[data-experience-surface="world"]');
  return Boolean(entry && elementRendered(entry, win) && renderedText(entry.querySelector("h2"), win)
    && elementRendered(entry.querySelector("button, a[href]"), win));
}

function postReady(doc, win, pathname) {
  const post = doc.querySelector('[data-experience-capability="post-master-reading-stage"]');
  let expected = "";
  try { expected = decodeURIComponent(pathname.slice(6)); } catch { expected = pathname.slice(6); }
  return Boolean(post && post.dataset.postSlug === expected && elementRendered(post, win)
    && renderedText(post.querySelector("h1"), win)
    && renderedText(post.querySelector(".sod29-reading-source"), win));
}

function numberReady(doc, win, pathname) {
  const root = doc.querySelector('[data-experience-surface="number"]');
  if (!root || !elementRendered(root, win)) return false;
  const expected = pathname.slice("/number/".length).split("/")[0];
  if (expected && String(root.dataset.numberRoot || "") !== expected) return false;
  if (root.dataset.numberEmpty === "true") return renderedText(root.querySelector("h1"), win);
  if (root.dataset.numberDepth !== "ready") return false;
  return Boolean(renderedText(root.querySelector("h1, .sod29-number-v10-stage-meta, .sod29-number-hero"), win));
}

function genericReady(doc, win) {
  const surface = doc.querySelector('main [data-experience-surface], main[data-experience-surface], [data-experience-surface]');
  if (!surface || !elementRendered(surface, win)) return false;
  if (surface.closest('[aria-busy="true"], .is-loading, .is-unavailable') || surface.querySelector('[aria-busy="true"]')) return false;
  const title = surface.querySelector("h1, h2");
  const action = surface.querySelector('a[href], button:not([disabled]), input:not([disabled])');
  return Boolean(renderedText(title, win) && (elementRendered(action, win) || String(surface.textContent || "").trim().length >= 160));
}

export function primaryContentState2029({ pathname = "/", doc, win } = {}) {
  const family = routeFamily(pathname);
  if (!doc || !win) return { usable: false, kind: `${family}-missing-document` };
  let usable = false;
  if (family === "home") usable = homeReady(doc, win);
  else if (family === "world") usable = worldReady(doc, win);
  else if (family === "post") usable = postReady(doc, win, pathname);
  else if (family === "number") usable = numberReady(doc, win, pathname);
  else usable = genericReady(doc, win);
  return { usable, kind: `${family}-primary-content` };
}

export { routeFamily as routeFamily2029 };
