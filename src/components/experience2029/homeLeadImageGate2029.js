// The Home's pinned lead image first (ZURIEL 17.11.2026, speed): on a slow phone every image below the opening screen (the short "עכשיו"
// thumbnails, the series and flagship pictures, the documentation hero) shares the one connection with the pinned lead's image, which is the
// page's largest paint. Those images wait until the lead image has loaded or failed (or there is none, or a few seconds passed); their boxes
// keep their size meanwhile, so nothing moves. Outside the Home composition the gate is open.
import { createContext } from "react";
export const HomeLeadImageGate2029 = createContext(true);
export const HOME_LEAD_IMAGE_CAP_MS = 6000;
