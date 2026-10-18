import React, { Component, Suspense, lazy, useMemo, useState } from "react";

// A component whose code is requested when it is first rendered, with a defined outcome for a slow and for a failed request.
// React.lazy keeps a rejected promise rejected for good and an uncaught lazy failure unmounts the whole app; here a failure is caught
// at this boundary and shown through `renderError({ retry, reload })` (the loader: ./onDemandLoader2029.js):
//  - `retry` is a function only while one in-place retry can work (the failed URL is known and no retry has failed since the last success);
//  - `reload` always exists: a reload of the page, same URL with its query and hash, run only when the person asks for it.
// Nothing here retries or reloads by itself.
export const reloadPage2029 = () => window.location.reload();

class LoadBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.renderFailure() : this.props.children; }
}

export default function OnDemandComponent2029({ load, fallback = null, renderError, reload = reloadPage2029, ...props }) {
  const [attempt, setAttempt] = useState(0);
  // Each attempt gets its own lazy component and its own boundary.
  const Loaded = useMemo(() => lazy(load), [load, attempt]); // eslint-disable-line react-hooks/exhaustive-deps
  const renderFailure = () => renderError({ retry: load.recovery?.().canRetry === false ? null : () => setAttempt((n) => n + 1), reload });
  return (
    <LoadBoundary key={attempt} renderFailure={renderFailure}>
      <Suspense fallback={fallback}><Loaded {...props} /></Suspense>
    </LoadBoundary>
  );
}
