// Test input preflight, not live-service acceptance. Runtime replay still rejects
// every unmapped request. These are minimum semantic requirements, not permission
// to invent responses or a replacement for the full browser/navigation gates.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const zlib=require('node:zlib');
function decodeSnapshot(bytes){
  const data=JSON.parse(zlib.gunzipSync(bytes));
  assert.ok(data&&typeof data==='object'&&!Array.isArray(data)&&Object.keys(data).length,'Empty snapshot is not representative test data');
  for(const [key,row] of Object.entries(data)){
    assert.ok(/^(GET|HEAD|POST|OPTIONS) https?:\/\//.test(key)&&row&&Number.isInteger(row.status)&&row.status>=100&&row.status<=599&&typeof row.body==='string','Malformed frozen response');
    assert.equal(Buffer.from(row.body,'base64').toString('base64'),row.body,'Noncanonical or corrupted response body');
  }
  return data;
}
function parseKey(key){
  const match=key.match(/^(GET|HEAD|POST|OPTIONS) (https?:\/\/\S+) (.*)$/);
  assert.ok(match,'Malformed request key');
  let body=match[3],headers=null;
  const signature=body.match(/ (\{"prefer":.*\})$/);
  if(signature){headers=JSON.parse(signature[1]);body=body.slice(0,-signature[0].length);}
  const args=body?JSON.parse(body):null;
  if(headers)assert.deepEqual(Object.keys(headers),['prefer','range','accept-profile'],'Header signature must retain all three fields');
  return {method:match[1],url:new URL(match[2]),args,headers};
}
function imageWidth(bytes){
  // JPEG SOF markers (including progressive), without decoding/re-encoding bytes.
  if(bytes[0]!==0xff||bytes[1]!==0xd8)return null;
  for(let p=2;p+8<bytes.length;){
    if(bytes[p++]!==0xff)return null;
    while(bytes[p]===0xff)p++;
    const marker=bytes[p++];if(marker===0xd9||marker===0xda)return null;
    const length=bytes.readUInt16BE(p);if(length<2||p+length>bytes.length)return null;
    if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker))return bytes.readUInt16BE(p+5);
    p+=length;
  }
  return null;
}
function coverageReport(data,kind){
  assert.ok(['performance','navigation','browser'].includes(kind),'Unknown snapshot contract');
  const entries=Object.entries(data).map(([key,row])=>{
    const request=parseKey(key);let json=null;try{json=JSON.parse(Buffer.from(row.body,'base64'));}catch{}
    return {key,row,...request,json};
  });
  const checks=[];
  const check=(name,run)=>{try{run();checks.push({name,passed:true});}catch(error){checks.push({name,passed:false,reason:error.message.split('\n')[0]});}};
  const success=e=>[200,206].includes(e.row.status);
  const rowsFor=(endpoint,predicate=()=>true)=>entries.filter(e=>e.url.pathname===`/rest/v1/${endpoint}`&&predicate(e));
  const requireRows=(endpoint,predicate,min=1)=>{
    const found=rowsFor(endpoint,predicate);assert.ok(found.length,`Missing ${endpoint} response`);
    assert.ok(found.some(e=>success(e)&&Array.isArray(e.json)&&e.json.length>=min),`Incomplete ${endpoint} rows`);return found;
  };
  const post=slug=>{
    const found=requireRows('posts',e=>e.url.searchParams.get('select')==='*'&&e.url.searchParams.get('slug')===`in.(${slug})`);
    const row=found.flatMap(e=>e.json||[]).find(p=>p.slug===slug);
    assert.ok(row&&typeof row.content==='string'&&row.content.replace(/<[^>]*>/g,' ').length>=800,'Full authored primary post body required');return row;
  };
  const lookup=value=>requireRows('rpc/fn_number_lookup',e=>e.method==='POST'&&e.args?.p_value===value)
    .some(e=>e.json.some(r=>r.value===value&&r.phrase&&r.method));
  const trace=phrase=>assert.ok(rowsFor('rpc/gematria_method_trace',e=>e.args?.p_phrase===phrase).some(e=>success(e)&&e.json?.input===phrase&&Array.isArray(e.json.steps)&&e.json.steps.length&&e.json.verification?.parity===true),'Verified nonempty method trace required');
  check('request header signatures',()=>{
    assert.ok(entries.every(e=>kind==='navigation'?e.headers&&Object.values(e.headers).every(v=>typeof v==='string'):!e.headers),'Snapshot request/header mode differs from runner');
  });
  check('public flags and World/Home content',()=>{
    requireRows('site_flags');requireRows('posts',e=>e.url.searchParams.get('select')?.includes('excerpt'),kind==='browser'?1:32);
    requireRows('nodes',e=>e.url.searchParams.get('is_active')==='eq.true');
  });
  if(kind!=='browser'){
    check('complete seventh-to-tenth primary body',()=>post('seventh-to-tenth-sefirot-2027'));
    if(kind==='performance')check('seventh-to-tenth original and native mobile rendition',()=>{
      const original=post('seventh-to-tenth-sefirot-2027').image_url;
      assert.match(original||'',/\/reading-v\d+\.jpg$/);
      const rendition=original.replace('/object/public/','/render/image/public/')+'?width=768&resize=contain&quality=90&format=origin';
      for(const [url,width] of [[original,1586],[rendition,768]]){
        const entry=entries.find(e=>e.method==='GET'&&e.url.href===url);
        assert.ok(entry&&entry.row.status===200,'Original/rendition binary missing');
        const bytes=Buffer.from(entry.row.body,'base64');assert.equal(imageWidth(bytes),width,'Original JPEG bytes/dimensions required; UTF8 conversion is invalid');
        if(width===768)assert.ok(bytes.length<=64*1024,'Existing rendition byte budget exceeded');
      }
    });
    check('nonempty World convergence and post trace data',()=>{
      for(const value of [1820,98])assert.ok(rowsFor('rpc/convergence_meter',e=>e.args?.p_n===value).some(e=>success(e)&&e.json?.number===value&&Array.isArray(e.json.layers)&&e.json.layers.length));
      assert.ok(rowsFor('rpc/gematria_method_trace').some(e=>success(e)&&Array.isArray(e.json?.steps)&&e.json.steps.length&&e.json.verification?.parity===true));
    });
  }
  if(kind==='navigation'){
    check('catalog 2/8/24 with exact count, order and continuation parity',()=>{
      const page=(offset,limit,prefer)=>{
        const found=rowsFor('topic_cards_public',e=>e.url.searchParams.get('order')?.startsWith('meter_score.desc')&&!e.url.searchParams.has('numbers')&&!e.url.searchParams.has('or')&&e.url.searchParams.get('offset')===String(offset)&&e.url.searchParams.get('limit')===String(limit)&&e.headers?.prefer===prefer);
        assert.equal(found.length,1,'Exact catalog page and header signature required');
        const entry=found[0];assert.ok(success(entry)&&Array.isArray(entry.json)&&entry.json.length===limit,'Catalog row volume must be preserved');
        if(prefer==='count=exact')assert.match(entry.row.range||'',/^\d+-\d+\/\d+$/,'Exact content-range count required');
        return entry;
      };
      const initial=page(0,3,''),oldInitial=page(0,9,''),full=page(0,25,'count=exact'),next=page(2,23,'count=exact');
      assert.deepEqual(initial.json,full.json.slice(0,3));assert.deepEqual(oldInitial.json,full.json.slice(0,9));
      assert.deepEqual([...initial.json.slice(0,2),...next.json.slice(0,22)],full.json.slice(0,24));
      assert.equal(full.row.range.split('/')[1],next.row.range.split('/')[1],'Continuation total differs');
      assert.ok(Number(full.row.range.split('/')[1])>=25);
    });
    check('Topic navigation and return source',()=>requireRows('topic_cards_public',e=>e.url.searchParams.has('slug')&&e.json?.some(r=>r.findings&&r.title)));
  }
  if(kind==='browser'){
    check('complete authored Bennett body and verified focus',()=>{
      const body=post('bennett-melach-631-78').content;assert.match(body,/נפתלי בנט/);assert.match(body,/631/);trace('נפתלי בנט');
      assert.ok(rowsFor('rpc/fn_method_value',e=>e.args?.p_phrase==='נפתלי בנט').some(e=>success(e)&&e.json===631),'Saved equality must be engine verified');
    });
    for(const value of [98,1237,596,1118,358,878,1326,631])check(`Number ${value} canonical rows`,()=>assert.ok(lookup(value)));
    for(const slug of ['888-yeshua','98-ikuv-geula'])check(`Topic ${slug}`,()=>requireRows('topic_cards_public',e=>e.url.searchParams.get('slug')===`eq.${slug}`&&e.json?.some(r=>r.findings&&r.title)));
    check('published media for rich World anchors',()=>requireRows('gallery_images',e=>e.json?.some(r=>r.published===1&&r.min_tier===0&&r.image_url)));
  }
  return {kind,responses:entries.length,checks,passed:checks.every(c=>c.passed)};
}
function requireCoverage(data,kind){
  const report=coverageReport(data,kind);
  assert.ok(report.passed,'BLOCKED: incomplete semantic snapshot coverage: '+report.checks.filter(c=>!c.passed).map(c=>c.name).join('; '));return report;
}
function verifyManifestEntry(entry,bytes){
  assert.ok(entry&&/^[a-f0-9]{64}$/.test(entry.sha256||''),'Exact reviewed snapshot hash required');
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),entry.sha256,'Snapshot digest mismatch');
  assert.ok(entry.source?.reference&&entry.source?.date&&entry.source?.sha256&&['public-reviewed','restricted-existing-artifact'].includes(entry.source.access),'Source, date, source hash and approved access classification required');
  assert.match(entry.source.sha256,/^[a-f0-9]{64}$/);
  assert.ok(entry.privacyReview?.reference&&entry.privacyReview?.decision==='approved-for-this-location','Explicit content review required before publishing/staging bodies');
  assert.ok(entry.coverage?.reference,'Coverage evidence reference required');
}
module.exports={decodeSnapshot,parseKey,imageWidth,coverageReport,requireCoverage,verifyManifestEntry};
