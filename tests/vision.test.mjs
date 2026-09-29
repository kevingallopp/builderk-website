import {test,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {createHash,createCipheriv,randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import publishedHandler,{createHandler} from '../api/vision.js';
const testKey=randomBytes(32),iv=randomBytes(12);
const png=Buffer.from('synthetic image bytes');
const fixtures={
 'process-interactive.html':{type:'text/html; charset=utf-8',base64:Buffer.from('<h1>50 selectable modules</h1><button disabled>Company canvas · local only</button>'+['process-interactive.css','process-interactive.js','process-modules.js','process-map-v1.png'].map(x=>'<a href="/vision/'+x+'"></a>').join('')).toString('base64')},
 'process-interactive.css':{type:'text/css',base64:Buffer.from('body{color:white}').toString('base64')},
 'process-interactive.js':{type:'application/javascript',base64:Buffer.from('/* not available on this hosted version */').toString('base64')},
 'process-modules.js':{type:'application/javascript',base64:Buffer.from('window.processModuleInventory='+JSON.stringify(Array.from({length:50},(_,i)=>({id:'fixture-'+i})))).toString('base64')},
 'process-map-v1.png':{type:'image/png',base64:png.toString('base64')}
};
const cipher=createCipheriv('aes-256-gcm',testKey,iv);cipher.setAAD(Buffer.from('builderk-vision-v1'));
const encrypted=Buffer.concat([cipher.update(JSON.stringify(fixtures),'utf8'),cipher.final()]);
const testBundle={iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:encrypted.toString('base64')};
const handler=createHandler(testBundle);
const previous={user:process.env.VISION_ACCESS_USER,password:process.env.VISION_ACCESS_PASSWORD,key:process.env.VISION_BUNDLE_KEY};
beforeEach(()=>{process.env.VISION_ACCESS_USER='test-viewer';process.env.VISION_ACCESS_PASSWORD='test-password-only';process.env.VISION_BUNDLE_KEY=testKey.toString('base64');});
afterEach(()=>{for(const [key,value] of [['VISION_ACCESS_USER',previous.user],['VISION_ACCESS_PASSWORD',previous.password],['VISION_BUNDLE_KEY',previous.key]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}});
const good='Basic '+Buffer.from('test-viewer:test-password-only').toString('base64');
function call({auth=good,asset,url='/api/vision',method='GET',endpoint=handler}={}){const headers={};let body;const req={url,method,headers:auth===null?{}:{authorization:auth},query:asset===undefined?{}:{asset}};const res={statusCode:0,setHeader(k,v){headers[k.toLowerCase()]=v;},end(value){body=Buffer.isBuffer(value)?value:Buffer.from(value);}};endpoint(req,res);return {status:res.statusCode,headers,body,text:body.toString()};}
test('missing configuration fails closed even with credentials',()=>{delete process.env.VISION_ACCESS_PASSWORD;const r=call();assert.equal(r.status,503);assert.ok(!r.text.includes('selectable modules'));});
test('every allowlisted asset and direct function request require authentication',()=>{for(const asset of ['process-interactive.html','process-interactive.css','process-interactive.js','process-modules.js','process-map-v1.png']){for(const auth of [null,'Basic invalid','Bearer token']){const r=call({asset,auth});assert.equal(r.status,401);assert.match(r.headers['www-authenticate'],/^Basic /);}}});
test('authenticated HTML preserves screen and uses gated absolute asset paths',()=>{const r=call();assert.equal(r.status,200);assert.match(r.text,/50 selectable modules/);for(const name of ['process-interactive.css','process-interactive.js','process-modules.js','process-map-v1.png'])assert.ok(r.text.includes('/vision/'+name));assert.ok(!r.text.includes('href="whole-picture.html"'));assert.match(r.text,/Company canvas · local only/);});
test('private-client seed and secondary local links are excluded',()=>{const r=call({asset:'process-interactive.js'});assert.ok(!r.text.includes("pilot.href='selections-pilot.html'"));assert.match(r.text,/not available on this hosted version/);for(const asset of ['selections-seed.js','selections-pilot.html','whole-picture.html','workflow_server.py'])assert.equal(call({asset}).status,404);});
test('encrypted image bytes roundtrip unchanged',()=>{const r=call({asset:'process-map-v1.png'});assert.equal(r.headers['content-type'],'image/png');assert.equal(createHash('sha256').update(r.body).digest('hex'),createHash('sha256').update(png).digest('hex'));});
test('all fifty module identities retained without client snapshot',()=>{const s=call({asset:'process-modules.js'}).text;const modules=JSON.parse(s.slice(s.indexOf('=')+1).trim().replace(/;$/,''));assert.equal(modules.length,50);assert.equal(new Set(modules.map(m=>m.id)).size,50);assert.ok(modules.every((entry,index)=>entry.id==='fixture-'+index));});
test('traversal, query arrays and duplicate parameters rejected',()=>{for(const asset of ['../selections-seed.js','%2e%2e%2fselections-seed.js','/process-map-v1.png',['process-map-v1.png'],'__proto__'])assert.equal(call({asset}).status,404);assert.equal(call({url:'/api/vision?asset=process-map-v1.png&asset=selections-seed.js'}).status,404);});
test('non-GET never serves protected content',()=>{for(const method of ['POST','PUT','DELETE','OPTIONS','HEAD']){const r=call({method});assert.equal(r.status,405);assert.equal(r.headers.allow,'GET');}});
test('all response outcomes disable caching and indexing',()=>{for(const r of [call(),call({auth:null}),call({asset:'bad'})]){assert.match(r.headers['cache-control'],/no-store/);assert.equal(r.headers['x-content-type-options'],'nosniff');assert.match(r.headers['x-robots-tag'],/noindex/);assert.match(r.headers['content-security-policy'],/connect-src 'none'/);assert.equal(r.headers.vary,'Authorization');}});
test('rewrites are restricted to vision while website config remains',async()=>{const c=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url)));assert.deepEqual(c.rewrites,[{source:'/vision',destination:'/api/vision?asset=process-interactive.html'},{source:'/vision/:asset',destination:'/api/vision?asset=:asset'}]);assert.equal(c.cleanUrls,true);assert.equal(c.trailingSlash,false);assert.equal(c.redirects.length,6);assert.equal(c.headers.length,5);});

test('missing or wrong bundle key fails closed without private output',()=>{delete process.env.VISION_BUNDLE_KEY;assert.equal(call().status,503);process.env.VISION_BUNDLE_KEY=randomBytes(32).toString('base64');const r=call();assert.equal(r.status,503);assert.ok(!r.text.includes('50 selectable'));});
test('tampered ciphertext and authentication tag fail closed',()=>{for(const bundle of [{...testBundle,data:Buffer.from('corrupt').toString('base64')},{...testBundle,tag:randomBytes(16).toString('base64')}])assert.equal(call({endpoint:createHandler(bundle)}).status,503);});
test('published artifact contains no private map labels or plaintext bundle',async()=>{const source=await readFile(new URL('../api/vision.js',import.meta.url),'utf8');for(const label of ['Land Search','Development Underwriting','Factory Network','whole-picture.html','PRIVATE_FIXTURE_CUSTOMER','PRIVATE_FIXTURE_PROJECT','const ASSETS ='])assert.ok(!source.includes(label));assert.ok(source.includes('const BUNDLE = {'));assert.equal(call({endpoint:publishedHandler}).status,503);});
