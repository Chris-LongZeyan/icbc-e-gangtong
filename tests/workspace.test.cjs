const test=require('node:test'),assert=require('node:assert/strict'),F=require('../fixtures'),E=require('../engine'),U=require('../ux'),B=require('../beyond'),P=require('../profile'),products=require('../products.cjs');
test('live scenarios follow Hong Kong date, reconcile balances and include CNY consumption',()=>{
 const numbers=new Set();for(const id of F.ids){const s=F.live(id,'2027-02-28');assert.equal(s.asOf,'2027-02-28');assert.deepEqual(E.quality(s),[]);for(const currency of ['HKD','CNY']){assert(E.forecast(s).current.liquid[currency]>0);assert(s.transactions.some(t=>t.currency===currency&&t.type==='expense'));}assert(B.automatic(s,s.wealth).plans.some(p=>p.max>0));assert(s.transactions.every(t=>t.date<=s.asOf));assert.equal(E.forecast(s).outside.length,0);for(const a of s.accounts){const card=P.card(a,false,false);assert(card.full.startsWith('DEMO'));assert(!numbers.has(card.full));numbers.add(card.full);}}
});
test('weekly planned income preserves expected-income semantics and rejects out-of-range schedules',()=>{const s=F.make('purchase'),r=U.recurring(s,{name:'定期收入',date:'2026-10-03',kind:'income',currency:'CNY',amount:50000,count:3,frequency:'weekly'});assert.deepEqual(r.events.map(e=>e.date),['2026-10-03','2026-10-10','2026-10-17']);assert(r.events.every(e=>e.amount===50000&&!e.protect));assert.throws(()=>U.recurring(s,{date:'2026-10-25',amount:100,count:3,frequency:'weekly'}));assert.equal(s.plan.events.length,0);});
test('automatic allocation uses the greater of explicit budget and supported spending estimate',()=>{const s=F.live('reserve','2026-10-15'),before=JSON.stringify(s),auto=B.automatic(s);assert(auto.state.plan.living>=s.plan.living);assert.equal(JSON.stringify(s),before);for(const r of auto.plans)assert(r.max<=B.capacity(s,{months:r.months}).max);const sparse=B.automatic(F.live('purchase','2026-10-15'));assert.equal(sparse.patterns.CNY.basis,'已设生活预算');});
test('public product parsing separates source publication from retrieval and fails closed on table changes',()=>{const text='e时代／综合客户 港币 50,000或以上 1.50% 2.10% 2.85% 3.00% 3.10% 人民币 50,000至500,000以下 0.75% 1.05% 1.15% 1.20% 1.25% 上述年利率为2026年9月29日公布';const p=products.parse(text,new Date('2026-10-15T00:00:00Z'));assert.equal(p.products.length,10);assert.equal(p.publishedAt,'2026-09-29');assert.equal(p.retrievedAt,'2026-10-15T00:00:00.000Z');assert.equal(p.products[0].annualRate,1.5);assert.equal(p.products[5].maximum,49999999);assert.throws(()=>products.parse(text.replace('50,000或以上','100,000或以上')));assert.throws(()=>products.parse(text.replace('2026年','2030年'),new Date('2026-10-15')));});
test('all app scripts retain deferred dependency order',()=>{const fs=require('node:fs');for(const page of ['experience.html','embedded.html']){const html=fs.readFileSync(require('node:path').join(__dirname,'..',page),'utf8'),tags=[...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*>/g)];assert(tags.length>10);for(const t of tags)assert(t[0].includes('defer'),t[1]);assert(tags.findIndex(t=>t[1]==='engine.js')<tags.findIndex(t=>t[1]==='app.js'));}});
test('natural-language regular income previews without saving or crediting cash',()=>{const A=require('../assistant.cjs'),T=require('../assistant-tools'),s=F.live('purchase','2026-10-15'),d=A.draft({tool:'reserve_payment',name:'工资',currency:'CNY',amount:'1000',date:'2026-10-16',kind:'income',frequency:'weekly',count:2,question:''}),before=JSON.stringify(s),result=T.run(s,null,d);assert.equal(result.preview.plan.events.length,2);assert(result.preview.plan.events.every(e=>e.kind==='income'));assert.equal(result.result.current.liquid.CNY,1000000);assert.equal(JSON.stringify(s),before);assert(T.missing({...d,count:null},'en'));assert.throws(()=>A.draft({...d,count:100}));});

test('wallet top-up, consumption and remaining balance stay distinct without duplicate import',()=>{
 const C=require('../core'),O=require('../octopus');
 for(const day of ['2026-10-01','2026-10-15','2027-02-28'])for(const id of F.ids){
  const s=F.live(id,day),before=E.reconcile(s.accounts,s.transactions,s.asOf),filter={from:s.demoOctopus.date,to:s.demoOctopus.date,currency:'HKD'};
  s.octopus=O.demoImport(s);assert.equal(C.accountOutflow(s,filter).totals.HKD,50000);assert.equal(C.spending(s,filter).totals.HKD,14800);assert.equal(C.octopusBalance(s).amount,35200);
  assert.equal(C.spending(s,filter).pending.length,0);assert.deepEqual(E.reconcile(s.accounts,s.transactions,s.asOf),before);
  assert.equal(C.spending(s,filter).ledgerRows.filter(t=>t.type==='topup'&&t.amount>0).length,1);
  const once=JSON.stringify(s.octopus);s.octopus=O.demoImport(s);assert.equal(JSON.stringify(s.octopus),once);
  assert(s.octopus.records.every(t=>t.date===E.addDays(day,-1)));
  assert.equal(C.spending(s,{...filter,source:'octopus',category:'交通'}).totals.HKD,440);
  assert.equal(C.spending(s,{...filter,includeOctopus:false}).totals.HKD,14800);
 }
});
test('wallet balance is a stock, not a deduction from every selected spending period',()=>{
 const C=require('../core'),O=require('../octopus'),s=F.live('purchase','2026-10-15');s.octopus=O.demoImport(s);
 assert.equal(C.spending(s,{from:'2026-10-13',to:'2026-10-13',currency:'HKD'}).totals.HKD,5800);
 assert.equal(C.octopusBalance(s).amount,35200);
 s.exclusions={'octopus:demo-mtr':true};assert.equal(C.spending(s,{from:s.demoOctopus.date}).totals.HKD,14360);assert.equal(C.octopusBalance(s).amount,35200);
});
test('ordinary deposit eligibility uses published minima without inventing rates',()=>{
 const html='Time deposit tenors range from overnight to 12 months. Hong Kong Dollar Time Deposit: Minimum amount is HKD10,000 Renminbi Time Deposit: Minimum amount is CNY5,000';
 const rows=products.parseStandard(html,new Date('2026-10-15T00:00:00Z'));assert.equal(rows.length,10);assert(rows.every(p=>p.annualRate===null&&p.source===products.standardSource));assert.equal(rows[0].minimum,1000000);assert.equal(rows[5].minimum,500000);
 assert.throws(()=>products.parseStandard(html.replace('CNY5,000','as quoted')));
 for(const id of F.ids){const s=F.live(id,'2026-10-15'),plans=B.automatic(s,s.wealth).plans;assert(rows.some(p=>p.currency===s.wealth.currency&&plans.some(r=>r.months===p.months&&r.status==='evaluated'&&r.max>=p.minimum)),id);}
});
