(function(root,factory){const api=factory(typeof module==='object'?require('./engine.js'):root.Gangxue);if(typeof module==='object')module.exports=api;else root.GangxuePlanner=api;})(globalThis,function(E){
'use strict';
// Exact integer arithmetic: CNY cents paid, fee rounded up, HKD cents rounded down.
function options(raw={}){
 const o={rate:0.91,feeBps:50,fixedFee:0,settlementDays:1,cnyReserve:0,includeExpected:false,...raw};
 if(!Number.isFinite(o.rate)||o.rate<=0||o.rate>100||Math.abs(o.rate*1e6-Math.round(o.rate*1e6))>1e-6)throw Error('汇率须为正数，最多六位小数');
 for(const [k,max] of [['feeBps',9999],['fixedFee',1e12],['settlementDays',30],['cnyReserve',1e12]])if(!Number.isSafeInteger(o[k])||o[k]<0||o[k]>max)throw Error('参数无效：'+k);
 return o;
}
function quote(cny,raw={}){
 const o=options(raw);if(!Number.isSafeInteger(cny)||cny<0||cny>1e12)throw Error('换汇金额无效');
 if(cny===0)return {cny:0,fee:0,hkd:0};
 const fee=Number((BigInt(cny)*BigInt(o.feeBps)+9999n)/10000n)+o.fixedFee;
 const hkd=fee>=cny?0:Number(BigInt(cny-fee)*1000000n/BigInt(Math.round(o.rate*1e6)));
 return {cny,fee,hkd};
}
function optimize(state,raw={}){
 const o=options({rate:state.plan.rate,...raw}),base=E.forecast(state,{includeExpected:o.includeExpected});
 const settlement=E.addDays(state.asOf,o.settlementDays),reserve=state.plan.reserve;
 const hkNeed=base.rows.filter(r=>r.lowHKD<reserve),firstNeed=hkNeed[0];
 const cnyFloor=Math.min(base.initial.CNY,...base.rows.map(r=>r.lowCNY));
 const maxCny=Math.max(0,cnyFloor-o.cnyReserve);
 const requiredHKD=Math.max(0,...base.rows.map(r=>reserve-r.lowHKD));
 const evaluate=cny=>{
  const q=quote(cny,o),initial={HKD:base.initial.HKD+(o.settlementDays===0?q.hkd:0),CNY:base.initial.CNY-cny};
  const rows=base.rows.map(r=>({...r,HKD:r.HKD+(r.date>=settlement?q.hkd:0),lowHKD:r.lowHKD+(r.date>=settlement?q.hkd:0),CNY:r.CNY-cny,lowCNY:r.lowCNY-cny}));
  const failed=rows.find(r=>r.lowHKD<reserve||r.lowCNY<o.cnyReserve);
  // The action must also be funded now. HKD may be below its target before settlement;
  // future day constraints, starting tomorrow, must all be met.
  return {...q,initial,rows,feasible:initial.CNY>=o.cnyReserve&&!failed,firstFailure:failed?.date||null,
   minHKD:Math.min(...rows.map(r=>r.lowHKD)),minCNY:Math.min(initial.CNY,...rows.map(r=>r.lowCNY))};
 };
 const common={base,options:o,settlement,requiredHKD,maxCny,firstNeed:firstNeed?.date||null,
  latestOrder:firstNeed?E.addDays(firstNeed.date,-o.settlementDays):null,
  allConversion:evaluate(Math.max(0,base.initial.CNY)),outside:base.outside};
 if(base.outside.length)return {...common,status:'blocked',reason:'存在规划期外或起点当日事项；请先修正日期，避免漏算付款。'};
 if(cnyFloor<o.cnyReserve)return {...common,status:'infeasible',reason:'人民币自身付款或预留不足，不能通过卖出人民币解决。'};
 if(requiredHKD===0)return {...common,status:'unnecessary',reason:'当前假设下，无需换汇即可覆盖两币种付款与预留。',solution:evaluate(0)};
 if(firstNeed.date<settlement)return {...common,status:'infeasible',reason:'首个港币预留缺口早于假设到账日；换汇金额再大也来不及。'};
 if(quote(maxCny,o).hkd<requiredHKD)return {...common,status:'infeasible',reason:'保留人民币付款和预留后，可换金额不足。需调整支出或确认新增资金。'};
 let lo=0,hi=maxCny,iterations=0;
 while(lo<hi){const mid=Math.floor((lo+hi)/2);if(quote(mid,o).hkd>=requiredHKD)hi=mid;else lo=mid+1;iterations++;}
 const solution=evaluate(lo),previous=evaluate(lo-1);
 if(!solution.feasible)throw Error('内部校验失败：换汇方案不满足逐日约束');
 return {...common,status:'feasible',reason:'找到当前固定汇率、单次换汇模型内的最小人民币扣款。',solution,
  proof:{previousCny:lo-1,previousHKD:previous.hkd,previousFeasible:previous.feasible,iterations}};
}
return {quote,optimize};
});
