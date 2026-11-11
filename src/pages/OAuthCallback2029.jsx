import React, {Suspense,lazy,useEffect,useRef,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {useAuth} from '../lib/AuthContext.jsx';
import {applySeo} from '../lib/seo.js';
import {consumePreviewOAuthReturn} from '../lib/oauthReturn.js';
import {AUTH_MESSAGES,classifyAuthError,recordAuthEvent} from '../lib/authDiagnostics.js';
// Loaded only when a recovery link's session needs the new-password screen.
const NewPassword2029Page=lazy(()=>import('./NewPassword2029Page.jsx'));

// What the address said before the SDK cleaned it: an Auth error (an expired or already used link, a denied provider) or nothing.
function callbackProblem(){
  const query=new URLSearchParams(window.location.search),fragment=new URLSearchParams(window.location.hash.slice(1));
  const read=key=>query.get(key)||fragment.get(key)||'';
  const failed=['error','error_code','error_description'].some(key=>query.has(key)||fragment.has(key));
  const kind=failed?classifyAuthError({code:read('error_code'),message:read('error_description')||read('error')},{step:'callback'}):'';
  return {failed,kind:kind==='link_expired'?kind:'callback_failed'};
}

// Supabase owns callback token verification and session creation. This route
// restores only a local destination and removes callback tokens from history.
// A session created by a password-recovery link stays here and asks for the new password first.
export default function OAuthCallback2029(){
  const [returnTarget,setReturnTarget]=useState('/2029');
  const [problem]=useState(callbackProblem);
  const callbackFailed=problem.failed;
  useEffect(()=>{applySeo({title:'משלימים כניסה',path:'/auth/callback',noindex:true});},[]);
  const {user,loading,passwordRecovery}=useAuth(),navigate=useNavigate(),completed=useRef(false);
  // Once the new-password screen is shown it stays (it has its own "saved" state) even after the recovery mark is cleared.
  const [recoveryShown,setRecoveryShown]=useState(false);
  useEffect(()=>{
    if(loading||completed.current)return;
    // The recovery mark is set while the SDK processes the link, before the session is admitted here.
    if(user&&!callbackFailed&&(passwordRecovery||recoveryShown)){window.history.replaceState(null,'','/auth/callback');setRecoveryShown(true);return;}
    completed.current=true;
    const target=consumePreviewOAuthReturn();setReturnTarget(target);
    if(user&&!callbackFailed)navigate(target,{replace:true});
    else{window.history.replaceState(null,'','/auth/callback');recordAuthEvent(problem.kind,'callback');}
  },[user,loading,navigate,callbackFailed,passwordRecovery,recoveryShown,problem.kind]);
  if(!loading&&user&&!callbackFailed&&(passwordRecovery||recoveryShown))return <Suspense fallback={<main dir="rtl" role="status" style={{padding:32}}><p>פותחים את בחירת הסיסמה…</p></main>}><NewPassword2029Page returnTo={returnTarget}/></Suspense>;
  const encoded=encodeURIComponent(returnTarget);
  return <main dir="rtl" role="status" style={{padding:32}}>
    {loading||user&&!callbackFailed?<p>משלימים את הכניסה לחשבון…</p>:<><p data-auth-diagnostic={problem.kind}>{AUTH_MESSAGES[problem.kind]||AUTH_MESSAGES.callback_failed}</p>
      <p><Link to={"/login?reset=1&returnTo="+encoded}>בקשת קישור חדש לשחזור סיסמה</Link></p>
      <p><Link to={"/login?returnTo="+encoded}>חזרה לכניסה (קוד למייל, סיסמה או Google)</Link></p></>}
  </main>;
}
