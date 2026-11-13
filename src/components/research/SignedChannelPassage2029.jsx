import React, { useEffect, useRef, useState } from "react";
import { getPublicResearchClient } from "../../lib/research/researchViewMode.js";
import { fetchSignedSourcePassage } from "../../lib/research/contributorSourcePassages.js";
import { GROUP_SOURCE_CHANNELS, redactGroupText } from "../../lib/research/worldGroupSource.js";

export default function SignedChannelPassage2029({ id }) {
  const [result, setResult] = useState(null);
  const target = useRef(null);
  useEffect(() => {
    let active = true;
    fetchSignedSourcePassage(getPublicResearchClient(), id, "channel_updates")
      .then((passage) => { if (active) setResult({ id, passage }); })
      .catch(() => { if (active) setResult({ id, passage: null }); });
    return () => { active = false; };
  }, [id]);
  const ready = result?.id === id;
  const passage = ready ? result.passage : null;
  useEffect(() => {
    if (!passage || !target.current) return;
    target.current.focus({ preventScroll: true });
    target.current.scrollIntoView({ block: "center", behavior: "instant" });
  }, [passage]);
  if (!ready) return <p role="status">פותח את העדכון המקורי…</p>;
  if (!passage) return <p role="status">הקטע שבקישור אינו זמין כרגע.</p>;
  return <section className="sod29-section" aria-labelledby="signed-channel-update-title">
    <header className="sod29-section-head">
      <h2 id="signed-channel-update-title">{passage.source.seo_title || "עדכון ציבורי"}</h2>
      {Object.hasOwn(GROUP_SOURCE_CHANNELS, passage.source.channel) ? <p>{GROUP_SOURCE_CHANNELS[passage.source.channel]}</p> : null}
    </header>
    {passage.blocks.map((block, index) => {
      const selected = index + 1 === Number(passage.ref.locator);
      const [heading, ...body] = block.text.split(/\r?\n/);
      return <article key={index} ref={selected ? target : null} id={selected ? passage.ref.anchor : undefined}
        tabIndex={selected ? -1 : undefined}>
        {block.credit ? <h3>{redactGroupText(heading)}</h3> : <p>{redactGroupText(heading)}</p>}
        <p style={{ whiteSpace: "pre-wrap" }}>{body.map((line) => redactGroupText(line)).join("\n")}</p>
      </article>;
    })}
  </section>;
}
