(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.Gangxue=api;})(globalThis,function(){
'use strict';
const DAY=86400000, CURRENCIES=['HKD','CNY'], TYPES=['expense','income','refund','transfer','fx','topup'];
const money=n=>Math.round(Number(n)*100);
const date=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+'T00:00:00Z'))||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)throw Error('日期无效：'+s);return Date.parse(s+'T00:00:00Z');};
const addDays=(s,n)=>new Date(date(s)+n*DAY).toISOString().slice(0,10);
function integer(n,name,min=0,max=1e12){if(!Number.isSafeInteger(n)||n<min||n>max)throw Error(name+'超出有效范围');}
function validateTransaction(t){
 if(!t.id||!t.account||!t.description)throw Error('流水缺少 ID、账户或说明');date(t.date);
 if(!CURRENCIES.includes(t.currency)||!TYPES.includes(t.type))throw Error('币种或类型不支持');
 integer(t.amount,'流水金额',-1e12);if(t.amount===0)throw Error('流水金额不能为零');
 if(t.type==='expense'&&t.amount>0)throw Error('支出必须为负数');
 if(['income','refund'].includes(t.type)&&t.amount<0)throw Error('收入/退款必须为正数');
 if(t.cnyActual!==null&&t.cnyActual!==undefined)integer(t.cnyActual,'实际人民币金额');
 if(t.fxRate!==null&&t.fxRate!==undefined&&(!Number.isFinite(t.fxRate)||t.fxRate<=0))throw Error('历史汇率必须大于零');
 return t;
}
function reconcile(accounts,transactions,asOf){
 date(asOf);const byId={},seen=new Set();
 for(const a of accounts){if(byId[a.id]||!CURRENCIES.includes(a.currency))throw Error('账户重复或币种无效');integer(a.opening,'期初余额',-1e12);date(a.openingDate);byId[a.id]={...a,balance:a.opening};}
 for(const t of transactions){validateTransaction(t);if(seen.has(t.id))throw Error('重复流水 ID：'+t.id);seen.add(t.id);const a=byId[t.account];if(!a||a.currency!==t.currency)throw Error('账户与流水币种不匹配');if(t.date<a.openingDate)throw Error('流水早于期初余额日');if(t.date<=asOf)a.balance+=t.amount;}
 const balances={HKD:0,CNY:0},liquid={HKD:0,CNY:0};
 for(const a of Object.values(byId)){balances[a.currency]+=a.balance;if(a.liquid)liquid[a.currency]+=a.balance;}
 return {accounts:Object.values(byId),balances,liquid};
}
function spending(transactions,from,to){
 let cny=0,unvalued=0;const original={HKD:0,CNY:0},categories={};
 for(const t of transactions.filter(t=>t.date>=from&&t.date<=to&&['expense','refund'].includes(t.type))){
  const sign=t.type==='refund'?-1:1,amount=Math.abs(t.amount)*sign;original[t.currency]+=amount;
  let value=t.cnyActual!=null?t.cnyActual*sign:t.currency==='CNY'?amount:t.fxRate?Math.round(amount*t.fxRate):null;
  if(value===null)unvalued++;else{cny+=value;categories[t.category||'未分类']=(categories[t.category||'未分类']||0)+value;}
 }
 return {cny,original,categories,unvalued};
}
function quality(state){
 const warnings=[],groups=new Map();
 for(const t of state.transactions){
  if(['transfer','fx','topup'].includes(t.type)){if(!t.linkId)warnings.push(t.id+'：内部转移未配对');else {if(!groups.has(t.linkId))groups.set(t.linkId,[]);groups.get(t.linkId).push(t);}}
  if(t.type==='refund'&&!state.transactions.some(o=>o.id===t.refundOf&&o.type==='expense'))warnings.push(t.id+'：退款未关联原支出');
 }
 for(const [id,ts]of groups){if(ts.length!==2||!ts.some(t=>t.amount<0)||!ts.some(t=>t.amount>0))warnings.push(id+'：需要一出一入两条记录');else if(ts[0].currency===ts[1].currency&&ts[0].amount+ts[1].amount!==0)warnings.push(id+'：同币种转账金额不平');}
 const r=reconcile(state.accounts,state.transactions,state.asOf);
 for(const a of r.accounts){if(a.expectedClosing!=null&&a.balance!==a.expectedClosing)warnings.push(a.name+'：与样例对账余额相差 '+((a.balance-a.expectedClosing)/100).toFixed(2));}
 return warnings;
}
function validatePlan(p){
 date(p.start);date(p.end);const days=(date(p.end)-date(p.start))/DAY;if(days<1||days>366)throw Error('规划期须为 1–366 天');
 integer(p.reserve,'应急金');integer(p.living,'生活费');if(!Number.isFinite(p.rate)||p.rate<=0||p.rate>100)throw Error('汇率无效');
 for(const e of p.events){date(e.date);integer(e.amount,'计划金额',-1e12);if(!CURRENCIES.includes(e.currency))throw Error('计划币种无效');if(!['income','expense'].includes(e.kind))throw Error('计划类型无效');if(e.kind==='income'&&e.amount<0||e.kind==='expense'&&e.amount>0)throw Error('计划金额方向无效');}
 return days;
}
function forecast(state,options={}){
 const p=JSON.parse(JSON.stringify(state.plan)),days=validatePlan(p),current=reconcile(state.accounts,state.transactions,state.asOf);
 integer(p.cnyReserve||0,'人民币预留');integer(p.floors?.HKD||0,'港币底线');integer(p.floors?.CNY||0,'人民币底线');
 p.reserve=Math.max(p.reserve,p.floors?.HKD||0);const cnyReserve=Math.max(p.cnyReserve||0,p.floors?.CNY||0);
 if(p.start!==state.asOf)throw Error('规划开始日须为对账日');
 const shift=options.delay??0,rate=p.rate*(1+(options.fxShock??0)/100);
 integer(shift,'延迟天数',0,90);integer(options.extra??0,'突发支出');if(!Number.isFinite(rate)||rate<=0)throw Error('情景汇率无效');if(options.tuitionDate)date(options.tuitionDate);
 const events=p.events.map(e=>({...e,date:e.kind==='income'?addDays(e.date,shift):e.id==='tuition'&&options.tuitionDate?options.tuitionDate:e.date}));
 if(options.extra)events.push({id:'shock',name:'突发支出',date:addDays(p.start,1),kind:'expense',currency:'HKD',amount:-options.extra});
 // Planned payments outside the horizon are visibly excluded, never silently moved.
 const outside=events.filter(e=>e.date<=p.start||e.date>p.end);
 const cash={...current.liquid};let conversion=null;
 if(options.convertCny){const available=Math.max(0,cash.CNY),fee=Math.ceil(available*0.005);const hkd=Math.floor((available-fee)/rate);cash.CNY-=available;cash.HKD+=hkd;conversion={cny:available,fee,hkd,rate};}
 const initial={...cash};let dailySpent=0,minDaily=Infinity;const rows=[];
 for(let i=1;i<=days;i++){
  const d=addDays(p.start,i),today=events.filter(e=>e.date===d),before={...cash};
  // Conservative within-day ordering: obligations precede incoming allowance.
  for(const e of today.filter(e=>e.kind==='expense'))cash[e.currency]+=e.amount;
  const living=Math.floor(p.living*i/days)-dailySpent;dailySpent+=living;cash.HKD-=living;
  const low={...cash};
  for(const e of today.filter(e=>e.kind==='income'))if(options.includeExpected)cash[e.currency]+=e.amount;
  // Uniform daily spending ceiling, including food, protects every payment date.
  minDaily=Math.min(minDaily,Math.floor((low.HKD+dailySpent-p.reserve)/i));
  rows.push({date:d,HKD:cash.HKD,CNY:cash.CNY,lowHKD:low.HKD,lowCNY:low.CNY,living,events:today.map(e=>e.name),before});
 }
 const firstGap=rows.find(r=>r.lowHKD<0||r.lowCNY<0)||null;
 const firstReserve=rows.find(r=>r.lowHKD<p.reserve||r.lowCNY<cnyReserve)||null;
 const minHKD=Math.min(initial.HKD,...rows.map(r=>r.lowHKD));
 return {rows,events,outside,initial,current,rate,conversion,firstGap,firstReserve,minHKD,days,
  maxGapHKD:Math.max(0,-minHKD),headroom:minHKD-p.reserve,free:rows.some(r=>r.lowCNY<cnyReserve)?0:Math.max(0,minHKD-p.reserve),
  weekly:rows.some(r=>r.lowCNY<cnyReserve)?0:Math.max(0,Math.min(7,days)*minDaily),plannedWeekly:Math.floor(p.living/days*Math.min(7,days)),reserve:p.reserve,cnyReserve,
  totalCny:current.balances.CNY+Math.round(current.balances.HKD*rate),includeExpected:!!options.includeExpected};
}
function deposits(state,options={}){
 const f=forecast(state,{...options,includeExpected:false}),p=state.plan;
 return [7,30,90].map(days=>{
  const maturity=addDays(p.start,days),buffer=addDays(maturity,1),window=f.rows.filter(r=>r.date<=buffer);
  const beyond=buffer>p.end,capacity=f.firstGap||f.firstReserve?0:Math.max(0,Math.min(f.initial.HKD-p.reserve,...window.map(r=>r.lowHKD-p.reserve)));
  return {days,maturity,available:buffer,max:capacity,min:100000,eligible:!beyond&&capacity>=100000,
   reason:beyond?'到期加 1 天缓冲超出规划期；无法确认':capacity<100000?'现有资金不足以同时保障付款与应急金':'按已到账 HKD 及用款日期测算；未计利息',rate:days===7?1:days===30?1.5:2};
 });
}
function parseCsv(text){
 if(text.length>2e6)throw Error('CSV 超过 2 MB');const rows=[];let row=[],cell='',quoted=false;
 text=text.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(quoted)quoted=false;else if(cell==='')quoted=true;else throw Error('CSV 引号格式错误');}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x!==''))rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw Error('CSV 引号未闭合');row.push(cell);if(row.some(x=>x!==''))rows.push(row);
 if(rows.length<2)throw Error('CSV 无流水');const header=rows.shift().map(x=>x.trim());
 if(new Set(header).size!==header.length)throw Error('CSV 列名重复');
 for(const h of ['id','date','account','currency','amount','type','description'])if(!header.includes(h))throw Error('缺少列：'+h);
 return rows.map((r,i)=>{if(r.length!==header.length)throw Error('第 '+(i+2)+' 行列数错误');const t=Object.fromEntries(header.map((h,j)=>[h,r[j].trim()]));
  const decimal=(s,name)=>{if(!/^-?\d+(\.\d{1,2})?$/.test(s))throw Error('第 '+(i+2)+' 行 '+name+' 金额无效（最多两位小数）');return money(s);};
  t.amount=decimal(t.amount,'amount');t.cnyActual=t.cny_actual?decimal(t.cny_actual,'cny_actual'):null;t.fxRate=t.fx_rate?Number(t.fx_rate):null;t.linkId=t.link_id||'';t.refundOf=t.refund_of||'';t.source='用户导入';return validateTransaction(t);
 });
}
function importCsv(state,text){
 const incoming=parseCsv(text),ids=new Map(state.transactions.map(t=>[t.id,t])),accepted=[],duplicates=[];
 if(incoming.some(t=>t.date>state.asOf))throw Error('未来事项请在学期日历填写');
 for(const t of incoming){if(ids.has(t.id)){const old=ids.get(t.id);if(['date','account','currency','amount','type','description','category','cnyActual','fxRate','linkId','refundOf'].some(k=>(old[k]??'')!==(t[k]??'')))throw Error('ID 冲突且内容不同：'+t.id);duplicates.push(t.id);}else {ids.set(t.id,t);accepted.push(t);}}
 const next={...state,transactions:[...state.transactions,...accepted]};reconcile(next.accounts,next.transactions,next.asOf);
 return {state:next,accepted:accepted.length,duplicates:duplicates.length,warnings:quality(next)};
}
function csv(transactions){const fields=['id','date','account','currency','amount','type','category','description','cny_actual','fx_rate','link_id','refund_of'];const quote=x=>'"'+String(x??'').replaceAll('"','""')+'"';return fields.join(',')+'\n'+transactions.map(t=>[t.id,t.date,t.account,t.currency,(t.amount/100).toFixed(2),t.type,t.category,t.description,t.cnyActual==null?'':(t.cnyActual/100).toFixed(2),t.fxRate??'',t.linkId||'',t.refundOf||''].map(quote).join(',')).join('\n');}
return {money,date,addDays,validateTransaction,reconcile,spending,quality,forecast,deposits,parseCsv,importCsv,csv};
});
