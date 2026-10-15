'use strict';
const demoCases={
 reserve:{id:'reserve',title:'学费到账后，还能安排多少？',text:'先看可安排金额，再调整一笔租金，观察预留如何变化。',view:'overview',next:'calendar',action:'调整付款计划 →'},
 purchase:{id:'purchase',title:'买一件东西，需要换多少港币？',text:'修改购买金额，点击“计算”，查看换汇金额与付款后的余额。',view:'overview',next:'calendar',action:'增加一笔租金预留 →'},
 arrival:{id:'purchase',title:'资金能赶上付款日吗？',text:'先查看缺口，再调整付款日或到账时间，重新计算。',view:'overview',next:'planner',action:'修改付款日期 →'},
 career:{id:'career',title:'首份工资到账前，怎样安排用钱？',text:'先看押金与房租预留，再比较工资晚到账时的资金变化。',view:'overview',next:'scenario',action:'比较收入与支出情景 →'}
};
let activeDemo='reserve';
function updateExperienceGuide(){
 const preset=demoCases[activeDemo],manual=state.experience==='manual';
 document.querySelector('.demo-launcher').hidden=personalMode;
 const other=document.querySelector('#other-demo');if(other){other.hidden=personalMode;document.querySelector('.demo-help').append(other);}
 document.querySelector('#active-account').textContent={reserve:'小林 · 在读学生',purchase:'小周 · 双币购买',arrival:'小陈 · 到账安排',career:'小许 · 初入职场'}[activeDemo]+' · 虚拟账户';
 document.querySelector('.demo-bar b').textContent=personalMode?'我的账本':'虚拟账户';
 simplifyExperience();
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
 if(personalMode)return;
 if(!Object.hasOwn(demoCases,key))key='reserve';
 activeDemo=key;const preset=demoCases[key];
 caseSessions.set(state.id,structuredClone(state));drafts.clear();showDemoCards=false;
 state=F.live(preset.id);applyReferenceRate();scenario={};plannerOptions={};pending=null;editing=null;octopusPending=null;
 spendFilter={from:'',to:state.asOf};reportMonth=state.asOf.slice(0,7);$('#persona').value=state.id;
 paymentOptions={target:state.id==='purchase'?'CNY':'HKD',purchase:state.id==='purchase'?1200000:0,due:E.addDays(state.asOf,1),market:'CNH',settlementDays:key==='arrival'?2:0,feeBps:0,fixedFee:0};
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
if(personalMode){spendFilter={from:'',to:state.asOf};reportMonth=state.asOf.slice(0,7);if(state.onboarding)tab='setup';render();}else launchDemo(requestedDemo||'reserve');
if(!personalMode&&['overview','ledger','plan','calendar','scenario','planner','octopus','report','wealth','integration','profile','setup'].includes(requestedView)){location.hash=requestedView;}

function simplifyExperience(){
 const content=document.querySelector('#content');if(!content)return;
 const labels={'需要补足的付款币种':'付款币种','购买金额（0为仅检查已有计划）':'购买金额','拟付款日期':'付款日期','先留好日常用钱':'生活费与应急金','下一笔学费 / 房租（可选）':'学费与房租','整个规划期生活费 HKD':'全期生活费 · 港币','整个规划期生活费 CNY':'全期生活费 · 人民币','新增 / 移除计划事项':'添加付款','资金与产品匹配':'闲钱安排','大额购买 / 换汇':'购买与换汇','逐笔分类与统计排除':'消费明细','钱花在哪些领域？':'收支记录','说明 / ID 搜索':'搜索商户或说明','费用、到账时间与牌价行':'换汇费用与到账时间','参考报价来源与估算假设':'汇率来源','红线随付款释放 · 逐日预测':'每日资金预测','完整账户对账、CSV 导入与手动记账':'导入与账户核对'};
 for(const el of content.querySelectorAll('label,h2,h3,summary,.section-links a'))for(const node of el.childNodes)if(node.nodeType===3&&labels[node.textContent.trim()])node.textContent=labels[node.textContent.trim()];
 function fold(node,title){if(!node||node.dataset.simplified)return;node.dataset.simplified='true';const d=document.createElement('details'),s=document.createElement('summary');d.className='compact-options';s.textContent=title;node.before(d);d.append(s,node);}
 if(tab==='setup'){
  const form=content.querySelector('#setup-form');
  if(form&&!form.dataset.simplified){form.dataset.simplified='true';const headings=[...form.querySelectorAll('h3')];for(const h of headings){const d=document.createElement('details'),s=document.createElement('summary');d.className='compact-options';s.textContent=h.textContent+'（可选）';h.before(d);d.append(s);let next=h.nextElementSibling;h.remove();while(next?.classList.contains('form-grid')){const n=next.nextElementSibling;d.append(next);next=n;}if([...d.querySelectorAll('input[type=number]')].some(e=>Number(e.value)>0))d.open=true;}}
 }
 if(tab==='planner'){
  const result=content.querySelector('#payment-result'),grid=result?.querySelector(':scope > .metric-grid'),main=result?.querySelector(':scope > .card');
  if(grid&&main){grid.before(main);fold(grid,'付款资金明细');}
 }
 if(false){
  const entry=content.querySelector('#new-event')?.closest('details.card'),timeline=[...content.children].find(c=>c.querySelector('h2')?.textContent==='时间顺序');if(entry&&timeline)timeline.after(entry);
  const heading=[...content.querySelectorAll('h2')].find(h=>h.textContent==='时间顺序');
  if(heading&&state.plan.events.length===0){const p=document.createElement('p');p.className='muted';p.textContent='还没有付款计划。下方添加第一笔。';heading.after(p);}
 }

 const pageTitle=document.querySelector('#page-title');if(tab==='setup')pageTitle.textContent='我的账本';
 if(tab==='profile'){const common=[...content.querySelectorAll('.card')].find(c=>c.querySelector('h2')?.textContent==='常用功能');fold(common,'账本与数据管理');}
}
