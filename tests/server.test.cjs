const {test}=require('node:test'),assert=require('node:assert/strict');
const {createServer,publicFile}=require('../server.cjs');
test('deployment serves only the explicit public asset set',()=>{
 for(const p of ['index.html','controls.css','data/reserve.json','report-assets/overview.png','report-assets/prototype-fx.jpg'])assert.equal(publicFile(p),true);
 for(const p of ['README.md','server.cjs','tests/core.test.cjs','.git/config','private/statement.csv','artifacts/test.txt','report-assets/../private/x.png'])assert.equal(publicFile(p),false);
});
test('HTTP health, nested mount, HEAD and private-path protections',async t=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port;
 const health=await fetch(base+'/healthz');assert.equal(health.status,200);assert.equal((await health.json()).version,'0.8.0');
 const page=await fetch(base+'/module/');assert.equal(page.status,200);assert.match(await page.text(),/工银e港通/);assert.match(page.headers.get('content-security-policy'),/frame-ancestors 'self'/);
 const shot=await fetch(base+'/report-assets/prototype-fx.jpg');assert.equal(shot.status,200);assert.equal(shot.headers.get('content-type'),'image/jpeg');assert.ok((await shot.arrayBuffer()).byteLength>10000);
 assert.equal((await fetch(base+'/.git/config')).status,404);assert.equal((await fetch(base+'/server.cjs')).status,404);
 assert.equal((await fetch(base+'/',{method:'POST'})).status,405);
 assert.equal(await (await fetch(base+'/',{method:'HEAD'})).text(),'');
 assert.equal((await fetch(base+'/%zz')).status,400);
});
