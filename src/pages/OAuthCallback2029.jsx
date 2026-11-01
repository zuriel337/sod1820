import React, {useEffect,useRef,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {useAuth} from '../lib/AuthContext.jsx';
import {applySeo} from '../lib/seo.js';
import {consumePreviewOAuthReturn} from '../lib/oauthReturn.js';

// Supabase owns callback token verification and session creation. This route
// restores only a local destination and removes callback tokens from history.
export default function OAuthCallback2029(){
  const [returnTarget,setReturnTarget]=useState('/2029');
  useEffect(()=>{applySeo({title:'משלימים כניסה',path:'/auth/callback',noindex:true});},[]);
  const {user,loading}=useAuth(),navigate=useNavigate(),completed=useRef(false);
  useEffect(()=>{
    if(loading||completed.current)return;
    completed.current=true;
    const target=consumePreviewOAuthReturn();setReturnTarget(target);
    if(user)navigate(target,{replace:true});
    else window.history.replaceState(null,'','/auth/callback');
  },[user,loading,navigate]);
  return <main dir="rtl" role="status" style={{padding:32}}>
    {loading||user?<p>משלימים את הכניסה לחשבון…</p>:<><p>הכניסה לא הושלמה. אפשר לנסות שוב.</p><Link to={"/login?returnTo="+encodeURIComponent(returnTarget)}>חזרה לכניסה</Link></>}
  </main>;
}
