// Reproducible report experiment. Synthetic cases; no personal records or API calls.
// The oracle enumerates every cent and rebuilds cash paths without engine/core helpers.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const C=require('../core'),F=require('../fixtures');
const snapshot=require('../official-rates.json'),rates=snapshot.markets.CNH;
let seed=20261008;const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/4294967296*n);};
const date=i=>'2026-10-'+String(2+i).padStart(2,'0');
function proceeds(d,source,o){if(!d)return 0;const fee=Math.ceil(d*o.feeBps/10000)+o.fixedFee,net=Math.max(0,d-fee);return source==='HKD'?Math.floor(net*1000000/1176990):Math.floor(net*1162840/1000000);}
function oracle(s,o,{ignoreFuture=false,ignoreDelay=false}={}){
 const target=o.target,source=target==='HKD'?'CNY':'HKD',cash=Object.fromEntries(s.accounts.map(a=>[a.currency,a.opening]));
 const floor={HKD:Math.max(s.plan.reserve,s.plan.floors.HKD),CNY:Math.max(s.plan.cnyReserve,s.plan.floors.CNY)};
 const earmark={HKD:s.plan.reserve,CNY:s.plan.cnyReserve};
 if(!ignoreFuture)for(const e of s.plan.events)if(e.kind==='expense'&&e.protect!==false)earmark[e.currency]-=e.amount;
 const cap=ignoreFuture?cash[source]:cash[source]-Math.max(earmark[source],s.plan.floors[source]);
 for(let d=0;d<=cap;d++){
  let ok=true;const q=proceeds(d,source,o),bal={...cash};bal[source]-=d;
  for(let day=1;day<=5;day++){
   if(!ignoreFuture){for(const e of s.plan.events)if(e.kind==='expense'&&e.date===date(day))bal[e.currency]+=e.amount;
    bal.HKD-=Math.floor(s.plan.living*day/5)-Math.floor(s.plan.living*(day-1)/5);
    bal.CNY-=Math.floor(s.plan.cnyLiving*day/5)-Math.floor(s.plan.cnyLiving*(day-1)/5);}
   if(date(day)===o.due)bal[target]-=o.purchase;
   const credit=ignoreDelay||day>=o.settlementDays?q:0;
   if(bal[source]<(ignoreFuture?0:floor[source])||bal[target]+credit<(ignoreFuture?0:floor[target])){ok=false;break;}
  }
  if(ok)return d;
 }
 return null;
}
const cases=[],counts={feasible:0,unnecessary:0,infeasible:0},baselines={aggregate:{falseAccept:0,falseReject:0},currencyOnly:{falseAccept:0,falseReject:0},withoutSettlement:{falseAccept:0,falseReject:0}},mismatches=[],timings=[];
for(let i=0;i<2000;i++){
 const s=F.make('purchase');s.plan.end=date(5);s.plan.reserve=rand(21);s.plan.cnyReserve=rand(21);s.plan.floors={HKD:rand(31),CNY:rand(31)};s.plan.living=rand(21);s.plan.cnyLiving=rand(21);
 s.accounts.forEach(a=>{a.opening=60+rand(181);a.expectedClosing=a.opening;});
 s.plan.events=[{id:'obligation',name:'synthetic obligation',kind:'expense',currency:rand(2)?'CNY':'HKD',amount:-rand(101),date:date(1+rand(5)),protect:!!rand(2)},
 {id:'expected',name:'unconfirmed income',kind:'income',currency:rand(2)?'CNY':'HKD',amount:rand(200),date:date(1+rand(5))}];
 const o={target:rand(2)?'CNY':'HKD',purchase:20+rand(221),due:date(1+rand(5)),settlementDays:rand(7),feeBps:[0,50,200][rand(3)],fixedFee:rand(4)};
 const truth=oracle(s,o),result=C.solve(s,rates,o),accepted=['feasible','unnecessary'].includes(result.status);counts[result.status]++;
 if(accepted!==(truth!==null)||(accepted&&result.solution.debit!==truth))mismatches.push({i,truth,result:result.status,debit:result.solution?.debit});
 const initial=Object.fromEntries(s.accounts.map(a=>[a.currency,a.opening]));
 const aggregate=o.target==='CNY'?initial.CNY+initial.HKD/1.176990>=o.purchase:initial.HKD+initial.CNY*1.162840>=o.purchase;
 const decisions={aggregate,currencyOnly:oracle(s,o,{ignoreFuture:true,ignoreDelay:true})!==null,withoutSettlement:oracle(s,o,{ignoreDelay:true})!==null};
 for(const [k,v]of Object.entries(decisions)){if(v&&truth===null)baselines[k].falseAccept++;if(!v&&truth!==null)baselines[k].falseReject++;}
 cases.push({id:i,state:s,options:o,expectedDebit:truth,status:result.status,decisions});
}
// Timing is descriptive for this machine only, independent of exhaustive-oracle runtime.
for(const c of cases.slice(0,100))C.solve(c.state,rates,c.options);
for(const c of cases){const t=performance.now();C.solve(c.state,rates,c.options);timings.push(performance.now()-t);}timings.sort((a,b)=>a-b);
const worked=[];for(const [name,rent,delay,due]of [['purchase',0,0,'2026-10-08'],['protected-rent',1900000,0,'2026-10-08'],['late-arrival',0,3,'2026-10-04']]){const s=F.make('purchase');if(rent)s.plan.events=[{id:'rent',name:'rent',date:'2026-10-20',currency:'HKD',amount:-rent,kind:'expense'}];const r=C.solve(s,rates,{target:'CNY',purchase:1200000,due,settlementDays:delay});worked.push({name,status:r.status,cap:r.cap,required:r.required,solution:r.solution,previous:r.previous,firstNeed:r.firstNeed,settlement:r.settlement,reason:r.reason});}
const result={schema:1,seed:20261008,caseCount:cases.length,scope:'Synthetic 5-day, 2-currency cases; all future income excluded. Integer-cent exhaustive oracle. Baselines are deliberate reduced models, not competitor measurements.',rates:{...rates,source:snapshot.source,sourceUpdatedAt:snapshot.sourceUpdatedAt},counts,baselines,mismatches,worked,timingMs:{p50:timings[1000],p95:timings[1900],max:timings.at(-1)},environment:{node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model},cases};
fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,cases:undefined},null,2));if(mismatches.length)process.exitCode=1;
