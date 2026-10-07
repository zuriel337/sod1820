import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import { isProjectorPilotVisible } from "../../lib/projectorPilotGate.js";
import { ADMIN_LAYER, PROJECTOR_MODE, explainProminence, fetchGoldenAdminUniverse, resolveProjectorMode } from "../../lib/research/goldenProjectorModes.js";
import { contextualVideosFromMaps, describeVideoMatch, videoUrlForAnchor } from "../../lib/research/videoSemanticMap.js";

// "מנהל | ציבור" inside the EXISTING Contextual Sidecar (Golden Posts 5112/92 only).
// Mode changes presentation only. The admin layer is read with the viewer's own session through the
// existing RLS-enforced readers and is held only in this component's state: it is never written to
// Research Context (persisted/synced, read by Raziel). PUBLIC_VIEW performs no admin read and drops
// any admin payload already in memory, so the public preview equals what a public visitor receives.

const MODE_KEY = "sod29.goldenProjector.mode";
const PAGE = 30;

const LAYER_LABEL = {
  [ADMIN_LAYER.PUBLIC]: "שכבה ציבורית (מה שמבקר ציבורי רואה)",
  [ADMIN_LAYER.GOVERNED]: "פלטי owner שלא בשכבה הציבורית",
  [ADMIN_LAYER.TRACE]: "טענות מקור ואימות Trace",
  [ADMIN_LAYER.RESEARCH]: "מחקר מורשה (פרטי / מועמדים / מקושר לפי ערך)",
};

function readStoredMode() {
  try { return window.sessionStorage.getItem(MODE_KEY); } catch { return null; }
}
function storeMode(mode) {
  try { window.sessionStorage.setItem(MODE_KEY, mode); } catch { /* per-viewer convenience only */ }
}


function ContextVideo({ item }) {
  const src = videoUrlForAnchor(item);
  if (!src) return null;
  return <article className="sod29-golden-context-video" data-video-public-id={item.videoPublicId || undefined}>
    <div className="sod29-golden-context-video-head">
      <b>וידאו בהקשר</b>
      <span>{describeVideoMatch(item)}</span>
    </div>
    <video
      controls
      playsInline
      preload="none"
      src={src}
      poster={item.posterUrl || undefined}
      aria-label={`וידאו רלוונטי: ${describeVideoMatch(item)}`}
    />
    <small>
      {item.anchor?.note || "מפת מקור פנימית — דברי הסרטון אינם מקבלים מעמד של עובדה רק משום שמופו."}
    </small>
  </article>;
}

function AdminRow({ item }) {
  return <li className="sod29-golden-admin-row">
    <details>
      <summary>
        <span className="sod29-golden-admin-label">{item.label}</span>
        {item.value ? <b>{item.value}</b> : null}
      </summary>
      <dl>
        <dt>סוג</dt><dd>{item.type || "—"}</dd>
        <dt>מצב</dt><dd>{(item.states || []).map((s) => <span key={s} className="sod29-golden-admin-state">{s}</span>)}</dd>
        <dt>למה</dt><dd>{item.reason || "—"}</dd>
        <dt>מקור</dt><dd>{item.provenance || "—"}</dd>
        {item.axes ? <><dt>סדר</dt><dd>{explainProminence(item.axes)}</dd></> : null}
      </dl>
    </details>
  </li>;
}

function AdminLayer({ layerKey, items }) {
  const [shown, setShown] = useState(PAGE);
  if (!items.length) return null;
  return <details className="sod29-golden-admin-layer" open={layerKey !== ADMIN_LAYER.RESEARCH || items.length <= PAGE}>
    <summary>{LAYER_LABEL[layerKey]} · {items.length}</summary>
    <ul>{items.slice(0, shown).map((item) => <AdminRow key={item.id} item={item} />)}</ul>
    {items.length > shown ? <button type="button" onClick={() => setShown((n) => n + PAGE)}>הצג עוד {Math.min(PAGE, items.length - shown)} (מתוך {items.length - shown} נוספים)</button> : null}
  </details>;
}

export default function GoldenProjectorModeLayer2029({ context, surface }) {
  const { isAdmin, loading } = useAuth();
  const location = useLocation();
  const visible = isProjectorPilotVisible({ surface, pathname: location.pathname, context });
  const [requested, setRequested] = useState(readStoredMode);
  const mode = resolveProjectorMode({ isAdmin: !loading && isAdmin, requested });
  const postSlug = context?.dimensions?.readingFocus?.postSlug || null;
  const [universe, setUniverse] = useState({ status: "idle", data: null });

  useEffect(() => {
    if (!visible || mode !== PROJECTOR_MODE.ADMIN_ALL || !postSlug) {
      setUniverse({ status: "idle", data: null });
      return undefined;
    }
    let alive = true;
    setUniverse({ status: "loading", data: null });
    (async () => {
      // Admin-only readers load lazily, only in ADMIN_ALL.
      const [projection, hub] = await Promise.all([
        import("../../lib/research/post2029ReadingProjection.js"),
        import("../../lib/research/entityHubProjection.js"),
      ]);
      return fetchGoldenAdminUniverse({
        postSlug,
        loadPack: projection.fetchGoldenContextPackBySlug,
        readResearchObjects: hub.fetchResearchObjectsForEntity,
      });
    })().then((data) => {
      if (alive) setUniverse({ status: data ? "ready" : "empty", data });
    }).catch(() => {
      if (alive) setUniverse({ status: "error", data: null });
    });
    return () => { alive = false; };
  }, [visible, mode, postSlug]);

  if (!visible || loading || !isAdmin) return null;

  const choose = (next) => { storeMode(next); setRequested(next); };
  const data = universe.data;
  const contextualVideos = data
    ? contextualVideosFromMaps(data.videoMaps || [], context, { limit: 2 })
    : [];

  return <section className="sod29-golden-mode" data-golden-projector-mode={mode} aria-label="מצב תצוגת ההקשר">
    <div className="sod29-golden-mode-toggle" role="group" aria-label="מנהל | ציבור">
      <button type="button" aria-pressed={mode === PROJECTOR_MODE.ADMIN_ALL} onClick={() => choose(PROJECTOR_MODE.ADMIN_ALL)}>מנהל / הכל</button>
      <button type="button" aria-pressed={mode === PROJECTOR_MODE.PUBLIC_VIEW} onClick={() => choose(PROJECTOR_MODE.PUBLIC_VIEW)}>ציבור</button>
    </div>
    {mode === PROJECTOR_MODE.PUBLIC_VIEW
      ? <p className="sod29-golden-mode-note">תצוגה ציבורית: מוצג בדיוק מה שמבקר ציבורי מורשה לראות. לא נטען כאן שום חומר פרטי.</p>
      : universe.status === "loading" ? <p className="sod29-golden-mode-note">טוען את כל החומר המורשה…</p>
        : universe.status === "error" ? <p className="sod29-golden-mode-note">טעינת שכבת המנהל נכשלה. השכבה הציבורית לא הושפעה.</p>
          : !data ? <p className="sod29-golden-mode-note">אין חבילת הקשר לפוסט הזה.</p>
            : <div className="sod29-golden-admin" data-admin-total={data.total}>
              <p className="sod29-golden-mode-note">מנהל / הכל · {data.total} פריטים. גלוי ≠ מאומת / מפורסם / קנוני. סדר לפי צירי SMART, בלי ציון יחיד; אותו ערך ≠ אותה זהות.</p>
              {contextualVideos.length ? <section className="sod29-golden-context-videos" aria-label="סרטונים רלוונטיים להקשר">
                <div className="sod29-golden-mode-note">וידאו ממופה · מוצג מה־Asset שכבר נותח ונשמר, בלי סריקה מחדש.</div>
                {contextualVideos.map((item) => <ContextVideo key={item.id} item={item} />)}
              </section> : null}
              {data.researchAccess?.available === false ? <p className="sod29-golden-mode-note">קריאת המחקר אינה זמינה לחשבון זה ({data.researchAccess.reason}).</p> : null}
              {data.truncatedNumbers?.length ? <p className="sod29-golden-mode-note">הגעתי לגבול העמוד עבור {data.truncatedNumbers.join(", ")} — קיימים פריטים נוספים.</p> : null}
              {Object.values(ADMIN_LAYER).map((key) => <AdminLayer key={key} layerKey={key} items={data.layers[key] || []} />)}
            </div>}
  </section>;
}
