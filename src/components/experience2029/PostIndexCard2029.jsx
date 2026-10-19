import React, { lazy, Suspense, useId, useState } from "react";
import { Link } from "react-router-dom";
import PostCategories2029 from "./PostCategories2029.jsx";
import ContextDepthMeter2029 from "./ContextDepthMeter2029.jsx";
import { stripHtml } from "../../lib/format.js";
import { bilingualDateLabel } from "../../lib/relativeTime2029.js";
import { humanContentTitle } from "../../lib/presentation/contentTitle.js";
import "../../pages/posts2029.css";

// The expanded context map opens only when a number is chosen inside the opened depth panel.
const ContextMapPanel2029 = lazy(() => import("./ContextMap2029.jsx"));

const numericSignals = (tags = []) => [...new Set(
  (Array.isArray(tags) ? tags : [])
    .map((tag) => String(tag || "").trim())
    .filter((tag) => /^\d{1,6}$/.test(tag))
)].slice(0, 4);

const isGoldenPost = (post) => Array.isArray(post?.tags)
  && post.tags.some((tag) => String(tag).includes("2029-golden"));

/**
 * The existing 2029 post index card. `depth` is an already-derived context-depth projection for this
 * post (never computed here). Without it the card is unchanged; with it the compact meter sits under
 * the card link and a click opens the full explanation in place. `mapReaders` are the existing owners'
 * readers, used only after the reader picks a number.
 */
export default function PostIndexCard({ post, index, depth = null, mapReaders = null, onMapOpen = null, onLocatorOpen = null, restore = null }) {
  const title = humanContentTitle(post?.title, { max: 92 });
  const excerpt = stripHtml(post?.excerpt || post?.content || "").slice(0, 180);
  const numbers = numericSignals(post?.tags);
  const image = post?.thumb_url || post?.image_url || null;
  const categories = (Array.isArray(post?.categories) ? post.categories : []).slice(0, 3);
  const golden = isGoldenPost(post);
  // Exact return: a card the reader left from (source region or map neighbour) reopens with the same number.
  const [open, setOpen] = useState(Boolean(restore));
  const [picked, setPicked] = useState(restore?.number ?? null);
  const panelId = useId();

  return <article
    className={"sod29-post-index-card" + (golden ? " is-golden" : "") + (depth || /תיעוד אירועים/.test((post?.categories || []).join(" ")) ? " has-depth" : "") + (depth && open ? " is-depth-open" : "")}
    id={post?.id != null ? `post-card-${post.id}` : undefined}
    data-experience-capability="post-index-card"
    data-post-golden={golden ? "true" : "false"}
    style={{ "--post-order": index }}
  >
    <Link className="sod29-post-index-card-link" to={"/post/" + encodeURIComponent(post.slug)}>
      <div
        className={"sod29-post-index-visual" + (image ? " has-image" : "")}
        aria-hidden="true"
      >
        {image ? <img className="sod29-post-index-cover" src={image} alt="" loading={index < 2 ? "eager" : "lazy"} decoding="async" width="640" height="360" /> : null}
        {!image ? <div className="sod29-post-index-number-field">
          {(numbers.length ? numbers : ["✦"]).map((value) => <span key={value}>{value}</span>)}
        </div> : null}
        <div className="sod29-post-index-visual-wash" />
      </div>

      <div className="sod29-post-index-copy">
        <div className="sod29-post-index-meta">
          {post.author ? <span>{post.author}</span> : null}
          <span>{post?.modified ? "עודכן " : "פורסם "}{bilingualDateLabel(post?.modified || post?.date, "תאריך לא צוין")}</span>
          <PostCategories2029 categories={categories} max={3} nested />
        </div>
        <h2>{title || "פוסט"}</h2>
        {excerpt ? <p>{excerpt}</p> : null}
        {numbers.length ? <div className="sod29-post-index-signals" aria-label="מספרים מרכזיים">
          {numbers.map((value) => <b key={value}>{value}</b>)}
        </div> : null}
        <span className="sod29-post-index-open">פתח את הפוסט <b aria-hidden="true">←</b></span>
      </div>
    </Link>
    {!depth && /תיעוד אירועים/.test((post?.categories || []).join(" ")) ? <div className="sod29-post-index-depth">
      <span className="sod29-depth-unmapped" data-context-depth-unmapped>עומק · טרם מופה</span>
    </div> : null}
    {depth ? <div className="sod29-post-index-depth">
      <ContextDepthMeter2029 depth={depth} variant="compact" expanded={open} onToggle={() => setOpen((value) => !value)} panelId={panelId} />
    </div> : null}
    {depth && open ? <div className="sod29-post-index-depth-panel" id={panelId}>
      <ContextDepthMeter2029 depth={depth} variant="full" selectedValue={picked} onSelectValue={setPicked} onOpenLocator={(source, number) => onLocatorOpen?.(post, source, number ?? picked)}>
        {picked != null && mapReaders ? <Suspense fallback={<p role="status">פותח את מפת ההקשר…</p>}>
          <ContextMapPanel2029 key={picked} defaultOpen focus={{ type: "number", id: String(picked), label: String(picked) }}
            audience={depth.audience} readers={mapReaders} onOpen={(item) => onMapOpen?.(post, item)} />
        </Suspense> : picked != null ? <p className="sod29-depth-note">מפת ההקשר נטענת בבקשה.</p> : null}
      </ContextDepthMeter2029>
    </div> : null}
  </article>;
}
