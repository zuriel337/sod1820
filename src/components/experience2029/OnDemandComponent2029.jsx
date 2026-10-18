import React, { Component, Suspense, lazy, useMemo, useState } from "react";

// A component whose code is requested when it is first rendered, with a defined outcome for a slow and for a failed request.
// React.lazy keeps a rejected promise rejected for good and an uncaught lazy failure unmounts the whole app; here a failure is caught
// at this boundary, shown through `renderError`, and a retry asks for the code again (the loader: ./onDemandLoader2029.js).

class LoadBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.errorView : this.props.children; }
}

export default function OnDemandComponent2029({ load, fallback = null, renderError, ...props }) {
  const [attempt, setAttempt] = useState(0);
  // Each attempt gets its own lazy component and its own boundary.
  const Loaded = useMemo(() => lazy(load), [load, attempt]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <LoadBoundary key={attempt} errorView={renderError({ retry: () => setAttempt((n) => n + 1) })}>
      <Suspense fallback={fallback}><Loaded {...props} /></Suspense>
    </LoadBoundary>
  );
}
