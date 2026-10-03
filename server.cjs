'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=__dirname;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.csv':'text/csv; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
const pages=new Set(['index.html','embedded.html','host-demo.html','icbc-comparison.html','integration-guide.html','feature-map.html','v05-notes.html','report.html']);
const scripts=new Set(['app.js','engine.js','fixtures.js','planner.js','octopus.js','features.js','core.js','core-ui.js','beyond.js','minimal-ui.js','ux.js','ux-ui.js','runtime-config.js','embedded-config.js','host-adapter.js','host-demo.js','shell.js']);
const styles=new Set(['style.css','bank-theme.css','minimal.css','friendly.css','controls.css','report.css']);
function publicFile(relative){return pages.has(relative)||scripts.has(relative)||styles.has(relative)||relative==='official-rates.json'||relative==='docs/evidence.json'||relative==='data/import-example.csv'||/^data\/(reserve|timing|currency|career|purchase)\.(json|csv)$/.test(relative)||/^report-assets\/[a-z0-9-]+\.(png|svg)$/.test(relative);}
function createServer(){
 let cachedRates=null,cachedAt=0,pendingRates=null;
 return http.createServer(async(req,res)=>{
  const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'"};
  for(const [k,v] of Object.entries(headers))res.setHeader(k,v);
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'}).end();return;}
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
  if(pathname.startsWith('/module/'))pathname=pathname.slice(7);
  if(pathname==='/healthz'){res.writeHead(200,{'Content-Type':'application/json'}).end(req.method==='HEAD'?undefined:JSON.stringify({status:'ok',version:'0.7.0'}));return;}
  if(pathname==='/api/rates'){
   try{
    if(!cachedRates||Date.now()-cachedAt>60000){
     if(!pendingRates)pendingRates=require('./rates.cjs').refresh().then(data=>{cachedRates=data;cachedAt=Date.now();return data;}).finally(()=>{pendingRates=null;});
     await pendingRates;
    }
    res.writeHead(200,{'Content-Type':'application/json'}).end(req.method==='HEAD'?undefined:JSON.stringify(cachedRates));
   }catch{res.writeHead(502,{'Content-Type':'application/json'}).end(req.method==='HEAD'?undefined:JSON.stringify({error:'官方来源暂不可用；保留有日期的快照，不伪装为实时。'}));}return;
  }
  const relative=pathname==='/'?'index.html':pathname.slice(1);
  if(!publicFile(relative)){res.writeHead(404).end('Not found');return;}
  fs.readFile(path.join(root,relative),(err,data)=>{
   if(err){res.writeHead(404).end('Not found');return;}
   res.writeHead(200,{'Content-Type':types[path.extname(relative)]});res.end(req.method==='HEAD'?undefined:data);
  });
 });
}
if(require.main===module){const port=Number(process.env.PORT||4173),host=process.env.HOST||(process.env.RENDER?'0.0.0.0':'127.0.0.1');createServer().listen(port,host,()=>console.log(`Dual Currency e Manager listening on ${host}:${port}`));}
module.exports={createServer,publicFile};
