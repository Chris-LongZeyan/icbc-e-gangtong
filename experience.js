'use strict';
const demoCases={
 reserve:{id:'reserve',title:'学费到账后，今天还能安排多少？',text:'港币80,000元已到账。核对学费、租金和日常预算，观察可安排金额；再修改一笔付款。',view:'overview',next:'calendar',action:'调整付款计划 →'},
 purchase:{id:'purchase',title:'人民币差2,000元，需要换多少港币？',text:'人民币10,000元、港币20,000元，计划购买人民币12,000元的商品。修改金额，观察最小换汇结果。',view:'planner',next:'calendar',action:'增加一笔租金预留 →'},
 arrival:{id:'purchase',title:'金额够了，资金能赶上付款吗？',text:'10月3日付款，假设兑换资金10月4日可用。将付款日调整到10月5日，比较计算结果。',view:'planner',next:'planner',action:'修改付款日期 →'},
 career:{id:'career',title:'首份工资到账前，押金和房租怎样安排？',text:'查看10月8日押金与首期租金，再核对10月31日预计工资。比较已到账资金与预计收入支持的计划。',view:'overview',next:'scenario',action:'比较收入与支出情景 →'}
};
let activeDemo='reserve';
function updateExperienceGuide(){
 const preset=demoCases[activeDemo],manual=state.experience==='manual';
 const known=!manual&&state.id===preset.id;
 document.querySelectorAll('[data-demo-case]').forEach(b=>b.setAttribute('aria-pressed',String(known&&b.dataset.demoCase===activeDemo)));
 const guide=document.querySelector('#demo-guide');if(!guide)return;
 guide.replaceChildren();const title=document.createElement('h3'),text=document.createElement('p');
 title.textContent=manual?'你的手动试算':known?preset.title:'自由探索当前案例';
 text.textContent=manual?'根据你填写的余额和计划计算。可继续记账、添加付款或试算购买。':known?preset.text:'使用账本、计划与购买试算，核对修改后的结果。';guide.append(title,text);
 const next=document.querySelector('#demo-next');next.href='#'+(known?preset.next:'planner');next.textContent=known?preset.action:'检查一笔购买 →';
 document.querySelector('#demo-reset').disabled=manual;
 document.querySelector('#demo-storage-note').textContent=manual?'手动数据仅保存在当前浏览器；请使用模拟或脱敏数字。':'账户与流水均为合成数据；报价使用标注来源和日期的公开快照。修改仅影响当前浏览器。';
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
document.querySelector('#demo-reset').addEventListener('click',()=>{launchDemo(activeDemo);notify('已恢复此场景的初始数据和试算条件；本机保存副本保持原样。');});
document.querySelector('#demo-resume').addEventListener('click',()=>{
 try{const saved=localStorage.getItem('gangxue-poc-v1');if(!saved){notify('此浏览器尚无保存记录。先体验并点击“保存”，即可在这里恢复。');return;}
 const recovered=JSON.parse(saved);E.forecast(recovered);E.quality(recovered);useExperience(recovered);notify('已恢复此浏览器保存的数据。');
 }catch{notify('保存记录无法通过校验，请使用场景或导入有效备份。',true);}
});
const requestedDemo=new URLSearchParams(location.search).get('scenario');
const requestedView=location.hash.slice(1);
launchDemo(requestedDemo||'reserve');
if(!requestedDemo&&['overview','ledger','calendar','scenario','planner','octopus','report','wealth','integration','profile','setup'].includes(requestedView)){location.hash=requestedView;}
