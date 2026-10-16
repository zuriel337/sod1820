// In-page source of the Home content predicates (v4): one definition for the runner and for test/home-readiness-predicate-2029.test.mjs.
// Two different questions, measured and reported separately:
//   composed  = the DOM holds real content: a hero or update card that is not a loading slot, has a meaningful title and an actual /post/ destination
//               (v3's "usable"; it says nothing about whether anyone can see it).
//   usable    = a person can see and use it NOW: composed, AND effectively opaque (>= 0.9 through all ancestors), AND inside the viewport (>= 40% of
//               its box), AND the element at the centre of the visible part belongs to it (nothing covers it), AND no ancestor is hidden / inert /
//               aria-hidden / aria-busy / loading / content-visibility:hidden. On a return (window.__target set to the departure control's text) the
//               usable thing is that control itself, because the reading position is restored away from the hero: old or hidden content never counts.
// "Real" = not .is-loading, not aria-hidden, not aria-busy, not hidden, displayed, non-zero box. A title is meaningful with >= 4 characters after
// whitespace/NBSP removal. The product's own markers (data-h29-primary, data-dg29-state) are read next to the structural result, never instead of it.
export const READINESS_VERSION = 4;
export const READINESS_SRC = String.raw`
// readiness (v4): structural, independent of the product's own markers (which are recorded next to it)
window.__real=(el)=>{for(let n=el;n&&n.nodeType===1;n=n.parentElement){if(n.classList.contains('is-loading')||n.getAttribute('aria-hidden')==='true'||n.getAttribute('aria-busy')==='true'||n.hidden)return false;const cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden')return false}const r=el.getBoundingClientRect();return r.width>0&&r.height>0};
window.__meaningful=(t)=>(t||'').replace(/[\s ]+/g,' ').trim().length>=4;
// visible: can a person see and use this element right now? { ok, why } (why = first failing reason, for diagnosis)
window.__visible=(el,minFraction=0.4,minOpacity=0.9)=>{
 if(!el||!el.isConnected)return {ok:false,why:'detached'};
 let opacity=1;
 for(let n=el;n&&n.nodeType===1;n=n.parentElement){
  if(n.hidden)return {ok:false,why:'hidden'};
  if(n.inert)return {ok:false,why:'inert'};
  if(n.getAttribute('aria-hidden')==='true')return {ok:false,why:'aria-hidden'};
  if(n.getAttribute('aria-busy')==='true')return {ok:false,why:'aria-busy'};
  if(n.classList.contains('is-loading'))return {ok:false,why:'loading'};
  const cs=getComputedStyle(n);
  if(cs.display==='none')return {ok:false,why:'display'};
  if(cs.visibility!=='visible')return {ok:false,why:'visibility'};
  if(cs.contentVisibility==='hidden')return {ok:false,why:'content-visibility'};
  opacity*=parseFloat(cs.opacity);
 }
 if(!(opacity>=minOpacity))return {ok:false,why:'opacity'};
 const r=el.getBoundingClientRect();
 if(!(r.width>0&&r.height>0))return {ok:false,why:'box'};
 const vw=document.documentElement.clientWidth,vh=window.innerHeight;
 const x0=Math.max(r.left,0),x1=Math.min(r.right,vw),y0=Math.max(r.top,0),y1=Math.min(r.bottom,vh);
 if(x1-x0<=0||y1-y0<=0)return {ok:false,why:'offscreen'};
 if((x1-x0)*(y1-y0)<minFraction*r.width*r.height)return {ok:false,why:'mostly-offscreen'};
 const hit=document.elementFromPoint((x0+x1)/2,(y0+y1)/2);
 if(!hit||!el.contains(hit))return {ok:false,why:'covered'};
 return {ok:true,why:null};
};
window.__ready=()=>{const q=s=>document.querySelector(s);const root=q('.h29');if(!root)return null;const real=window.__real,mean=window.__meaningful,vis=window.__visible;
 const heroEl=q('.h29-hero:not(.is-loading)');
 const heroText=heroEl&&heroEl.querySelector('h1');
 const heroReal=!!(heroEl&&real(heroEl)&&mean(heroText&&heroText.textContent)&&[...heroEl.querySelectorAll('a[href^="/post/"]')].some(real));
 const cards=[...document.querySelectorAll('.h29-updates article.h29-card')].filter(c=>real(c)&&mean(c.querySelector('.h29-card-t')&&c.querySelector('.h29-card-t').textContent)&&[...c.querySelectorAll('a[href^="/post/"]')].some(real));
 const cardReal=cards.length;
 const heroVisible=heroReal&&vis(heroEl).ok;
 const visibleCards=cards.filter(c=>vis(c).ok);
 const cardVisible=visibleCards.length;
 // the control the person is returning to (set by the runner on a return); matched by its own text, never by position
 let anchorUsable=null,anchorWhy=null;
 if(window.__target){const els=[...document.querySelectorAll('h1,h2,h3,h4,a,p,li,button,span,strong,b,small')].filter(e=>e.children.length===0&&(e.innerText||'').trim().slice(0,80)===window.__target);
  const verdicts=els.map(e=>vis(e));anchorUsable=verdicts.some(v=>v.ok);anchorWhy=anchorUsable?null:(verdicts[0]?verdicts[0].why:'absent')}
 const usable=window.__target?anchorUsable===true:(heroVisible||cardVisible>0);
 const composed=heroReal||cardReal>0;
 const why=usable?null:(window.__target?anchorWhy:(!composed?'not-composed':(heroReal?vis(heroEl).why:(cards[0]?vis(cards[0]).why:'not-composed'))));
 const dgItems=[...document.querySelectorAll('.dg29 a.dg29-source[href],.dg29 a.dg29-dimension-source[href],.dg29 a.dg29-language-preview[href]')].filter(real).length;
 const dg=q('.dg29'),dgMarker=dg?dg.getAttribute('data-dg29-state'):null,prMarker=root.getAttribute('data-h29-primary');
 return {heroReal,cardReal,composed,heroVisible,cardVisible,anchorUsable,usable,why,both:heroReal&&cardReal>0,dgItems,dgReady:dgItems>0,dgSettled:dgItems>0||dgMarker==='empty'||dgMarker==='error',prMarker,dgMarker,h:document.documentElement.scrollHeight}};
// holds: every remembered-box node with the applied CSS variable, its box and its natural extent (first child top .. last child bottom)
window.__holds=()=>[...document.querySelectorAll('[data-h29-hold],[data-h29-hold-block]')].map(n=>{const f=n.firstElementChild,l=n.lastElementChild,r=n.getBoundingClientRect();return {cls:String(n.className||'').split(/\s+/).slice(0,2).join('.'),attr:n.hasAttribute('data-h29-hold')?'hold':'block',v:n.style.getPropertyValue('--h29-settled-h'),h:Math.round(r.height),w:Math.round(r.width),nat:f&&l?Math.round(l.getBoundingClientRect().bottom-f.getBoundingClientRect().top):null}});
window.__skeletons=()=>({loading:document.querySelectorAll('.h29 .is-loading').length,busy:document.querySelectorAll('.h29 [aria-busy="true"]').length,status:document.querySelectorAll('.dg29 [role="status"]').length});
// images the page asked for and could not decode (a response that is not an image): complete, a source, and no pixels
window.__brokenImages=()=>[...document.images].filter(i=>i.currentSrc&&i.complete&&i.naturalWidth===0).map(i=>{try{const u=new URL(i.currentSrc);return u.host+u.pathname}catch(_){return 'unparsed'}});
`;
