import React, { useEffect, useMemo, useRef, useState } from "react";

export default function ConvergenceGolden2029({ scene, motion }) {
  const nodes=Array.isArray(scene?.sceneNodes)?scene.sceneNodes:[];
  const routes=nodes.filter((node)=>node.kind==="convergence_route");
  const valueNode=nodes.find((node)=>node.kind==="number");
  const [revealed,setRevealed]=useState(routes.length);
  const [converged,setConverged]=useState(true);
  const [playing,setPlaying]=useState(false);
  const timers=useRef([]);

  const routeCueTimes=useMemo(
    ()=>Array.isArray(motion?.cues)
      ? motion.cues.filter((cue)=>cue.action==="reveal_route").map((cue)=>cue.at)
      : [],
    [motion]
  );
  const convergeAt=useMemo(
    ()=>Array.isArray(motion?.cues)
      ? (motion.cues.find((cue)=>cue.action==="converge")?.at??null)
      : null,
    [motion]
  );

  useEffect(()=>()=>timers.current.forEach(clearTimeout),[]);

  if(!valueNode||routes.length<2||routes.some((route)=>route?.ref?.engineTrace?.engine_verified!==true)){
    return <section className="sod29-convergence" dir="rtl" data-state="unverified" aria-live="polite">
      <p>ממתין למסלולים מאומתים.</p>
    </section>;
  }

  const revealAll=()=>{
    timers.current.forEach(clearTimeout);
    timers.current=[];
    setPlaying(false);
    setRevealed(routes.length);
    setConverged(true);
  };

  const play=()=>{
    timers.current.forEach(clearTimeout);
    timers.current=[];
    setPlaying(true);
    setRevealed(0);
    setConverged(false);

    const reduced=typeof window!=="undefined"&&window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if(reduced){
      revealAll();
      return;
    }

    routes.forEach((route,index)=>{
      const at=Number(routeCueTimes[index]??(500+index*900));
      timers.current.push(setTimeout(()=>setRevealed(index+1),at));
    });
    const finishAt=Number(convergeAt??(900+routes.length*900));
    timers.current.push(setTimeout(()=>{
      setConverged(true);
      setPlaying(false);
    },finishAt));
  };

  return <section
    className="sod29-convergence"
    dir="rtl"
    data-experience-capability="convergence-1237"
    data-playing={playing?"true":"false"}
    data-converged={converged?"true":"false"}
    aria-label={"התכנסות של "+routes.length+" מסלולים לערך "+valueNode.label}
  >
    <header>
      <small>CONVERGENCE · שלושה מסלולים, נקודת מפגש אחת</small>
      <h2>{valueNode.label}</h2>
      <p>כל מסלול מחושב בנפרד. ההמחשה מחברת את התוצאות — היא אינה יוצרת אותן.</p>
    </header>

    <div className="sod29-convergence__stage">
      <div className="sod29-convergence__routes" role="list">
        {routes.map((route,index)=><article
          className="sod29-convergence__route"
          role="listitem"
          key={route.id}
          data-visible={index<revealed?"true":"false"}
          style={{"--route-index":index}}
        >
          <span>{route.subtitle}</span>
          <strong>{route.label}</strong>
          <b>{route.ref?.engineTrace?.value}</b>
        </article>)}
      </div>

      <div className="sod29-convergence__core" data-active={converged?"true":"false"} aria-label={"נקודת המפגש "+valueNode.label}>
        <span>נקודת מפגש</span>
        <strong>{valueNode.label}</strong>
      </div>
    </div>

    <div className="sod29-convergence__actions">
      <button type="button" onClick={play} disabled={playing}>הפעל גילוי</button>
      <button type="button" onClick={revealAll}>הצג הכול</button>
    </div>

    <p className="sod29-convergence__truth-note">התכנסות = שוויון תוצאות בין מסלולים מאומתים. היא אינה ציון אמת ואינה הופכת פרשנות לעובדה.</p>
  </section>;
}
