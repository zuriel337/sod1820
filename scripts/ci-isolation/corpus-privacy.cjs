// Publication preflight for this explicitly reviewed offline experiment.
// This is an allowlist check, not a claim that a regex establishes publicity.
const assert=require('node:assert/strict');
const forbidden=/^(?:_.*|(?:.*_)?user_id|visitor_id|email|phone|password|secret|(?:.*_)?token|api_key|service_role_key|access_code|dossier_settings|engine_run_id|verified_run_id)$/i;
const contributorFields=['active','display_name','id','kind','role','slug','trusted'];
function reviewCorpus(snapshot,{authors,creators,contributorCards=[]}){
 assert.ok(Array.isArray(authors)&&Array.isArray(creators),'Reviewed public display attribution allowlists required');
 const lists={author:new Set(authors),authors:new Set(authors),created_by:new Set(creators)};
 let responses=0;
 function scan(value,path=[]){
  if(Array.isArray(value)){for(const [i,item] of value.entries())scan(item,[...path,i]);return;}
  if(value&&typeof value==='object'){
   for(const [key,item] of Object.entries(value)){
    assert.ok(key==='token'||!forbidden.test(key),'Excluded corpus field: '+[...path,key].join('.'));
    if(Object.hasOwn(lists,key)&&item!==null){
     const labels=key==='authors'?item:[item];
     assert.ok(Array.isArray(labels)&&labels.every(label=>typeof label==='string'&&lists[key].has(label)),'Unreviewed public attribution: '+[...path,key].join('.'));
    }
    // A trace step's "token" is the canonical mathematical letter, preserved
    // exactly. Authentication tokens are never an allowed corpus field.
    if(key==='token')assert.ok(path.at(-2)==='steps'&&typeof item==='string'&&/^[\u0590-\u05ff\s'"״׳]+$/u.test(item),'Non-mathematical token in corpus');
    scan(item,[...path,key]);
   }
  }else if(typeof value==='string')assert.ok(!/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value),'Contact data in corpus at '+path.join('.'));
 }
 for(const [key,row] of Object.entries(snapshot)){
  if(row.type?.split(';')[0]!=='application/json'||key.startsWith('HEAD '))continue;
  const value=JSON.parse(Buffer.from(row.body,'base64').toString('utf8'));
  if(/^GET https:\/\/[^/]+\/rest\/v1\/contributors\?/.test(key)){
   assert.ok(Array.isArray(value)&&value.length>0,'Approved contributor response must contain its source rows');
   for(const card of value){
    assert.deepEqual(Object.keys(card).sort(),contributorFields,'Only the seven approved public-card fields may be retained');
    const approved=contributorCards.find(source=>source.id===card.id);
    assert.deepEqual(card,approved,'Contributor must match the explicitly reviewed public source DTO');
   }
  }
  scan(value);responses++;
 }
 return {responses,excludedFields:0,unreviewedAttribution:0,contactStrings:0};
}
module.exports={reviewCorpus};
