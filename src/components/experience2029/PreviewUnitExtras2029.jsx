// The React parts of the preview unit "זה לעומת זה עשה האלוהים — ימין ושמאול תפרצי" (postPreviewUnits2029.js), portalled into the hosts
// that the unit element carries:
//   bar      a direct link lands here exactly; continue to the whole Elections post, or go back to the last place;
//   images   the unit's two gematria images, bound as references only (private inbox files are NEVER fetched or shown);
//   sources  Yaniv and Shachar as SEPARATE identities, each with his own public words, writer page and exact source link;
//   engine   the unit's claims, each with the engine's own state (the approved words are not touched);
//   share    the EXISTING ShareActions, with the unit's own link and its royal card (the existing /api/card, variant "unit").
// Preview only: it mounts only when the unit element exists, and that exists only in the protected Preview build.
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ShareActions from "../ShareActions.jsx";
import PostExternalSourceUnit2029, { ClaimRow } from "./PostExternalSourceUnit2029.jsx";
import { fetchGematriaMethodTrace } from "../../lib/research/gematriaTrace.js";
import { projectGematriaTrace } from "../../lib/research/gematriaTracePresentation.js";
import { checkSourceHint } from "../../lib/research/postSourceHintCheck2029.js";
import SpatialMethodStage2029 from "../gematria2029/SpatialMethodStage2029.jsx";
import GematriaShowcase2029 from "./GematriaShowcase2029.jsx";
import { use2029Shell } from "./Sod2029Shell.jsx";
import { fetchGroupSourceArrivals } from "../../lib/research/worldGroupSource.js";
import { detectNumbersAndExpressions } from "../../lib/research/unitTextSuggestions2029.js";
import { publicPostHref } from "../../lib/publicPostUrls.js";
import { previewUnitsFor, unitShareUrl, unitCardUrl, YAMIN_SMOL_CLAIMS, YAMIN_SMOL_IMAGES, YAMIN_SMOL_SOURCES, ATTRIBUTION_GROUPS } from "../../lib/research/postPreviewUnits2029.js";

const LAST_KEY = (postId) => `sod2029:pu-last:${postId}`;
const readLast = (postId) => { try { return JSON.parse(sessionStorage.getItem(LAST_KEY(postId)) || "null"); } catch { return null; } };
const writeLast = (postId, value) => { try { if (value) sessionStorage.setItem(LAST_KEY(postId), JSON.stringify(value)); else sessionStorage.removeItem(LAST_KEY(postId)); } catch { /* optional */ } };
const IDENTITY_LABEL = Object.freeze({ "yaniv-levi": "יניב לוי", "shachar-kandro": "יצחק שחר קנדרו" });

function Bar({ unit, post, postPath }) {
  const { search } = useLocation();
  const navigate = useNavigate();
  const [last, setLast] = useState(() => readLast(post.id));
  const direct = new URLSearchParams(search).get("unit") === unit.id;
  // "Continue to the whole post" opens the Post from its top. `puWhole` tells the page not to resume an older saved reading region (the saved
  // region of this Post is the start of its original text, far below the update stack); the unit stays one tap away through "חזרה ליחידה".
  const toWholePost = () => {
    writeLast(post.id, { unit: unit.id });
    setLast({ unit: unit.id });
    navigate(postPath, { state: { puWhole: true } });
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" }));
  };
  const backToUnit = () => { writeLast(post.id, null); setLast(null); navigate(`${postPath}?unit=${encodeURIComponent(unit.id)}#${encodeURIComponent(unit.id)}`); };
  // ONE compact secondary breadcrumb inside the unit (never a second page-wide tab bar): whole Post ‹ this unit. The Post-level tabs above stay the
  // only segmented control. "Back to the last place" appears only for a direct link; "back to the unit" only after leaving it for the whole Post.
  const canGoBack = direct && typeof window !== "undefined" && window.history.length > 1;
  return <nav className="sod29-pu-bar" data-pu-bar={direct ? "direct" : last && last.unit === unit.id ? "resume" : "crumb"} aria-label="מיקום היחידה בפוסט">
    <button type="button" onClick={toWholePost}>← כל הפוסט</button>
    <span className="sod29-pu-crumb" aria-current="location">יחידה · {unit.title}</span>
    {canGoBack ? <button type="button" onClick={() => navigate(-1)}>חזרה למקום האחרון</button> : null}
    {!direct && last && last.unit === unit.id ? <button type="button" onClick={backToUnit}>חזרה ליחידה ↺</button> : null}
  </nav>;
}

function Images() {
  return <section className="sod29-pu-images" aria-label="תמונות הגימטריה של היחידה">
    {YAMIN_SMOL_IMAGES.map((image, i) => <figure key={image.id} className="sod29-pu-image is-pending" data-pu-image={image.ref} data-image-state={image.state}>
      <div aria-hidden="true">🖼</div>
      <figcaption><b>תמונת גימטריה {i + 1}</b><span>ממתינה לאישור פרסום — הקובץ שמור בתיבה פרטית ואינו מוצג</span></figcaption>
    </figure>)}
  </section>;
}

function Sources() {
  const [units, setUnits] = useState([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const found = [], want = new Set(YAMIN_SMOL_SOURCES.map((s) => s.slug));
      let before = null;
      for (let page = 0; page < 6 && found.length < want.size; page += 1) {
        const rows = await fetchGroupSourceArrivals({ limit: 40, before });
        if (!rows.length) break;
        for (const row of rows) {
          const wanted = YAMIN_SMOL_SOURCES.find((s) => s.slug === row.creatorSlug && String(row.sourceRef || "").includes(s.id.split(":").pop()));
          if (!wanted || found.some((u) => u.writerSlug === row.creatorSlug)) continue;
          const claims = detectNumbersAndExpressions(row.fullText).filter((d) => d.kind === "claim");
          found.push({ id: row.sourceRef, demo: false, writerName: row.creator, writerSlug: row.creatorSlug, writerHref: row.creatorHref, groupLabel: row.sourceGroupLabel,
            dateIso: row.arrivalAt, text: row.fullText, claims: claims.map((c) => ({ phrase: c.phrase, number: c.number, methodText: c.methodText })), href: row.href });
        }
        before = rows.at(-1)?.arrivalAt || null;
        if (!before) break;
      }
      if (alive) setUnits(found);
    })().catch(() => { if (alive) setUnits([]); });
    return () => { alive = false; };
  }, []);
  return <section className="sod29-pu-sources" aria-label="מקורות היחידה">
    <h4>המקורות — כל כותב בזהות נפרדת, בדבריו שלו</h4>
    <p className="sod29-pu-sources-note">זהויות ביחידה: {ATTRIBUTION_GROUPS.map((g) => g.label).join(" · ")} · פסוקים · בעל הסולם · עריכת האתר. אין מייחסים לכותב אלא את מה שכתב.</p>
    {units.length === 0 ? <p className="sod29-pu-sources-note" role="status">מקורות הכותבים נטענים מהקורא הציבורי…</p> : null}
    {units.map((source) => <PostExternalSourceUnit2029 key={source.id} source={source} />)}
  </section>;
}

// The CANONICAL method trace of one claim (the same projection and visual family the Beit Midrash and the Number page use).
// `auto` (the focal numbers in the unit body): the breakdown is OPEN in front of the reader and is fetched only when it scrolls near the screen.
// Otherwise (the engine panel): it opens on request. The method comes from the engine's own resolution of the SOURCE's method text (never inferred
// from the target number); on any missing/failed/unsupported/mismatched trace the panel says so and invents no step.
function ClaimTrace({ claim, auto = false }) {
  const shell = use2029Shell();
  const [open, setOpen] = useState(auto);
  const [state, setState] = useState({ phase: "idle" });
  const hostRef = useRef(null);
  const load = async () => {
    setState((current) => (current.phase === "idle" ? { phase: "loading" } : current));
    try {
      const check = await checkSourceHint({ expression: claim.phrase, stated: claim.number, methodText: claim.methodText });
      const methodKey = check?.method?.key;
      if (!methodKey) return setState({ phase: "unavailable" });
      const finding = await fetchGematriaMethodTrace(methodKey, claim.phrase);
      const trace = finding?.projection?.dimensions?.trace || null;
      const model = projectGematriaTrace(trace, { expression: claim.phrase, methodKey, expectedValue: check.value });
      setState(model.state === "ready" ? { phase: "ready", model, check, trace, methodKey } : { phase: "unavailable" });
    } catch { setState({ phase: "unavailable" }); }
  };
  useEffect(() => {
    if (!auto || state.phase !== "idle") return undefined;
    const node = hostRef.current;
    if (!node || typeof IntersectionObserver === "undefined") { load(); return undefined; }
    const observer = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { observer.disconnect(); load(); } }, { rootMargin: "300px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [auto, state.phase, claim.id]);
  const toggle = () => { const next = !open; setOpen(next); if (next && state.phase === "idle") load(); };
  const model = state.model;
  return <div className="sod29-pu-trace" data-trace-state={state.phase} data-trace-auto={auto ? "true" : undefined} ref={hostRef}>
    {!auto ? <button type="button" className="sod29-pu-trace-btn" aria-expanded={open} onClick={toggle}>{open ? "הסתר את החישוב" : "איך הגענו למספר?"}</button> : null}
    {open && state.phase === "loading" ? <p role="status" className="sod29-pu-sources-note">פותח את צעדי החישוב…</p> : null}
    {open && state.phase === "unavailable" ? <p role="status" className="sod29-pu-sources-note">פירוט החישוב אינו זמין כרגע. לא הומצאו צעדים חלופיים.</p> : null}
    {open && state.phase === "ready" ? <div className="sod29-pu-trace-body">
      {model.components?.length
        ? <SpatialMethodStage2029 expression={claim.phrase} methodKey={state.methodKey} trace={state.trace} expectedValue={state.check?.value ?? null} depth="S2" />
        : <GematriaShowcase2029 model={model} expression={claim.phrase} />}
      <p className="sod29-pu-trace-links">
        <button type="button" onClick={() => shell?.openNumber?.({ type: "number", id: String(model.result) })}>פתח בדף המספר</button>
        <Link to="/beit-midrash">פתח את השיטה בבית המדרש</Link>
      </p>
    </div> : null}
  </div>;
}

function Engine() {
  return <details className="sod29-pu-engine">
    <summary>בדיקת המנוע לטענות ביחידה</summary>
    <p className="sod29-pu-sources-note">הנוסח המאושר נשאר כפי שנמסר. כאן מוצג רק מה שהמנוע החזיר לכל טענה; אימות חישוב אינו אימות פרשנות.</p>
    {YAMIN_SMOL_CLAIMS.map((claim) => <div key={claim.id} className="sod29-pu-engine-row" data-claim={claim.id}>
      {claim.by ? <small>בדברי {IDENTITY_LABEL[claim.by]}</small> : <small>בנוסח העריכה</small>}
      <ClaimRow claim={claim} />
      <ClaimTrace claim={claim} />
    </div>)}
  </details>;
}

function Share({ unit, post, postPath }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = unitShareUrl(origin, postPath, unit.id);
  const title = `${unit.title} — ${unit.subtitle}`;
  return <section className="sod29-pu-share" aria-label="שיתוף היחידה" data-pu-share-url={url}>
    <h4>שיתוף היחידה</h4>
    <p className="sod29-pu-sources-note">הקישור פותח את היחידה עצמה בתוך פוסט הבחירות, עם דרך להמשיך לכל הפוסט. שיתוף הפוסט הראשי נשאר כרגיל.</p>
    <ShareActions type="post" entityId={`posts:${post.id}#${unit.id}`} sourceSurface="post_2029_unit" subtype="share" url={url} title={title}
      image={unitCardUrl(origin, unit)} force exactState={{ unit: unit.id, series: unit.seriesKey }} />
    <a className="sod29-pu-link" href={url} data-pu-direct-link="true">{url.replace(/^https?:\/\//, "")}</a>
  </section>;
}

export default function PreviewUnitExtras2029({ rootRef, post, htmlKey }) {
  const [mounts, setMounts] = useState([]);
  const postPath = publicPostHref(post) || `/post/${post.slug}`;
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const found = [];
    for (const unit of previewUnitsFor(post.id)) {
      const section = root.querySelector(`[id="${unit.id}"]`);
      if (!section) continue;
      const host = (name) => section.querySelector(`[data-pu-host="${name}"]`);
      found.push({ unit, traces: [...section.querySelectorAll("[data-pu-trace]")].map((node) => ({ node, claim: YAMIN_SMOL_CLAIMS.find((c) => c.id === node.getAttribute("data-pu-trace")) })).filter((t) => t.claim), hosts: { bar: host("bar"), images: host("images"), sources: host("sources"), engine: host("engine"), share: host("share") } });
    }
    setMounts(found);
    return () => setMounts([]);
  }, [rootRef, post.id, htmlKey]);
  return <>{mounts.map(({ unit, hosts, traces }) => <React.Fragment key={unit.id}>
    {hosts.bar ? createPortal(<Bar unit={unit} post={post} postPath={postPath} />, hosts.bar) : null}
    {hosts.images ? createPortal(<Images />, hosts.images) : null}
    {hosts.sources ? createPortal(<Sources />, hosts.sources) : null}
    {hosts.engine ? createPortal(<Engine />, hosts.engine) : null}
    {traces.map(({ node, claim }) => createPortal(<ClaimTrace claim={claim} auto />, node))}
    {hosts.share ? createPortal(<Share unit={unit} post={post} postPath={postPath} />, hosts.share) : null}
  </React.Fragment>)}</>;
}
