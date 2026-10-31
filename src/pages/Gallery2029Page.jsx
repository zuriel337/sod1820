import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Sod2029Shell, { FrameState } from "../components/experience2029/Sod2029Shell.jsx";
import CanonicalMediaImage2029 from "../components/experience2029/CanonicalMediaImage2029.jsx";
import ShareActions from "../components/ShareActions.jsx";
import RealityStreamFollow2029 from "../components/research/RealityStreamFollow2029.jsx";
import { RealityRiver2029 } from "../components/research/RealityRiver2029.jsx";
import { worldMediaPublicShare } from "../lib/research/worldFindingShare.js";
import { SourceMethodResearch } from "../components/research/Revelation1237Gate2029.jsx";
import WorldZviSourceFindings2029 from "../components/research/WorldZviSourceFindings2029.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { getImagesByGallery, getGalleriesOverview, getRealityHints, searchArchiveOcrIds } from "../lib/supabase.js";
import { fetchGallerySourceContext } from "../lib/research/entityHubProjection.js";
import { fetchNumberMethodProfile } from "../lib/research/numberCoreProjection.js";
import { resolveTopicExpressionFocus2029 } from "../lib/research/topicExpressionFocus2029.js";
import { numberExpressionFocusHref } from "../lib/research/numberExpressionFocus.js";
import { gatePublicMethodRows, gateSourcePresentation, gateSourceSelectionIsCurrent } from "../lib/research/revelation1237Gate2029.js";
import { buildPublicGalleryCatalog2029, galleryImageDatePresentation, galleryEditorialUpdate2029, galleryReadingFilters2029, projectGalleryReading2029, loadPublicGalleryReading2029, galleryReadingHref2029, gallerySourceHref2029, galleryOccurrenceItem, loadPublicGallerySourceWindow, resolvePublicGallerySelection, loadPublicRealityStream2029 } from "../lib/research/topicSourceContext.js";
import { bilingualDateLabel } from "../lib/relativeTime2029.js";
import { publicMediaCaption, publicMediaTitle } from "../lib/presentation/contentTitle.js";
import { canonicalMediaPublicLabel } from "../lib/presentation/canonicalPresentation.js";
import "./gallery2029.css";

const readWindow = (options) => loadPublicGallerySourceWindow({ ...options,
  listGalleryImages: (id) => getImagesByGallery(id, { publicSourceOnly: true, throwOnError: true }),
  fetchSourceContext: fetchGallerySourceContext });
const ordinaryClick = (event) => !event.defaultPrevented && event.button === 0
  && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
const readingLabel = (item) => canonicalMediaPublicLabel({
  title: publicMediaTitle(item?.legacyPlacement?.originalName),
  description: publicMediaCaption(item?.legacyPlacement?.originalCaption),
}, { fallback: "תמונה מהגלריה" });

function GalleryImageDate({ item }) {
  const date = galleryImageDatePresentation(item);
  return date ? <span className="g29-image-date" title={date.description} aria-label={`${date.kind}: ${date.label}. ${date.description}`}>
    <span>{date.kind}</span><time dir="ltr" dateTime={date.dateTime}>{date.label}</time>
  </span> : <span className="g29-image-date is-unknown">תאריך עדכון לא צוין</span>;
}

function useGalleryReading(search,retry,enabled=true,includeStream=false) {
  const filters=useMemo(()=>galleryReadingFilters2029(search),[search]);
  const [overview,setOverview]=useState({status:'loading'}),[ocr,setOcr]=useState({key:'',status:'ready',rows:[]});
  const [stream,setStream]=useState({status:'loading',items:[]});
  const showStream=enabled&&includeStream&&!filters.q&&!filters.from&&!filters.to&&!filters.year
    &&!filters.kind&&!filters.nums.length;
  useEffect(()=>{
    if(!showStream)return;
    let alive=true;setStream({status:'loading',items:[]});
    // Existing source selector + exact-source admission own all content rules.
    // This surface owns only its async lifecycle and truthful Follow attribution.
    loadPublicRealityStream2029({listHints:getRealityHints,fetchSourceContext:fetchGallerySourceContext})
      .then(result=>{if(alive)setStream({...result,status:'ready'});})
      .catch(()=>{if(alive)setStream({status:'failed',items:[]});});
    return()=>{alive=false;};
  },[showStream,retry]);
  useEffect(()=>{
    if(!enabled)return;
    let alive=true;setOverview({status:'loading'});
    getGalleriesOverview({force:true,publicSourceOnly:true}).then(raw=>{if(alive)setOverview({status:'ready',catalog:buildPublicGalleryCatalog2029(raw)});})
      .catch(()=>{if(alive)setOverview({status:'failed'});});
    return()=>{alive=false;};
  },[retry,enabled]);
  const key=filters.ocr&&filters.q.length>=2?filters.q:'';
  useEffect(()=>{
    if(!enabled)return;
    let alive=true;setOcr({key,status:key?'loading':'ready',rows:[]});
    const timer=key?setTimeout(()=>searchArchiveOcrIds(key,{publicSourceOnly:true}).then(result=>{
      if(alive)setOcr({key,status:'ready',...result});
    }).catch(()=>{if(alive)setOcr({key,status:'failed',rows:[]});}),250):null;
    return()=>{alive=false;clearTimeout(timer);};
  },[key,retry,enabled]);
  const status=overview.status!=='ready'?overview.status:key&&(ocr.key!==key||ocr.status!=='ready')?(ocr.key===key?ocr.status:'loading'):'ready';
  const projection=useMemo(()=>status==='ready'?projectGalleryReading2029(overview.catalog,filters,{ocrIds:ocr.rows.map(r=>r.id),ocrPartial:ocr.partial}):{items:[],total:0,coverage:{}},[overview,filters,ocr,status]);
  const years=useMemo(()=>[...new Set((overview.catalog?.items||[]).flatMap(g=>g.entries.map(row=>galleryEditorialUpdate2029(row.name)?.dateTime?.slice(0,4)).filter(Boolean)))].sort().reverse(),[overview]);
  return {status,filters,projection,years,stream,showStream};
}

function GalleryReadingControls({reading,search,onChange,onRefresh}) {
  const {filters:f,years}=reading;
  const patch=(key,value)=>{const p=new URLSearchParams(search);value?p.set(key,value):p.delete(key);p.delete('image');p.delete('offset');p.delete('take');p.set('flow','1');onChange('/world?'+p);};
  return <div className="g29-reading-controls">
    <div className="g29-catalog-controls"><label>חיפוש בגלריות ובכיתובים<input type="search" maxLength={200} value={(new URLSearchParams(search).get('q')||'').slice(0,200)} placeholder="שם, כיתוב או מספר" onChange={e=>patch('q',e.target.value)} /></label>
      <label>סדר הגלריות<select aria-label="סדר הגלריות" value={f.order} onChange={e=>patch('sort',e.target.value)}>
        <option value="activity">פעילות אחרונה</option><option value="date">עדכוני המקור — חדשים למעלה</option><option value="oldest">עדכוני המקור — ישנים למעלה</option><option value="original">הסדר ההיסטורי</option><option value="name">לפי שם</option>
        {['asc','desc'].includes(f.order)?<option value={f.order}>לפי שם — {f.order==='asc'?'עולה':'יורד'}</option>:null}
      </select></label><button className="g29-page-link" type="button" onClick={onRefresh} disabled={reading.status==='loading'}>רענון הגלריות</button></div>
    <details className="g29-filter-panel"><summary>סינון ותצוגה</summary><div className="g29-filter-grid">
      <label>שנת עדכון<select aria-label="שנת עדכון" value={f.year||''} onChange={e=>patch('year',e.target.value)}><option value="">כל השנים</option>{years.map(y=><option key={y}>{y}</option>)}</select></label>
      <label>מתאריך עדכון<input type="date" value={f.from||''} onChange={e=>patch('from',e.target.value)} /></label>
      <label>עד תאריך עדכון<input type="date" value={f.to||''} onChange={e=>patch('to',e.target.value)} /></label>
      <label>סוג תמונה<select aria-label="סוג תמונה" value={f.kind||''} onChange={e=>patch('kind',e.target.value)}><option value="">כל הסוגים</option>{[['hint','רמזים'],['gematria','גימטריה'],['event','מן החדשות'],['method','שיטות'],['trail','מסלולים'],['gallery','כללי']].map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
      <label>מספרים שסומנו<input aria-label="מספרים שסומנו" placeholder="14, 45" value={new URLSearchParams(search).get('nums')||''} onChange={e=>patch('nums',e.target.value.slice(0,120))} /></label>
      <label>שילוב מספרים<select aria-label="שילוב מספרים" value={f.mode} onChange={e=>patch('mode',e.target.value)}><option value="or">לפחות אחד המספרים</option><option value="and">כל המספרים באותה תמונה</option></select></label>
      <label>היקף המספרים<select aria-label="היקף המספרים" value={f.primary?'1':''} onChange={e=>patch('primary',e.target.value)}><option value="">כל התיוגים השמורים</option><option value="1">המספר המוביל בלבד</option></select></label>
      <label>אופן העיון<select aria-label="אופן העיון" value={f.layout} onChange={e=>patch('layout',e.target.value)}><option value="reading">תמונה והסבר</option><option value="compact">רצף תמונות קומפקטי</option></select></label>
      <label className="g29-check"><input type="checkbox" checked={f.ocr} onChange={e=>patch('ocr',e.target.checked?'1':'')} />גם בטקסט שזוהה בתמונות</label>
      <button type="button" className="g29-page-link" onClick={()=>{const p=new URLSearchParams({view:'gallery',flow:'1'}),id=new URLSearchParams(search).get('gallery');if(id)p.set('gallery',id);onChange('/world?'+p);}}>ניקוי הסינון</button>
    </div><p className="g29-note">סינון התאריכים מתייחס לעדכונים שנכתבו במקור. במיון פעילות אחרונה נכללים גם מועדי ההוספה לזרם, שמוצגים בנפרד. מספרים משותפים הם סינון, לא אישור לקשר בעץ.</p></details>
  </div>;
}

function GalleryCatalogBody() {
  const location = useLocation(), navigate = useNavigate(), research = useResearch();
  const [retry, setRetry] = useState(0);
  const reading=useGalleryReading(location.search,retry,true,true);
  const state={status:reading.status,...reading.projection};
  const query = reading.filters.q;
  const href = galleryReadingHref2029(location.search);
  useEffect(() => {
    research.updateResearchContext?.({ subject: null, selection: null, lens: 'gallery', returnTo: null,
      dimensions: { surfaceFocus: { id: 'gallery-catalog', type: 'surface', label: 'גלריות', href },
        surfaceSections: [{ id: 'gallery-catalog', label: 'גלריות' }], surfaceMapLabel: 'בתוך הגלריות', activeSectionId: 'gallery-catalog',
        readingFocus: null, surfaceFindings: [], expressionFocusExplicit: false, topicSlug: null,
        galleryImageId: null, wpGalleryId: null } });
  }, [href]);
  const items = state.items;
  // Stream arrival and authored gallery-update chronology are different lenses.
  // Reuse the same admitted river; never move source rows or rewrite dates.
  const showStream = reading.showStream;
  return <>
    {showStream ? <section aria-label="חדש בזרם המציאות" data-gallery-entry-stream>
      <RealityRiver2029 items={reading.stream.items} loading={reading.stream.status==='loading'} failed={reading.stream.status==='failed'}
        onRetry={()=>setRetry(n=>n+1)} follow={<RealityStreamFollow2029 source="gallery_catalog_2029" />} />
    </section> : null}
    <article className="g29-gallery g29-catalog" id="gallery-catalog" dir="rtl">
    <header className="g29-heading"><div className="g29-heading-line"><div><p className="g29-eyebrow">סוד 1820 · מבט בתמונות</p>
      <h2>גלריות רמזי הגאולה</h2></div></div><p className="g29-intro">האוספים ההיסטוריים — סיפורים, מספרים ותמונות שנאספו לאורך השנים. כברירת מחדל, הפעילות האחרונה מופיעה ראשונה; אפשר לבחור גם בעדכוני המקור או בסדר ההיסטורי.</p>
      <Link className="g29-text-link" to="/world">חזרה לעולם ←</Link></header>
    <GalleryReadingControls reading={reading} search={location.search} onChange={href=>navigate(href,{replace:true})} onRefresh={()=>setRetry(n=>n+1)} />
    {state.status === 'loading' ? <FrameState kind="loading" title="פותחים את הגלריות">טוענים את הגלריות הזמינות לעיון.</FrameState> : null}
    {state.status === 'failed' ? <p className="g29-message" role="alert">לא הצלחנו לטעון את הגלריות כרגע. אפשר לנסות שוב באמצעות הרענון.</p> : null}
    {state.status === 'ready' ? <><p className="g29-catalog-status" role="status">{items.length} גלריות · {state.total} תמונות{query ? ' בתוצאות החיפוש' : ' לעיון'}</p>
      {state.coverage?.partial ? <p className="g29-message">התצוגה חלקית. ייתכן שיש גלריות או תמונות נוספות שאינן מוצגות בקריאה הזו.</p> : null}
      {!items.length ? <p className="g29-message">{query ? 'לא נמצאו גלריות מתאימות לחיפוש.' : 'אין כרגע גלריות עם תמונות ציבוריות זמינות.'}</p> : null}
      <div className="g29-catalog-grid">{items.map((item, index) => {
        const latest=reading.filters.order==='activity'?item.activityCover:null;
        const cover=latest||item.cover;
        const galleryHref=galleryReadingHref2029(location.search,{galleryId:item.wpGalleryId});
        const latestHref=latest?galleryReadingHref2029(location.search,{galleryId:item.wpGalleryId,imageId:latest.galleryImageId}):null;
        return <div key={item.galleryId}><Link className="g29-catalog-card" data-catalog-gallery={item.wpGalleryId}
          to={latestHref||galleryHref} aria-label={`${latest?'פתיחת התמונה האחרונה מתוך':'פתיחת'} ${publicMediaCaption(item.originalName)}`}>
        <div className="g29-catalog-cover">
          {cover ? <span className="g29-image-surface"><CanonicalMediaImage2029 item={cover} alt={publicMediaCaption(item.originalName)} loading={index < 3 ? 'eager' : 'lazy'} /><GalleryImageDate item={cover} /></span> : <span>גלריה בתמונות</span>}</div>
        <div className="g29-catalog-copy">
          <h3>{publicMediaCaption(item.originalName)}</h3><p>{state.coverage?.partial ? 'לפחות ' : ''}{item.matchingCount} מתוך {item.imageCount} תמונות זמינות</p>
          {latest?<p>נוסף לזרם · <time dateTime={item.latestStreamAddition.dateTime}>{bilingualDateLabel(item.latestStreamAddition.dateTime)}</time></p>:null}
          {item.updatedAt?<p>עדכון המקור האחרון · {bilingualDateLabel(item.updatedAt)}</p>:<p>תאריך עדכון במקור לא צוין</p>}
          <span className="g29-text-link">{latestHref?'פתיחת התמונה האחרונה ←':'לפתיחת הגלריה ←'}</span></div>
        </Link>{latestHref?<Link className="g29-text-link" to={galleryHref} aria-label={`פתיחת הגלריה המלאה ${publicMediaCaption(item.originalName)}`}>לפתיחת הגלריה כולה ←</Link>:null}</div>;})}</div></> : null}
    {!showStream ? <RealityStreamFollow2029 source="gallery_catalog_2029" /> : null}
  </article></>;
}

function GalleryImageCard({ item, index, selected, opening, error, onRemember, onOpenExpression, onSelect }) {
  const location = useLocation();
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const p = item.legacyPlacement;
  const source = gateSourcePresentation(item);
  const slotKey = `gallery-source-${item.galleryImageId}`;
  const title = publicMediaTitle(p.originalName);
  const caption = publicMediaCaption(p.originalCaption);
  const share = worldMediaPublicShare(item, { origin: typeof window !== "undefined" ? window.location.origin : null });
  const kind = p.imageType === "gematria" ? "גימטריה" : p.imageType === "hint" ? "רמזים בתמונה"
    : p.imageType === "event" ? "מן החדשות" : "מהגלריה";
  const numberLink = (number) => <Link key={number} className="g29-number" to={numberExpressionFocusHref(number)}
    onClick={(event) => { if (ordinaryClick(event)) onRemember(item); }} aria-label={`לדף המספר ${number}`}><bdi>{number.toLocaleString("en-US")}</bdi>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="m3 9 6-6M3 3h6v6" /></svg></Link>;
  return <section id={slotKey} tabIndex={-1} className="g29-exhibit" data-gallery-image-id={item.galleryImageId}
    data-gallery-selected={selected ? item.galleryImageId : undefined} aria-label={title || `תמונה ${index + 1}`}>
    <a className="g29-canvas" href={item.imageUrl} target="_blank" rel="noreferrer" aria-label={`הגדלת התמונה: ${title || "תמונה מהגלריה"}`}>
      <span className="g29-image-surface"><CanonicalMediaImage2029 item={item} primary loading={index < 2 ? "eager" : "lazy"} alt={title || "תמונה מהגלריה"} /><GalleryImageDate item={item} /></span>
    </a>
    <div className="g29-placard">
      {p.originalName?.includes('עדכון') ? <p className="g29-update-heading">{publicMediaCaption(p.originalName)}</p> : null}
      <div className="g29-card-heading"><span className="g29-kind">{kind}</span><span className="g29-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        {share ? <ShareActions type="image" {...share} title={title || share.title} variant="icon" sourceSurface="gallery_2029" force /> : null}
      </div>
      {title ? <h3>{title}</h3> : null}
      {caption ? <><p className={`g29-caption${captionExpanded ? " is-expanded" : ""}`}>{caption}</p>
        {caption.length > 170 ? <button className="g29-text-button" type="button" aria-expanded={captionExpanded}
          onClick={() => setCaptionExpanded((value) => !value)}>{captionExpanded ? "פחות טקסט" : "להמשך הקריאה"}</button> : null}</> : null}
      {source.numbers.length ? <div className="g29-number-row" aria-label="המספרים שסומנו לתמונה">
        <span className="g29-number-label">המספרים שסומנו</span><div className="g29-tags">{source.numbers.slice(0, 3).map(numberLink)}</div>
        {source.numbers.length > 3 ? <details className="g29-more-numbers"><summary>עוד {source.numbers.length - 3} מספרים</summary><div className="g29-tags">{source.numbers.slice(3).map(numberLink)}</div></details> : null}
      </div> : null}
      <details className="g29-depth" onToggle={(event) => { if (event.currentTarget.open) onSelect(item); }}>
        <summary><span>לגלות עוד</span><svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="m9 3-6 6M3 3v6h6" /></svg></summary>
        <div className="g29-depth-body">
          <WorldZviSourceFindings2029 key={item.sourceRef} scope="all" sourceRef={item.sourceRef}
            returnTo={new URLSearchParams(location.search).get('flow')==='1'
              ?galleryReadingHref2029(location.search,{galleryId:p.wpGalleryId,imageId:item.galleryImageId})
              :gallerySourceHref2029(p.wpGalleryId,item.galleryImageId)} onFindingOpen={()=>onRemember(item)} />
          {source.numbers.length ? <p className="g29-note">המספרים הם תיוגים שמורים של התמונה. אפשר לעיין בהם; הם אינם אישור לחישוב או לחיבור.</p> : null}
          <div className="rv"><SourceMethodResearch item={item} slotKey={slotKey} sectionId={slotKey} publicCopy
            readProfile={fetchNumberMethodProfile} onOpenExpression={(row, origin) => onOpenExpression(item, row, origin)}
            openingKey={opening} focusError={error?.key === slotKey ? error.message : null} focusErrorKey={slotKey} /></div>
          <details className="g29-source-details"><summary>המקור והסיפור שמאחורי התמונה</summary>
            <p className="g29-note">כאן שמורים הכיתובים, הקרדיטים והמקומות שבהם התמונה הופיעה. הופעות חוזרות אינן מקורות עצמאיים.</p>
            {source.history.map((placement) => <section key={placement.galleryImageId} className="g29-history">
              <h4>{placement.galleryName || "מיקום נוסף בגלריה"}</h4>
              {placement.originalName ? <p>{publicMediaCaption(placement.originalName)}</p> : null}
              {placement.originalCaption ? <p className="g29-original-caption">{publicMediaCaption(placement.originalCaption)}</p> : null}
              {(publicMediaCaption(placement.originalName) !== (placement.originalName || "")
                || publicMediaCaption(placement.originalCaption) !== (placement.originalCaption || "")) ? <details className="g29-verbatim">
                  <summary>הנוסח השמור במקור</summary>
                  {placement.originalName ? <pre>{placement.originalName}</pre> : null}
                  {placement.originalCaption ? <pre>{placement.originalCaption}</pre> : null}
                </details> : null}
              {[placement.originalCredit?.author, placement.originalCredit?.publication].filter(Boolean).length ? <p>קרדיט: {[placement.originalCredit.author, placement.originalCredit.publication].filter(Boolean).join(" · ")}</p> : null}
              {placement.occurredAt ? <p className="g29-note">{placement.dateProvenance?.occurredAt?.derivedFrom === "path" ? `תיקיית המקור: ${placement.occurredAt.slice(0, 7)}. זה אינו תאריך אירוע מאומת.`
                : `תאריך שנשמר עם התמונה: ${bilingualDateLabel(placement.occurredAt)}. זה אינו תאריך אירוע מאומת.`}</p> : null}
              {placement.createdAt ? <p className="g29-note">נוסף לארכיון: {bilingualDateLabel(placement.createdAt)}</p> : null}
              {gallerySourceHref2029(placement.wpGalleryId, placement.galleryImageId) ? <Link className="g29-text-link"
                to={gallerySourceHref2029(placement.wpGalleryId, placement.galleryImageId)}>לראות בהקשר הזה ←</Link> : null}
            </section>)}
            <details className="g29-reference"><summary>פרטי האסמכתה</summary><bdi>{item.sourceRef}</bdi></details>
          </details>
        </div>
      </details>
    </div>
  </section>;
}

function GalleryBody() {
  const location = useLocation();
  const navigate = useNavigate();
  const research = useResearch();
  const requestRef = useRef(0);
  const restoredRouteRef = useRef(null);
  const [state, setState] = useState({ status: "loading" });
  const [retry, setRetry] = useState(0);
  const [opening, setOpening] = useState(null);
  const [error, setError] = useState(null);
  const params = new URLSearchParams(location.search);
  const galleryId = params.get("gallery");
  const flow=params.get('flow')==='1';
  const reading=useGalleryReading(location.search,retry,flow);
  const takeText=params.get('take')||'12', take=/^\d+$/.test(takeText)?Number(takeText):NaN;
  const selectedGallery=reading.projection.items.find(g=>g.wpGalleryId===Number(galleryId));
  const progressScope=galleryId+JSON.stringify(reading.filters);
  const [passed,setPassed]=useState([]);
  useEffect(()=>{setPassed([]);},[progressScope]);
  const wpGalleryId = /^[1-9]\d*$/.test(galleryId || "") ? Number(galleryId) : null;
  const imageId = params.get("image");
  const offsetText = params.get("offset") || "0";
  const offset = /^\d+$/.test(offsetText) ? Number(offsetText) : NaN;
  const routeKey = `${galleryId}:${location.search}`;

  useEffect(() => {
    let alive = true;
    requestRef.current += 1;
    setOpening(null); setError(null);setState(old=>flow&&old.progressScope===progressScope&&take>old.take&&old.page
      ?{...old,status:'loading_more',routeKey}:{status:'loading',routeKey});
    if(flow&&reading.status==='loading')return()=>{alive=false;};
    const resultPromise=flow?(reading.status==='failed'?Promise.reject(Error('overview unavailable')):selectedGallery
      ?loadPublicGalleryReading2029({gallery:selectedGallery,take,imageId,fetchSourceContext:fetchGallerySourceContext})
      :Promise.resolve({status:'empty_window',page:null,selected:null})):readWindow({ wpGalleryId, imageId, offset });
    resultPromise.then((result) => {
      if (alive) setState({ ...result, routeKey,progressScope,take });
    }).catch(() => { if (alive) setState({ status: "failed", routeKey }); });
    return () => { alive = false; requestRef.current += 1; };
  }, [routeKey, retry, flow?reading.status:null, flow?reading.projection:null]);

  const current = state.routeKey === routeKey ? state : { status: "loading" };
  const item = galleryOccurrenceItem(current.selected);
  const slotKey = item ? `gallery-source-${item.galleryImageId}` : null;
  const sourceHrefFor=sourceItem=>flow?galleryReadingHref2029(location.search,{galleryId:wpGalleryId,imageId:sourceItem.galleryImageId,take}):gallerySourceHref2029(wpGalleryId,sourceItem.galleryImageId);
  const exactHref = item ? sourceHrefFor(item) : null;
  const title = item?.legacyPlacement?.galleryName || selectedGallery?.originalName || "גלריה בתמונות";
  const catalogHref=galleryReadingHref2029(location.search);
  const subject = { id: String(wpGalleryId), type: "gallery", label: title, href: flow?galleryReadingHref2029(location.search,{galleryId:wpGalleryId}):gallerySourceHref2029(wpGalleryId) };
  const imageKey=(current.page?.scannedIds||[]).join(',');
  useEffect(()=>{
    if(!flow||!current.page)return;
    const ids=new Set(current.page.scannedIds.filter(id=>resolvePublicGallerySelection(current.page,id).status==='ready'));
    setPassed(old=>old.filter(id=>ids.has(id)));
    if(typeof IntersectionObserver==='undefined')return;
    const observer=new IntersectionObserver(entries=>{
      setPassed(old=>{const set=new Set(old);for(const e of entries){const id=e.target.dataset.galleryImageId;
        if(!e.isIntersecting&&e.boundingClientRect.bottom<80)set.add(id);if(e.isIntersecting)set.delete(id);}return [...set];});
    },{rootMargin:'-80px 0px 0px 0px'});
    for(const id of ids){const el=document.getElementById('gallery-source-'+id);if(el)observer.observe(el);}
    return()=>observer.disconnect();
  },[flow,imageKey,current.status]);

  useEffect(() => {
    if (!item) return;
    research.updateResearchContext?.((previous) => ({ subject,
      selection: { entityId: item.galleryImageId, entityType: "image", sourceRef: item.sourceRef, locator: `#${slotKey}` },
      lens: "gallery", dimensions: { ...(previous?.dimensions || {}), readingFocus: null, surfaceFindings: [],
        topicSlug: null, expressionFocusExplicit: false, galleryImageId: item.galleryImageId, wpGalleryId,
        surfaceFocus: { id: item.mediaId, type: "image", label: readingLabel(item), primary: readingLabel(item),
          reference: item.sourceIdentity?.ref, locator: `#${slotKey}`, href: exactHref, sourceLabel: title } } }));
  }, [routeKey, item?.galleryImageId]); // Existing Context only; no gallery store/provider.

  useEffect(() => {
    if (!item || !slotKey) return;
    const previous = restoredRouteRef.current;
    restoredRouteRef.current = routeKey;
    if (!location.hash && (flow||!previous || previous === routeKey)) return;
    const frame = requestAnimationFrame(() => {
      const hashId=location.hash.startsWith('#gallery-source-')?location.hash.slice('#gallery-source-'.length):null;
      const target=flow&&hashId&&resolvePublicGallerySelection(current.page,hashId).status==='ready'?'gallery-source-'+hashId:slotKey;
      const element = document.getElementById(location.hash ? target : "gallery-top");
      element?.scrollIntoView({ block: "start", behavior: "instant" });
      element?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [routeKey, current.status, slotKey, location.hash]);

  const sourceReturn = (sourceItem) => ({ href: sourceHrefFor(sourceItem), label: title, subject,
    selection: { entityId: sourceItem.galleryImageId, entityType: "image", sourceRef: sourceItem.sourceRef, locator: `#gallery-source-${sourceItem.galleryImageId}` },
    lens: "gallery", dimensions: { galleryImageId: sourceItem.galleryImageId, wpGalleryId,
      activeSectionId: `gallery-source-${sourceItem.galleryImageId}`, galleryNumberPath: "stored_tag_not_verified_calculation" },
    journey: research.context?.journey || null });
  const remember = (sourceItem) => {
    const returnTo = sourceReturn(sourceItem);
    research.updateResearchContext?.({ returnTo });
    if (`${location.pathname}${location.search}${location.hash}` !== returnTo.href) navigate(returnTo.href, { replace: true });
  };

  const openExpression = async (sourceItem, row, origin) => {
    const request = ++requestRef.current;
    const startedRoute = window.location.pathname + window.location.search;
    const isCurrentRequest = () => request === requestRef.current
      && window.location.pathname + window.location.search === startedRoute;
    const sourceSlot = `gallery-source-${sourceItem.galleryImageId}`;
    const sourceHref = sourceHrefFor(sourceItem);
    const fail = (message) => setError({ key: sourceSlot, message });
    setOpening(sourceSlot); setError(null);
    try {
      const fresh = await fetchGallerySourceContext({ imageIds: [sourceItem.galleryImageId] });
      if (!isCurrentRequest()) return false;
      const selected = resolvePublicGallerySelection({ wpGalleryId, scannedIds: [sourceItem.galleryImageId], items: fresh.items }, sourceItem.galleryImageId);
      const freshItem = galleryOccurrenceItem(selected);
      if (!gateSourceSelectionIsCurrent(freshItem, origin)
        || row.text !== origin.sourceText.slice(origin.selectionStart, origin.selectionEnd)) {
        if (!freshItem) setState((old) => ({ ...old, status: "unavailable", selected: null, page: null }));
        fail("התמונה אינה זמינה או שהטקסט שלה השתנה. רעננו ובחרו את הביטוי מחדש.");
        return false;
      }
      const resolved = await resolveTopicExpressionFocus2029(row, { profileReader: fetchNumberMethodProfile });
      if (!isCurrentRequest()) return false;
      const focus = resolved.focus;
      const method = focus && gatePublicMethodRows(focus.rows).find((entry) => entry.methodKey === focus.method
        && entry.computedValue === focus.resultValue);
      if (!method || (origin.expectedMethodVersion != null
        && String(method.definitionVersion ?? "") !== String(origin.expectedMethodVersion))) {
        fail("החישוב השתנה או שהשיטה אינה זמינה כעת. פתחו מחדש את השיטות ונסו שוב.");
        return false;
      }
      const returnTo = sourceReturn(sourceItem);
      research.setResearchContext?.({ subject: { id: String(focus.root), type: "number", label: String(focus.root), href: focus.href },
        selection: { entityId: `${sourceItem.sourceRef}:${origin.selectionStart}-${origin.selectionEnd}`, entityType: "gematria_expression",
          sourceRef: sourceItem.sourceRef, locator: `#${sourceSlot}`, expression: focus.expression, method: focus.method,
          methodVersion: method.definitionVersion == null ? null : String(method.definitionVersion),
          resultValue: focus.resultValue, focusKind: "expression" },
        lens: "gematria", locale: research.context?.locale || "he", journey: research.context?.journey || null, returnTo,
        dimensions: { expressionFocusExplicit: true, focusOrigin: "gallery", wpGalleryId, galleryImageId: sourceItem.galleryImageId,
          storedTextSelectionKind: "stored_ocr", storedTextSelectionStart: origin.selectionStart,
          storedTextSelectionEnd: origin.selectionEnd, storedTextSelectionSourceRef: sourceItem.sourceRef,
          sourceMethodPairing: "not_asserted" } });
      // Exact source in the previous history entry; same canonical Number page,
      // no gallery-local calculator, inspector or numeric interpretation.
      if (`${location.pathname}${location.search}${location.hash}` !== sourceHref) navigate(sourceHref, { replace: true });
      navigate(focus.href);
      return true;
    } catch {
      if (isCurrentRequest()) fail("לא הצלחנו לפתוח את החישוב כרגע. אפשר לנסות שוב בעוד רגע.");
      return false;
    } finally { if (request === requestRef.current) setOpening(null); }
  };

  if (!gallerySourceHref2029(wpGalleryId)) return <FrameState kind="empty" title="הגלריה עדיין לא זמינה כאן"><Link to="/world">לגלריות ולסיפורים בעולם</Link></FrameState>;
  if (current.status === "loading") return <FrameState kind="loading" title="פותחים את הגלריה">עוד רגע, התמונות בדרך…</FrameState>;
  const page = current.page;
  const images = (page?.scannedIds || []).map((id) => galleryOccurrenceItem(resolvePublicGallerySelection(page, id))).filter(Boolean);
  const select = (sourceItem) => research.updateResearchContext?.({
    selection: { entityId: sourceItem.galleryImageId, entityType: "image", sourceRef: sourceItem.sourceRef,
      locator: `#gallery-source-${sourceItem.galleryImageId}` },
    dimensions: { galleryImageId: sourceItem.galleryImageId, surfaceFocus: { id: sourceItem.mediaId, type: "image",
      label: readingLabel(sourceItem), primary: readingLabel(sourceItem), reference: sourceItem.sourceIdentity?.ref,
      locator: `#gallery-source-${sourceItem.galleryImageId}`, href: gallerySourceHref2029(wpGalleryId, sourceItem.galleryImageId), sourceLabel: title } },
  });
  const position=reading.projection.items.findIndex(g=>g.wpGalleryId===wpGalleryId);
  const nextGallery=reading.projection.items[position+1], previousGallery=position>0?reading.projection.items[position-1]:null;
  return <article id="gallery-top" className={`g29-gallery${flow?' g29-flow-reading':''}${flow&&reading.filters.layout==='compact'?' is-compact':''}`} dir="rtl" data-gallery-id={wpGalleryId}>
    <header className="g29-heading">
      <nav className="g29-breadcrumb" aria-label="מיקום בגלריות"><Link to="/world">העולם</Link><span aria-hidden="true">/</span><Link to="/world?view=gallery">כל הגלריות</Link></nav>
      <div className="g29-heading-line"><div><p className="g29-eyebrow">סוד 1820 · מבט בתמונות</p>
        <h2>{title}</h2></div><svg className="g29-gallery-mark" width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
          <rect x="11" y="7" width="45" height="48" rx="7" transform="rotate(-8 11 7)" /><rect x="17" y="16" width="45" height="48" rx="7" />
          <circle cx="46" cy="31" r="5" /><path d="m23 53 12-14 9 9 6-6 7 11" />
        </svg></div>
      <p className="g29-intro">תמונות, מספרים ועוד כיוון להתבוננות.</p>
      <div className="g29-heading-bottom"><nav aria-label="המשך הגלישה"><Link className="g29-text-link" to={flow?catalogHref:'/world?view=gallery'}>כל הגלריות ←</Link>
        {!flow?<Link className="g29-text-link" to={galleryReadingHref2029('',{galleryId:wpGalleryId})}>לרצף העדכונים והסינונים ←</Link>:null}</nav>
        {images.length ? <span className="g29-count"><bdi>{images.length}</bdi> תמונות לעיון</span> : null}</div>
    </header>
    {flow?<><details className="g29-flow-tools"><summary>מיון, חיפוש וסינון בגלריה</summary><GalleryReadingControls reading={reading} search={location.search} onChange={href=>navigate(href,{replace:true})} onRefresh={()=>setRetry(n=>n+1)} /></details>
      {reading.projection.coverage.partial?<p className="g29-message">התוצאות חלקיות; ייתכנו תמונות נוספות שאינן מכוסות בקריאה הזו.</p>:null}
      {position>=0?<p className="g29-catalog-status">גלריה {position+1} מתוך {reading.projection.items.length} בתוצאות · עוד {reading.projection.items.length-position-1} גלריות בהמשך</p>:null}
      {page?<div className="g29-progress" role="status">מוצגות {images.length} תמונות · {page.totalListed} ברשימה המסוננת · עוד {Math.max(0,page.totalListed-page.nextOffset)} להמשך
        <progress value={page.nextOffset} max={Math.max(1,page.totalListed)} aria-label="התקדמות טעינת תמונות" />
        <details className="g29-passed"><summary>עברת בגלילה {passed.length} תמונות — חזרה למקום</summary><nav>{passed.map(id=><a key={id} href={'#gallery-source-'+id}>תמונה {page.scannedIds.indexOf(id)+1}</a>)}</nav><p className="g29-note">זו התקדמות בגלילה הנוכחית, לא אישור קריאה ולא מדד ראיות.</p></details>
      </div>:null}</>:null}
    {flow&&current.status==='empty_window'?<p className="g29-message">אין תמונות זמינות בסינון הזה. אפשר לשנות או לנקות את הסינון.</p>:null}
    {current.status === "failed" ? <p className="g29-message" role="status">לא הצלחנו לטעון את התמונות כרגע. נסו שוב בעוד רגע.</p> : null}
    {current.status === "unavailable" ? <p className="g29-message" role="status">התמונה המבוקשת אינה זמינה כאן כרגע.</p> : null}
    {current.status === "empty_window" ? <p className="g29-message" role="status">אין כרגע תמונות זמינות בחלק הזה של הגלריה. אפשר לעבור לתמונות הבאות.</p> : null}
    {current.status === "failed" || current.status === "unavailable" ? <button className="sod29-action" onClick={() => setRetry((n) => n + 1)}>בדיקה מחדש</button> : null}
    <div className="g29-flow" aria-label="תמונות הגלריה">{images.map((image, index) => <GalleryImageCard key={image.galleryImageId}
      item={image} index={index} selected={item?.galleryImageId === image.galleryImageId} opening={opening} error={error}
      onRemember={remember} onOpenExpression={openExpression} onSelect={select} />)}</div>
    {page ? <footer className="g29-browse">
      <span className="g29-footer-note">לכל תמונה יש סיפור. ממשיכים לגלות?</span>
      {current.navigation?.previous || current.navigation?.next ? <nav aria-label="תמונות לפי הסדר המקורי">
        {current.navigation.previous ? <Link className="g29-page-link" to={current.navigation.previous}>→ התמונה הקודמת</Link> : null}
        {current.navigation.next ? <Link className="g29-page-link is-next" to={current.navigation.next}>התמונה הבאה ←</Link> : null}
      </nav> : null}
      <nav aria-label="עוד תמונות בגלריה">
        {page.offset > 0 ? <Link className="g29-page-link" to={flow?galleryReadingHref2029(location.search,{galleryId:wpGalleryId,imageId:selectedGallery.entries[Math.max(0,page.offset-12)]?.id,take:12}):`${subject.href}&offset=${Math.max(0, page.offset - page.limit)}`}>→ התמונות הקודמות</Link> : null}
        {page.hasMore ? flow?<Link className="g29-page-link is-next" aria-disabled={current.status==='loading_more'} onClick={e=>{if(current.status==='loading_more')e.preventDefault();}}
          to={galleryReadingHref2029(location.search,{galleryId:wpGalleryId,take:take<120?take+12:12,imageId:take<120?(page.offset?selectedGallery.entries[page.offset]?.id:null):selectedGallery.entries[page.nextOffset]?.id})}>
            {take<120?'טען עוד — מצטרף לרצף':'המשך למקטע הבא'} · עוד {page.totalListed-page.nextOffset} תמונות</Link>
          :<Link className="g29-page-link is-next" to={`${subject.href}&offset=${page.nextOffset}`}>התמונות הבאות ←</Link> : null}
      </nav>
      {flow?<div className="g29-gallery-neighbors">
        {previousGallery?<Link className="g29-page-link" to={galleryReadingHref2029(location.search,{galleryId:previousGallery.wpGalleryId})}>→ הגלריה הקודמת · {previousGallery.originalName}</Link>:null}
        {nextGallery?<Link className="g29-catalog-card" data-next-gallery={nextGallery.wpGalleryId} to={galleryReadingHref2029(location.search,{galleryId:nextGallery.wpGalleryId})}>
          <span className="g29-kind">הגלריה הבאה לפי הסינון והסדר הנוכחיים</span>{nextGallery.cover?<CanonicalMediaImage2029 item={nextGallery.cover} alt={nextGallery.originalName} thumbnail />:null}
          <h3>{nextGallery.originalName}</h3><p>{nextGallery.matchingCount} תמונות בתוצאות{nextGallery.updatedAt?' · עדכון '+bilingualDateLabel(nextGallery.updatedAt):''}</p><span>לגלריה הבאה ←</span></Link>
          :<p>הגעת לגלריה האחרונה בתוצאות. <Link to={catalogHref}>חזרה לכל הגלריות</Link></p>}
      </div>:null}
      {page.withheld || page.occurrencesTruncated ? <details className="g29-coverage"><summary>מידע על התצוגה</summary>
        {page.withheld ? <p>חלק מהתמונות אינן זמינות להצגה כאן כרגע.</p> : null}
        {page.occurrencesTruncated ? <p>יש לתמונות הופעות נוספות שאינן מוצגות בקריאה הזו.</p> : null}
      </details> : null}
    </footer> : null}
    <RealityStreamFollow2029 source="gallery_reading_2029" />
  </article>;
}

export default function Gallery2029Page() {
  const location = useLocation();
  return <Sod2029Shell surface="world" title="גלריות" introVariant="none">{new URLSearchParams(location.search).has('gallery') ? <GalleryBody /> : <GalleryCatalogBody />}</Sod2029Shell>;
}
