import React, { useMemo, useState } from "react";
import "./numberDeepView2029.css";

function truthLabel(cluster) {
  const text = ((cluster?.truthClass || "") + " " + (cluster?.why || "")).toLowerCase();
  if (text.includes("textual")) return "מנוע + מקור";
  if (text.includes("orthographic")) return "טרנספורמציה";
  if (text.includes("deterministic") || text.includes("arithmetic") || text.includes("system method")) return "מבנה מתמטי";
  return cluster?.kind === "primary" ? "ממצא מוביל" : "מחקר משני";
}

function ClusterCard({ cluster, onOpenHeichal, root }) {
  return (
    <article className="sod29-deep-cluster" data-cluster-key={cluster.key || ""}>
      <div className="sod29-deep-cluster-head">
        <span>{truthLabel(cluster)}</span>
        <strong>{cluster.title}</strong>
      </div>
      {cluster.facts?.length ? (
        <ul>
          {cluster.facts.slice(0, 5).map((fact) => <li key={fact}>{fact}</li>)}
        </ul>
      ) : null}
      {cluster.boundary ? <p>{cluster.boundary}</p> : cluster.why ? <p>{cluster.why}</p> : null}
      {onOpenHeichal ? <button
        type="button"
        onClick={() => onOpenHeichal({
          kind: "deep_view_cluster",
          root,
          clusterKey: cluster.key || null,
          title: cluster.title,
          facts: cluster.facts || [],
        })}
      >
        ◇ בדוק בהיכל
      </button> : null}
    </article>
  );
}

function EvidenceStrip({ evidence }) {
  if (!evidence?.available) return (
    <div className="sod29-deep-access-note">
      נתוני האמינות אינם זמינים בהרשאה הנוכחית. הדף לא ממציא ספירה חלופית.
    </div>
  );

  return (
    <div className="sod29-deep-evidence" aria-label="סיכום אמינות מחקרית">
      <article><span>נמצאו</span><strong>{evidence.raw ?? "—"}</strong><small>ביטויים גולמיים</small></article>
      <article className="is-independent"><span>עצמאיים</span><strong>{evidence.independent ?? "—"}</strong><small>יחידות ראיה אחרי נרמול</small></article>
      <article><span>תלויים</span><strong>{evidence.dependent ?? "—"}</strong><small>נשארים גלויים, בלי משקל חדש</small></article>
      <article><span>שיטות P1</span><strong>{evidence.independentP1Methods ?? "—"}</strong><small>משפחות שיטה עצמאיות</small></article>
    </div>
  );
}

export default function NumberDeepView2029({ model, onOpenHeichal, onRazielAction } = {}) {
  const [showSecondary, setShowSecondary] = useState(false);
  const [showDeep, setShowDeep] = useState(false);
  const relationRows = useMemo(() => Object.entries(model?.frozenRelationCounts || {}), [model?.frozenRelationCounts]);

  if (!model) return null;

  return (
    <section className="sod29-section sod29-number-deep-view" id="number-deep-view" data-number-deep-view="v1" data-contract-available={model.contractAvailable ? "true" : "false"}>
      <header className="sod29-number-deep-head">
        <div>
          <div className="sod29-kicker">RESEARCH MAP · DEPENDENCY AWARE</div>
          <h2>מפת המחקר של {model.root}</h2>
          <p>קודם המבנים העצמאיים, אחר כך הקשרים המשניים, ורק בעומק כל ההתאמות הגולמיות. זו הקרנת מחקר — לא ציון אמת.</p>
        </div>
        {onOpenHeichal ? <button
          type="button"
          className="sod29-action primary"
          onClick={() => onOpenHeichal({
            kind: "number_deep_view",
            root: model.root,
            sourceResearchObjectId: model.sourceResearchObjectId,
            primaryClusters: model.primary.map((cluster) => cluster.key).filter(Boolean),
          })}
        >◇ פתח בהיכל</button> : null}
      </header>

      <EvidenceStrip evidence={model.evidence} />

      {model.contractAvailable ? (
        <>
          <div className="sod29-number-deep-tier-head">
            <div><span>S2 · PRIMARY</span><strong>מה באמת מוביל את המחקר</strong></div>
            <small>{model.primary.length} מבנים רלוונטיים למספר הזה</small>
          </div>

          {model.primary.length ? (
            <div className="sod29-number-deep-cluster-grid">
              {model.primary.map((cluster) => <ClusterCard key={cluster.key || cluster.title} cluster={cluster} root={model.root} onOpenHeichal={onOpenHeichal} />)}
            </div>
          ) : (
            <div className="sod29-deep-access-note">החוזה זמין, אבל אין כרגע מבנה PRIMARY שמזכיר ישירות את {model.root}. החומר נשאר זמין בעומק.</div>
          )}

          {model.secondary.length ? (
            <div className="sod29-number-deep-disclosure">
              <button type="button" aria-expanded={showSecondary} onClick={() => setShowSecondary((value) => !value)}>
                <span>S3 · קשרים משניים עם בקרות</span>
                <strong>{showSecondary ? "סגור" : "פתח " + model.secondary.length + " מבנים"}</strong>
              </button>
              {showSecondary ? (
                <div className="sod29-number-deep-cluster-grid is-secondary">
                  {model.secondary.map((cluster) => <ClusterCard key={cluster.key || cluster.title} cluster={cluster} root={model.root} onOpenHeichal={onOpenHeichal} />)}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="sod29-number-deep-disclosure">
            <button type="button" aria-expanded={showDeep} onClick={() => setShowDeep((value) => !value)}>
              <span>DEEP / TRACE · למה זה נספר ככה?</span>
              <strong>{showDeep ? "סגור עומק" : "פתח בקרות ותלויות"}</strong>
            </button>

            {showDeep ? (
              <div className="sod29-number-deep-raw">
                {model.dependentFamilies.length ? (
                  <section>
                    <h3>משפחות תלויות במספר הזה</h3>
                    <div className="sod29-number-deep-family-list">
                      {model.dependentFamilies.map((family, index) => (
                        <article key={family.familyKey || index}>
                          <strong>{family.phrases.join(" ↔ ")}</strong>
                          <small>
                            {family.collapsedDelta ? family.collapsedDelta + " התאמות אינן מוסיפות משקל חדש" : "תלות מבנית"}
                            {family.method ? " · " + family.method : ""}
                          </small>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}

                {relationRows.length ? (
                  <section>
                    <h3>יחסים מכוילים</h3>
                    <div className="sod29-number-deep-relation-list">
                      {relationRows.slice(0, 6).map(([label, info]) => (
                        <div key={label}>
                          <strong>{label}</strong>
                          <span>{info?.effective_method_families ?? "—"} משפחות עצמאיות</span>
                          <small>{info?.role || "ממצא מחקר"}</small>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {model.controls.length ? (
                  <section><h3>בקרות</h3><ul>{model.controls.slice(0, 7).map((control) => <li key={control}>{control}</li>)}</ul></section>
                ) : null}

                <div className="sod29-number-deep-actions">
                  {onOpenHeichal ? <button type="button" onClick={() => onOpenHeichal({ kind: "inspect_dependency", root: model.root, sourceResearchObjectId: model.sourceResearchObjectId })}>למה זה נספר פעם אחת?</button> : null}
                  <button type="button" onClick={() => onRazielAction?.("explain_deep_view", { kind: "number_deep_view", root: model.root, evidence: model.evidence, dependentFamilies: model.dependentFamilies })}>✦ הסבר עם רזיאל</button>
                </div>
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <div className="sod29-deep-access-note">חוזה המחקר העמוק אינו קריא בהרשאה הנוכחית. ספירת האמינות נשארת גלויה אם היא ציבורית, אבל תוכן מחקר פרטי אינו מוקרן לדף.</div>
      )}
    </section>
  );
}
