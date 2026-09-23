import React, { useEffect, useMemo } from "react";
import Sod2029Shell, { use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { applySeo } from "../lib/seo.js";
import { synthesis1820PreviewProjection } from "../lib/research/synthesis1820Preview.js";
import "./synthesisPreview2029.css";

function LegacyCard({ legacy }) {
  return <article className="sod29-synth-card is-legacy" aria-label="הניתוח הקיים">
    <div className="sod29-synth-card-head">
      <div>
        <div className="sod29-kicker">TODAY · LEGACY SNAPSHOT</div>
        <h2>{legacy.title}</h2>
        <p>{legacy.subtitle}</p>
      </div>
      <span className="sod29-chip">היום</span>
    </div>

    <div className="sod29-synth-anchor">
      <small>עוגן מקומי</small>
      <strong>{legacy.anchor}</strong>
    </div>

    <p className="sod29-synth-message">{legacy.message}</p>

    <div className="sod29-synth-evidence">
      {legacy.evidence.map((item) => <span key={item}>{item}</span>)}
    </div>

    <div className="sod29-synth-boundary">
      <b>מה קורה מתחת</b>
      <p>עוגן + ביטויים מובילים → AI מחבר סיפור. זו בדיוק הצורה שאנחנו רוצים לשמר, אבל לא את סמכות־המשמעות המקומית.</p>
    </div>
  </article>;
}

function SynthesisCard({ preview, onRaziel }) {
  const { synthesis, display } = preview;
  return <article className="sod29-synth-card is-2029" aria-label="Synthesis 2029 preview">
    <div className="sod29-synth-card-head">
      <div>
        <div className="sod29-kicker">SYNTHESIS 2029 · GOLDEN PREVIEW</div>
        <h2>ניתוח AI למספר 1820</h2>
        <p>אותה שפה ציורית · מנוע מחקר מנורמל מתחת</p>
      </div>
      <span className="sod29-chip">2029</span>
    </div>

    <div className="sod29-synth-primary">
      <small>המוטיב המרכזי</small>
      <strong>{display.primary_motif}</strong>
    </div>

    <p className="sod29-synth-message">{synthesis.message}</p>

    <section className="sod29-synth-proof" aria-label="למה המנוע אומר את זה">
      <div className="sod29-synth-subhead">
        <b>✦ נבדק בתוך ה־Preview</b>
        <span>לא ציון אמת</span>
      </div>
      {display.anchors.map((anchor) => <div className="sod29-synth-proof-row" key={anchor}>
        <span aria-hidden="true">✓</span>
        <p>{anchor}</p>
      </div>)}
    </section>

    <section className="sod29-synth-controls" aria-label="בקרות">
      <b>מה המנוע כבר לא סופר אוטומטית</b>
      <div>
        {display.controls.map((item) => <span key={item}>{item}</span>)}
      </div>
    </section>

    <div className="sod29-synth-alt">
      <small>קריאה חלופית</small>
      <p>{display.alternative}</p>
    </div>

    <div className="sod29-actions">
      <button className="sod29-action primary" type="button" onClick={onRaziel}>✦ פתח את אותו Synthesis ברזיאל</button>
      <a className="sod29-action" href="/2029/number/1820">פתח את דף 1820 הקיים ב־2029</a>
    </div>
  </article>;
}

function PreviewBody() {
  const shell = use2029Shell();
  const research = useResearch();
  const preview = useMemo(() => synthesis1820PreviewProjection(), []);

  useEffect(() => {
    const current = research.context || {};
    const same = current?.subject?.type === "number" && String(current?.subject?.id) === "1820";
    if (same && current?.dimensions?.synthesisGoldenPreview === preview.preview_version) return;

    research.setResearchContext?.({
      subject: { id: "1820", type: "number", label: "1820", href: "/2029/number/1820" },
      selection: { entityId: "1820", entityType: "number" },
      lens: "number",
      locale: "he",
      returnTo: current?.returnTo || null,
      journey: current?.journey || null,
      dimensions: {
        ...(current?.dimensions || {}),
        synthesisGoldenPreview: preview.preview_version,
      },
    });
  }, [preview, research]);

  const openRaziel = () => {
    shell.openRaziel({
      razielMicroIntent: "synthesis_preview",
      numberCoreFocus: {
        root: 1820,
        expression: "1820",
        method: "synthesis-preview",
        result: 1820,
        preview: true,
      },
      synthesisPreview: preview.synthesis,
    });
  };

  return <>
    <section className="sod29-synth-intro">
      <div>
        <div className="sod29-kicker">GOLDEN VISUAL · OLD → NEW</div>
        <h1>{preview.display.title}</h1>
        <p>{preview.display.subtitle}</p>
      </div>
      <span className="sod29-chip">{preview.display.preview_notice}</span>
    </section>

    <section className="sod29-synth-grid" aria-label="השוואת ניתוח ישן מול Synthesis 2029">
      <LegacyCard legacy={preview.legacy} />
      <SynthesisCard preview={preview} onRaziel={openRaziel} />
    </section>

    <section className="sod29-synth-note">
      <b>מה אנחנו בודקים כאן?</b>
      <p>רק את חוויית ההגשה ואת זה שדף ורזיאל צורכים אותו Synthesis. ה־fixture אינו live research result, אינו public truth ואינו מחליף את דף המספר. אחרי אישור חזותי נחבר Result Bundle/Synthesis runtime אמיתי.</p>
    </section>
  </>;
}

export default function SynthesisPreview2029Page() {
  useEffect(() => {
    applySeo({
      title: "1820 · Synthesis 2029 Preview · SOD1820",
      description: "Golden branch-only preview: ניתוח 1820 הישן מול Synthesis 2029.",
      path: "/2029/preview/synthesis/1820",
      noindex: true,
    });
  }, []);

  return <Sod2029Shell
    surface="number"
    symbol="✦"
    eyebrow="PREVIEW · SYNTHESIS · RAZIEL"
    title="1820 · Preview"
    description="אותו קול ואותה שפה ציורית — עם חוזה Synthesis אחד מתחת לדף ולרזיאל."
  >
    <PreviewBody />
  </Sod2029Shell>;
}
