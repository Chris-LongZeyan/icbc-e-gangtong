'use strict';
// Export synthetic examples through the same deterministic engine used by the prototype.
// No network, credentials or personal transaction data are read.
const fs=require('node:fs'),path=require('node:path');
const E=require('../engine'),C=require('../core'),F=require('../fixtures');
const root=path.resolve(__dirname,'..'), out=path.join(__dirname,'data');
fs.mkdirSync(out,{recursive:true});
const state=F.make('reserve'),forecast=E.forecast(state),rates=require('../official-rates.json');
const opening={date:state.asOf,HKD:forecast.initial.HKD};
const projection=[opening,...forecast.rows].map(r=>({date:r.date,balance_cents:r.HKD,after_purchase_cents:r.HKD-500000,protected_cents:C.redline(state,r.date).floor.HKD,reserve_cents:state.plan.reserve}));
const quote=Array.from({length:21},(_,i)=>C.quote(235388+i,'HKD',rates.markets.CNH));
const result={schema:1,evidence:'Synthetic report examples, not customer observations',rateSource:rates.source,rateTime:rates.sourceUpdatedAt,rate:rates.markets.CNH,projection,quote,targetCents:200000,allocation:{opening:80000,tuition:50000,rent:12000,reserve:5000,living:8000,free:5000},wallet:{opening:500,topup:500,consumed:148,remaining:352}};
fs.writeFileSync(path.join(out,'examples.json'),JSON.stringify(result,null,2)+'\n');
console.log('Exported synthetic chart inputs to report-tools/data/examples.json');
