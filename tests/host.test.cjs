const {test}=require('node:test'),assert=require('node:assert/strict');
const H=require('../host-adapter.js'),E=require('../engine.js'),F=require('../fixtures.js'),rates=require('../official-rates.json');
test('host response requires exact origin, parent, channel and correlated request',()=>{
 const parent={},event={source:parent,origin:'https://bank.example',data:{channel:H.CHANNEL,type:'response',id:'123'}};
 assert.equal(H.accept(event,parent,event.origin,'123'),true);
 for(const bad of [{...event,source:{}},{...event,origin:'https://bank.example.attacker.test'},{...event,data:{...event.data,id:'old'}},{...event,data:{...event.data,channel:'other'}}])assert.equal(H.accept(bad,parent,event.origin,'123'),false);
});
test('host snapshot validated and cloned; future transactions and bad liquidity rejected',()=>{
 const s=F.make('reserve'),v=H.validateSnapshot(s,E);v.plan.reserve=1;assert.notEqual(s.plan.reserve,1);
 assert.throws(()=>H.validateSnapshot({...s,plan:{...s.plan,start:'2026-10-01'}},E));
 assert.throws(()=>H.validateSnapshot({...s,transactions:[{...s.transactions[0],date:'2026-10-03'}]},E));
 assert.throws(()=>H.validateSnapshot({...s,accounts:[{...s.accounts[0],liquid:'true'}]},E));
});
test('preference export excludes account balances and transaction bodies',()=>{
 const p=H.preferences(F.make('reserve'));assert.equal(p.accounts,undefined);assert.equal(p.transactions,undefined);assert.equal(p.schema,'gangxue.preferences.v1');assert.ok(p.plan);assert.ok(p.categories);
});
test('host quote needs provenance, unit and both valid sides',()=>{
 assert.deepEqual(H.validateRates(rates),rates);
 for(const q of [{...rates,unit:'CNY per HKD'},{...rates,source:'javascript:alert(1)'},{...rates,sourceUpdatedAt:'unknown'},{...rates,markets:{CNH:{customerBuy:1,customerSell:2}}}])assert.throws(()=>H.validateRates(q));
});
function mock(){const listeners=new Set();let last;const parent={postMessage:x=>last=x};const win={parent,crypto:{randomUUID:()=> 'request-1'},setTimeout,clearTimeout,addEventListener:(_,fn)=>listeners.add(fn),removeEventListener:(_,fn)=>listeners.delete(fn)};return {win,listeners,get last(){return last;},reply(data,origin='https://bank.example'){for(const fn of listeners)fn({source:parent,origin,data:{channel:H.CHANNEL,type:'response',id:'request-1',...data}});}};}
test('bridge resolves correlated response and removes listener',async()=>{const m=mock(),b=H.createBridge(m.win,{parentOrigin:'https://bank.example',timeoutMs:50});const p=b.request('getSnapshot');m.reply({result:{ok:true}},'https://wrong.example');assert.equal(m.listeners.size,1);m.reply({result:{ok:true}});assert.deepEqual(await p,{ok:true});assert.equal(m.listeners.size,0);});
test('bridge timeout fails closed and removes listener',async()=>{const m=mock(),b=H.createBridge(m.win,{parentOrigin:'https://bank.example',timeoutMs:5});await assert.rejects(b.request('getSnapshot'),/超时/);assert.equal(m.listeners.size,0);});
test('bridge rejects denial, unsupported operations and wildcard origins',async()=>{const m=mock(),b=H.createBridge(m.win,{parentOrigin:'https://bank.example',timeoutMs:50});let p=b.request('getSnapshot');m.reply({error:'denied'});await assert.rejects(p,/denied/);await assert.rejects(b.request('executeTrade'));assert.throws(()=>H.createBridge(m.win,{parentOrigin:'*'}));assert.equal(m.listeners.size,0);});
