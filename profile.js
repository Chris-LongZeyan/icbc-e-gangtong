(function(root,factory){const api=factory(typeof module==='object'?require('./engine.js'):root.Gangxue);if(typeof module==='object')module.exports=api;else root.GangxueProfile=api;})(globalThis,function(E){
 'use strict';
 function amount(value,label){if(!/^\d+(\.\d{1,2})?$/.test(String(value)))throw Error(label+'须为非负金额，最多两位小数');const n=E.money(value);if(!Number.isSafeInteger(n)||n>100000000000)throw Error(label+'过大');return n;}
 function createManual(input){
  E.date(input.asOf);E.date(input.end);
  const name=String(input.name||'我的试算').trim();if(!name||name.length>40)throw Error('称呼请填写1至40字');
  const s={id:'manual',name,experience:'manual',asOf:input.asOf,transactions:[],accounts:['HKD','CNY'].map(c=>({id:c.toLowerCase(),name:c==='HKD'?'港币账户（手动）':'人民币账户（手动）',currency:c,liquid:true,openingDate:input.asOf,opening:amount(input[c],c+'余额')})),plan:{start:input.asOf,end:input.end,rate:1,reserve:amount(input.reserve,'港币应急金'),cnyReserve:amount(input.cnyReserve,'人民币应急金'),living:amount(input.living,'港币生活预算'),cnyLiving:amount(input.cnyLiving,'人民币生活预算'),events:[]}};
  for(const key of ['tuition','rent']){const n=amount(input[key]||'0','付款金额');if(n){const currency=input[key+'Currency'];if(!['HKD','CNY'].includes(currency))throw Error('付款币种无效');E.date(input[key+'Date']);s.plan.events.push({id:key,name:key==='tuition'?'学费':'房租',currency,date:input[key+'Date'],amount:-n,kind:'expense',protect:true});}}
  const f=E.forecast(s);if(f.outside.length)throw Error('付款日期须晚于余额日，且不超过规划结束日');return s;
 }
 function card(account,manual,host){
  // The standalone demo never needs a user's real card number.
  if(host)return {label:'宿主账户标识',masked:String(account.id),full:null};
  if(manual)return {label:'本地试算账户',masked:account.currency+' · 未绑定银行卡',full:null};
  const suffix={hkd:'1001',cny:'2002',wallet:'3003'}[account.id];
  if(!suffix)return {label:'账户标识',masked:String(account.id),full:null};
  return {label:account.liquid?'虚构演示卡号':'虚构钱包编号',masked:'DEMO •••• '+suffix,full:'DEMO 0000 0000 '+suffix};
 }
 function blank(day){return {...createManual({asOf:day,end:E.addDays(day,60),name:'我的账本',HKD:'0',CNY:'0',reserve:'0',cnyReserve:'0',living:'0',cnyLiving:'0'}),onboarding:true};}
 function restorePersonal(text){const s=JSON.parse(text);if(s.experience!=='manual'||s.id!=='manual')throw Error('请选择个人账本备份');E.forecast(s);E.quality(s);return s;}
 return {createManual,card,blank,restorePersonal};
});
