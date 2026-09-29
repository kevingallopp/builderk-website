import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes,createCipheriv} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
// Explicit source directory; never copy the atlas or its client observation seed.
const option=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const source=option('--sourcepath'),keyfile=option('--keyfile');
if(!source||!keyfile)throw Error('Supply --sourcepath and external --keyfile');
const website=resolve(dirname(fileURLToPath(import.meta.url)),'..');
if(resolve(keyfile).startsWith(website+'/'))throw Error('Key file must be outside website repository');
const encodedKey=(await readFile(keyfile,'utf8')).trim();
if(!/^[A-Za-z0-9+/]{43}=$/.test(encodedKey))throw Error('Invalid key file');
const key=Buffer.from(encodedKey,'base64');
const names=['process-interactive.html','process-interactive.css','process-interactive.js','process-modules.js','process-map-v1.png'];
const types=['text/html; charset=utf-8','text/css; charset=utf-8','application/javascript; charset=utf-8','application/javascript; charset=utf-8','image/png'];
const assets={};
for(let i=0;i<names.length;i++){
 const name=names[i];let bytes=await readFile(resolve(source,name));
 if(name==='process-interactive.html'){
  let s=bytes.toString('utf8');
  s=s.replace('<a href="whole-picture.html">Company canvas</a>','<button type="button" disabled title="The previous local company canvas is not available on this hosted version.">Company canvas · local only</button>');
  for(const asset of names.slice(1))s=s.replaceAll('"'+asset+'"','"/vision/'+asset+'"');
  bytes=Buffer.from(s);
 }
 if(name==='process-interactive.js'){
  let s=bytes.toString('utf8');
  const old="const pilot=make('a','Open Selections pilot →');pilot.href='selections-pilot.html';d.append(pilot,make('p','Project-specific observation pilot. No automated writes or running agent team.'));";
  if(!s.includes(old))throw Error('Selections link changed; review hosted sanitization');
  s=s.replace(old,"d.append(make('p','Selections observation pilot is not available on this hosted version. Open the native module below; no client snapshots are published here.'));");
  bytes=Buffer.from(s);
 }
 assets[name]={type:types[i],base64:bytes.toString('base64')};
}
const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
cipher.setAAD(Buffer.from('builderk-vision-v1'));
const data=Buffer.concat([cipher.update(JSON.stringify(assets),'utf8'),cipher.final()]);
const bundle={iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')};
const target=resolve(website,'api/vision.js');
const prior=await readFile(target,'utf8');
if(!/const BUNDLE = .*; \/\/ END_BUNDLE/.test(prior))throw Error('Bundle marker missing');
await writeFile(target,prior.replace(/const BUNDLE = .*; \/\/ END_BUNDLE/,'const BUNDLE = '+JSON.stringify(bundle)+'; // END_BUNDLE'));
