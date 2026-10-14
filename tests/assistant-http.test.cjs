const {test}=require('node:test'),assert=require('node:assert/strict'),{createServer}=require('../server.cjs');
test('assistant HTTP enforces activation, origin, body limits, rate limits and private modules',async t=>{
 let calls=0;const server=createServer({assistant:{config:{enabled:true,voice:false,key:'test',base:'https://example.invalid',model:'fixture'},fetch:async()=>{calls++;return new Response(JSON.stringify({choices:[{message:{tool_calls:[{function:{name:'check_purchase',arguments:JSON.stringify({name:'电脑',amount:'12000',currency:'CNY',date:'2026-10-08',question:''})}}]}}]}));}}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port;
 assert.equal((await (await fetch(base+'/api/assistant')).json()).voice,false);
 assert.equal((await fetch(base+'/assistant.cjs')).status,404);
 const body=JSON.stringify({text:'test',asOf:'2026-10-02'}),post=(extra={})=>fetch(base+'/api/assistant',{method:'POST',headers:{'Content-Type':'application/json',...extra},body});
 assert.equal((await post({Origin:'https://evil.example'})).status,403);
 assert.equal((await fetch(base+'/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:'x'.repeat(9000)})).status,413);
 for(let i=0;i<10;i++)assert.equal((await post()).status,200);
 assert.equal((await post()).status,429);assert.equal(calls,10);
});
test('unconfigured deployment retains manual service and returns explicit unavailable status',async t=>{
 const server=createServer({assistant:{config:{enabled:false,model:'qwen3.7-plus'}}});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port;
 assert.equal((await (await fetch(base+'/api/assistant')).json()).enabled,false);assert.equal((await fetch(base+'/api/assistant',{method:'POST'})).status,503);assert.equal((await fetch(base+'/experience.html')).status,200);
});
