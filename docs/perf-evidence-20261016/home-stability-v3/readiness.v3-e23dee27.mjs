// HISTORICAL: everything below this header is the v3 predicate exactly as committed in e23dee27 (that file: sha256 5190aff5...64259). Kept only as the
// negative control in test/home-readiness-predicate-2029.test.mjs: it counts a transparent card, or a card far below the screen, as usable. Not for measurements; see readiness.mjs.
// In-page source of the Home usable-content predicate (v3): one definition for the runner and for test/home-readiness-predicate-2029.test.mjs.
// "Real" = visible, not .is-loading, not aria-hidden, not aria-busy, not hidden, non-zero box. A title is meaningful with >= 4 characters
// after whitespace/NBSP removal. A hero or card is usable only with an actual /post/ destination. The product's own markers
// (data-h29-primary, data-dg29-state) are read next to the structural result, never instead of it.
export const READINESS_SRC = String.raw`
// readiness (v3): structural, independent of the product's own markers (which are recorded next to it)
window.__real=(el)=>{for(let n=el;n&&n.nodeType===1;n=n.parentElement){if(n.classList.contains('is-loading')||n.getAttribute('aria-hidden')==='true'||n.getAttribute('aria-busy')==='true'||n.hidden)return false;const cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden')return false}const r=el.getBoundingClientRect();return r.width>0&&r.height>0};
window.__meaningful=(t)=>(t||'').replace(/[\s\u00a0]+/g,' ').trim().length>=4;
window.__ready=()=>{const q=s=>document.querySelector(s);const root=q('.h29');if(!root)return null;const real=window.__real,mean=window.__meaningful;
 const heroEl=q('.h29-hero:not(.is-loading)');
 const heroReal=!!(heroEl&&real(heroEl)&&mean(heroEl.querySelector('h1')&&heroEl.querySelector('h1').textContent)&&[...heroEl.querySelectorAll('a[href^="/post/"]')].some(real));
 const cardReal=[...document.querySelectorAll('.h29-updates article.h29-card')].filter(c=>real(c)&&mean(c.querySelector('.h29-card-t')&&c.querySelector('.h29-card-t').textContent)&&[...c.querySelectorAll('a[href^="/post/"]')].some(real)).length;
 const dgItems=[...document.querySelectorAll('.dg29 a.dg29-source[href],.dg29 a.dg29-dimension-source[href],.dg29 a.dg29-language-preview[href]')].filter(real).length;
 const dg=q('.dg29'),dgMarker=dg?dg.getAttribute('data-dg29-state'):null,prMarker=root.getAttribute('data-h29-primary');
 return {heroReal,cardReal,usable:heroReal||cardReal>0,both:heroReal&&cardReal>0,dgItems,dgReady:dgItems>0,dgSettled:dgItems>0||dgMarker==='empty'||dgMarker==='error',prMarker,dgMarker,h:document.documentElement.scrollHeight}};
// holds: every remembered-box node with the applied CSS variable, its box and its natural extent (first child top .. last child bottom)
window.__holds=()=>[...document.querySelectorAll('[data-h29-hold],[data-h29-hold-block]')].map(n=>{const f=n.firstElementChild,l=n.lastElementChild,r=n.getBoundingClientRect();return {cls:String(n.className||'').split(/\s+/).slice(0,2).join('.'),attr:n.hasAttribute('data-h29-hold')?'hold':'block',v:n.style.getPropertyValue('--h29-settled-h'),h:Math.round(r.height),w:Math.round(r.width),nat:f&&l?Math.round(l.getBoundingClientRect().bottom-f.getBoundingClientRect().top):0}});
window.__skeletons=()=>({loading:document.querySelectorAll('.h29 .is-loading').length,busy:document.querySelectorAll('.h29 [aria-busy="true"]').length,status:document.querySelectorAll('.dg29 [role="status"]').length});
`;
