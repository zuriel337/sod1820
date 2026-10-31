import React from 'react';
import WatchButton from '../WatchButton.jsx';
import './realityRiver2029.css';

/** A callsite of the single follow controller; not a gallery subscription. */
export default function RealityStreamFollow2029({ source = 'reality_stream_2029' }) {
  return <div className="r29-follow" aria-label="מעקב אחרי זרם המציאות">
    <WatchButton topic="stream:reality" source={source} variant="2029" compact noPush
      label="לעקוב אחרי הזרם" followLabel="במעקב אחרי הזרם"
      explainer="מעקב אחרי תמונות ורמזים שנוספים לזרם המציאות — לא אחרי כל שינוי בגלריות." />
    {import.meta.env.VITE_INTEGRATED_PREVIEW === 'true' ? <p className="r29-note">הפריוויו לקריאה בלבד; שינויים במעקב אינם נשמרים כאן.</p> : null}
  </div>;
}
