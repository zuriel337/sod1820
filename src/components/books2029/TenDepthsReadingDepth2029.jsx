import React,{useEffect,useMemo,useRef,useState} from 'react';
import {bindDepthsReadingDepth,DEPTHS_READING_ASSET,DEPTHS_DEFAULT_READING} from './tenDepthsReadingDepthData2029.js';

export default function TenDepthsReadingDepth2029({bundle,model,selectedId,readingId,focusRevision=0,onReading,onComponent,onSource,onModel}){
  const [content,setContent]=useState(null),[error,setError]=useState(false),[attempt,setAttempt]=useState(0),[zoom,setZoom]=useState(false);
  const readingHeading=useRef(null),focusRequested=useRef(false);
  useEffect(()=>{
    const controller=new AbortController();setError(false);
    fetch(DEPTHS_READING_ASSET,{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('unavailable');return r.json();}).then(data=>{if(!data||typeof data!=='object')throw Error('invalid_content');if(!controller.signal.aborted)setContent(data);}).catch(e=>{if(e.name!=='AbortError')setError(true);});
    return()=>controller.abort();
  },[attempt]);
  const bound=useMemo(()=>{if(!content)return {};try{return {data:bindDepthsReadingDepth(content,bundle)};}catch{return {invalid:true};}},[content,bundle]);
  const data=bound.data,active=data?.readings.find(r=>r.id===(readingId||DEPTHS_DEFAULT_READING));
  useEffect(()=>setZoom(false),[readingId]);
  useEffect(()=>{if(active&&(focusRevision||focusRequested.current)){readingHeading.current?.focus();focusRequested.current=false;}},[active?.id,focusRevision]);
  const chooseReading=id=>{focusRequested.current=true;onReading(id);if(id===active?.id)readingHeading.current?.focus();};
  if(error||bound.invalid)return <section className="dw-depth-reading" aria-label="קריאת עומק ופירושים"><p role="alert">קריאת העומק לא נטענה ממקור מתאים. עמוד המקור נשאר נגיש.</p><button type="button" onClick={()=>{setContent(null);setAttempt(a=>a+1);}}>נסה שוב</button></section>;
  if(!data)return <p role="status">פותחים את קריאת העומק…</p>;
  if(!active)return <section className="dw-depth-reading" aria-label="קריאת עומק ופירושים"><p role="alert">הקטע שבקישור אינו שייך לקריאת העומק הזאת.</p><button type="button" onClick={()=>onReading(DEPTHS_DEFAULT_READING)}>פתח את קטע המשנה</button></section>;
  const selected=model.components.find(c=>c.stable_id===selectedId||c.id===selectedId)||model.components.find(c=>c.id==='up');
  const explanation=data.component_explanations.find(e=>e.component_id===selected.id);
  return <section className="dw-depth-reading" aria-label="קריאת עומק ופירושים" data-reading-id={active.id}>
    <header><span>ספר יצירה · קריאה מתוך עמוד 53</span><h2>לקרוא מעבר לתרשים</h2><p>לשון המשנה, פירושים מודפסים והסבר נלווה — כל קול במקומו.</p></header>
    <nav className="dw-reading-voices" aria-label="בחירת קטע ופירוש">{data.readings.map(r=><button type="button" key={r.id} aria-pressed={active.id===r.id} onClick={()=>chooseReading(r.id)}><span>{r.source_layer==='book_text'?'המשנה':'פירוש מודפס'}</span><strong>{r.voice_he}</strong></button>)}</nav>
    <article className="dw-printed-reading">
      <header><span>{active.source_layer==='book_text'?'דברי הספר · תקציר':'תקציר פירוש מודפס'} · {active.voice_he}</span><h3 ref={readingHeading} tabIndex={-1}>{active.title_he}</h3><p>{active.content.summary}</p></header>
      <div className="dw-reading-source-tools"><span>דברי הספר · צילום הקטע</span><button type="button" aria-pressed={zoom} onClick={()=>setZoom(v=>!v)}>{zoom?'התאם את הקטע לרוחב':'הגדל את צילום הקטע'}</button></div>
      <div className="dw-reading-crop-scroll" tabIndex={0} role="region" aria-label={`צילום הקטע של ${active.voice_he}, גלילה במקלדת או במגע`}>
        <svg role="img" aria-label={`צילום המקור: ${active.title_he}`} viewBox={`${active.crop.x} ${active.crop.y} ${active.crop.width} ${active.crop.height}`} style={{width:zoom?'175%':'100%'}}><image href={data.image} width={data.image_width} height={data.image_height}/></svg>
      </div>
      <div className="dw-reading-quotes"><span>מילים שנקראו במקור</span>{active.content.exact_short_quotes.map(q=><q key={q}>{q}</q>)}</div>
      <button className="dw-reading-open-source" type="button" onClick={()=>onSource(active)}>פתח את עמוד המקור המלא · PDF {active.source.pdf_page}</button>
      <section className="dw-reading-companion" aria-label="הסבר נלווה לקטע"><span>הסבר נלווה</span>{active.companion_paragraphs_he.map((p,i)=><p key={i}>{p}</p>)}</section>
      <section className="dw-reading-questions" aria-label="שאלות לקריאה"><h4>לשים לב בזמן הקריאה</h4><ul>{active.questions_he.map(q=><li key={q}>{q}</li>)}</ul></section>
      <details><summary>פרטי המקור</summary><p>{active.source.page_region} · עמוד PDF {active.source.pdf_page}</p><p>הציטוטים קצרים ותחומים. התקציר וההסבר הנלווה אינם תעתיק מלא של הפירוש.</p><ul>{active.unresolved.map(g=><li key={g}>{g}</li>)}</ul><p>המחשה וקריאה מתוך המקור; לא בוצע אימות במנוע.</p></details>
    </article>
    <section className="dw-component-depth" aria-label="עומק הקריאה ברכיב הנבחר"><span>הסבר נלווה · לבחור מילה ברשימה</span><div className="dw-depth-word-grid">{model.components.map(c=><button key={c.id} type="button" aria-pressed={c.id===selected.id} onClick={()=>onComponent(c)}>{c.label_he}</button>)}</div><h3>{explanation.title_he}</h3><p>{explanation.explanation_he}</p><p className="dw-reading-question">{explanation.question_he}</p><button type="button" onClick={()=>onModel(selected)}>חזור לרכיב במבנה</button></section>
    <section className="dw-reading-diagrams" aria-label="מבני מהלך והשוואה">{data.reading_structures.map(diagram=><article key={diagram.id} data-reading-diagram={diagram.id}><span>{diagram.representation_label}</span><h3>{diagram.title_he}</h3><ol>{diagram.steps_he.map((step,i)=><li key={step}><b>{i+1}</b><span>{step}</span></li>)}</ol><p>{diagram.explanation_he}</p><div>{diagram.reading_ids.map(id=><button type="button" key={id} onClick={()=>chooseReading(id)}>קרא: {data.readings.find(r=>r.id===id).voice_he}</button>)}</div></article>)}</section>
  </section>;
}
