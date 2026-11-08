// The Frame owns ONE watcher of the world discovery stream (useSystemFeed2029). Surfaces that show the same
// publications (the Home "עדכונים אחרונים" strip) read it from here; none of them starts a second reader or poller.
import { createContext } from "react";

export const SystemFeedContext2029 = createContext(null);
