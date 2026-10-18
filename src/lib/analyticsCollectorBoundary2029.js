import {
  prepareRuntimeErrorCapture2029,
  suspendRuntimeErrorCollector2029,
} from "./runtimeErrorCollector2029.js";
import {
  resumeTrackingEntryCollection2029,
  suspendTrackingEntryCollection2029,
} from "./trackingEntryFacade2029.js";
import {
  prepareWebVitals2029,
  suspendWebVitalsCollection2029,
} from "./webVitals2029.js";

export function resumeEarlyAnalyticsCollection2029() {
  prepareRuntimeErrorCapture2029();
  resumeTrackingEntryCollection2029();
  prepareWebVitals2029();
}

export function discardEarlyAnalyticsCollection2029() {
  suspendRuntimeErrorCollector2029();
  suspendTrackingEntryCollection2029();
  suspendWebVitalsCollection2029();
}
