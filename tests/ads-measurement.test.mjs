import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import vm from 'node:vm';
const read = name => readFileSync(new URL('../'+name,import.meta.url),'utf8');
function visit(path,{previous,gpc=false,dnt=false}={}) {
 const w = new JSDOM('<body></body>',{url:'https://www.builderk.com'+path,runScripts:'outside-only'}).window;
 if(previous) for(const key of ['builderk-lead-attribution-v1','builderk-ad-measurement-v1']){
  const value=previous.sessionStorage.getItem(key);if(value)w.sessionStorage.setItem(key,value);
 }
 Object.defineProperty(w.navigator,'globalPrivacyControl',{value:gpc});Object.defineProperty(w.navigator,'doNotTrack',{value:dnt?'1':null});
 w.eval(read('scripts/lead-attribution.js'));return w;
}
const payload=w=>JSON.parse(JSON.stringify(w.BuilderKAttribution.payload()));
for(const id of ['gclid','wbraid','gbraid']) test(id+' requires consent and survives navigation after consent',()=>{
 const a=visit('/?'+id+'=Audit_Click_123456&bk_campaign_id=23660601595&bk_adgroup_id=193913054843');
 assert.equal(payload(a).first_source,'google');assert.equal(payload(a)['first_'+id],'');
 assert(!a.sessionStorage.getItem('builderk-lead-attribution-v1').includes('Audit_Click_123456'));
 a.BuilderKAttribution.setMeasurementConsent(true);
 const b=visit('/contact',{previous:a});
 assert.equal(payload(b)['first_'+id],'Audit_Click_123456');assert.equal(payload(b).bk_campaign_id,'23660601595');
 assert.equal(payload(b).ad_measurement_consent,'granted');
 b.BuilderKAttribution.setMeasurementConsent(false);
 assert.equal(payload(b)['first_'+id],'');assert(!b.sessionStorage.getItem('builderk-lead-attribution-v1').includes('Audit_Click_123456'));
 a.close();b.close();
});
for(const option of ['gpc','dnt']) test(option+' prevents ad identifier collection even if allow is invoked',()=>{
 const w=visit('/?gclid=Audit_Click_123456',{[option]:true});w.BuilderKAttribution.setMeasurementConsent(true);
 assert.equal(payload(w).ad_measurement_consent,'denied');assert.equal(payload(w).first_gclid,'');w.close();
});
test('a later campaign does not inherit the previous paid click identifier',()=>{
 const a=visit('/?gclid=Audit_Click_123456&utm_campaign=old');a.BuilderKAttribution.setMeasurementConsent(true);
 const b=visit('/contact?utm_source=facebook&utm_campaign=new',{previous:a});
 assert.equal(payload(b).first_gclid,'Audit_Click_123456');assert.equal(payload(b).last_gclid,'');assert.equal(payload(b).last_source,'facebook');a.close();b.close();
});
test('unchanged retries use one identity and count CRM receipt when it recovers after fallback',async()=>{
 const w=visit('/contact');const events=[],bodies=[];let fail=true;
 w.gtag=(...args)=>events.push(args);w.eval(read('scripts/lead-submit.js'));
 w.fetch=async(url,opt)=>{if(url==='/api/webhook'){bodies.push(JSON.parse(opt.body));return{ok:!fail,json:async()=>({success:true,received:true,opportunity:true})};}return{ok:true,json:async()=>({ok:true})};};
 const data={email:'qa@example.test',name:'Audit Fixture',phone:'2025550123'};
 await w.BuilderKLeadSubmit.submit(data,'/mock-fallback');fail=false;await w.BuilderKLeadSubmit.submit({...data},'/mock-fallback');
 assert.equal(bodies[0].submission_id,bodies[1].submission_id);assert.equal(events.filter(x=>x[1]==='conversion').length,1);assert.equal(events.filter(x=>x[1]==='crm_lead_received').length,1);w.close();
});
const field={first_touch:'r6O9RljxSBj3PxPsGOOg',last_touch:'cNtoGEjf2oz1CWlWhfwd',first_source:'mxlSVlzipI3wNOsO7chr',first_campaign:'xizi5rIxdIKFPXWqyMXP',last_campaign:'aPv418oAledts2cZnXAM',q:'eQmHfW9Q3KSCnXs8lAMh',delivery:'jZoh9X0cpNSNUsMF8VXX'};
async function backend({replay=false,existingFields=[],failOpportunity=false,body,wrongIdentity=false,notesFail=false}={}){
 const request=body||{form_type:'website-contact',form_version:'2',submission_id:'12345678-1234-4234-8234-123456789abc',name:'Audit Fixture',email:'qa@example.test',phone:'2025550123',lot_ownership:'Still looking',budget:'$400K to $700K',timeline:'Just exploring',project_location:'Orlando',first_source:'google',first_campaign:'initial',last_source:'google',last_campaign:'latest',first_gclid:'Audit_Click_123456',last_gclid:'Audit_Click_123456',ad_measurement_consent:'granted'};
 const calls=[];let saved=existingFields;
 const contact=()=>({id:'fixture-contact',locationId:wrongIdentity?'other-location':'fixture-location',email:'qa@example.test',phone:'+12025550123',customFields:saved});
 const reply=(data,status=200)=>({ok:status<400,status,json:async()=>data});
 const sandbox={process:{env:{GHL_PIT_TOKEN:'fixture-only',GHL_LOCATION_ID:'fixture-location'}},AbortSignal,console:{error(){}},fetch:async(url,options={})=>{
  const method=options.method||'GET',data=JSON.parse(options.body||'null');calls.push({url,method,data});
  if(url.endsWith('/contacts/'))return reply({meta:{contactId:'fixture-contact'}},409);
  if(url.endsWith('/notes'))return method==='GET'?reply({notes:replay?[{body:'BuilderK website request\nsubmission_id: '+request.submission_id}]:[]},notesFail?403:200):reply({note:{id:'fixture-note'}},201);
  if(url.includes('/pipelines?'))return reply({pipelines:[{id:'p',name:'Builderk',stages:[{id:'s',name:'Lead Generation'}]}]});
  if(url.endsWith('/opportunities/'))return failOpportunity?reply({},403):reply({opportunity:{id:'opp'}},201);
  assert(url.endsWith('/contacts/fixture-contact'));
  if(method==='PUT') {const merged=new Map(saved.map(f=>[f.id,f.value]));for(const f of data.customFields||[])merged.set(f.id,f.field_value);saved=[...merged].map(([id,value])=>({id,value}));}
  return reply({contact:contact(),succeeded:true});
 }};
 vm.createContext(sandbox);vm.runInContext(read('api/webhook.js').replace('export default async function handler','async function handler')+'\nthis.handler=handler;',sandbox);
 const res={code:200,setHeader(){},status(x){this.code=x;return this;},json(x){this.body=x;return this;}};
 await sandbox.handler({method:'POST',body:request},res);return {res,calls,saved};
}
test('backend preserves a recorded first touch and human qualification while updating the latest request',async()=>{
 const {res,saved,calls}=await backend({existingFields:[{id:field.first_touch,value:'original-json'},{id:field.first_source,value:'organic'},{id:field.q,value:'Qualified'},{id:'unrelated',value:'keep'}]});
 assert.equal(res.body.attributionSaved,true);const values=new Map(saved.map(f=>[f.id,f.value]));
 assert.equal(values.get(field.first_touch),'original-json');assert.equal(values.get(field.first_source),'organic');assert(!values.has(field.first_campaign));assert.equal(values.get(field.q),'Qualified');assert.equal(values.get('unrelated'),'keep');
 assert.equal(JSON.parse(values.get(field.last_touch)).gclid,'Audit_Click_123456');
 for(const c of calls.filter(x=>x.method==='PUT'))assert.deepEqual(Object.keys(c.data),['customFields']);
});
test('new website fields remain awaiting review, and failed opportunities create a reconciliation status',async()=>{
 const {res,saved}=await backend({failOpportunity:true});assert.equal(res.body.received,true);assert.equal(res.body.opportunity,false);
 const values=new Map(saved.map(f=>[f.id,f.value]));assert.equal(values.get(field.q),'Awaiting review');assert.match(values.get(field.delivery),/handoff needs review/);
});
test('a durable matching request note prevents repeated note and opportunity writes',async()=>{
 const {res,calls}=await backend({replay:true});assert.equal(res.body.duplicate,true);assert.equal(res.body.received,true);
 assert(!calls.some(x=>x.url.endsWith('/opportunities/')));assert(!calls.some(x=>x.url.endsWith('/notes')&&x.method==='POST'));
});
test('uncertain replay lookup does not blindly create another opportunity',async()=>{
 const {res,calls}=await backend({notesFail:true});assert.equal(res.code,502);assert(!calls.some(x=>x.url.endsWith('/opportunities/')));
});
test('unconfirmed contact identity prevents structured field changes without discarding the saved request',async()=>{
 const {res,calls}=await backend({wrongIdentity:true});assert.equal(res.body.received,true);assert.equal(res.body.attributionSaved,false);assert(!calls.some(x=>x.method==='PUT'));
});
test('website inquiry requires project details while calculator remains a separate email-only flow',async()=>{
 const bad=await backend({body:{form_type:'website-contact',email:'qa@example.test'}});assert.equal(bad.res.code,400);assert.equal(bad.calls.length,0);
 const calc=await backend({body:{form_type:'calculator-estimate',email:'qa@example.test'}});assert.equal(calc.res.body.received,true);
});
test('a Florida project does not invent the buyer residential state or postal code',async()=>{
 const {calls}=await backend();const contact=calls.find(call=>call.url.endsWith('/contacts/')).data;
 assert.equal(Object.hasOwn(contact,'state'),false);assert.equal(Object.hasOwn(contact,'postalCode'),false);
 const note=calls.find(call=>call.url.endsWith('/notes')&&call.method==='POST').data.body;
 assert.match(note,/project_location: Orlando/);
});
