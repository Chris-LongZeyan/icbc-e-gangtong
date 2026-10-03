const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=__dirname,types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.csv':'text/csv; charset=utf-8','.txt':'text/plain; charset=utf-8'};
http.createServer(async(req,res)=>{let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
 if(pathname.startsWith('/module/'))pathname=pathname.slice(7);
 if(pathname==='/api/rates'){
  if(req.method!=='GET'){res.writeHead(405).end();return;}
  try{const data=await require('./rates.cjs').refresh();res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(data));}
  catch(e){res.writeHead(502,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({error:'官方来源暂不可用；保留有日期的快照，不伪装为实时。'}));}return;
 }
 const base=root;
 const relative=pathname==='/'?'index.html':pathname.slice(1);
 if(relative.split(/[\\/]/).some(p=>p.startsWith('.')||p==='private')){res.writeHead(403).end('Forbidden');return;}
 const file=path.resolve(base,relative);if(!file.startsWith(base+path.sep)||!['.html','.js','.css','.json','.csv','.txt'].includes(path.extname(file))){res.writeHead(403).end('Forbidden');return;}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)],'X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'"});res.end(data);});
}).listen(4173,'127.0.0.1',()=>console.log('Gangxue POC http://127.0.0.1:4173 — local only'));
