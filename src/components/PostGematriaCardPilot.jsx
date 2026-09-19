import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import GematriaCard from "./GematriaCard.jsx";
import { fetchGematriaMethodStates } from "../lib/research/gematriaMethodRegistry.js";
import { fetchNumberMethodProfile } from "../lib/research/numberCoreProjection.js";
import { buildGematriaPresentationModel } from "../lib/presentation/gematriaPresentation.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import "./postGematriaCardPilot.css";

export const GOLDEN_POST_GEMATRIA_PILOT_SLUG = "צופן-חותים-5784";

const clean = (value) => value == null ? "" : String(value).trim();

function parseLegacyEqualityBox(box) {
  const row = clean(box?.querySelector?.(".gb-rows")?.textContent);
  if (!row) return null;
  const parts = row.split("=").map(clean).filter(Boolean);
  if (parts.length < 3) return null;
  const value = Number(parts[0].replace(/[^0-9-]/g, ""));
  const expressions = parts.slice(1).filter((item) => /[א-ת]/.test(item));
  if (!Number.isSafeInteger(value) || expressions.length < 2) return null;
  return { value, expressions };
}

function profileMethod(profile, methodKey) {
  return (Array.isArray(profile) ? profile : []).find((row) => row?.methodKey === methodKey) || null;
}

export default function PostGematriaCardPilot({
  enabled = false,
  postSlug = "",
  postTitle = "",
  contentRootRef,
  navigate,
}) {
  const research = useResearch();
  const [mountNode, setMountNode] = useState(null);
  const [data, setData] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState("רגיל");

  useEffect(() => {
    if (!enabled || postSlug !== GOLDEN_POST_GEMATRIA_PILOT_SLUG) return undefined;
    const root = contentRootRef?.current;
    const box = root?.querySelector?.(".sod-gematria-box");
    if (!box) return undefined;

    const parsed = parseLegacyEqualityBox(box);
    if (!parsed) return undefined;

    let cancelled = false;
    let mount = null;

    Promise.all([
      fetchGematriaMethodStates(),
      ...parsed.expressions.map((expression) => fetchNumberMethodProfile(expression)),
    ]).then(([methodStates, ...profiles]) => {
      if (cancelled) return;

      const regularRows = profiles.map((profile) => profileMethod(profile, "רגיל"));
      const allVerified = regularRows.every((row) => Number(row?.computedValue) === parsed.value);
      if (!allVerified) return;

      mount = document.createElement("div");
      mount.className = "sod-gematria-card-pilot-mount";
      mount.dataset.gematriaCardPilotMount = "true";
      box.classList.add("is-gematria-card-pilot");
      box.appendChild(mount);

      const contextMethod = clean(research?.context?.dimensions?.gematriaMethod);
      const contextExpression = clean(research?.context?.dimensions?.gematriaExpression);
      const initialMethod = contextExpression === parsed.expressions[0] && contextMethod
        ? contextMethod
        : "רגיל";

      setSelectedMethod(initialMethod);
      setData({
        expectedValue: parsed.value,
        expressions: parsed.expressions,
        profiles,
        methodStates,
      });
      setMountNode(mount);
    }).catch(() => {
      // Fail closed: legacy box remains untouched.
    });

    return () => {
      cancelled = true;
      setMountNode(null);
      setData(null);
      if (box) box.classList.remove("is-gematria-card-pilot");
      if (mount?.parentNode) mount.parentNode.removeChild(mount);
    };
  }, [enabled, postSlug, contentRootRef]); // eslint-disable-line react-hooks/exhaustive-deps

  const model = useMemo(() => {
    if (!data?.profiles?.length) return null;
    const activeProfile = data.profiles[0];
    const activeRow = profileMethod(activeProfile, selectedMethod)
      || profileMethod(activeProfile, "רגיל")
      || activeProfile[0]
      || null;
    if (!activeRow) return null;

    const rawActiveValue = activeRow.computedValue;
    const activeValue = rawActiveValue == null || rawActiveValue === ""
      ? null
      : Number.isFinite(Number(rawActiveValue))
        ? Number(rawActiveValue)
        : null;
    const peerExpressions = data.expressions.map((expression, index) => {
      const row = profileMethod(data.profiles[index], activeRow.methodKey);
      return {
        expression,
        value: row?.computedValue ?? null,
        methodKey: activeRow.methodKey,
        verified: activeValue != null
          && row?.computedValue != null
          && Number(row.computedValue) === activeValue,
        verificationState: activeValue != null
          && row?.computedValue != null
          && Number(row.computedValue) === activeValue
            ? "match"
            : "different_value",
      };
    });

    return buildGematriaPresentationModel({
      expression: data.expressions[0],
      numberRoot: activeValue,
      focusKind: "expression",
      activeMethodKey: activeRow.methodKey,
      methodProfile: activeProfile,
      methodStates: data.methodStates,
      peerExpressions,
      researchContextRef: research?.context || null,
    });
  }, [data, selectedMethod, research?.context]);

  if (!enabled || !mountNode || !model) return null;

  const expression = model.subject?.expressionRaw || data?.expressions?.[0] || "";

  const updateMethod = (methodKey) => {
    setSelectedMethod(methodKey);
    const dimensions = {
      gematriaExpression: expression,
      gematriaMethod: methodKey,
      gematriaSurface: "post",
    };
    if (research?.context?.subject) {
      research.updateResearchContext?.({ lens: "post", dimensions });
    } else {
      research.setResearchContext?.({
        subject: {
          id: postSlug,
          type: "post",
          label: postTitle || postSlug,
          href: `/${postSlug}`,
        },
        selection: { entityId: expression, entityType: "phrase" },
        lens: "post",
        dimensions,
      });
    }
  };

  const openFull = () => {
    updateMethod(model.activeMethod?.methodKey || selectedMethod);
    navigate?.(`/number/${encodeURIComponent(expression)}`);
  };

  return createPortal(
    <GematriaCard
      model={model}
      surface="post"
      onMethodSelect={updateMethod}
      onOpenFull={openFull}
    />,
    mountNode,
  );
}
