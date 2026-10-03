const {test}=require('node:test'),assert=require('node:assert/strict');
const P=require('../planner'),F=require('../fixtures');
test('currency case: minimum debit protects 60 days and saves CNY versus full conversion',()=>{
 const r=P.optimize(F.make('currency'));assert.equal(r.status,'feasible');assert.equal(r.solution.cny,3018091);assert.equal(r.solution.fee,15091);assert.equal(r.solution.hkd,3300000);assert.equal(r.solution.minHKD,300000);assert.equal(r.solution.minCNY,481909);assert.equal(r.proof.previousFeasible,false);assert.equal(r.latestOrder,'2026-10-04');
});
test('new worker retains mainland obligation; full conversion would violate it',()=>{
 const r=P.optimize(F.make('career'));assert.equal(r.solution.cny,2652262);assert.equal(r.solution.minCNY,547738);assert.equal(r.allConversion.feasible,false);assert(r.allConversion.minCNY<0);
});
test('already funded plan needs zero conversion and incurs no fixed fee',()=>{const r=P.optimize(F.make('reserve'),{fixedFee:1000});assert.equal(r.status,'unnecessary');assert.equal(r.solution.fee,0);});
test('no CNY funding returns infeasible, not an executable plan',()=>{const r=P.optimize(F.make('timing'));assert.equal(r.status,'infeasible');assert.equal(r.solution,undefined);});
test('late settlement cannot cure an earlier payment shortage',()=>{const r=P.optimize(F.make('currency'),{settlementDays:4});assert.equal(r.status,'infeasible');assert.match(r.reason,/来不及/);});
test('settlement on first need day works under explicit start-of-day settlement assumption',()=>assert.equal(P.optimize(F.make('currency'),{settlementDays:3}).status,'feasible'));
test('CNY reserve and future obligations constrain amount available today',()=>{const r=P.optimize(F.make('career'),{cnyReserve:600000});assert.equal(r.status,'infeasible');assert.equal(r.maxCny,2600000);});
test('future salary changes only the conditional scenario, not confirmed cash',()=>{
 const s=F.make('career'),a=P.optimize(s),b=P.optimize(s,{includeExpected:true});assert(b.solution.cny<a.solution.cny);s.plan.events.find(e=>e.id==='salary').amount=99999999;assert.equal(P.optimize(s).solution.cny,a.solution.cny);
});
test('dates outside coverage block optimization',()=>{const s=F.make('currency');s.plan.events[0].date='2027-01-01';assert.equal(P.optimize(s).status,'blocked');});
test('unfunded CNY obligation is explicitly infeasible',()=>{const s=F.make('career');s.plan.events.find(e=>e.currency==='CNY').amount=-4000000;assert.match(P.optimize(s).reason,/人民币自身/);});
test('fee ceiling and proceeds floor use exact integer arithmetic',()=>{assert.deepEqual(P.quote(101,{rate:0.91,feeBps:50,fixedFee:1}),{cny:101,fee:2,hkd:108});assert.equal(P.quote(1,{fixedFee:100}).hkd,0);});
test('invalid parameters rejected',()=>{for(const bad of [{feeBps:-1},{feeBps:10000},{settlementDays:1.2},{rate:NaN},{rate:0},{rate:.1234567},{cnyReserve:Infinity}])assert.throws(()=>P.optimize(F.make('currency'),bad));});
test('solver leaves all source data unchanged',()=>{const s=F.make('career'),before=JSON.stringify(s);P.optimize(s);assert.equal(JSON.stringify(s),before);});
test('120 small cases equal an independent exhaustive integer oracle',()=>{
 for(let i=1;i<=120;i++){
  const hk=i%20,cn=200,reserve=i%7,spend=i%50+30,cnyPay=i%11,bps=i%2?50:100,fix=i%4,rate=i%2?0.91:1;
  const s={asOf:'2026-10-02',transactions:[],accounts:[{id:'h',currency:'HKD',opening:hk,openingDate:'2026-10-02',liquid:true},{id:'c',currency:'CNY',opening:cn,openingDate:'2026-10-02',liquid:true}],plan:{start:'2026-10-02',end:'2026-10-04',rate,reserve,living:spend,events:[{id:'c',date:'2026-10-04',currency:'CNY',amount:-cnyPay,kind:'expense'}]}};
  let brute=null;for(let x=0;x<=cn-cnyPay;x++){const fee=x===0?0:Math.ceil(x*bps/10000)+fix;const received=Math.max(0,Math.floor(Math.max(0,x-fee)*100/(rate===1?100:91)));if(hk+received-spend>=reserve){brute=x;break;}}
  const r=P.optimize(s,{rate,feeBps:bps,fixedFee:fix,settlementDays:1});assert.equal(r.solution?.cny??null,brute,'case '+i);
 }
});
