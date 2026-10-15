const {test}=require('node:test'),a=require('node:assert/strict'),B=require('../beyond'),F=require('../fixtures'),E=require('../engine'),H=require('../host-adapter');
function blank(){const s=F.make('purchase');s.plan.end='2027-01-31';s.plan.living=0;s.plan.events=[];s.plan.reserve=0;s.plan.cnyReserve=0;s.plan.floors={};s.accounts.forEach(x=>x.opening=x.currency==='HKD'?12000000:1000000);return s;}
test('calendar months clamp month-end including leap years',()=>{a.equal(B.addMonths('2026-01-31',1),'2026-02-28');a.equal(B.addMonths('2028-01-31',1),'2028-02-29');a.equal(B.addMonths('2026-12-31',2),'2027-02-28');});
test('protected tuition never becomes idle even if deposit matures earlier',()=>{const s=blank();s.plan.events=[{id:'tuition',name:'Tuition',date:'2026-12-15',currency:'HKD',kind:'expense',amount:-10000000}];a.equal(B.capacity(s).max,2000000);a.equal(B.match(s,{amount:5000000})[0].fits,false);});
test('source currencies are never pooled to pass minimum',()=>{const s=blank();a.equal(B.capacity(s,{currency:'CNY'}).max,1000000);a.equal(B.match(s,{currency:'CNY',amount:5000000})[0].fits,false);});
test('other currency deficit blocks investment despite HKD surplus',()=>{const s=blank();s.plan.cnyReserve=1100000;a.equal(B.capacity(s).status,'blocked');});
test('a later baseline shortfall blocks an earlier maturing deposit',()=>{const s=blank();s.plan.events=[{id:'later',name:'Later',date:'2027-01-20',currency:'HKD',kind:'expense',amount:-13000000,protect:false}];a.equal(B.capacity(s).status,'blocked');});
test('availability day obligations execute before principal return',()=>{const s=blank();s.plan.events=[{id:'bill',name:'Bill',date:'2026-11-04',currency:'HKD',kind:'expense',amount:-8000000,protect:false}];a.equal(B.capacity(s,{months:1,bufferDays:2}).max,4000000);s.plan.events[0].date='2026-11-05';a.equal(B.capacity(s,{months:1,bufferDays:2}).max,12000000);});
test('future income and risk interest cannot relax cash constraints',()=>{const s=blank(),base=B.match(s,{amount:5000000});s.plan.events.push({id:'income',name:'Expected',date:'2026-10-10',currency:'HKD',kind:'income',amount:9990000});a.deepEqual(B.match(s,{amount:5000000,interest:'investment'}),base);});
test('long tenure is blocked at planning horizon instead of extrapolated',()=>{a.equal(B.capacity(blank(),{months:6}).status,'blocked');a.throws(()=>B.capacity(blank(),{bufferDays:0}));a.throws(()=>B.capacity(blank(),{currency:'USD'}));});
test('real catalog minimum and available amount both apply',()=>{const s=blank();a.equal(B.match(s,{amount:4999999})[0].fits,false);a.equal(B.match(s,{amount:5000000})[0].fits,true);a.equal(B.match(s,{amount:12000001})[0].fits,false);});
test('capacity exactly bounds an independent daily cash simulation',()=>{const s=blank();s.plan.living=100001;s.plan.reserve=200000;s.plan.events=[{id:'bill',name:'Bill',date:'2026-10-12',currency:'HKD',kind:'expense',amount:-9000000,protect:false}];const r=B.capacity(s),f=E.forecast(s);for(const amount of [r.max,r.max+1]){const lows=[f.current.liquid.HKD,...f.rows.filter(x=>x.date<=r.available).map(x=>x.lowHKD)];a.equal(lows.every(n=>n-amount>=200000),amount===r.max);}});
test('classification confirmations are invalidated by exclusion or category change',()=>{const s=F.make('reserve');const first=B.stamp(s,'ledger','2026-09'),t=s.transactions.find(x=>x.date.startsWith('2026-09')&&x.type==='expense');t.category='New category';a.notEqual(B.stamp(s,'ledger','2026-09'),first);const next=B.stamp(s,'ledger','2026-09');s.exclusions={[t.id]:true};a.notEqual(B.stamp(s,'ledger','2026-09'),next);});
test('plan confirmation does not accumulate and changing plan invalidates it',()=>{const s=blank();s.care={planStamp:B.stamp(s,'plan','2026-09')};a.equal(B.tasks(s,'2026-09')[0].done,true);a.deepEqual(B.tasks(s,'2026-09'),B.tasks(s,'2026-09'));s.plan.reserve=1;a.equal(B.tasks(s,'2026-09')[0].done,false);});
test('review keeps original currencies, scopes budgets and does not infer zero prior month',()=>{const s=blank();a.equal(B.review(s,'2026-09').changes.HKD,null);s.budgets=[{month:'2026-08',category:'餐饮',currency:'HKD',amount:2000}];a.equal(B.review(s,'2026-09').budgets.length,0);});
test('budget warning links included records and honors exclusions',()=>{const s=F.make('reserve');s.budgets=[{month:'2026-09',category:'餐饮',currency:'HKD',amount:1}];const r=B.review(s,'2026-09'),action=r.actions.find(x=>x.amount!=null);a(action.ids.length>0);s.exclusions=Object.fromEntries(action.ids.map(id=>[id,true]));a.equal(B.review(s,'2026-09').actions.some(x=>x.amount!=null),false);});
test('host saves wealth preference and compact receipt without raw transaction descriptions',()=>{const s=F.make('reserve');s.wealth={currency:'HKD',amount:100000,bufferDays:2};s.care={ledgerStamp:B.stamp(s,'ledger','2026-09')};const p=H.preferences(s);a.deepEqual(p.wealth,s.wealth);a.equal(p.care.ledgerStamp.length<40,true);a.equal(JSON.stringify(p.care).includes(s.transactions[0].description),false);a.equal(p.transactions,undefined);});

test('product filters combine independently without relaxing suitability constraints',()=>{
 const s=blank(),options={amount:5000000,riskProfile:'unassessed',lossBudget:0,productTypes:['deposit','bond']};
 const r=B.recommend(s,options);a.equal(r.deposits.length,5);a.deepEqual(r.investments.map(p=>p.id),['bond']);a.equal(r.investments[0].fits,false);
 a.equal(B.recommend(s,{...options,productTypes:['cash','equity']}).deposits.length,0);
 a.deepEqual(B.recommend(s,{...options,productTypes:[]}),{deposits:[],investments:[]});
 a.throws(()=>B.recommend(s,{productTypes:['unknown']}));a.throws(()=>B.recommend(s,{productTypes:['bond','bond']}));
});

test('adjustment compares user-selected bills and currencies without mutating the ledger',()=>{
 const s=blank();s.plan.events=[{id:'rent-user',name:'Rent',kind:'expense',currency:'HKD',amount:-400000,date:'2026-11-01'}];const before=structuredClone(s);
 const r=B.adjustPlan(s,{eventId:'rent-user',eventDate:'2026-10-20',extra:20000,currency:'CNY',date:'2026-10-25'});
 a.deepEqual(s,before);a.equal(r.adjusted.events.find(e=>e.id==='rent-user').date,'2026-10-20');
 a.equal(r.adjusted.rows.at(-1).CNY,r.base.rows.at(-1).CNY-20000);
 a.throws(()=>B.adjustPlan(s,{eventId:'unknown',eventDate:'2026-10-20'}));a.throws(()=>B.adjustPlan(s,{extra:100,date:'2026-10-02'}));a.throws(()=>B.adjustPlan(s,{extra:100,date:'2027-02-01'}));
});

test('adjustments include expected income only when explicitly selected',()=>{
 const s=blank();s.plan.events=[{id:'salary',name:'Salary',kind:'income',currency:'CNY',amount:50000,date:'2026-10-10'}];
 const conservative=B.adjustPlan(s,{delay:7}),expected=B.adjustPlan(s,{delay:7,includeExpected:true});
 a.equal(conservative.base.rows.at(-1).CNY,conservative.adjusted.rows.at(-1).CNY);
 a.equal(expected.adjusted.rows.find(r=>r.date==='2026-10-11').CNY,expected.base.rows.find(r=>r.date==='2026-10-11').CNY-50000);
});
