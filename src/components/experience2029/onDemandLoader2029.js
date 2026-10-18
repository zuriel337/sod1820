// A browser remembers a failed module fetch for the life of the document: importing the same URL again fails again, however healthy the
// network has become. The failed module's URL is in the error text (Chromium and Firefox name it), so the retry asks for the same file
// under a query string, which is a different module URL. The URL is taken from the error only if it is a same-origin script.
export function failedModuleUrl(error, origin = typeof location === "undefined" ? "" : location.origin) {
  const match = /https?:\/\/[^\s"'`)?#]+\.js(?![\w.\/-])/.exec(String(error?.message || ""));
  if (!match) return null;
  try {
    const url = new URL(match[0]);
    if (url.origin !== origin) return null;
    url.search = "";
    url.hash = "";
    return url.href;
  } catch { return null; }
}

// One request at a time per component, shared by every mount; a failure is forgotten so that the next attempt asks again.
export function createOnDemandLoader(importer) {
  let pending = null;
  let failedUrl = null;
  let retries = 0;
  return () => (pending ||= (failedUrl ? import(/* @vite-ignore */ `${failedUrl}?retry=${++retries}`) : importer())
    .catch((error) => { failedUrl = failedModuleUrl(error) || failedUrl; pending = null; throw error; }));
}
