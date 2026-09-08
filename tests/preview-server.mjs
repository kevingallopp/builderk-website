// Local QA only: suppress analytics, mock both lead destinations, never import the real webhook.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(new URL('..',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
let submissions=[];
http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(req.method==='POST'&&['/api/webhook','/__test/formspree','/__test/analytics'].includes(url.pathname)){
    let body='';for await(const chunk of req)body+=chunk;
    submissions.push({path:url.pathname,body});
    const fail=body.includes('failure%40example.test')||body.includes('failure@example.test');
    res.writeHead(fail?503:200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:!fail,success:!fail,received:!fail,opportunity:!fail}));return;
  }
  if(url.pathname==='/__test/results'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(submissions));return;}
  try{
    let pathname=decodeURIComponent(url.pathname);if(pathname==='/')pathname='/index.html';
    let file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep))throw Error('outside root');
    if(!path.extname(file))file+=pathname==='/referral-program'?'/index.html':'.html';
    let data=await readFile(file);const ext=path.extname(file);
    if(ext==='.html'){
      let html=data.toString();
      html=html.replace(/<script[^>]*src="https:[^"]*"[^>]*><\/script>/g,'');
      html=html.replace(/<script[^>]*>[\s\S]*?<\/script>/g,block=>/ttq\.load|gtag\('config'/.test(block)?'':block);
      html=html.replace(/<noscript>[\s\S]*?<\/noscript>/g,'');
      html=html.replaceAll('https://formspree.io/f/mreybpyl','/__test/formspree');
      html=html.replace('</head>',`<script>window.gtag=function(){fetch('/__test/analytics',{method:'POST',body:JSON.stringify(Array.from(arguments))})};</script></head>`);
      data=html;
    }
    res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'})[ext]||'application/octet-stream'});res.end(data);
  }catch(error){res.writeHead(404);res.end('Not found');}
}).listen(4178,'127.0.0.1',()=>console.log('Local isolated QA: http://127.0.0.1:4178'));
