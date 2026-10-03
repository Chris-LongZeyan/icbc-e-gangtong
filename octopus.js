(function(root,factory){const api=factory(typeof module==='object'?require('./engine.js'):root.Gangxue);if(typeof module==='object')module.exports=api;else root.GangxueOctopus=api;})(globalThis,function(E){
'use strict';
const categories=['交通','餐饮','日用','洗衣','未分类'];
function suggest(description){
 if(/\bMTR\b/i.test(description))return {category:'交通',basis:'商户名称含 MTR；未识别线路或站点'};
 if(/laundry/i.test(description))return {category:'洗衣',basis:'商户名称含 Laundry'};
 if(/coffee|catering|pret a manger|silk tea/i.test(description))return {category:'餐饮',basis:'商户名称关键词，需用户确认'};
 return {category:'未分类',basis:'仅凭商户名称无法确定用途'};
}
function preview(existing,text){
 const input=E.parseCsv(text),ids=new Map(existing.map(t=>[t.id,t])),accepted=[],warnings=[];let duplicates=0;
 if(input.length>2000)throw Error('一次最多导入 2000 条');
 for(const t of input){
  if(t.currency!=='HKD'||t.account!=='octopus')throw Error('八达通样本必须为 octopus 账户和 HKD');
  if(!['expense','refund','topup'].includes(t.type))throw Error('样本仅支持 expense、refund、topup');
  if(t.type==='topup'&&t.amount<0)throw Error('八达通侧充值应为正数');
  if(t.time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(t.time))throw Error('时间须为 HH:mm');
  t.time=t.time||'';t.source='本地 CSV 转录';
  const suggestion=suggest(t.description);t.category=t.category||suggestion.category;t.basis=suggestion.basis;
  if(!categories.includes(t.category)&&t.type!=='topup')throw Error('不支持的分类：'+t.category);
  if(ids.has(t.id)){
   const old=ids.get(t.id);
   if(['date','time','description','amount','type'].some(k=>(old[k]||'')!==(t[k]||'')))throw Error('ID 相同但内容不同：'+t.id);
   duplicates++;continue;
  }
  const similar=[...ids.values()].find(x=>x.date===t.date&&x.time===t.time&&x.description===t.description&&x.amount===t.amount);
  if(similar)warnings.push(t.id+' 与 '+similar.id+' 字段相同；可能重复，保留两笔待复核');
  ids.set(t.id,t);accepted.push(t);
 }
 return {records:[...existing,...accepted],accepted:accepted.length,duplicates,warnings};
}
function summary(records,opening=null,closing=null){
 let expense=0,refund=0,topup=0,net=0;const groups={};
 for(const t of records){E.validateTransaction(t);net+=t.amount;
  if(t.type==='expense'){expense-=t.amount;groups[t.category]=(groups[t.category]||0)-t.amount;}
  if(t.type==='refund'){refund+=t.amount;groups[t.category]=(groups[t.category]||0)-t.amount;}
  if(t.type==='topup')topup+=t.amount;
 }
 const hasBalances=Number.isSafeInteger(opening)&&Number.isSafeInteger(closing);
 return {count:records.length,expense,refund,spending:expense-refund,topup,net,groups,
  calculatedClosing:hasBalances?opening+net:null,difference:hasBalances?opening+net-closing:null,
  status:hasBalances?(opening+net===closing?'balanced':'mismatch'):'unknown'};
}
// Suggest possible pairs only. A unique amount/date does not prove ownership or a match.
function topupCandidates(records,bank){return records.filter(t=>t.type==='topup').map(t=>({id:t.id,
 candidates:bank.filter(b=>b.type==='topup'&&b.amount<0&&b.currency==='HKD'&&-b.amount===t.amount&&Math.abs(E.date(b.date)-E.date(t.date))<=86400000).map(b=>b.id)}));}
const sample='id,date,account,currency,amount,type,description,time,category\n'+
'demo-topup,2026-09-28,octopus,HKD,500.00,topup,Octopus top-up,09:00,充值\n'+
'demo-mtr,2026-09-28,octopus,HKD,-4.40,expense,MTR Corporation Limited,10:15,\n'+
'demo-cafe,2026-09-28,octopus,HKD,-28.00,expense,Example Coffee,12:10,\n'+
'demo-laundry1,2026-09-28,octopus,HKD,-5.20,expense,Example Hall Laundry,22:15,\n'+
'demo-laundry2,2026-09-28,octopus,HKD,-10.40,expense,Example Hall Laundry,22:15,\n'+
'demo-unknown,2026-09-29,octopus,HKD,-100.00,expense,Example Hall,18:30,\n';
return {categories,suggest,preview,summary,topupCandidates,sample};
});
