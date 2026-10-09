'use strict';
const demoCases={
 reserve:{id:'reserve',title:'学费到账后，今天还能安排多少？',text:'查看学费、租金与生活费预留。',view:'overview',next:'calendar',action:'调整付款计划 →'},
 purchase:{id:'purchase',title:'人民币差2,000元，需要换多少港币？',text:'调整购买金额，查看所需换汇。',view:'planner',next:'calendar',action:'增加一笔租金预留 →'},
 arrival:{id:'purchase',title:'金额够了，资金能赶上付款吗？',text:'比较付款日与到账日，检查期限冲突。',view:'planner',next:'planner',action:'修改付款日期 →'},
 career:{id:'career',title:'首份工资到账前，押金和房租怎样安排？',text:'核对押金、房租与工资到账日。',view:'overview',next:'scenario',action:'比较收入与支出情景 →'}
};
let activeDemo='reserve';
function updateExperienceGuide(){
 const preset=demoCases[activeDemo],manual=state.experience==='manual';
 const known=!manual&&state.id===preset.id;
 document.querySelectorAll('[data-demo-case]').forEach(b=>b.setAttribute('aria-pressed',String(known&&b.dataset.demoCase===activeDemo)));
 const guide=document.querySelector('#demo-guide');if(!guide)return;
 guide.replaceChildren();const text=document.createElement('p');
 text.textContent=manual?'按你填写的余额与计划试算。':known?preset.text:'修改记录或计划，查看结果。';guide.append(text);
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
