import React, { useMemo } from "react";
import Timeline2029 from "./Timeline2029.jsx";
import { buildPublicTimeline } from "../../lib/research/timeline2029.js";

export default function PostTimeline2029({ items = [], currentHref = null }) {
  const rows = useMemo(() => buildPublicTimeline(items, { currentHref }), [items, currentHref]);
  return <Timeline2029 rows={rows} surface="post" />;
}
