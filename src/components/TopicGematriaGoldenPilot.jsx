import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import GematriaCard from "./GematriaCard.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import {
  GOLDEN_TOPIC_GEMATRIA_SLUG,
  buildGoldenTopicGematriaModel,
  fetchGoldenTopicGematriaCalibration,
} from "../lib/research/topicGematriaGoldenProjection.js";
import "./topicGematriaGoldenPilot.css";

const clean = (value) => value == null ? "" : String(value).trim();

function topicArticle(slug) {
  if (typeof document === "undefined") return null;
  const article = document.querySelector(".sod29-topic2029[data-canonical-slug]");
  return article?.dataset?.canonicalSlug === slug ? article : null;
}

function makeMount(slug) {
  const article = topicArticle(slug);
  const intro = article?.querySelector?.(".sod29-topic-intro");
  if (!article || !intro) return null;
  const existing = article.querySelector('[data-gematria-topic-golden-mount="true"]');
  if (existing) return existing;

  const node = document.createElement("div");
  node.className = "sod29-topic-gematria-golden-mount";
  node.dataset.gematriaTopicGoldenMount = "true";
  intro.insertAdjacentElement("afterend", node);
  return node;
}

export { GOLDEN_TOPIC_GEMATRIA_SLUG };

export default function TopicGematriaGoldenPilot({
  enabled = false,
  topicSlug = "",
}) {
  const navigate = useNavigate();
  const research = useResearch();
  const [mountNode, setMountNode] = useState(null);
  const [calibration, setCalibration] = useState(null);
  const [activeExpression, setActiveExpression] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("רגיל");

  useEffect(() => {
    if (!enabled || topicSlug !== GOLDEN_TOPIC_GEMATRIA_SLUG) {
      setCalibration(null);
      return undefined;
    }

    let alive = true;
    fetchGoldenTopicGematriaCalibration(topicSlug)
      .then((data) => {
        if (!alive || !data) return;
        setCalibration(data);
        setActiveExpression(data.primaryAxis?.expressions?.[0]?.expression || "");
        setSelectedMethod("רגיל");
      })
      .catch(() => {
        // Fail closed: the native Topic remains untouched.
      });

    return () => { alive = false; };
  }, [enabled, topicSlug]);

  useEffect(() => {
    if (!enabled || topicSlug !== GOLDEN_TOPIC_GEMATRIA_SLUG) {
      setMountNode(null);
      return undefined;
    }

    let cancelled = false;
    let ownedNode = null;

    const tryMount = () => {
      if (cancelled) return true;
      const node = makeMount(topicSlug);
      if (!node) return false;
      ownedNode = node;
      setMountNode(node);
      return true;
    };

    if (!tryMount()) {
      const observer = new MutationObserver(() => {
        if (tryMount()) observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
      return () => {
        cancelled = true;
        observer.disconnect();
        setMountNode(null);
        if (ownedNode?.parentNode) ownedNode.parentNode.removeChild(ownedNode);
      };
    }

    return () => {
      cancelled = true;
      setMountNode(null);
      if (ownedNode?.parentNode) ownedNode.parentNode.removeChild(ownedNode);
    };
  }, [enabled, topicSlug]);

  const model = useMemo(() => {
    if (!calibration) return null;
    return buildGoldenTopicGematriaModel(calibration, {
      expression: activeExpression,
      methodKey: selectedMethod,
      researchContextRef: research?.context || null,
    });
  }, [calibration, activeExpression, selectedMethod, research?.context]);

  if (!enabled || !mountNode || !calibration || !model) return null;

  const updateResearchContext = (expression, methodKey) => {
    research?.updateResearchContext?.({
      lens: "topic",
      dimensions: {
        gematriaExpression: expression,
        gematriaMethod: methodKey,
        gematriaSurface: "topic-golden",
        gematriaTopicAxis: calibration.primaryAxis.value,
      },
    });
  };

  const selectExpression = (expression) => {
    const next = clean(expression);
    if (!next) return;
    setActiveExpression(next);
    setSelectedMethod("רגיל");
    updateResearchContext(next, "רגיל");
  };

  const selectMethod = (methodKey) => {
    const next = clean(methodKey) || "רגיל";
    setSelectedMethod(next);
    updateResearchContext(activeExpression, next);
  };

  const openFull = () => {
    const value = Number(model?.activeMethod?.value);
    if (!Number.isSafeInteger(value)) return;
    updateResearchContext(activeExpression, model.activeMethod?.methodKey || selectedMethod);
    navigate("/2029/number/" + value);
  };

  const rows = calibration.primaryAxis.expressions;

  return createPortal(
    <section
      className="sod29-topic-gematria-golden"
      data-gematria-topic-golden="v1"
      aria-label="Golden Gematria Topic calibration"
      dir="rtl"
    >
      <header className="sod29-topic-gematria-golden__head">
        <div>
          <div className="sod29-kicker">GEMATRIA MAP · GOLDEN</div>
          <h2>הצירים המספריים של הטופיק</h2>
          <p>
            שוויונות חישוביים מאומתים מוצגים בנפרד מהמשמעות והפרשנות של הטופיק.
          </p>
        </div>
        <span className="sod29-topic-gematria-golden__verified">
          ✓ {rows.length} שוויונות מאומתים
        </span>
      </header>

      <div className="sod29-topic-gematria-golden__axes" aria-label="צירים מספריים">
        <button type="button" className="is-primary" aria-pressed="true">
          <strong>{calibration.primaryAxis.value}</strong>
          <span>רגיל · {rows.length} ביטויים מאומתים</span>
        </button>

        {calibration.relatedAxes.map((axis) => (
          <button
            type="button"
            key={axis.value}
            onClick={() => navigate("/2029/number/" + axis.value)}
            title={axis.note || axis.label}
          >
            <strong>{axis.value}</strong>
            <span>{axis.label}</span>
            <small>קשר בטופיק · לא חלק מציר השוויון המאומת</small>
          </button>
        ))}
      </div>

      <div className="sod29-topic-gematria-golden__body">
        <aside className="sod29-topic-gematria-golden__equalities" aria-label="שוויונות מאומתים">
          <div className="sod29-topic-gematria-golden__subhead">
            <span>שוויונות מאומתים · רגיל</span>
            <strong>{calibration.primaryAxis.value}</strong>
          </div>

          <div className="sod29-topic-gematria-golden__equality-list">
            {rows.map((row) => (
              <button
                type="button"
                key={row.expression}
                className={row.expression === activeExpression ? "is-active" : ""}
                onClick={() => selectExpression(row.expression)}
                aria-pressed={row.expression === activeExpression}
              >
                <span>{row.expression}</span>
                <b>= {row.engineValue}</b>
              </button>
            ))}
          </div>
        </aside>

        <div className="sod29-topic-gematria-golden__control">
          <div className="sod29-topic-gematria-golden__control-head">
            <span>CONTROL CARD</span>
            <strong>{activeExpression}</strong>
            <small>בחר שיטה — אותו כרטיס משתנה, הטופיק לא מתארך.</small>
          </div>

          <GematriaCard
            model={model}
            surface="topic"
            onMethodSelect={selectMethod}
            onOpenFull={openFull}
          />
        </div>
      </div>

      <footer className="sod29-topic-gematria-golden__truth">
        <span>חישוב</span>
        <strong>מאומת במנוע הקנוני</strong>
        <span>פרשנות</span>
        <strong>נשארת חומר מחקר של הטופיק</strong>
      </footer>
    </section>,
    mountNode,
  );
}
