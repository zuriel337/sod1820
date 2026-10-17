// A browser remembers a failed module fetch for the life of the document: importing the same URL again fails again, however healthy the
// network has become. The failed module's URL is in the error text (Chromium and Firefox name it), so a retry asks for the same file
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
// `load.recovery()` says what the person can be offered after a failure: one in-place retry exists only when the failed URL is known and no
// retry has failed since the last success; otherwise the only thing that can help is a reload of the page (never done automatically).
export function createOnDemandLoader(importer) {
  let pending = null;
  let failedUrl = null;
  let retries = 0;
  let retryFailed = false;
  const load = () => {
    if (pending) return pending;
    const retrying = Boolean(failedUrl);
    pending = (retrying ? import(/* @vite-ignore */ `${failedUrl}?retry=${++retries}`) : importer())
      .then((module) => { failedUrl = null; retryFailed = false; return module; })
      .catch((error) => {
        failedUrl = failedModuleUrl(error) || failedUrl;
        retryFailed = retrying;
        pending = null;
        throw error;
      });
    return pending;
  };
  load.recovery = () => ({ canRetry: Boolean(failedUrl) && !retryFailed });
  return load;
}
