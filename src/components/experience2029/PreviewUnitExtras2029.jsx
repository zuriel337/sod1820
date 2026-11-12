// The React parts of the preview unit "זה לעומת זה עשה האלוהים — ימין ושמאול תפרצי" (postPreviewUnits2029.js), portalled into the hosts
// that the unit element carries:
//   bar      a direct link lands here exactly; continue to the whole Elections post, or go back to the last place;
//   images   the unit's two gematria images, bound as references only (private inbox files are NEVER fetched or shown);
//   sources  Yaniv and Shachar as SEPARATE identities, each with his own public words, writer page and exact source link;
//   engine   the unit's claims, each with the engine's own state (the approved words are not touched);
//   share    the EXISTING ShareActions, with the unit's own link and its royal card (the existing /api/card, variant "unit").
// Preview only: it mounts only when the unit element exists, and that exists only in the protected Preview build.
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import ShareActions from "../ShareActions.jsx";
import PostExternalSourceUnit2029, { ClaimRow } from "./PostExternalSourceUnit2029.jsx";
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
  if (direct) return <p className="sod29-pu-bar" data-pu-bar="direct" role="note">
    <span>קישור ישיר ליחידה בתוך פוסט הבחירות · סדרת מפת המציאות</span>
    <button type="button" onClick={toWholePost}>המשך לכל פוסט הבחירות ←</button>
    <button type="button" onClick={() => navigate(-1)} disabled={typeof window !== "undefined" && window.history.length <= 1}>חזרה למקום האחרון</button>
  </p>;
  return last && last.unit === unit.id ? <p className="sod29-pu-bar" data-pu-bar="resume" role="note">
    <span>קראת את היחידה הזאת</span><button type="button" onClick={backToUnit}>חזרה ליחידה ↺</button>
  </p> : null;
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

function Engine() {
  return <details className="sod29-pu-engine">
    <summary>בדיקת המנוע לטענות ביחידה</summary>
    <p className="sod29-pu-sources-note">הנוסח המאושר נשאר כפי שנמסר. כאן מוצג רק מה שהמנוע החזיר לכל טענה; אימות חישוב אינו אימות פרשנות.</p>
    {YAMIN_SMOL_CLAIMS.map((claim) => <div key={claim.id} className="sod29-pu-engine-row" data-claim={claim.id}>
      {claim.by ? <small>בדברי {IDENTITY_LABEL[claim.by]}</small> : <small>בנוסח העריכה</small>}
      <ClaimRow claim={claim} />
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
      found.push({ unit, hosts: { bar: host("bar"), images: host("images"), sources: host("sources"), engine: host("engine"), share: host("share") } });
    }
    setMounts(found);
    return () => setMounts([]);
  }, [rootRef, post.id, htmlKey]);
  return <>{mounts.map(({ unit, hosts }) => <React.Fragment key={unit.id}>
    {hosts.bar ? createPortal(<Bar unit={unit} post={post} postPath={postPath} />, hosts.bar) : null}
    {hosts.images ? createPortal(<Images />, hosts.images) : null}
    {hosts.sources ? createPortal(<Sources />, hosts.sources) : null}
    {hosts.engine ? createPortal(<Engine />, hosts.engine) : null}
    {hosts.share ? createPortal(<Share unit={unit} post={post} postPath={postPath} />, hosts.share) : null}
  </React.Fragment>)}</>;
}
