(function(root,factory){const api=factory(typeof module==='object'?require('./engine'):root.Gangxue);if(typeof module==='object')module.exports=api;else root.GangxueCore=api;})(globalThis,function(E){
'use strict';
const currencies=['HKD','CNY'];
function amount(v){if(!Number.isSafeInteger(v)||v<0||v>1e12)throw Error('金额须为非负整数分');return v;}
function spending(state,filter={}){
 const from=filter.from||'0000-01-01',to=filter.to||state.asOf;
 if(from>to)throw Error('开始日期不能晚于结束日期');
 const matches=t=>t.date>=from&&t.date<=to&&(!filter.currency||t.currency===filter.currency)&&(!filter.account||t.account===filter.account)&&(!filter.category||t.category===filter.category)&&(!filter.query||(t.description+' '+t.id).toLowerCase().includes(filter.query.toLowerCase()));
 const excluded=t=>state.exclusions?.[t.id]===true||!!(t.refundOf&&state.exclusions?.[t.refundOf]===true);
 const all=state.transactions.filter(t=>['expense','refund'].includes(t.type)&&matches(t));
 const rows=all.filter(t=>filter.showExcluded||!excluded(t)).map(t=>({...t,excluded:excluded(t)})).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
 const totals={HKD:0,CNY:0},groups=Object.create(null);
 for(const t of rows.filter(t=>!t.excluded)){const n=-t.amount;totals[t.currency]+=n;const g=groups[t.category||'未分类']||={HKD:0,CNY:0};g[t.currency]+=n;}
 return {rows,totals,groups,excludedCount:all.filter(excluded).length};
}
function redline(state,day=state.asOf){
 E.date(day);const reserve={HKD:amount(state.plan.reserve),CNY:amount(state.plan.cnyReserve||0)};
 const locked={HKD:0,CNY:0};
 for(const e of state.plan.events)if(e.kind==='expense'&&e.protect!==false&&e.date>day)locked[e.currency]-=e.amount;
 const floor={};for(const c of currencies)floor[c]=Math.max(reserve[c]+locked[c],amount(state.plan.floors?.[c]||0));
 const liquid=E.reconcile(state.accounts,state.transactions,state.asOf).liquid;
 return {reserve,locked,floor,liquid,headroom:Object.fromEntries(currencies.map(c=>[c,liquid[c]-floor[c]]))};
}
// Rates are HKD per one CNY/CNH, matching the source table. Bid/ask are never interchanged.
function quote(debit,source,rates,feeBps=0,fixedFee=0){
 amount(debit);amount(fixedFee);if(!currencies.includes(source)||!Number.isSafeInteger(feeBps)||feeBps<0||feeBps>=10000)throw Error('换汇参数无效');
 for(const k of ['customerSell','customerBuy'])if(!Number.isFinite(rates?.[k])||rates[k]<=0||rates[k]>100||Math.abs(rates[k]*1e6-Math.round(rates[k]*1e6))>1e-6)throw Error('缺少可核验的买入 / 卖出报价');
 if(rates.customerSell>rates.customerBuy)throw Error('买卖报价方向异常');
 if(!debit)return {debit:0,fee:0,received:0};
 const fee=Number((BigInt(debit)*BigInt(feeBps)+9999n)/10000n)+fixedFee,net=Math.max(0,debit-fee);
 const rate=BigInt(Math.round(rates[source==='CNY'?'customerSell':'customerBuy']*1e6));
 const received=Number(source==='CNY'?BigInt(net)*rate/1000000n:BigInt(net)*1000000n/rate);
 return {debit,fee,received};
}
function solve(state,rates,raw={}){
 const o={target:'HKD',purchase:0,due:E.addDays(state.asOf,1),settlementDays:0,feeBps:0,fixedFee:0,...raw};
 if(!currencies.includes(o.target))throw Error('付款币种无效');amount(o.purchase);amount(o.fixedFee);E.date(o.due);
 if(!Number.isSafeInteger(o.feeBps)||o.feeBps<0||o.feeBps>=10000)throw Error('比例费无效');
 if(!Number.isSafeInteger(o.settlementDays)||o.settlementDays<0||o.settlementDays>30)throw Error('到账延迟无效');
 const target=o.target,source=target==='HKD'?'CNY':'HKD',copy=structuredClone(state);
 if(o.purchase)copy.plan.events.push({id:'purchase-check',name:'拟购物付款',currency:target,amount:-o.purchase,date:o.due,kind:'expense',protect:false});
 const base=E.forecast(copy),r=redline(state),settlement=E.addDays(state.asOf,o.settlementDays);
 const floor={HKD:Math.max(state.plan.reserve,state.plan.floors?.HKD||0),CNY:Math.max(state.plan.cnyReserve||0,state.plan.floors?.CNY||0)};
 const low=(row,c)=>row['low'+c],sourceMargin=Math.min(base.initial[source]-r.floor[source],...base.rows.map(row=>low(row,source)-floor[source]));
 const cap=Math.max(0,sourceMargin),required=Math.max(0,...base.rows.map(row=>floor[target]-low(row,target)));
 const first=base.rows.find(row=>low(row,target)<floor[target]);
 const common={target,source,options:o,base,cap,required,settlement,firstNeed:first?.date||null,redline:r,rates};
 if(base.outside.length)return {...common,status:'blocked',reason:'存在规划期外或起点当日付款，请调整日期或规划期。'};
 if(sourceMargin<0)return {...common,status:'infeasible',reason:'另一币种已低于预留红线，不能挪用学费、租金或应急金补足此次付款。'};
 if(!required)return {...common,status:'unnecessary',reason:'原币余额可覆盖付款及预留，无需换汇。',solution:{debit:0,fee:0,received:0}};
 if(!rates)return {...common,status:'missing-rate',reason:'尚无官方报价。请刷新或检查来源后输入，不能用随机汇率生成方案。'};
 if(first.date<settlement)return {...common,status:'infeasible',reason:'预计到账晚于首个资金缺口；需提前安排、延后购买或确认新增资金。'};
 if(quote(cap,source,rates,o.feeBps,o.fixedFee).received<required)return {...common,status:'infeasible',reason:'保护另一币种付款及红线后，可换余额不足；应减少 / 延后可选消费或补充资金。'};
 let lo=0,hi=cap;while(lo<hi){const mid=Math.floor((lo+hi)/2);if(quote(mid,source,rates,o.feeBps,o.fixedFee).received>=required)hi=mid;else lo=mid+1;}
 const solution=quote(lo,source,rates,o.feeBps,o.fixedFee),previous=quote(lo-1,source,rates,o.feeBps,o.fixedFee);
 const rows=base.rows.map(row=>({...row,[source]:row[source]-lo,['low'+source]:low(row,source)-lo,[target]:row[target]+(row.date>=settlement?solution.received:0),['low'+target]:low(row,target)+(row.date>=settlement?solution.received:0)}));
 if(rows.some(row=>currencies.some(c=>low(row,c)<floor[c])))throw Error('换汇后逐日核验失败');
 return {...common,status:'feasible',reason:'固定报价下的最小换汇估算；真实成交前需由银行确认报价、费用与收款账户可达性。',solution,previous,rows,latestOrder:E.addDays(first.date,-o.settlementDays)};
}
function monthly(state,month){
 if(!/^\d{4}-\d{2}$/.test(month))throw Error('月份无效');E.date(month+'-01');
 const end=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0)).toISOString().slice(0,10);
 const result=spending(state,{from:month+'-01',to:end});
 return {...result,month,partial:end>state.asOf,redline:redline(state)};
}
return {spending,redline,quote,solve,monthly};
});
