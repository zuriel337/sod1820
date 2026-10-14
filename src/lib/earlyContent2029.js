// Starts the first content read of the entry route from the boot script, in parallel with the
// route chunk, instead of from a React effect that only runs after that chunk has loaded.
// Same readers, same arguments — only the moment of the call changes. One-shot: the first
// matching consumer takes the in-flight promise; every later navigation reads normally.
const slots = new Map();

export function startEarlyContent2029(pathname = "") {
  try {
    if (pathname === "/") {
      slots.set("home", import("./research/home2029Projection.js")
        .then((m) => m.fetchHome2029Projection({ includeWorld: true, includeTemporal: true })));
    } else if (pathname.startsWith("/post/")) {
      const raw = pathname.slice("/post/".length).split("/")[0];
      if (!raw) return;
      let slug = raw;
      try { slug = decodeURIComponent(raw); } catch { /* keep raw */ }
      slots.set(`post:${slug}`, import("./research/post2029ReadingProjection.js")
        .then((m) => m.fetchPost2029ReadingProjection(slug)));
    }
  } catch { /* early read is an optimisation, never a dependency */ }
  for (const p of slots.values()) p.catch(() => {});
}

export function takeEarlyContent2029(key) {
  const p = slots.get(key);
  slots.delete(key);
  return p || null;
}
