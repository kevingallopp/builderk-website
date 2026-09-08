import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {timingSafeEqual} from 'node:crypto';
import vm from 'node:vm';
const source=readFileSync(new URL('../api/lead-health.js',import.meta.url),'utf8')
 .replace("import {timingSafeEqual} from 'node:crypto';",'').replace('export default async function handler','async function handler');
async function run({method='GET',authorization='Bearer fixture-invalid',upstream=false,pipelines=[]}={}) {
 const requests=[];const sandbox={Buffer,timingSafeEqual,AbortSignal,process:{env:{GHL_PIT_TOKEN:'fixture-correct',GHL_LOCATION_ID:'fixture-location'}},fetch:async(url,options)=>{requests.push({url,method:options.method||'GET'});return {ok:upstream,json:async()=>({customFields:[],pipelines})};}};
 vm.createContext(sandbox);vm.runInContext(source+'\nthis.handler=handler;',sandbox);
 const res={code:200,setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
 await sandbox.handler({method,headers:{authorization}},res);return {res,requests};
}
test('private health diagnostics reject unauthenticated requests without CRM access',async()=>{const {res,requests}=await run();assert.equal(res.code,401);assert.equal(requests.length,0);});
test('health diagnostics never accept mutation methods',async()=>{const {res,requests}=await run({method:'POST',authorization:'Bearer fixture-correct'});assert.equal(res.code,405);assert.equal(requests.length,0);});
test('authenticated health checks use only GET and report missing configuration accurately',async()=>{const {res,requests}=await run({authorization:'Bearer fixture-correct',upstream:true});assert.equal(res.code,503);assert.equal(res.body.attributionFields,false);assert.equal(res.body.leadPipeline,false);assert.equal(requests.length,2);assert(requests.every(x=>x.method==='GET'));});
test('health accepts the numbered Lead Generation stage in the main BuilderK pipeline',async()=>{
 const {res}=await run({authorization:'Bearer fixture-correct',upstream:true,pipelines:[{name:'Partners',stages:[]},{name:'Main Pipeline Builderk',stages:[{name:'1. Lead Generation'}]}]});
 assert.equal(res.body.leadPipeline,true);
});
