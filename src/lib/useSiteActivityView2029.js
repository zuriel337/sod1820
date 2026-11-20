import { useEffect, useRef } from 'react';
import { recordSiteActivity } from './siteActivity2029.js';
import { measurementAuth, subscribeMeasurementAuth } from './measurementAuth2029.js';
// Domain views are distinct from the route owner's page/view.
export function useSiteActivityView2029(section, enabled = true) {
  const sent = useRef(false);
  useEffect(() => {
    if (!enabled) return;
    const send = () => {
      if (sent.current || !measurementAuth().ready) return;
      sent.current = true;
      recordSiteActivity('view', { section });
    };
    const unsubscribe = subscribeMeasurementAuth(send);
    send();
    return unsubscribe;
  }, [section, enabled]);
}
