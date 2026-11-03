import React, { useMemo } from 'react';
import { postSystemAdditionHtml2029 } from '../../lib/research/postSystemAddition2029.js';
import { hardenPassiveMediaHtml } from '../../lib/mediaEgressGuard.js';

export default function PostSystemAddition2029({ html }) {
  const passive = useMemo(() => hardenPassiveMediaHtml(postSystemAdditionHtml2029(html)), [html]);
  if (!passive) return null;
  return <aside id="post-system-addition" className="sod29-section" aria-labelledby="post-system-addition-title" data-author="המערכת">
    <h2 id="post-system-addition-title">תוספת המערכת</h2>
    <p>מאת המערכת · הרחבה ופרשנות נפרדות מדברי הכותב. עצם הצגת התוספת אינה אישור אימות.</p>
    <div className="sod29-reading-source" dangerouslySetInnerHTML={{ __html: passive }} />
  </aside>;
}
