const fs=require('node:fs'),F=require('./fixtures'),E=require('./engine'),C=require('./core'),rates=require('./official-rates.json');
const purchase=F.make('purchase'),o={target:'CNY',purchase:1200000,due:'2026-10-08'},r=C.solve(purchase,rates.markets.CNH,o);
purchase.plan.events.push({id:'rent',name:'Protected rent',currency:'HKD',amount:-1900000,date:'2026-10-20',kind:'expense'});
const blocked=C.solve(purchase,rates.markets.CNH,o),reserve=F.make('reserve');
const out={schema:'gangxue-evidence-v0.3',accountData:'synthetic',accountAsOf:'2026-10-02',quote:rates,purchase:{required:r.required,solution:r.solution,previous:r.previous},protectedRent:{cap:blocked.cap,status:blocked.status},reserve:{redline:C.redline(reserve),free:E.forecast(reserve).free},september:C.monthly(reserve,'2026-09').totals};
fs.mkdirSync('docs',{recursive:true});fs.writeFileSync('docs/evidence.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
