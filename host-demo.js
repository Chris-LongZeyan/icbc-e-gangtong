'use strict';
const frame=document.querySelector('#planning-frame'),log=document.querySelector('#host-log'),saved=new Map();
const addLog=text=>{log.textContent=new Date().toLocaleTimeString()+' '+text+'\n'+log.textContent;};
window.addEventListener('message',async event=>{
 const d=event.data;if(event.origin!==location.origin||event.source!==frame.contentWindow||d?.channel!==GangxueHost.CHANNEL||d.type!=='request'||!GangxueHost.METHODS.includes(d.method)||typeof d.id!=='string')return;
 const access=document.querySelector('#host-access').value;if(access==='timeout')return;
 const response={channel:GangxueHost.CHANNEL,type:'response',id:d.id};
 try{
  if(access==='denied')throw Error('宿主授权已失效，请返回宿主重新授权。');
  const persona=document.querySelector('#host-persona').value;
  if(d.method==='getSnapshot'){
   response.result=GangxueFixtures.make(persona);const overlay=saved.get(persona);
   if(overlay){response.result.plan=overlay.plan;response.result.budgets=overlay.budgets;response.result.exclusions=overlay.exclusions;response.result.transactions.forEach(t=>{if(overlay.categories[t.id])t.category=overlay.categories[t.id];});}
  }else if(d.method==='getRates'){
   const r=await fetch(d.params.refresh?'api/rates':'official-rates.json');response.result=await r.json();if(!r.ok)throw Error(response.result.error);
  }else if(d.method==='savePreferences'){
   const p=d.params;if(p.schema!=='gangxue.preferences.v1'||p.accounts||p.transactions)throw Error('只接受规划偏好，不接受账户修改');
   Gangxue.forecast({...GangxueFixtures.make(persona),plan:p.plan});saved.set(persona,structuredClone(p));response.result={saved:true};
  }else if(d.method==='openFxReview'){
   const p=d.params;if(!['CNY','HKD'].includes(p.source)||!['CNY','HKD'].includes(p.target)||p.source===p.target||!Number.isSafeInteger(p.debit)||p.debit<=0)throw Error('复核意图无效');
   response.result={status:'preview-only'};addLog('收到换汇复核意图：'+p.source+' '+(p.debit/100).toFixed(2)+' → '+p.target+'；未执行交易。');
  }
  addLog(d.method+' 完成（合成数据／参考报价）');
 }catch(e){response.error=e.message;addLog(d.method+' 失败：'+e.message);}
 event.source.postMessage(response,event.origin);
});
document.querySelector('#host-size').onchange=e=>frame.classList.toggle('phone',e.target.value==='phone');
document.querySelector('#host-reload').onclick=()=>{frame.src='embedded.html?reload='+Date.now()+'#overview';addLog('已重新加载；偏好仅保存在宿主页面内存。');};

