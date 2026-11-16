// The mark of the newest reality-map update, shared by "עכשיו" and the Home strip (one projection). A dot that blinks until this viewer enters the update, with the small label
// "עדכון חדש"; once entered it stays as a still dot labelled "העדכון האחרון" until a newer update of the series replaces it (System Frame v2 §10.8, dated addendum 16.11.2026).
import React from "react";
import "./seriesLatestMark2029.css";

export default function SeriesLatestMark2029({ model }) {
  if (!model?.seriesLatest) return null;
  const blinking = Boolean(model.seriesLatestBlinking);
  return <span className="sod29-nowpub-latest" data-now-series-latest="reality-map">
    <i className={`sod29-nowpub-blink${blinking ? " is-blinking" : ""}`} aria-hidden="true" data-now-series-blinking={blinking ? "true" : "false"} />
    {blinking ? "עדכון חדש" : "העדכון האחרון"}
  </span>;
}
