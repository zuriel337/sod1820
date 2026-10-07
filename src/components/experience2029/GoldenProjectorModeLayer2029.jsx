import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import ProjectorMediaCards2029 from "./ProjectorMediaCards2029.jsx";
import { isProjectorPilotVisible } from "../../lib/projectorPilotGate.js";
import { ADMIN_LAYER, PROJECTOR_MODE, explainProminence, fetchGoldenAdminUniverse, resolveProjectorMode } from "../../lib/research/goldenProjectorModes.js";
import {
  RESEARCH_FACET_FILTER_DEFAULTS,
  RESEARCH_OPERATION_LABELS_HE,
  buildResearchFacetControl,
  filterResearchFacetItems,
} from "../../lib/research/researchFacetProjection.js";

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
        {item.sourceText ? <><dt>דברי המקור</dt><dd className="sod29-golden-source-text">{item.sourceText}</dd></> : null}
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
  const [facetFilters, setFacetFilters] = useState(() => ({ ...RESEARCH_FACET_FILTER_DEFAULTS }));

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
        readSourceOccurrences: hub.fetchResearchSourceOccurrences,
      });
    })().then((data) => {
      if (alive) setUniverse({ status: data ? "ready" : "empty", data });
    }).catch(() => {
      if (alive) setUniverse({ status: "error", data: null });
    });
    return () => { alive = false; };
  }, [visible, mode, postSlug]);

  useEffect(() => {
    setFacetFilters({ ...RESEARCH_FACET_FILTER_DEFAULTS });
  }, [postSlug]);

  if (!visible || loading || !isAdmin) return null;

  const choose = (next) => { storeMode(next); setRequested(next); };
  const data = universe.data;
  const researchItems = data?.layers?.[ADMIN_LAYER.RESEARCH] || [];
  const facetControl = buildResearchFacetControl(researchItems);
  const filteredResearchItems = filterResearchFacetItems(researchItems, facetFilters);
  const updateFacet = (key, value) => setFacetFilters((current) => ({ ...current, [key]: value }));
  const resetFacets = () => setFacetFilters({ ...RESEARCH_FACET_FILTER_DEFAULTS });

  return <section className="sod29-golden-mode" data-golden-projector-mode={mode} aria-label="מצב תצוגת ההקשר">
    <div className="sod29-golden-mode-toggle" role="group" aria-label="מנהל | ציבור">
      <button type="button" aria-pressed={mode === PROJECTOR_MODE.ADMIN_ALL} onClick={() => choose(PROJECTOR_MODE.ADMIN_ALL)}>מנהל / הכל</button>
      <button type="button" aria-pressed={mode === PROJECTOR_MODE.PUBLIC_VIEW} onClick={() => choose(PROJECTOR_MODE.PUBLIC_VIEW)}>ציבור</button>
    </div>
    <ProjectorMediaCards2029 postSlug={postSlug} context={context} />
    {mode === PROJECTOR_MODE.PUBLIC_VIEW
      ? <p className="sod29-golden-mode-note">תצוגה ציבורית: מוצג בדיוק מה שמבקר ציבורי מורשה לראות. לא נטען כאן שום חומר פרטי.</p>
      : universe.status === "loading" ? <p className="sod29-golden-mode-note">טוען את כל החומר המורשה…</p>
        : universe.status === "error" ? <p className="sod29-golden-mode-note">טעינת שכבת המנהל נכשלה. השכבה הציבורית לא הושפעה.</p>
          : !data ? <p className="sod29-golden-mode-note">אין חבילת הקשר לפוסט הזה.</p>
            : <div className="sod29-golden-admin" data-admin-total={data.total}>
              <p className="sod29-golden-mode-note">מנהל / הכל · {data.total} פריטים. גלוי ≠ מאומת / מפורסם / קנוני. סדר לפי צירי SMART, בלי ציון יחיד; אותו ערך ≠ אותה זהות.</p>
              {data.researchAccess?.available === false ? <p className="sod29-golden-mode-note">קריאת המחקר אינה זמינה לחשבון זה ({data.researchAccess.reason}).</p> : null}
              {data.researchSourceAccess?.available === false ? <p className="sod29-golden-mode-note">דברי המקור המלאים אינם זמינים לחשבון זה ({data.researchSourceAccess.reason}). הממצאים עצמם נשארים מוצגים.</p> : null}
              {data.truncatedNumbers?.length ? <p className="sod29-golden-mode-note">הגעתי לגבול העמוד עבור {data.truncatedNumbers.join(", ")} — קיימים פריטים נוספים.</p> : null}
              {(facetControl.hasStructuredFacets || facetControl.hasSourceMethodMentions) ? <div className="sod29-golden-facet-filters" aria-label="סינון מחקר לפי העץ">
                {Object.keys(facetControl.byMethod).length ? <label><span>שיטה מאומתת/מובנית</span><select value={facetFilters.method} onChange={(event) => updateFacet("method", event.target.value)}>
                  <option value="all">כל השיטות המובנות</option>
                  {Object.entries(facetControl.byMethod).map(([method, count]) => <option key={method} value={method}>{method} · {count}</option>)}
                </select></label> : null}
                {Object.keys(facetControl.byOperation).length ? <label><span>פעולה</span><select value={facetFilters.operation} onChange={(event) => updateFacet("operation", event.target.value)}>
                  <option value="all">כל הפעולות</option>
                  {Object.entries(facetControl.byOperation).map(([operation, count]) => <option key={operation} value={operation}>{RESEARCH_OPERATION_LABELS_HE[operation] || "פעולה מחקרית"} · {count}</option>)}
                </select></label> : null}
                {Object.keys(facetControl.byFactor).length ? <label><span>מכפיל</span><select value={facetFilters.factor} onChange={(event) => updateFacet("factor", event.target.value)}>
                  <option value="all">כל המכפילים</option>
                  {Object.entries(facetControl.byFactor).sort((a, b) => Number(a[0]) - Number(b[0])).map(([factor, count]) => <option key={factor} value={factor}>×{factor} · {count}</option>)}
                </select></label> : null}
                {facetControl.spatial3d ? <label><span>מבנה</span><select value={facetFilters.spatial} onChange={(event) => updateFacet("spatial", event.target.value)}>
                  <option value="all">כל המבנים</option>
                  <option value="3d">תלת־ממד · {facetControl.spatial3d}</option>
                </select></label> : null}
                {Object.keys(facetControl.byFamily).length ? <label><span>סט מחקרי</span><select value={facetFilters.family} onChange={(event) => updateFacet("family", event.target.value)}>
                  <option value="all">כל הסטים</option>
                  {Object.entries(facetControl.byFamily).map(([key, family]) => <option key={key} value={key}>{family.label} · {family.count}</option>)}
                </select></label> : null}
                {facetControl.hasStructuredFacets ? <button type="button" onClick={resetFacets}>אפס סינון</button> : null}
                {Object.keys(facetControl.bySourceMethod || {}).length ? <small>
                  שיטות שנאמרו במקור בלבד (לא פילטר חישובי עד קישור/אימות): {Object.entries(facetControl.bySourceMethod).map(([method, count]) => `${method} · ${count} מקורות`).join(" · ")}
                </small> : null}
                <small>{filteredResearchItems.length} מתוך {researchItems.length} ממצאי מחקר</small>
              </div> : null}
              {Object.values(ADMIN_LAYER).map((key) => <AdminLayer key={key} layerKey={key} items={key === ADMIN_LAYER.RESEARCH ? filteredResearchItems : (data.layers[key] || [])} />)}
            </div>}
  </section>;
}
