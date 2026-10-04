// Pure planning model. No network, credentials, or production dependencies.
export const VERSION = 1;
export const SOURCES = {
  storageRate: {label:'Supabase Storage',url:'https://supabase.com/docs/guides/platform/manage-your-usage/storage-size',detail:'תעריף חריגה לאחסון; המודל משתמש בממוצע חודשי, בקירוב של חודשים בני 30 יום.'},
  uncachedRate: {label:'Supabase Egress',url:'https://supabase.com/docs/guides/platform/manage-your-usage/egress',detail:'לתעבורה רגילה ולתעבורה מהמטמון מכסות נפרדות.'},
  cachedRate: {label:'Supabase Egress',url:'https://supabase.com/docs/guides/platform/manage-your-usage/egress',detail:'מטמון מוזיל תעבורה; הוא אינו מבטל אותה.'},
  cpuRate: {label:'Vercel Fluid Compute · iad1',url:'https://vercel.com/docs/functions/usage-and-pricing',detail:'מחיר ייחוס לאזור Washington D.C. יש להתאים לאזור ולתוכנית בפועל.'},
  memoryRate: {label:'Vercel Fluid Compute · iad1',url:'https://vercel.com/docs/functions/usage-and-pricing',detail:'קירוב ללא שיתוף מופעים; מספר בקשות מקבילות עשוי לשנות את GB-hours בפועל.'},
  invocationRate: {label:'Vercel Fluid Compute',url:'https://vercel.com/docs/functions/usage-and-pricing',detail:'תעריף למיליון הפעלות. יש להזין בנפרד את המכסה בחשבון.'}
};
// Reference prices are not a claim about the user's subscription.
export const DEFAULTS = {
  uploads:10, sizeMB:30, duration:60, retention:3, growth:0,
  mode:'hosted', keepOriginal:true, renditionPercent:40, variants:1, thumbnailKB:200,
  views:100, watched:60, cache:80, proxyUpload:false, proxyViews:false,
  cpuSeconds:12, wallSeconds:30, memoryGB:1, retries:5, invocations:2,
  aiEnabled:false, aiRate:0.006, apiRate:0, serviceMonthly:0,
  metadataKB:10, logKB:5, logRetention:1,
  baseStorage:0, baseData:0, baseUncached:0, baseCached:0, baseCPU:0, baseMemory:0, baseInvocations:0,
  includedStorage:0, includedData:0, includedUncached:0, includedCached:0, includedCPU:0, includedMemory:0, includedInvocations:0,
  storageRate:0.0213, dataRate:0.125, uncachedRate:0.09, cachedRate:0.03,
  cpuRate:0.128, memoryRate:0.0106, invocationRate:0.6, proxyRate:0.15,
  fixedMonthly:0, computeCredit:0, extraMonthly:0, budget:50, uncertainty:25,
  months:12, fx:3.5
};
export const GROUPS = [
 {id:'volume',title:'העלאות ואחסון',subtitle:'כמה נכנס, וכמה נשאר',fields:[
  ['uploads','העלאות ביום','סרטונים',0,10000,1,'range',100],
  ['sizeMB','גודל קובץ מקור','MB',0,10000,1,'range',200],
  ['duration','משך סרטון','שניות',0,36000,1],
  ['retention','משך שמירת תוכן','חודשים',1,24,1,'range',24],
  ['growth','גידול חודשי בהעלאות','%',0,100,1,'range',100],
  ['mode','דרך הצגת הסרטון','',0,0,0,'select'],
  ['keepOriginal','שמירת קובץ המקור','',0,0,0,'boolean'],
  ['renditionPercent','גודל גרסת הצפייה ביחס למקור','%',1,100,1],
  ['variants','מספר גרסאות צפייה שמורות','עותקים',1,8,1],
  ['thumbnailKB','תמונה מקדימה לכל סרטון','KB',0,10000,10]
 ]},
 {id:'traffic',title:'צפיות ותעבורה',subtitle:'נפח הצפיות ומסלול הקבצים',fields:[
  ['views','צפיות בחודש לכל סרטון שמור','צפיות',0,1000000,10,'range',10000],
  ['watched','חלק מהקובץ שנשלח בכל צפייה','%',0,100,1,'range',100],
  ['cache','שיעור פגיעות במטמון','%',0,100,1,'range',100],
  ['proxyUpload','העלאה דרך שרת ביניים','',0,0,0,'boolean'],
  ['proxyViews','צפייה דרך שרת ביניים','',0,0,0,'boolean']
 ]},
 {id:'processing',title:'עיבוד ויומנים',subtitle:'כל ניסיון צורך משאבים',fields:[
  ['cpuSeconds','זמן CPU פעיל לכל ניסיון','שניות',0,86400,1],
  ['wallSeconds','משך ריצה כולל לכל ניסיון','שניות',0,86400,1],
  ['memoryGB','זיכרון מוקצה לעיבוד','GB',0,64,0.1],
  ['retries','תוספת ניסיונות חוזרים','%',0,300,1,'range',100],
  ['invocations','הפעלות פונקציה לכל ניסיון','הפעלות',0,1000,1],
  ['aiEnabled','עיבוד AI / תמלול לכל סרטון','',0,0,0,'boolean'],
  ['aiRate','עלות שירות AI לדקת מדיה','$/דקה',0,100,0.001],
  ['apiRate','עלות API / הורדה לכל ניסיון','$/ניסיון',0,100,0.001],
  ['serviceMonthly','דמי שירות ההעלאות','$/חודש',0,100000,1],
  ['metadataKB','מטא־דאטה לכל סרטון','KB',0,10000,1],
  ['logKB','יומנים לכל ניסיון','KB',0,10000,1],
  ['logRetention','שמירת יומנים','חודשים',1,24,1]
 ]},
 {id:'baseline',title:'השימוש הקיים שלך',subtitle:'צריכה חודשית לפני החיבור',fields:[
  ['fixedMonthly','תשלום קבוע קיים, נטו','$/חודש',0,1000000,1],
  ['baseStorage','אחסון קבצים קיים · ממוצע','GB',0,10000000,1],
  ['baseData','נתונים ויומנים קיימים · ממוצע','GB',0,10000000,0.1],
  ['baseUncached','תעבורה רגילה קיימת','GB/חודש',0,10000000,1],
  ['baseCached','תעבורה מהמטמון קיימת','GB/חודש',0,10000000,1],
  ['baseCPU','CPU קיים','שעות/חודש',0,10000000,0.1],
  ['baseMemory','זיכרון עיבוד קיים','GB-h/חודש',0,10000000,1],
  ['baseInvocations','הפעלות קיימות','הפעלות/חודש',0,100000000000,1]
 ]},
 {id:'pricing',title:'מכסות ותעריפים',subtitle:'כל מכסה משותפת לשימוש הקיים ולתוספת',fields:[
  ['includedStorage','מכסת אחסון קבצים','GB',0,10000000,1],
  ['includedData','מכסת נתונים ויומנים','GB',0,10000000,0.1],
  ['includedUncached','מכסת תעבורה רגילה','GB/חודש',0,10000000,1],
  ['includedCached','מכסת תעבורה מהמטמון','GB/חודש',0,10000000,1],
  ['includedCPU','מכסת CPU','שעות/חודש',0,10000000,1],
  ['includedMemory','מכסת זיכרון עיבוד','GB-h/חודש',0,10000000,1],
  ['includedInvocations','מכסת הפעלות פונקציה','הפעלות/חודש',0,100000000000,1],
  ['storageRate','אחסון קבצים מעבר למכסה','$/GB-חודש',0,100,0.0001],
  ['dataRate','נתונים ויומנים מעבר למכסה','$/GB-חודש',0,100,0.001],
  ['uncachedRate','תעבורה רגילה מעבר למכסה','$/GB',0,100,0.01],
  ['cachedRate','תעבורה מהמטמון מעבר למכסה','$/GB',0,100,0.01],
  ['cpuRate','CPU פעיל מעבר למכסה','$/שעה',0,100,0.001],
  ['memoryRate','זיכרון עיבוד מעבר למכסה','$/GB-h',0,100,0.0001],
  ['invocationRate','הפעלות מעבר למכסה','$/מיליון',0,100,0.01],
  ['proxyRate','תעבורה נוספת דרך שרת ביניים','$/GB',0,100,0.01],
  ['computeCredit','זיכוי חודשי לעיבוד בלבד','$',0,1000000,1],
  ['extraMonthly','תוספות קבועות עקב החיבור','$/חודש',0,1000000,1],
  ['budget','תקציב לתוספת החודשית','$',0,1000000,1],
  ['uncertainty','טווח רגישות בעומס','±%',0,90,1],
  ['months','אופק הסימולציה','חודשים',3,24,1],
  ['fx','שער דולר לשקל לצורך תצוגה','₪/$',0.01,100,0.01]
 ]}
];
export const FIELDS = GROUPS.flatMap(g=>g.fields);
export const PRESETS = [
 {id:'embed',name:'הטמעה מטיקטוק',desc:'קישורים ותמונות בלבד',changes:{uploads:10,mode:'embed',growth:0,views:100,cpuSeconds:1,wallSeconds:3,aiEnabled:false}},
 {id:'pilot',name:'פיילוט קטן',desc:'10 העלאות ביום',changes:{uploads:10,mode:'hosted',growth:0,views:100,cpuSeconds:12,wallSeconds:30,aiEnabled:false}},
 {id:'growth',name:'צמיחה',desc:'50 ביום · גידול 10%',changes:{uploads:50,mode:'hosted',growth:10,views:300,cpuSeconds:12,wallSeconds:30,aiEnabled:false}},
 {id:'viral',name:'גל ויראלי',desc:'100 ביום · 2,000 צפיות',changes:{uploads:100,mode:'hosted',growth:20,views:2000,cpuSeconds:12,wallSeconds:30,aiEnabled:false}}
];
export function normalize(raw={}) {
 const v={...DEFAULTS};
 for(const f of FIELDS){const [key,, ,min,max,step,type]=f;
  if(type==='boolean'){if(typeof raw[key]==='boolean')v[key]=raw[key];}
  else if(type==='select'){if(['hosted','embed'].includes(raw[key]))v[key]=raw[key];}
  else if(typeof raw[key]==='number'&&Number.isFinite(raw[key])){
   v[key]=Math.min(max,Math.max(min,raw[key]));
   if(step===1)v[key]=Math.round(v[key]);
  }
 }
 return v;
}
export const METERS = [
 {key:'storage',name:'אחסון קבצים',unit:'GB בממוצע',base:'baseStorage',included:'includedStorage',rate:'storageRate',color:'#617f69'},
 {key:'data',name:'נתונים ויומנים',unit:'GB בממוצע',base:'baseData',included:'includedData',rate:'dataRate',color:'#949888'},
 {key:'uncached',name:'תעבורה רגילה',unit:'GB',base:'baseUncached',included:'includedUncached',rate:'uncachedRate',color:'#9882bb'},
 {key:'cached',name:'תעבורה מהמטמון',unit:'GB',base:'baseCached',included:'includedCached',rate:'cachedRate',color:'#c4b2d6'},
 {key:'cpu',name:'CPU פעיל',unit:'שעות',base:'baseCPU',included:'includedCPU',rate:'cpuRate',color:'#cf9873'},
 {key:'memory',name:'זיכרון עיבוד',unit:'GB-h',base:'baseMemory',included:'includedMemory',rate:'memoryRate',color:'#d5bba2'},
 {key:'calls',name:'הפעלות פונקציה',unit:'הפעלות',base:'baseInvocations',included:'includedInvocations',rate:'invocationRate',scale:1000000,color:'#a6b6c9'}
];
export function price(v,usage={},additional={}) {
 const costs={}, overages={};
 for(const meter of METERS){
  const over=Math.max(0,v[meter.base]+(usage[meter.key]||0)-v[meter.included]);
  overages[meter.key]=over; costs[meter.key]=over*v[meter.rate]/(meter.scale||1);
 }
 const computeBefore=costs.cpu+costs.memory+costs.calls;
 const creditUsed=Math.min(v.computeCredit,computeBefore);
 costs.computeCredit=-creditUsed;
 costs.proxy=additional.proxy||0; costs.ai=additional.ai||0; costs.api=additional.api||0;
 costs.services=additional.services||0; costs.extra=additional.extra||0; costs.fixed=v.fixedMonthly;
 const total=Object.values(costs).reduce((a,b)=>a+b,0);
 return {costs,overages,total,creditUsed};
}
export function simulate(raw,loadFactor=1) {
 const v=normalize(raw),base=price(v), rows=[];
 const content=[],logs=[];
 const retainedDays=v.retention*30,logDays=v.logRetention*30;
 let active=0,activeLogs=0;
 const hosted=v.mode==='hosted';
 const deliveryMB=hosted?v.sizeMB*v.renditionPercent/100:0;
 const storedMB=(hosted? (v.keepOriginal?v.sizeMB:0)+deliveryMB*v.variants:0)+v.thumbnailKB/1000;
 for(let m=0;m<v.months;m++){
  const perDay=v.uploads*Math.pow(1+v.growth/100,m)*loadFactor;
  let avgActive=0,avgLogs=0;
  const attemptsPerDay=perDay*(1+v.retries/100);
  for(let d=0;d<30;d++){
   const expired=content.length>=retainedDays?content.shift():0;
   const expiredLogs=logs.length>=logDays?logs.shift():0;
   // Uniform ingestion and expiry across each day: average of daily endpoints.
   avgActive+=active+(perDay-expired)/2;
   avgLogs+=activeLogs+(attemptsPerDay-expiredLogs)/2;
   active+=perDay-expired; activeLogs+=attemptsPerDay-expiredLogs;
   content.push(perDay);logs.push(attemptsPerDay);
  }
  avgActive/=30;avgLogs/=30;
  const uploads=perDay*30,attempts=attemptsPerDay*30;
  const videoViews=avgActive*v.views;
  const mediaGB=videoViews*deliveryMB*v.watched/100/1000;
  const thumbsGB=videoViews*v.thumbnailKB/1000000;
  const servedGB=mediaGB+thumbsGB;
  const metadataGB=videoViews*v.metadataKB/1000000;
  const cached=servedGB*v.cache/100,uncached=servedGB-cached+metadataGB;
  const ingress=hosted?attempts*v.sizeMB/1000:0;
  const proxyGB=(v.proxyUpload?ingress:0)+(v.proxyViews?servedGB+metadataGB:0);
  const aiMinutes=v.aiEnabled?attempts*v.duration/60:0;
  const usage={storage:avgActive*storedMB/1000,data:(avgActive*v.metadataKB+avgLogs*v.logKB)/1000000,
   cached,uncached,cpu:attempts*v.cpuSeconds/3600,memory:attempts*v.wallSeconds*v.memoryGB/3600,calls:attempts*v.invocations};
  const after=price(v,usage,{proxy:proxyGB*v.proxyRate,ai:aiMinutes*v.aiRate,api:attempts*v.apiRate,services:v.serviceMonthly,extra:v.extraMonthly});
  const delta=after.total-base.total;
  const deltaCosts={};for(const k of Object.keys(after.costs))deltaCosts[k]=after.costs[k]-(base.costs[k]||0);
  rows.push({month:m+1,uploads,attempts,active:Math.max(0,active),avgActive,views:videoViews,ingress,servedGB,mediaGB,metadataGB,proxyGB,aiMinutes,
   storageEnd:Math.max(0,active)*storedMB/1000,dataEnd:(Math.max(0,active)*v.metadataKB+Math.max(0,activeLogs)*v.logKB)/1000000,
   usage,total:after.total,delta,base:base.total,costs:after.costs,deltaCosts,overages:after.overages,creditUsed:after.creditUsed});
 }
 return {v,base,rows,cumulative:rows.reduce((a,r)=>a+r.total,0),cumulativeDelta:rows.reduce((a,r)=>a+r.delta,0)};
}
export function freshState(){return {version:VERSION,values:{...DEFAULTS},provenance:Object.fromEntries(FIELDS.map(([k])=>[k,SOURCES[k]?'reference':'example'])),saved:[],currency:'USD',selectedMonth:6,scenarioName:'פיילוט קטן',budgetWarningPercent:80,budgetWarningProvenance:'example'};}
export function parseState(input){
 if(!input||typeof input!=='object'||input.version!==VERSION||!input.values||typeof input.values!=='object')throw new Error('קובץ זה אינו קובץ סימולציה תקין בגרסה 1.');
 const clean=freshState();clean.values=normalize(input.values);
 const source=validSnapshotSource(input.assumptionSources?.baseStorage);
 if(source)clean.assumptionSources={baseStorage:source};
 for(const [key] of FIELDS){const p=input.provenance?.[key];if(['user','example','reference','scenario','snapshot_assumption'].includes(p)&&(!(p==='reference')||SOURCES[key])&&(p!=='snapshot_assumption'||(key==='baseStorage'&&source)))clean.provenance[key]=p;}
 clean.saved=(Array.isArray(input.saved)?input.saved:[]).slice(0,8).filter(s=>s&&typeof s.name==='string'&&s.values).map(s=>{
  const source=validSnapshotSource(s.assumptionSources?.baseStorage);
  return {name:s.name.slice(0,48),values:normalize(s.values),provenance:Object.fromEntries(FIELDS.map(([k])=>[k,['user','example','reference','scenario','snapshot_assumption'].includes(s.provenance?.[k])&&(s.provenance[k]!=='reference'||SOURCES[k])&&(s.provenance[k]!=='snapshot_assumption'||(k==='baseStorage'&&source))?s.provenance[k]:'example'])),...(source?{assumptionSources:{baseStorage:source}}:{})};
 });
 clean.selectedMonth=Math.max(1,Math.min(clean.values.months,Number.isFinite(input.selectedMonth)?Math.round(input.selectedMonth):6));
 clean.currency=input.currency==='ILS'?'ILS':'USD';clean.scenarioName=typeof input.scenarioName==='string'?input.scenarioName.slice(0,48):'תרחיש מיובא';
 const validWarning=Number.isInteger(input.budgetWarningPercent)&&input.budgetWarningPercent>=1&&input.budgetWarningPercent<=100;
 clean.budgetWarningPercent=validWarning?input.budgetWarningPercent:80;
 clean.budgetWarningProvenance=validWarning&&input.budgetWarningProvenance==='user'?'user':'example';
 return clean;
}

const nonNegative=v=>{
 if(!['string','number'].includes(typeof v)||(typeof v==='string'&&!/^\d+(\.\d+)?$/.test(v)))return null;
 const n=Number(v);return Number.isFinite(n)&&n>=0?n:null;
};
const isoDate=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?new Date(v).toISOString():null;
function validSnapshotSource(s){
 if(!s||s.basis!=='snapshot_as_monthly_assumption'||s.source!=='admin_system_health.media.storage.total_bytes')return null;
 const bytes=nonNegative(s.observedBytes),at=isoDate(s.observedAt);
 if(bytes===null||!at)return null;
 return {basis:s.basis,source:s.source,observedBytes:bytes,observedAt:at};
}
// Projection of the already-authorized parent RPC response, never another fetch.
// Current stock, observed daily traffic, historical billing and current provider
// billing stay separate. Missing data remains null, never coerced to zero.
export function getHealthObservations(health,readAt=null){
 const observedAt=isoDate(health?.generated_at)||isoDate(readAt);
 const storageBytes=nonNegative(health?.media?.storage?.total_bytes);
 const databaseBytes=nonNegative(health?.db?.database_bytes);
 const observed24hBytes=nonNegative(health?.usage?.storage_egress_observed_24h_bytes);
 const cachedBytes=nonNegative(health?.usage?.supabase_cached_egress);
 const history=health?.usage?.supabase_egress_historical_exact;
 return {
  observedAt,
  storage:{valueGB:storageBytes===null?null:storageBytes/1e9,bytes:storageBytes,basis:storageBytes===null?'UNKNOWN':'OBSERVED_SNAPSHOT'},
  database:{valueGB:databaseBytes===null?null:databaseBytes/1e9,basis:databaseBytes===null?'UNKNOWN':'OBSERVED_SNAPSHOT'},
  egress24h:{valueGB:observed24hBytes===null?null:observed24hBytes/1e9,basis:health?.usage?.storage_egress_observed_basis||'UNKNOWN',observedAt:isoDate(health?.usage?.storage_egress_observed_latest_at)},
  providerCached:{valueGB:cachedBytes===null?null:cachedBytes/1e9,basis:health?.usage?.supabase_cached_egress_basis||'UNKNOWN'},
  historicalCached:{valueGB:nonNegative(history?.cached_egress_gb),basis:history?.cycle_start?'EXACT_BILLING_HISTORY':'UNKNOWN',cycleStart:history?.cycle_start||null,cycleEnd:history?.cycle_end||null}
 };
}
export function applyStorageSnapshot(state,observations){
 const gb=observations?.storage?.valueGB,bytes=observations?.storage?.bytes,at=isoDate(observations?.observedAt);
 if(typeof gb!=='number'||!Number.isFinite(gb)||gb<0||gb>10000000||nonNegative(bytes)===null||!at)throw new Error('אין תמונת אחסון תקינה עם מועד מדידה שניתן להשתמש בה.');
 return {...state,values:{...state.values,baseStorage:gb},provenance:{...state.provenance,baseStorage:'snapshot_assumption'},scenarioName:'תרחיש עם נקודת פתיחה מהמערכת',assumptionSources:{...state.assumptionSources,baseStorage:{basis:'snapshot_as_monthly_assumption',source:'admin_system_health.media.storage.total_bytes',observedBytes:bytes,observedAt:at}}};
}
