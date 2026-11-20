import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPublicResearchClient } from "../../lib/research/researchViewMode.js";
import { publicGalleryToSystemItem, publicNowMediaKind } from "../../lib/research/systemFeedPublicSources2029.js";

import "./homeStreamVideo2029.css";

const FEATURED_ID = "b83221ae-53bc-59f4-8cb6-158c852db7af";

export default function HomeStreamVideo2029() {
  const [item, setItem] = useState(undefined);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    async function read() {
      const { data, error } = await getPublicResearchClient().from("gallery_images")
        .select("id,wp_gallery_id,name,image_url,source,published,min_tier,curator_hidden,stream_at,created_at,video:ocr_meta->>video_url")
        .eq("id", FEATURED_ID).eq("source", "update").eq("published", 1).eq("min_tier", 0)
        .not("curator_hidden", "is", true).abortSignal(controller.signal).maybeSingle();
      const source = !error && publicGalleryToSystemItem(data);
      if (!controller.signal.aborted) setItem(source?.href && publicNowMediaKind(source.mediaHref) === "image"
        && publicNowMediaKind(data.video) === "video" ? { ...source, video: data.video } : null);
    }
    read().catch(() => { if (!controller.signal.aborted) setItem(null); });
    return () => controller.abort();
  }, []);

  if (item === undefined) return <div className="h29-stream-slot" aria-hidden="true" />;
  if (!item) return null;
  return <article className="h29-stream-video" aria-labelledby="home-stream-video-title">
    {playing ? <video controls playsInline autoPlay preload="none" src={item.video} poster={item.mediaHref}
      aria-label={item.label} onError={() => setFailed(true)} /> :
      <button className="h29-stream-play" type="button" onClick={() => setPlaying(true)} aria-label={`הפעלת הסרטון · ${item.label}`}>
        <img src={item.mediaHref} alt="" decoding="async" />
        <span aria-hidden="true">▶</span>
      </button>}
    <div className="h29-stream-details">
      <small>סרטון מזרם המציאות</small>
      <h2 id="home-stream-video-title">{item.label}</h2>
      {failed && <p role="status">הניגון נכשל. <a href={item.video}>פתיחת הסרטון ישירות</a></p>}
      <Link to={item.href}>לפריט בזרם המציאות ←</Link>
    </div>
  </article>;
}
