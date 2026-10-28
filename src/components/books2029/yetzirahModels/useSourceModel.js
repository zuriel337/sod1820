import {useEffect,useMemo,useState} from 'react';
import {bindSourceModel} from './sourceModels.js';
let pending;
function load(){
  if(!pending)pending=Promise.all(['structures','units','source-readings'].map(async name=>{const r=await fetch(`/book-data/sefer-yetzirah.${name}.json`);if(!r.ok)throw new Error('SOURCE_UNAVAILABLE');return r.json();})).then(([structures,units,readings])=>({structures,units,readings})).catch(error=>{pending=null;throw error;});
  return pending;
}
export function useSourceModel(key,supplied){
  const [bundle,setBundle]=useState(null),[error,setError]=useState(null),[attempt,setAttempt]=useState(0);
  useEffect(()=>{if(supplied)return;let live=true;setError(null);load().then(value=>{if(live)setBundle(value);},err=>{if(live)setError(err.message);});return()=>{live=false;};},[supplied,attempt]);
  const bound=useMemo(()=>{if(!(supplied||bundle))return {};try{return {model:bindSourceModel(supplied||bundle,key)};}catch(e){return {error:e.message};}},[supplied,bundle,key]);
  return {model:bound.model,error:error||bound.error,retry:()=>{pending=null;setBundle(null);setAttempt(n=>n+1);},bundle:supplied||bundle};
}
