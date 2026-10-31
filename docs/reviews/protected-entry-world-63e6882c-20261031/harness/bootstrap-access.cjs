// Reuse only Vercel's deployment-auth cookies in memory. Never serialize to disk/logs.
const {request}=require('playwright');
const origin='https://sod1820-26of53pw9-sod1820-s-projects.vercel.app';
module.exports=async function bootstrap(access){
  const proxy=process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}:undefined;
  const api=await request.newContext(proxy?{proxy}:{});
  let status=null;
  try{
    let url=access;
    for(let hop=0;hop<8;hop++){
      let response;
      for(let attempt=0;attempt<4;attempt++){
        response=await api.get(url,{maxRedirects:0,timeout:30000});status=response.status();
        if(![429,502,503,504].includes(status))break;
        await new Promise(r=>setTimeout(r,500*2**attempt));
      }
      if(status>=300&&status<400){const next=new URL(response.headers().location,url);if(next.origin!==origin)throw new Error();url=next.href;continue;}
      if(!response.ok())throw new Error();break;
    }
    const identity=await api.get(origin+'/preview-identity.json',{maxRedirects:0});status=identity.status();
    const body=await identity.json();if(body.sha!=='63e6882c3b7b4004d337927c7231728a7612d452'||body.target!=='preview')throw new Error();
    const state=await api.storageState();
    const host=new URL(origin).hostname;
    const cookies=state.cookies.filter(c=>c.domain===host||c.domain==='.'+host||c.domain==='.vercel.app');
    if(!cookies.length)throw new Error();
    console.log('Protected Preview bootstrap PASS; deployment cookies retained in memory only');
    return JSON.stringify(cookies);
  }catch{throw new Error('Protected Preview bootstrap blocked, HTTP '+status+'; credentials withheld');}
  finally{await api.dispose();}
};
