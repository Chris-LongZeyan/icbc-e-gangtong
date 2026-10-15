const {test}=require('node:test'),assert=require('node:assert/strict');
const P=require('../profile.js'),E=require('../engine.js'),U=require('../ux.js');
const input={name:'我的试算',asOf:'2026-10-03',end:'2026-12-02',HKD:'20000',CNY:'10000',reserve:'1000',cnyReserve:'500',living:'3000',cnyLiving:'0',tuition:'0',rent:'6000',rentDate:'2026-11-01',rentCurrency:'HKD'};
test('personal entry starts empty and refuses virtual-account archives',()=>{
 const s=P.blank('2026-10-15');assert.equal(s.onboarding,true);assert.equal(s.experience,'manual');assert.equal(s.transactions.length,0);assert.equal(s.plan.events.length,0);assert.equal(E.forecast(s).current.liquid.HKD,0);assert.equal(E.forecast(s).current.liquid.CNY,0);
 const manual=P.createManual(input);assert.deepEqual(P.restorePersonal(JSON.stringify(manual)),manual);assert.throws(()=>P.restorePersonal(JSON.stringify(require('../fixtures').make('reserve'))));
});
test('manual balance snapshots contain no sample transactions and retain both currency reserves',()=>{
 const s=P.createManual(input),f=E.forecast(s);assert.equal(s.transactions.length,0);assert.equal(f.current.liquid.HKD,2000000);assert.equal(f.current.liquid.CNY,1000000);assert.equal(s.plan.cnyReserve,50000);assert.equal(s.plan.events[0].protect,true);assert.deepEqual(U.restore(U.backup(s)),s);
 const t={id:'manual-1',account:'hkd',date:s.asOf,currency:'HKD',amount:-2000,type:'expense',description:'午餐',category:'餐饮'};s.transactions.push(t);assert.equal(E.forecast(s).current.liquid.HKD,1998000);
});
test('manual setup rejects amounts that silently round, invalid dates and out-of-horizon obligations',()=>{
 for(const patch of [{HKD:'1.001'},{CNY:'-1'},{reserve:'NaN'},{asOf:'2026-02-30'},{end:'2026-10-02'},{rentDate:'2026-10-03'},{rentDate:'2027-01-01'},{rentCurrency:'USD'}])assert.throws(()=>P.createManual({...input,...patch}));
});
test('manual setup accepts CNY tuition and zero balances without inventing funding',()=>{
 const s=P.createManual({...input,HKD:'0',CNY:'0',tuition:'12000',tuitionCurrency:'CNY',tuitionDate:'2026-10-10'});assert.equal(s.plan.events[0].amount,-1200000);assert.ok(E.forecast(s).firstGap);
});
test('card presentation never invents a card for manual or host-provided accounts',()=>{
 const a={id:'hkd',currency:'HKD',liquid:true};assert.match(P.card(a,false,false).full,/^DEMO /);assert.equal(P.card(a,true,false).full,null);assert.equal(P.card(a,false,true).full,null);assert.equal(P.card(a,false,true).masked,'hkd');
});
