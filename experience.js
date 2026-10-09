'use strict';
const demoCases={
 reserve:{id:'reserve',title:'学费到账后，还能安排多少？',text:'先看可安排金额，再调整一笔租金，观察预留如何变化。',view:'overview',next:'calendar',action:'调整付款计划 →'},
 purchase:{id:'purchase',title:'买一件东西，需要换多少港币？',text:'修改购买金额，点击“计算”，查看换汇金额与付款后的余额。',view:'planner',next:'calendar',action:'增加一笔租金预留 →'},
 arrival:{id:'purchase',title:'资金能赶上付款日吗？',text:'先查看缺口，再调整付款日或到账时间，重新计算。',view:'planner',next:'planner',action:'修改付款日期 →'},
 career:{id:'career',title:'首份工资到账前，怎样安排用钱？',text:'先看押金与房租预留，再比较工资晚到账时的资金变化。',view:'overview',next:'scenario',action:'比较收入与支出情景 →'}
};
let activeDemo='reserve';
function updateExperienceGuide(){
 const preset=demoCases[activeDemo],manual=state.experience==='manual';
 const known=!manual&&state.id===preset.id;
 document.querySelectorAll('[data-demo-case]').forEach(b=>b.setAttribute('aria-pressed',String(known&&b.dataset.demoCase===activeDemo)));
 const guide=document.querySelector('#demo-guide');if(!guide)return;
 guide.replaceChildren();const title=document.createElement('h3'),text=document.createElement('p');
 title.textContent=manual?'用自己的数字试算':known?preset.title:'开始尝试';
 text.textContent=manual?'填写双币余额与付款计划，再查看可安排金额。':known?preset.text:'查看余额与计划，修改一笔记录，观察结果。';guide.append(title,text);
 const next=document.querySelector('#demo-next');next.href='#'+(known?preset.next:'planner');next.textContent=known?preset.action:'检查一笔购买 →';
 document.querySelector('#demo-reset').disabled=manual;
}
function launchDemo(key){
 if(!Object.hasOwn(demoCases,key))key='reserve';
 activeDemo=key;const preset=demoCases[key];
 caseSessions.set(state.id,structuredClone(state));drafts.clear();showDemoCards=false;
 state=F.make(preset.id);applyReferenceRate();scenario={};plannerOptions={};pending=null;editing=null;octopusPending=null;
 spendFilter={from:'',to:state.asOf};reportMonth=state.asOf.slice(0,7);$('#persona').value=state.id;
 paymentOptions={target:state.id==='purchase'?'CNY':'HKD',purchase:state.id==='purchase'?1200000:0,due:'2026-10-03',market:'CNH',settlementDays:key==='arrival'?2:0,feeBps:0,fixedFee:0};
 tab=preset.view;history.replaceState(null,'','experience.html?scenario='+key+'#'+tab);render();
 $('#notice').replaceChildren();
}
document.querySelectorAll('[data-demo-case]').forEach(b=>b.addEventListener('click',()=>launchDemo(b.dataset.demoCase)));
document.querySelector('#demo-reset').addEventListener('click',()=>{launchDemo(activeDemo);notify('场景已重置。');});
document.querySelector('#demo-resume').addEventListener('click',()=>{
 try{const saved=localStorage.getItem('gangxue-poc-v1');if(!saved){notify('尚无保存记录。');return;}
 const recovered=JSON.parse(saved);E.forecast(recovered);E.quality(recovered);useExperience(recovered);notify('已恢复保存数据。');
 }catch{notify('保存记录无法通过校验，请使用场景或导入有效备份。',true);}
});
const requestedDemo=new URLSearchParams(location.search).get('scenario');
const requestedView=location.hash.slice(1);
launchDemo(requestedDemo||'reserve');
if(!requestedDemo&&['overview','ledger','calendar','scenario','planner','octopus','report','wealth','integration','profile','setup'].includes(requestedView)){location.hash=requestedView;}
