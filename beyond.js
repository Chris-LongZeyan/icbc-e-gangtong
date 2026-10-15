(function(root,factory){const api=factory(typeof module==='object'?require('./engine'):root.Gangxue,typeof module==='object'?require('./core'):root.GangxueCore);if(typeof module==='object')module.exports=api;else root.GangxueBeyond=api;})(globalThis,function(E,C){
'use strict';
const currencies=['HKD','CNY'];
const catalog={source:'https://www.icbcasia.com/hk/sc/personal/latest-promotion/online-time-deposit.html',checked:'2026-10-03',published:'2026-09-29',tier:'e时代／综合客户',minimum:5000000,months:[1,2,3,6,12]};
function addMonths(day,n){E.date(day);if(!Number.isInteger(n)||n<1||n>12)throw Error('期限无效');const d=new Date(day+'T00:00:00Z'),date=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+n);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(date,last));return d.toISOString().slice(0,10);}
// Principal remains unavailable through the assumed availability day's payments.
// Protected obligations remain liquid even when the deposit would mature earlier.
function capacity(state,{currency='HKD',months=1,bufferDays=2}={}){
 if(!currencies.includes(currency)||!Number.isInteger(bufferDays)||bufferDays<1||bufferDays>14)throw Error('币种或到账缓冲无效');
 const maturity=addMonths(state.asOf,months),available=E.addDays(maturity,bufferDays),f=E.forecast(state),now=C.redline(state);
 const result={currency,months,bufferDays,maturity,available,max:0,status:'blocked',reason:''};
 if(available>state.plan.end||f.outside.length)return {...result,reason:'期限或已有事项超出规划覆盖，请先延长并核实资金计划。'};
 const checks=[{date:state.asOf,lowHKD:f.current.liquid.HKD,lowCNY:f.current.liquid.CNY},...f.rows];
 const gap=checks.find(row=>currencies.some(c=>row['low'+c]<C.redline(state,row.date).floor[c]));
 if(gap)return {...result,reason:gap.date+' 存在币种资金或预留不足；先解决付款计划。',gap:gap.date};
 let max=now.headroom[currency],binding=state.asOf;
 for(const row of checks.filter(r=>r.date<=available)){const headroom=row['low'+currency]-C.redline(state,row.date).floor[currency];if(headroom<max){max=headroom;binding=row.date;}}
 return {...result,max:Math.max(0,max),binding,status:'evaluated',reason:'保留全部受保护用途、生活预算和双币底线；不计预计收入及利息。'};
}
function match(state,options={}){
 const amount=options.amount??0;if(!Number.isSafeInteger(amount)||amount<0||amount>1e12)throw Error('金额须为非负整数分');
 return catalog.months.map(months=>{const r=capacity(state,{...options,months});let reason=r.reason;
 const fits=r.status==='evaluated'&&amount>0&&amount<=r.max&&amount>=catalog.minimum;
 if(r.status==='evaluated')reason=amount>r.max?'拟存金额会占用已规划的资金。':amount<catalog.minimum?'未达到此公开存款方案的 50,000 原币起存额。':'金额与期限初筛通过；客户资格、营业时段、到期处理和当日条款仍须银行确认。';
 return {...r,amount,fits,reason};});
}
// Demonstration types: parameters are explicit test assumptions, not marketed products or risk ratings.
const productTypes=[
 {id:'cash',name:'现金管理类基金',months:1,risk:1,lossBps:500,minimum:10000},
 {id:'bond',name:'债券类基金',months:3,risk:2,lossBps:1500,minimum:10000},
 {id:'equity',name:'权益类基金',months:6,risk:3,lossBps:4000,minimum:10000}
];
function recommend(state,options={}){
 const {currency='HKD',amount=0,bufferDays=2,interest='deposit',riskProfile='unassessed',lossBudget=0}=options;
 const levels={unassessed:0,conservative:1,balanced:2,growth:3};
 if(!Object.hasOwn(levels,riskProfile)||!['deposit','investment'].includes(interest))throw Error('产品偏好无效');
 for(const x of [amount,lossBudget])if(!Number.isSafeInteger(x)||x<0||x>1e12)throw Error('金额须为非负整数分');
 const selected=options.productTypes??(interest==='deposit'?['deposit']:['deposit',...productTypes.map(p=>p.id)]);
 if(!Array.isArray(selected)||selected.some(id=>!['deposit',...productTypes.map(p=>p.id)].includes(id))||new Set(selected).size!==selected.length)throw Error('产品类别无效');
 const deposits=match(state,{currency,amount,bufferDays}).filter(()=>selected.includes('deposit'));
 if(!selected.some(id=>id!=='deposit'))return {deposits,investments:[]};
 const f=E.forecast(state);
 const investments=productTypes.filter(product=>selected.includes(product.id)).map(product=>{
  const cap=capacity(state,{currency,months:product.months,bufferDays});
  const after=f.rows.filter(r=>r.date>cap.available);
  let futureHeadroom=Number.MAX_SAFE_INTEGER;
  for(const row of after)futureHeadroom=Math.min(futureHeadroom,row['low'+currency]-C.redline(state,row.date).floor[currency]);
  const budgetCap=Number(BigInt(lossBudget)*10000n/BigInt(product.lossBps));
  const stressCap=futureHeadroom===Number.MAX_SAFE_INTEGER?Number.MAX_SAFE_INTEGER:Number(BigInt(Math.max(0,futureHeadroom))*10000n/BigInt(product.lossBps));
  const max=cap.status==='evaluated'?Math.min(cap.max,budgetCap,stressCap):0;
  const stressLoss=Number((BigInt(amount)*BigInt(product.lossBps)+9999n)/10000n);
  const checks=[
   {id:'profile',label:'偏好匹配',ok:levels[riskProfile]>=product.risk,detail:riskProfile==='unassessed'?'请选择体验风险偏好':levels[riskProfile]>=product.risk?'符合所选体验偏好':'超出所选体验偏好'},
   {id:'cash',label:'付款保护',ok:cap.status==='evaluated'&&amount<=cap.max,detail:cap.status==='evaluated'?'资金容量 '+(cap.max/100).toFixed(2)+' '+currency+' · 约束日 '+cap.binding:cap.reason},
   {id:'stress',label:'压力承受',ok:stressLoss<=lossBudget&&amount<=stressCap,detail:'假设回撤 '+(product.lossBps/100)+'%，情景损失 '+(stressLoss/100).toFixed(2)+' '+currency},
   {id:'minimum',label:'样例门槛',ok:amount>=product.minimum,detail:'样例金额下限 '+(product.minimum/100).toFixed(2)+' '+currency}
  ];
  return {...product,currency,amount,max,stressLoss,available:cap.available,binding:cap.binding,checks,fits:checks.every(x=>x.ok),reason:checks.filter(x=>!x.ok).map(x=>x.detail).join('；')||'金额、期限、偏好及压力条件通过'};
 });
 return {deposits,investments};
}
function review(state,month){
 const current=C.monthly(state,month),d=new Date(month+'-01T00:00:00Z');d.setUTCMonth(d.getUTCMonth()-1);const previousMonth=d.toISOString().slice(0,7),previous=C.monthly(state,previousMonth);
 const budgets=(state.budgets||[]).filter(b=>b.month===month).map(b=>({...b,spent:current.groups[b.category]?.[b.currency]||0}));
 const unknown=current.rows.filter(t=>!t.category||['未分类','待确认','其他'].includes(t.category));
 const changes=Object.fromEntries(currencies.map(c=>{const a=current.rows.some(t=>t.currency===c),b=previous.rows.some(t=>t.currency===c);return [c,a&&b?current.totals[c]-previous.totals[c]:null];}));
 const actions=budgets.filter(b=>b.spent>b.amount).map(b=>({text:b.category+' 超过分类预算；检查是否一次性支出，再调整后续计划。',currency:b.currency,amount:b.spent-b.amount,ids:current.rows.filter(t=>t.category===b.category&&t.currency===b.currency).map(t=>t.id)}));
 if(unknown.length)actions.push({text:'核对 '+unknown.length+' 笔用途未明确的记录。',ids:unknown.map(t=>t.id)});
 const wallet=current.rows.filter(t=>t.category==='未细分钱包支出');if(wallet.length)actions.push({text:'钱包汇总尚未拆分用途。取得同区间明细并对账后才能细化，不能把独立样本再加一次。',ids:wallet.map(t=>t.id)});
 const f=E.forecast(state);if(f.firstReserve)actions.unshift({text:f.firstReserve.date+' 预计低于资金底线；先核实大额付款与资金来源。',ids:[]});
 if(!actions.length)actions.push({text:'已知记录中未触发超预算提示；确认下一笔付款日期和账单覆盖范围。',ids:[]});
 return {current,previousMonth,previous,changes,budgets,unknown,actions};
}
function stamp(state,kind,month){
 let payload;
 if(kind==='plan')payload=[state.asOf,state.plan];
 else if(kind==='ledger'){C.monthly(state,month);payload=[state.asOf,month,C.spending(state,{from:month+'-01',to:new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0)).toISOString().slice(0,10),showExcluded:true}).rows];}
 else throw Error('核对类型无效');
 // Non-security change detection only; do not export raw ledger bodies in preferences.
 const text=JSON.stringify(payload);let hash=2166136261;for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);
 return 'v1-'+text.length+'-'+(hash>>>0).toString(16);
}
function tasks(state,month){const r=review(state,month),care=state.care||{};return [
 {id:'plan',label:'核实付款日期与预留',done:care.planStamp===stamp(state,'plan',month)},
 {id:'ledger',label:'核对本月分类与忽略项',done:!r.unknown.length&&r.current.rows.length>0&&care.ledgerStamp===stamp(state,'ledger',month)},
 {id:'budget',label:'设置本月分类预算',done:r.budgets.some(b=>b.amount>0)}
 ];}
function adjustPlan(state,options={}){
 const next=structuredClone(state),{delay=0,extra=0,currency='HKD',date,eventId,eventDate,includeExpected=false}=options;
 if(!Number.isSafeInteger(extra)||extra<0||extra>1e12||!currencies.includes(currency)||typeof includeExpected!=='boolean')throw Error('调整金额或币种无效');
 const checkDate=value=>{E.date(value);if(value<=state.asOf||value>state.plan.end)throw Error('日期须在余额日之后、规划结束日以内');};
 if(eventId||eventDate){const event=next.plan.events.find(e=>e.id===eventId&&e.kind==='expense');if(!event||!eventDate)throw Error('请选择付款事项及调整后的日期');checkDate(eventDate);event.date=eventDate;}
 if(extra){checkDate(date);next.plan.events.push({id:'adjustment-'+next.plan.events.length,name:'新增支出',currency,date,amount:-extra,kind:'expense'});}
 return {base:E.forecast(state,{includeExpected}),adjusted:E.forecast(next,{delay,includeExpected})};
}
function automatic(state,options={}){
 const next=structuredClone(state),days=Math.round((E.date(state.plan.end)-E.date(state.asOf))/86400000),historyDays=Math.min(60,Math.max(0,Math.round((E.date(state.asOf)-Math.max(...state.accounts.filter(a=>a.liquid).map(a=>E.date(a.openingDate))))/86400000)));
 const patterns={};
 for(const currency of currencies){const key=currency==='HKD'?'living':'cnyLiving',rows=C.spending(state,{currency,from:E.addDays(state.asOf,-historyDays),to:state.asOf}).rows.filter(t=>!t.excluded&&!t.pending&&['餐饮','日用','交通','洗衣','通讯','娱乐'].includes(t.category)),activeDays=new Set(rows.map(t=>t.date)).size;
  const estimate=historyDays>=14&&activeDays>=5?Math.ceil(Math.max(0,-rows.reduce((n,t)=>n+t.amount,0))*days/(historyDays+1)*1.15):0;
  next.plan[key]=Math.max(next.plan[key]||0,estimate);patterns[currency]={amount:next.plan[key],basis:estimate>(state.plan[key]||0)?'消费记录及15%缓冲':'已设生活预算',historyDays,activeDays};
 }
 const plans=[1,2,3,6,12].map(months=>capacity(next,{currency:options.currency||'HKD',months,bufferDays:options.bufferDays||2}));
 return {state:next,patterns,plans};
}
return {catalog,productTypes,addMonths,capacity,match,recommend,review,stamp,tasks,adjustPlan,automatic};
});
