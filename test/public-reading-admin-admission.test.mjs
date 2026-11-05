import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { transform } from 'esbuild';
import { verifyReadingSession, readingSessionOptions } from '../src/lib/publicReadingAuthSession.js';
import { publicReadingPath, publicReadingFeatureLock } from '../src/lib/publicReadingRelease2029.js';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));

test('server verifies JWT and same principal; local metadata never admits a mismatched account', async () => {
 const session = { access_token: 'candidate-token', user: { id: 'a', user_metadata: { role: 'admin' } } };
 let seen;
 assert.equal((await verifyReadingSession(session, { getUser: async token => { seen=token;return {data:{user:{id:'a'}}}; } })).id, 'a');
 assert.equal(seen, 'candidate-token');
 for (const result of [{data:{user:{id:'b'}}}, {error:new Error('invalid'),data:{user:{id:'a'}}}, {data:{user:null}}]) {
  assert.equal(await verifyReadingSession(session, {getUser:async()=>result}), null);
 }
 assert.equal(await verifyReadingSession(session,{getUser:async()=>{throw Error('offline');}}),null);
 assert.equal(await verifyReadingSession({user:session.user},{getUser:async()=>assert.fail('no token')}),null);
});

test('reading account storage stays separate and tab scoped; only the exact callback can complete PKCE', () => {
 const storage = {getItem(){},setItem(){},removeItem(){}};
 assert.equal(readingSessionOptions(storage).storage,storage);
 assert.equal(readingSessionOptions(storage).persistSession,true);
 assert.equal(readingSessionOptions(undefined).persistSession,false);
 assert.equal(readingSessionOptions(storage, {pathname:'/'}).detectSessionInUrl,false);
 assert.equal(readingSessionOptions(storage).flowType,'pkce');
 assert.equal(readingSessionOptions(storage).storageKey,'sod-public-reading-account');
});

test('verified admin can enter existing private surfaces while public and unknown services remain closed', () => {
 // The Bible code is public (Classic only); /els continues to /code. Neither is an administrator-only view any more.
 assert.equal(publicReadingPath('/code'),'public');assert.equal(publicReadingPath('/els'),'continuation');
 for(const path of ['/heichal','/היכל']) {
  assert.equal(publicReadingPath(path),'closed');
  assert.equal(publicReadingPath(path,{isAdmin:true}),'admin-view');
 }
 for(const path of ['/2029/journey','/2029/me/overview','/research']) {
  assert.equal(publicReadingPath(path,{isAdmin:true}),'admin-view');
  assert.equal(publicReadingPath(path),'closed');
 }
 // Public source continuations are now admitted; they do not enable writes.
 for(const path of ['/books','/book/existing','/community/chat']) {
  assert.equal(publicReadingPath(path),'public');
  assert.equal(publicReadingPath(path,{isAdmin:true}),'admin-view');
 }
 // Beit Midrash is open to the public (ZURIEL 5.11.2026); an unknown method key is validated by the page itself against the method registry.
 for(const path of ['/beit-midrash','/beit-midrash/standard','/beit-midrash/unverified-method'])for(const isAdmin of [false,true])assert.equal(publicReadingPath(path,{isAdmin}),'public');
 for(const path of ['/api/unknown','/auth/unknown'])assert.equal(publicReadingPath(path,{isAdmin:true}),'closed');
 assert.equal(publicReadingPath('/auth/callback'),'account');
 assert.equal(publicReadingPath('/unknown/surface',{isAdmin:true}),'missing');
 assert.equal(publicReadingPath('/login'),'account');
 for(const key of ['lock_heichal','lock_raziel_site','lock_life_journey','unknown'])assert.equal(publicReadingFeatureLock(key).enabled,true);
 for(const key of ['lock_books','lock_els'])assert.equal(publicReadingFeatureLock(key).enabled,false);
});

async function mountAuth({profileReader=async id=>({id,role:'admin'}),verify=async token=>({data:{user:{id:token,user_metadata:{avatar_url:'https://example.invalid/avatar'}}}})}={}) {
 let callback, states=[], refs=[], effects=[], si=0,ri=0,first=true;
 const calls=[];
 const React={createContext:()=>({Provider:'context'}),useContext:()=>null,useEffect:fn=>{effects.push(fn);},
  useState:initial=>{const i=si++;if(first)states[i]=initial;return [states[i],value=>states[i]=typeof value==='function'?value(states[i]):value];},
  useRef:initial=>{const i=ri++;if(first)refs[i]={current:initial};return refs[i];},useCallback:fn=>fn,
  createElement:(_type,props)=>props.value};
 const supabase={auth:{getSession:async()=>({data:{session:null}}),getUser:verify,onAuthStateChange:fn=>{callback=fn;return {data:{subscription:{unsubscribe(){}}}};}},rpc:(...args)=>calls.push(args)};
 let source=read('src/lib/AuthContext.jsx').replace(/^import .*;\n/gm,'').replaceAll("import.meta.env.VITE_INTEGRATED_PREVIEW",'"false"').replace('export const useAuth','const useAuth').replace('export function AuthProvider','function AuthProvider');
 const compiled=(await transform(source,{loader:'jsx',format:'cjs'})).code;
 const context={React,...React,supabase,PUBLIC_READING_RELEASE:true,verifyReadingSession,fetchProfile:profileReader,
  logActivity:(...args)=>calls.push(args),stitchLogin:(...args)=>calls.push(args),claimResearchLead:(...args)=>calls.push(args),getVisitorId:()=>{calls.push('visitor');return 'visitor';},doSignOut:async()=>({}),localStorage:{getItem:()=>{calls.push('localStorage');return null;},setItem:()=>calls.push('storageWrite')},Date,console};
 vm.createContext(context);vm.runInContext(compiled+';globalThis.AuthProvider=AuthProvider;',context);
 const render=()=>{si=0;ri=0;effects=[];const initial=first;const result=context.AuthProvider({children:null});first=false;if(!initial)effects.slice(1).forEach(fn=>fn());return result;};
 render();const cleanup=effects.map(fn=>fn());await flush();
 return {emit:session=>callback('SIGNED_IN',session),render,calls,dispose:()=>cleanup.forEach(fn=>fn?.())};
}

test('real AuthProvider reading mode verifies admin role without credits, marketing, visitor, avatar or referral side effects',async()=>{
 const app=await mountAuth();
 app.emit({access_token:'a',user:{id:'a',user_metadata:{avatar_url:'https://example.invalid/avatar',role:'admin'}}});await flush();await flush();
 const state=app.render();assert.equal(state.user.id,'a');assert.equal(state.isAdmin,true);assert.equal(state.loading,false);assert.deepEqual(app.calls,[]);
 app.emit(null);await flush();assert.equal(app.render().isAdmin,false);assert.equal(app.render().user,null);app.dispose();
});

test('account switch revokes old admin immediately; stale profile cannot grant role to replacement',async()=>{
 let release;
 const app=await mountAuth({profileReader:id=>id==='a'?new Promise(resolve=>{release=resolve;}):Promise.resolve({id,role:'member'})});
 app.emit({access_token:'a',user:{id:'a'}});await flush();
 app.emit({access_token:'b',user:{id:'b'}});assert.equal(app.render().user,null);assert.equal(app.render().isAdmin,false);
 await flush();release({id:'a',role:'admin'});await flush();
 assert.equal(app.render().user.id,'b');assert.equal(app.render().isAdmin,false);assert.equal(app.render().profile.id,'b');assert.deepEqual(app.calls,[]);app.dispose();
});

test('token verification failure clears prior admin and prevents profile fetch',async()=>{
 let count=0;
 const app=await mountAuth({verify:async token=>token==='a'?{data:{user:{id:'a'}}}:{error:Error('JWT rejected')},profileReader:async id=>{count++;return {id,role:'admin'};}});
 app.emit({access_token:'a',user:{id:'a'}});await flush();assert.equal(app.render().isAdmin,true);
 app.emit({access_token:'bad',user:{id:'a'}});await flush();assert.equal(app.render().user,null);assert.equal(app.render().isAdmin,false);assert.equal(count,1);app.dispose();
});

test('same-principal token refresh preserves local navigation identity but revokes admin until server revalidation',async()=>{
 let release, reads=0;
 const app=await mountAuth({verify:async token=>++reads===1?{data:{user:{id:'a'}}}:new Promise(resolve=>{release=resolve;})});
 app.emit({access_token:'a',user:{id:'a'}});await flush();assert.equal(app.render().isAdmin,true);
 app.emit({access_token:'refreshed',user:{id:'a'}});
 assert.equal(app.render().user.id,'a');assert.equal(app.render().loading,false);assert.equal(app.render().isAdmin,false);
 release({data:{user:{id:'a'}}});await flush();assert.equal(app.render().user.id,'a');assert.equal(app.render().isAdmin,true);app.dispose();
});

async function featureState({admin=false,lock=null,authLoading=false,policyLoading=false,profile=true}={}) {
 let source=read('src/components/MaintenanceLock.jsx').replace(/^import .*;\n/gm,'').replace(/import\.meta\.env(?:\?\.|\.)[A-Z0-9_]+/g,'"false"').replaceAll('export default ','').replaceAll('export ','');
 const compiled=(await transform(source,{loader:'jsx',format:'cjs'})).code;
 const context={React:{},PUBLIC_READING_RELEASE:profile,publicReadingFeatureLock,useAuth:()=>({user:admin?{id:'admin'}:null,isAdmin:admin,loading:authLoading}),
  useState:()=>[{loading:policyLoading,lock,readKey:null,enabled:!profile||admin},()=>{}],useEffect:()=>{},useMemo:fn=>fn(),Set,JSON};
 vm.createContext(context);vm.runInContext(compiled+';globalThis.feature=useFeatureState;',context);
 return context.feature('lock_heichal',{requireFlag:true});
}

test('canonical feature state opens verified admin, denies public, missing flags and pending verification',async()=>{
 const state=await featureState({admin:true,lock:{enabled:false,mode:'all'}});
 assert.equal(state.adminViewAllowed,false);assert.equal(state.blocked,false);assert.equal(state.allowed,true);assert.equal(state.adminBypass,true);
 for(const options of [{admin:true,lock:null},{admin:false,lock:{enabled:false}},{admin:true,lock:{enabled:false},authLoading:true},{admin:true,lock:{enabled:false},policyLoading:true}]) {
  const denied=await featureState(options);assert.equal(denied.adminViewAllowed,false);assert.equal(denied.blocked,true);
 }
 const legacy=await featureState({profile:false,admin:true,lock:{enabled:true,mode:'all'}});assert.equal(legacy.allowed,true);assert.equal(legacy.adminBypass,true);
});

const treeElements = node => !node ? [] : Array.isArray(node) ? node.flatMap(treeElements) : typeof node==='object' ? [node,...treeElements(node.props?.children)] : [];
async function screenHarness(path, expose, overrides={}) {
 const calls=[];
 const React={createElement:(type,props,...children)=>({type,props:{...props,children}}),Fragment:'fragment'};
 const policy=read('src/lib/publicReadingRelease2029.js').replaceAll('export ','').replace('import.meta.env?.VITE_PUBLIC_READING_RELEASE','\"public-reading-20261101\"');
 const actionsLocked=vm.runInNewContext(policy+';publicReadingActionsLocked;', {__SOD_2029_BUILD__:true});
 const context={React,PUBLIC_READING_RELEASE:true,publicReadingActionsLocked:actionsLocked,useAuth:()=>({isAdmin:false,user:null}),useEffect:()=>{},useMemo:fn=>fn(),useState:initial=>[initial,()=>{}],use2029Palette:()=>({}),
  useResearch:()=>({context:{subject:{id:'1820',type:'number',label:'1820'}},addToResearch:()=>calls.push('write'),saveItem:()=>calls.push('write')}),
  use2029Shell:()=>({openRaziel:()=>calls.push('model'),returnExact:()=>{},razielLocked:true}),
  useFeatureState:()=>({blocked:true}),supabase:{functions:{invoke:()=>calls.push('invoke')}},getVisitorId:()=>calls.push('visitor'),
  Link:'a',FrameState:'state',Sod2029Shell:'shell',FeatureClosedNotice:'notice',NavigationIcon2029:'icon',...overrides};
 let source=read(path).replace(/^import[\s\S]*?;\n/gm,'').replaceAll('export default ','').replaceAll('export ','');
 const compiled=(await transform(source,{loader:'jsx',format:'cjs'})).code;
 vm.createContext(context);vm.runInContext(compiled+';globalThis.renderTest='+expose+';',context);
 return {render:context.renderTest,calls,context};
}

test('Heichal public view rejects direct action handlers before model, telemetry or write',async()=>{
 const h=await screenHarness('src/pages/Heichal2029Page.jsx','ActiveResearchEnvironment');
 const controls=treeElements(h.render()).filter(n=>n.type==='button'&&n.props.onClick);
 const closed=controls.filter(n=>n.props.disabled===true);
 assert.ok(closed.length>=3,'research/save/model/ordinal controls must be disabled');
 for(const n of closed)await n.props.onClick();
 assert.deepEqual(h.calls,[]);
 const empty=await screenHarness('src/pages/Heichal2029Page.jsx','NoContextEntry');
 const elements=treeElements(empty.render());assert.equal(elements.find(n=>n.type==='input').props.disabled,true);
 await elements.find(n=>n.type==='form').props.onSubmit({preventDefault(){}});assert.deepEqual(empty.calls,[]);
});

test('Book save stays disabled for public/member, including direct handler invocation',async()=>{
 const h=await screenHarness('src/pages/Books2029Page.jsx','SaveBookItemAction');
 let saved=0;const nodes=treeElements(h.render({item:{id:'book'},research:{saveItem:()=>saved++}}));
 const button=nodes.find(n=>n.type==='button');assert.equal(button.props.disabled,true);button.props.onClick();assert.equal(saved,0);
});

test('ELS public view is the Classic mode only; the administrator keeps every mode',async()=>{
 const h=await screenHarness('src/pages/Els2029Page.jsx','Els2029Page',{useResearch:()=>assert.fail('operational hooks mounted by the wrapper')});
 const node=h.render({});assert.equal(node.type.name,'OperationalEls2029Page');assert.equal(node.props.publicClassic,true);assert.equal(node.props.key,'public-classic');
 const admin=await screenHarness('src/pages/Els2029Page.jsx','Els2029Page',{useAuth:()=>({isAdmin:true,user:{id:'verified-admin'}})});
 const adminNode=admin.render({});assert.equal(adminNode.props.publicClassic,false);assert.equal(adminNode.props.key,'full');
});


test('admin Book save uses the existing explicit operation and ELS operational surface',async()=>{
 const auth={useAuth:()=>({isAdmin:true,user:{id:'verified-admin'}})};
 const h=await screenHarness('src/pages/Books2029Page.jsx','SaveBookItemAction',auth);
 let saved=0;const button=treeElements(h.render({item:{id:'book'},research:{saveItem:()=>++saved}})).find(n=>n.type==='button');
 assert.equal(button.props.disabled,false);assert.equal(saved,0);button.props.onClick();assert.equal(saved,1);
 const els=await screenHarness('src/pages/Els2029Page.jsx','Els2029Page',auth);
 assert.equal(els.render({}).type.name,'OperationalEls2029Page');assert.deepEqual(els.calls,[]);
});

test('role revoke/regrant cannot reuse cached flags before the fresh policy read',async()=>{
 let state, effect, cleanup, reads=[];
 const context={React:{},useState:initial=>{state??=initial;return[state,value=>{state=value;}];},
  useEffect:fn=>{effect=fn;},useMemo:fn=>fn(),useAuth:()=>({}),PUBLIC_READING_RELEASE:true,publicReadingFeatureLock,
  getSiteFlags:()=>new Promise(resolve=>reads.push(resolve)),Set,JSON};
 let source=read('src/components/MaintenanceLock.jsx').replace(/^import .*;\n/gm,'').replace(/import\.meta\.env(?:\?\.|\.)[A-Z0-9_]+/g,'"false"').replaceAll('export default ','').replaceAll('export ','');
 vm.createContext(context);vm.runInContext((await transform(source,{loader:'jsx',format:'cjs'})).code+';globalThis.reader=useSiteFlag;',context);
 const render=enabled=>context.reader('lock_els',{pendingScope:'same-principal-and-page',enabled});
 const commit=()=>{cleanup?.();cleanup=effect();};
 assert.equal(render(true).loading,true);commit();reads.shift()({lock_els:{enabled:true,mode:'all'}});await flush();
 assert.equal(render(true).loading,false);
 assert.equal(render(false).loading,true);commit();
 assert.equal(render(true).loading,true);assert.equal(render(true).lock,null);commit();
 reads.shift()({});await flush();assert.equal(render(true).lock,null,'required flag removed on server must not reuse the old flag');
 cleanup?.();
});
