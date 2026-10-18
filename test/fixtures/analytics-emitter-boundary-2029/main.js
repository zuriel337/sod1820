import { createAnalyticsEmitterBoundary2029 } from "@boundary";
import { analyticsEmissionAllowed2029 } from "@policy";
import {
  prepareRuntimeErrorCapture2029,
  runtimeErrorCollectorState2029,
} from "@errors";
import {
  discardEarlyAnalyticsCollection2029,
  resumeEarlyAnalyticsCollection2029,
} from "@collectors";

window.__analyticsBoundary = {
  moduleLoads: 0,
  writes: [],
  cleanups: [],
  state: runtimeErrorCollectorState2029,
};

prepareRuntimeErrorCapture2029();
const boundary = createAnalyticsEmitterBoundary2029({ importer: () => import("./emitter.js") });

window.__analyticsBoundary.apply = ({ loading = false, on = true, hostedPreview = false, integratedPreview = false } = {}) => {
  const allowed = analyticsEmissionAllowed2029({
    switchState: { loading, on },
    pathname: "/world",
    hostedPreview,
    integratedPreview,
  });
  if (!allowed) {
    if (!loading) discardEarlyAnalyticsCollection2029();
    return false;
  }
  resumeEarlyAnalyticsCollection2029();
  const stopOwner = boundary.activate();
  const stopRoute = boundary.beginRoute("/world", { delayMs: 20 });
  window.__analyticsBoundary.cleanups.push(() => { stopRoute(); stopOwner(); });
  return true;
};
