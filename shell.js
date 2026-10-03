'use strict';
const embedded=GangxueConfig.mode==='embedded';
const hostBridge=embedded?GangxueHost.createBridge(window,GangxueConfig):null;
let hostReady=!embedded,hostFailure='';
document.documentElement.classList.toggle('embedded',embedded);
if(embedded){document.querySelector('.demo-bar b').textContent='宿主模块 / 等待授权';document.querySelector('#data-label').textContent='尚未读取账户快照';document.querySelector('#save').disabled=true;}
const dataAdapter={
 async rates(refresh=false){
  if(embedded)return GangxueHost.validateRates(await hostBridge.request('getRates',{refresh}));
  const response=await fetch(new URL(refresh?'api/rates':'official-rates.json',document.baseURI));
  const data=await response.json();if(!response.ok)throw Error(data.error||'报价暂不可用');
  return GangxueHost.validateRates(data);
 },
 async bootstrap(){
  if(!embedded)return;
  try{state=GangxueHost.validateSnapshot(await hostBridge.request('getSnapshot'),Gangxue);hostReady=true;hostFailure='';document.querySelector('.demo-bar b').textContent='宿主模块 / 接入演示';document.querySelector('#save').textContent='保存规划到宿主';document.querySelector('#save').disabled=false;await loadOfficialRates();render();}
  catch(e){hostReady=false;hostFailure=e.message;render();}
 },
 async save(){
  if(embedded){await hostBridge.request('savePreferences',GangxueHost.preferences(state));notify('规划偏好已交给宿主保存；没有修改账户或发起交易。');}
  else{localStorage.setItem('gangxue-poc-v1',JSON.stringify(state));notify('已保存到此浏览器；未加密，仅用于模拟 / 脱敏数据。');}
 }
};
