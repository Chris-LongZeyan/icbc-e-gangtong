(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.GangxueHost=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const CHANNEL='gangxue.host.v1',METHODS=['getSnapshot','getRates','savePreferences','openFxReview'];
 function accept(event,parent,origin,id){const d=event.data;return event.source===parent&&event.origin===origin&&d?.channel===CHANNEL&&d.type==='response'&&d.id===id;}
 function createBridge(win,config){
  if(!/^https?:\/\//.test(config.parentOrigin)||new URL(config.parentOrigin).origin!==config.parentOrigin)throw Error('必须配置准确的宿主 origin');
  return {request(method,params={}){return new Promise((resolve,reject)=>{
   if(!METHODS.includes(method))return reject(Error('未允许的宿主操作'));
   if(win.parent===win)return reject(Error('此入口须由宿主页面嵌入，请打开 host-demo.html'));
   const id=win.crypto.randomUUID();let timer;
   const finish=()=>{win.clearTimeout(timer);win.removeEventListener('message',listener);};
   const listener=e=>{if(!accept(e,win.parent,config.parentOrigin,id))return;finish();e.data.error?reject(Error(String(e.data.error))):resolve(e.data.result);};
   win.addEventListener('message',listener);timer=win.setTimeout(()=>{finish();reject(Error('宿主响应超时；没有回退到模拟账户'));},config.timeoutMs||8000);
   win.parent.postMessage({channel:CHANNEL,type:'request',id,method,params},config.parentOrigin);
  });}};
 }
 function validateSnapshot(s,E){
  if(!s||!Array.isArray(s.accounts)||!Array.isArray(s.transactions)||!s.plan||typeof s.name!=='string')throw Error('账户快照格式不完整');
  if(!s.accounts.length||s.accounts.length>100||s.transactions.length>10000)throw Error('账户或流水数量超出模块范围');
  E.date(s.asOf);if(s.plan.start!==s.asOf)throw Error('规划起点必须与快照日一致');
  if(s.accounts.some(a=>typeof a.liquid!=='boolean'||a.openingDate>s.asOf))throw Error('账户可用性或期初日期无效');
  if(s.transactions.some(t=>t.date>s.asOf))throw Error('宿主不可提供未来已记账流水');
  E.forecast(s);E.quality(s);return structuredClone(s);
 }
 function validateRates(q){
  if(!q||typeof q.provider!=='string'||typeof q.kind!=='string'||!Number.isFinite(Date.parse(q.sourceUpdatedAt))||!Number.isFinite(Date.parse(q.retrievedAt)))throw Error('报价缺少来源或时间');
  if(!/^https:\/\//.test(q.source)||q.unit!=='HKD per CNY/CNH')throw Error('报价来源或单位不匹配');
  for(const m of ['CNY','CNH']){const r=q.markets?.[m];if(!r||!Number.isFinite(r.customerSell)||!Number.isFinite(r.customerBuy)||r.customerSell<=0||r.customerBuy<r.customerSell)throw Error('买卖报价无效');}
  return structuredClone(q);
 }
 function preferences(s){return {schema:'gangxue.preferences.v1',asOf:s.asOf,wealth:structuredClone(s.wealth||{}),care:structuredClone(s.care||{}),plan:structuredClone(s.plan),budgets:structuredClone(s.budgets||[]),exclusions:structuredClone(s.exclusions||{}),categories:Object.fromEntries(s.transactions.map(t=>[t.id,t.category||'未分类']))};}
 return {CHANNEL,METHODS,accept,createBridge,validateSnapshot,validateRates,preferences};
});
