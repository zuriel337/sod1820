// Same canonical request and caller JWT. The Preview server adds only its own
// platform identity; no model call is retried after an ambiguous response.
export async function invokePreviewRaziel({client,body,signal,fetchImpl=fetch}) {
  if(signal?.aborted)return {data:null,error:new Error('aborted')};
  const {data,error}=await client.auth.getSession();
  const token=data?.session?.access_token;
  if(error||!token)return {data:null,error:error||new Error('authentication_required')};
  try{
    const response=await fetchImpl('/api/preview-raziel',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body),...(signal?{signal}:{}),credentials:'same-origin',redirect:'error'});
    const result=await response.json();
    return response.ok?{data:result,error:null}:{data:null,error:new Error(result.error||'preview_research_failed')};
  }catch(error){return {data:null,error};}
}
