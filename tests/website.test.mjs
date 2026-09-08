import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
const read = path => readFileSync(new URL('../'+path, import.meta.url),'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
function dom(page='contact.html',query='') {
  const d = new JSDOM(read(page),{url:'https://www.builderk.com/'+page.replace('.html','')+query,runScripts:'outside-only'});
  const w=d.window; w.scrollTo=()=>{}; w.AbortController=AbortController;
  return {d,w};
}
function evalScript(w,path){w.eval(read(path));}
function inline(w,page,marker){
  const script=[...read(page).matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].find(m=>m[1].includes(marker));
  assert.ok(script,marker); w.eval(script[1]);
}
test('all shipped inline JavaScript parses',()=>{
  const files=readdirSync(new URL('..',import.meta.url)).filter(x=>x.endsWith('.html')).concat('referral-program/index.html');
  for(const name of files)for(const match of read(name).matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g))
    if(!/application\/ld\+json/.test(match[1]))new vm.Script(match[2],{filename:name});
});
test('1977 plan carries its exact area, 4 beds and 2.5 baths',async()=>{
  const {d,w}=dom('floor-plan-1977-sq-ft.html');evalScript(w,'scripts/pricing-config.js');evalScript(w,'scripts/plan-pricing.js');await tick();
  const link=w.document.querySelector('a[href^="/calculator?"]');const q=new URL(link.href).searchParams;
  assert.equal(q.get('sqft'),'1977');assert.equal(q.get('beds'),'4');assert.equal(q.get('baths'),'2.5');d.window.close();
});
test('calculator preserves exact plan, choices, financial inputs and range through Contact and edit',async()=>{
  const {d,w}=dom('calculator.html','?sqft=1977&beds=4&baths=2.5&plan=floor-plan-1977-sq-ft&city_interest=miami');
  evalScript(w,'scripts/pricing-config.js');evalScript(w,'scripts/lead-context.js');inline(w,'calculator.html','// ===== CALCULATOR');await tick();
  assert.equal(w.state.sqft,1977);assert.equal(w.state.baths,2.5);assert.equal(w.state.beds,4);
  w.setFinish('luxury');w.setGarage(3);w.toggleExtra(w.document.querySelector('[data-extra="pool"]'));
  w.document.getElementById('lot-value-input').value='150000';w.document.getElementById('lot-balance-input').value='40000';w.setDown(20);
  const saved=w.sessionStorage.getItem('builderk-planning-context-v1');const payload=w.estimatePayload();
  const contact=dom();contact.w.sessionStorage.setItem('builderk-planning-context-v1',saved);evalScript(contact.w,'scripts/lead-context.js');
  const form=contact.w.document.querySelector('form');contact.w.BuilderKLeadContext.attach(form);
  assert.match(form.textContent,/1977 sq ft · 4 beds · 2.5 baths · luxury/);
  assert.equal(form.elements.calc_extras.value,'pool');assert.equal(form.elements.city_interest.value,'miami');assert.equal(form.elements.estimate_range.value,payload.estimate_range);
  const edit=dom('calculator.html','?resume=1');edit.w.sessionStorage.setItem('builderk-planning-context-v1',saved);
  evalScript(edit.w,'scripts/pricing-config.js');evalScript(edit.w,'scripts/lead-context.js');inline(edit.w,'calculator.html','// ===== CALCULATOR');await tick();
  assert.equal(edit.w.state.finish,'luxury');assert.equal(edit.w.state.garage,3);assert.equal(edit.w.state.baths,2.5);assert.equal(edit.w.state.lotValue,150000);assert.equal(edit.w.state.cashDown,w.state.cashDown);
  assert.equal(edit.w.estimatePayload().estimate_range,payload.estimate_range);
  [d,contact.d,edit.d].forEach(x=>x.window.close());
});
test('expired or unavailable session storage does not break Contact',()=>{
  const {d,w}=dom();evalScript(w,'scripts/lead-context.js');w.sessionStorage.setItem('builderk-planning-context-v1',JSON.stringify({savedAt:1,data:{calc_sqft:1977}}));
  assert.equal(Object.keys(w.BuilderKLeadContext.read()).length,0);
  Object.defineProperty(w,'sessionStorage',{get(){throw Error('blocked');}});assert.doesNotThrow(()=>w.BuilderKLeadContext.save({calc_sqft:2000}));assert.doesNotThrow(()=>w.BuilderKLeadContext.attach(w.document.querySelector('form')));d.window.close();
});
for (const [name,crm,formspree,expected] of [
  ['both receipts',true,true,true],['Formspree receipt despite CRM failure',false,true,true],
  ['CRM receipt despite Formspree failure',true,false,true],['both rejected',false,false,false]
]) test(name+' controls conversion',async()=>{
  const {d,w}=dom();const events=[];w.gtag=(...args)=>events.push(args);
  w.fetch=async url=>({ok:true,json:async()=>url==='/api/webhook'?{success:crm,received:crm,opportunity:crm}:{ok:formspree}});
  evalScript(w,'scripts/lead-submit.js');const result=await w.BuilderKLeadSubmit.submit({email:'qa@example.test'},'https://formspree.io/f/test');
  assert.equal(result.received,expected);assert.equal(events.filter(x=>x[1]==='conversion').length,expected?1:0);assert.ok(!JSON.stringify(events).includes('qa@example.test'));d.window.close();
});
test('Formspree current next response confirms receipt without a legacy ok field',async()=>{
  const {d,w}=dom();const events=[];w.gtag=(...args)=>events.push(args);
  w.fetch=async url=>({ok:true,json:async()=>url==='/api/webhook'?{received:false}:{next:'https://formspree.io/thanks'}});
  evalScript(w,'scripts/lead-submit.js');const result=await w.BuilderKLeadSubmit.submit({email:'qa@example.test'},'https://formspree.io/f/test');
  assert.equal(result.received,true);assert.equal(events.filter(x=>x[1]==='conversion').length,1);d.window.close();
});
test('HTTP 200 without a receipt and network failures never count and never retry automatically',async()=>{
  const {d,w}=dom();let calls=0;const events=[];w.gtag=(...x)=>events.push(x);
  w.fetch=async url=>{calls++;if(url.includes('formspree'))throw Error('lost response');return {ok:true,json:async()=>({success:true})};};
  evalScript(w,'scripts/lead-submit.js');const result=await w.BuilderKLeadSubmit.submit({email:'qa@example.test'},'https://formspree.io/f/test');
  assert.equal(result.received,false);assert.equal(calls,2);assert.equal(events.length,0);d.window.close();
});
test('form keeps entries on failure and suppresses double submits during delivery and after success',async()=>{
  const {d,w}=dom();evalScript(w,'scripts/lead-submit.js');const form=w.document.querySelector('form');form.reportValidity=()=>true;
  form.elements.name.value='Test visitor';let release;let calls=0;let ok=false;
  w.fetch=async()=>{calls++;await new Promise(r=>release=r);return {ok:true,json:async()=>({success:ok,received:ok})};};
  // One destination lets us release its held response deterministically.
  form.removeAttribute('action');Object.defineProperty(form,'action',{value:null});w.BuilderKLeadSubmit.bind(form,'website-contact');
  const submit=()=>form.dispatchEvent(new w.Event('submit',{cancelable:true}));submit();submit();assert.equal(calls,1);
  release();await tick();assert.equal(form.elements.name.value,'Test visitor');assert.equal(form.querySelector('button[type="submit"]').disabled,false);
  ok=true;submit();release();await tick();submit();assert.equal(calls,2);assert.match(form.textContent,/has been received/);d.window.close();
});
test('Miami and Tampa label baseline and match canonical tiers',()=>{
  for(const city of ['miami','tampa']){
    const {d,w}=dom(city+'.html');const section=[...w.document.querySelectorAll('section')].find(x=>x.innerHTML.includes('Central Florida Pricing Reference'));
    assert.match(section.textContent,/not .* pricing/);assert.deepEqual([...section.querySelectorAll('.price')].map(x=>x.textContent),['$160 to $180','$180 to $220','$220 to $280+']);d.window.close();
  }
});

// Handler tests run in an isolated VM with mocked upstream APIs, never real credentials or leads.
async function webhook(body,scenario='success'){
  const calls=[];const sandbox={process:{env:{GHL_PIT_TOKEN:'test-only',GHL_LOCATION_ID:'test-location'}},console:{log(){},error(){}},AbortSignal,
    fetch:async(url,options)=>{calls.push({url,payload:JSON.parse(options.body||'null')});
      if(scenario==='network')throw Error('unavailable');
      let response=url.endsWith('/notes')?{note:{id:'note-1'}}:url.includes('/pipelines?')?{pipelines:[{id:'p1',name:'Builderk',stages:[{id:'s1',name:'Lead Generation'}]}]}:url.endsWith('/opportunities/')?{opportunity:{id:'o1'}}:{contact:{id:'c1'}};
      if(scenario==='duplicate'&&url.endsWith('/contacts/'))return {ok:false,status:400,json:async()=>({meta:{contactId:'c1'}})};
      if(scenario==='note-failure'&&url.endsWith('/notes'))return {ok:false,status:403,json:async()=>({})};
      if(scenario==='note-no-id'&&url.endsWith('/notes'))response={};
      if(scenario==='missing-stage'&&url.includes('/pipelines?'))response={pipelines:[]};
      if(scenario==='opp-network'&&url.endsWith('/opportunities/'))throw Error('lost response');
      return {ok:true,status:201,json:async()=>response};
    }};
  vm.createContext(sandbox);vm.runInContext(read('api/webhook.js').replace('export default async function handler','async function handler')+'\nthis.handler=handler;',sandbox);
  const res={code:200,setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
  await sandbox.handler({method:'POST',body},res);return {res,calls};
}
for(const scenario of ['success','duplicate','missing-stage','opp-network'])test('CRM '+scenario+' preserves context in contact note',async()=>{
  const {res,calls}=await webhook({email:'qa@example.test',name:'Test Visitor',message:'Keep this note',plan_interest:'floor-plan-1977-sq-ft',calc_sqft:1977,calc_baths:2.5,estimate_range:'$400,000 to $450,000',budget:'$400K to $700K'},scenario);
  assert.equal(res.body.received,true);const note=calls.find(x=>x.url.endsWith('/notes'));assert.match(note.payload.body,/calc_baths: 2.5/);assert.match(note.payload.body,/Keep this note/);
  if(scenario==='success')assert.equal(calls.find(x=>x.url.endsWith('/opportunities/')).payload.monetaryValue,550000);
  if(['missing-stage','opp-network'].includes(scenario))assert.equal(res.body.opportunity,false);
});
for(const scenario of ['note-failure','note-no-id','network'])test('CRM '+scenario+' never acknowledges estimate receipt',async()=>{
  const {res}=await webhook({email:'qa@example.test'},scenario);assert.equal(res.body.received,false);assert.equal(res.code,502);
});
test('invalid input rejected before upstream writes',async()=>{
  for(const body of [null,{},[],{email:'invalid'},{email:'qa@example.test',message:{}},{email:'qa@example.test',message:'x'.repeat(25000)}]){
    const {res,calls}=await webhook(body);assert.equal(res.code,400);assert.equal(calls.length,0);
  }
});
