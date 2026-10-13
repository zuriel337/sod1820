import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import UserBadge from '../src/components/UserBadge.jsx';

function Harness() {
  const [url, setUrl] = useState('https://avatar.test/first.png');
  return <><label>כתובת תמונה<input value={url} onChange={event => setUrl(event.target.value)} /></label><UserBadge name="משתמש לדוגמה" avatarUrl={url}><time>היום</time></UserBadge></>;
}
createRoot(document.getElementById('root')).render(<Harness />);
