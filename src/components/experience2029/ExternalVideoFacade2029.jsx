import React, { useEffect, useRef, useState } from "react";
import "./externalVideoFacade2029.css";
import { externalVideoEmbedSrc, externalVideoRefusal } from "../../lib/community/messageLinks.js";

// The ONE external-video player of 2029 (YouTube / Vimeo), extracted from the Community link card so every surface
// (Community, Now, Or HaGeula, World, the Golden Projector) shares it. Input is only a link already described by the
// canonical detector `describeMessageLink` (src/lib/community/messageLinks.js): kind, id, embed, thumbnail, href.
// Nothing heavy loads before the person asks (media performance map §7): a thumbnail button first, the iframe
// (youtube-nocookie / player.vimeo) only after a click. When YouTube refuses embedding (player error 100/101/150/153)
// the card turns into a plain "watch on YouTube" link instead of a broken player. Nothing is downloaded or copied.

const PROVIDERS = {
  youtube: { name: "YouTube", origin: "https://www.youtube-nocookie.com" },
  vimeo: { name: "Vimeo", origin: "https://player.vimeo.com" },
};

export default function ExternalVideoFacade2029({ link, title = "", context = "", className = "" }) {
  const provider = PROVIDERS[link?.kind];
  const frame = useRef(null);
  const [state, setState] = useState("idle"); // idle | loading | playing | refused
  const [imageFailed, setImageFailed] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const src = provider ? externalVideoEmbedSrc(link, typeof window === "undefined" ? "" : window.location.origin) : null;

  useEffect(() => {
    if (state !== "loading") return undefined;
    const started = Date.now(), timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [state]);

  useEffect(() => {
    if (link?.kind !== "youtube" || (state !== "loading" && state !== "playing")) return undefined;
    const onMessage = event => {
      if (event.origin !== provider.origin || event.source !== frame.current?.contentWindow) return;
      if (externalVideoRefusal(event.data) != null) setState("refused");
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [link?.kind, provider, state]);

  if (!provider || !src) return null;
  const label = title ? `${title} · ${provider.name}` : `סרטון ${provider.name}`;
  // The way out is the provider's own watch page (an embed address would refuse again), never the raw source address.
  const watch = <a className="sod29-external-video-out" href={link.watch || link.href} target="_blank" rel="noopener noreferrer">צפייה ב־{provider.name} ↗</a>;
  const cover = <>
    {link.thumbnail && !imageFailed ? <img src={link.thumbnail} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} /> : null}
  </>;
  return <figure className={`sod29-external-video ${className}`.trim()} data-external-video={link.kind} data-external-video-state={state}>
    {state === "refused" ? <div className="sod29-external-video-refused" role="status">
      {cover}<p>בעל הסרטון לא מאפשר לנגן אותו כאן. אפשר לצפות בו ישירות ב־{provider.name}.</p>
    </div> : state === "idle" ? <button type="button" className="sod29-external-video-cover" onClick={() => { setSeconds(0); setState("loading"); }} aria-label={`הפעלת הנגן · ${label}`}>
      {cover}<span className="sod29-external-video-play" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 4v16l13-8Z" /></svg></span>
    </button> : <div className="sod29-external-video-frame">
      <iframe ref={frame} src={src} title={label} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin" onLoad={() => {
          setState(current => current === "loading" ? "playing" : current);
          // Ask the YouTube player to report its events (onError) to this page; no API script is loaded.
          if (link.kind === "youtube") frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: link.id, channel: "widget" }), provider.origin);
        }} />
      {state === "loading" ? <span className="sod29-external-video-status" role="status">טוען את נגן {provider.name} · {seconds} שנ׳</span> : null}
    </div>}
    <figcaption>{title ? <strong dir="auto">{title}</strong> : null}{context ? <small dir="auto">{context}</small> : null}{watch}</figcaption>
  </figure>;
}
