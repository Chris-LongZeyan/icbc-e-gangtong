(function(root,factory){const api=factory(typeof module==='object'?require('./engine'):root.Gangxue,typeof module==='object'?require('./core'):root.GangxueCore);if(typeof module==='object')module.exports=api;else root.GangxueAssistant=api;})(globalThis,function(E,C){
'use strict';
function run(state,rates,draft,options={}){
 if(!draft||!['check_purchase','reserve_payment'].includes(draft.tool)||!['HKD','CNY'].includes(draft.currency)||typeof draft.name!=='string'||draft.name.length>60)throw Error('请检查事项及币种');
 const amount=E.money(draft.amount);if(amount<=0||amount>1e12)throw Error('请输入有效金额');
 E.date(draft.date);if(draft.date<=state.asOf||draft.date>state.plan.end)throw Error('付款日须晚于余额日，并位于规划期内');
 if(draft.question)throw Error('请先补充并确认事项');
 // Whitelist calculation parameters. A model cannot change reserves or income.
 const opts={settlementDays:options.settlementDays??0,feeBps:options.feeBps??0,fixedFee:options.fixedFee??0};
 const copy=structuredClone(state);let result;
 if(draft.tool==='check_purchase')result=C.solve(copy,rates,{...opts,target:draft.currency,purchase:amount,due:draft.date});
 else{copy.plan.events.push({id:'assistant-preview',name:draft.name||'必要付款',currency:draft.currency,amount:-amount,date:draft.date,kind:'expense',protect:true});result=E.forecast(copy);}
 return {tool:draft.tool,draft:{...draft},result,preview:copy};
}
function fields(draft,intent){
 if(intent==='prepare_setup'){
  if(draft?.tool!==intent)throw Error('事项类型无效');
  const result={};
  for(const key of ['HKD','CNY','reserve','cnyReserve','living','cnyLiving','tuition','rent']){
   const v=draft[key];if(v!==null&&(typeof v!=='string'||!/^\d{1,10}(\.\d{1,2})?$/.test(v)||E.money(v)>1e12))throw Error('金额无效');
   if(v!==null||['HKD','CNY'].includes(key))result[key]=v??'';
  }
  for(const key of ['asOf','end','tuitionDate','rentDate']){if(draft[key]!==null)E.date(draft[key]);if(draft[key]!==null||['asOf','end'].includes(key)||Number(draft[key.startsWith('tuition')?'tuition':'rent'])>0)result[key]=draft[key]??'';}
  for(const key of ['tuitionCurrency','rentCurrency']){if(draft[key]!==null&&!['HKD','CNY'].includes(draft[key]))throw Error('币种无效');if(draft[key]!==null||Number(draft[key.startsWith('tuition')?'tuition':'rent'])>0)result[key]=draft[key]??'';}
  if(typeof draft.name!=='string'||draft.name.length>40)throw Error('称呼无效');if(draft.name)result.name=draft.name;
  return result;
 }
 if(!draft||draft.tool!==intent||!['check_purchase','reserve_payment','record_transaction'].includes(intent))throw Error('识别的事项类型与当前表单不符');
 if(draft.currency!==null&&!['CNY','HKD'].includes(draft.currency))throw Error('币种无效');
 if(draft.amount!==null&&(typeof draft.amount!=='string'||!/^\d{1,10}(\.\d{1,2})?$/.test(draft.amount)||E.money(draft.amount)<=0||E.money(draft.amount)>1e12))throw Error('金额无效');
 if(draft.date!==null)E.date(draft.date);
 if(typeof draft.name!=='string'||draft.name.length>60||typeof draft.question!=='string'||draft.question.length>200)throw Error('事项说明无效');
 if(intent==='record_transaction'){
  if(draft.type!==null&&!['expense','income','refund'].includes(draft.type))throw Error('收支类型无效');
  if(typeof draft.category!=='string'||draft.category.length>40)throw Error('用途无效');
  return {description:draft.name,currency:draft.currency||'',amount:draft.amount||'',date:draft.date||'',type:draft.type||'',category:draft.category||'未分类'};
 }
 return intent==='check_purchase'?{target:draft.currency||'',purchase:draft.amount||'',due:draft.date||''}:{name:draft.name,currency:draft.currency||'',amount:draft.amount||'',date:draft.date||'',kind:'expense'};
}
function missing(draft,language='zh'){
 if(draft.tool==='record_transaction'){
  const labels=language==='en'?{currency:'currency',amount:'amount',date:'transaction date',type:'income, expense or refund',name:'description'}:{currency:'币种',amount:'金额',date:'交易日期',type:'收入、支出或退款',name:'商户或说明'};
  const keys=Object.keys(labels).filter(k=>!draft[k]);return keys.length?(language==='en'?'Please provide: ':'请补充：')+keys.map(k=>labels[k]).join('、'):'';
 }
 if(draft.tool==='prepare_setup'){
  const required=['HKD','CNY','asOf','end',...['tuition','rent'].filter(k=>Number(draft[k])>0).flatMap(k=>[k+'Currency',k+'Date'])];
  const labels={HKD:'港币余额',CNY:'人民币余额',asOf:'余额日',end:'规划结束日',tuitionCurrency:'学费币种',tuitionDate:'学费日期',rentCurrency:'房租币种',rentDate:'房租日期'};
  const keys=required.filter(k=>draft[k]===null||draft[k]==='');
  return keys.length?(language==='en'?'Please provide: ':'请补充：')+keys.map(k=>language==='en'?k:labels[k]).join('、'):'';
 }
 const labels={zh:{currency:'币种',amount:'金额',date:'付款日期'},yue:{currency:'币种',amount:'金额',date:'付款日期'},en:{currency:'currency',amount:'amount',date:'payment date'}},names=['currency','amount','date'].filter(k=>!draft[k]).map(k=>(labels[language]||labels.zh)[k]);
 return names.length?(language==='en'?'Please provide ':language==='yue'?'请补充返':'请补充')+names.join(language==='en'?', ':'、')+(language==='en'?'.':'。'):'';
}
function transactionFields(state,draft,currentAccount='',language='zh'){
 const map=fields(draft,'record_transaction');
 const accounts=state.accounts.filter(a=>a.currency===draft.currency),chosen=accounts.find(a=>a.id===currentAccount)||(accounts.length===1?accounts[0]:null);
 map.account=chosen?.id||'';
 let question=missing(draft,language);
 if(!question&&!chosen)question=language==='en'?'Select the account below.':'请在下方选择收支账户。';
 if(draft.date&&draft.date>state.asOf){map.date='';question=language==='en'?'Enter a transaction date on or before the balance date.':'请填写余额日或之前已发生的交易日期；未来付款请加入计划。';}
 if(chosen&&draft.date&&draft.date<chosen.openingDate){map.date='';question=language==='en'?'This transaction predates the opening balance. Check the opening date and balance before adding historical records.':'这笔交易早于期初余额日。补录历史流水前，请先核实账本的期初日期与余额。';}
 if(draft.type==='refund')question+=(language==='en'?' Select the original transaction for this refund.':' 请填写退款对应的原流水编号。');
 return {map,question};
}
return {run,fields,missing,transactionFields};
});
