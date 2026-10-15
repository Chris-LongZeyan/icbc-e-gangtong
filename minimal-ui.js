'use strict';
const B=GangxueBeyond;
let ledgerExpanded=false;
function sectionLinks(){
 const group=['calendar','planner','wealth','scenario'].includes(tab)?[['calendar','付款与预留'],['planner','购买与换汇'],['wealth','闲钱安排']]:['ledger','report'].includes(tab)?[['ledger','流水明细'],['report','收支分析']]:[];
 return group.length?'<div class="section-links">'+group.map(([id,label])=>`<a href="#${id}" ${tab===id?'aria-current="page"':''}>${label}</a>`).join('')+'</div>':'';
}
function minimalOverview(){
 const f=E.forecast(state),r=C.redline(state),next=state.plan.events.filter(e=>e.kind==='expense'&&e.date>state.asOf).sort((a,b)=>a.date.localeCompare(b.date))[0];
 return `<div class="card calm-hero"><span class="metric-label">覆盖已录入计划后 · 港币可自由支出参考</span><div class="hero-number">${fmt(f.free)}</div><p>已扣除生活预算及必要付款，保留应急金；人民币不足底线时归零。</p><div class="balance-strip"><span>可用港币 <b>${fmt(r.liquid.HKD)}</b></span><span>可用人民币 <b>${fmt(r.liquid.CNY,'CNY')}</b></span></div><a class="button" href="#planner">检查一笔大额付款</a></div>
 <div class="card next-payment"><span class="metric-label">下一笔已安排付款</span><h2>${next?esc(next.name):'暂无待付款事项'}</h2>${next?`<div class="row"><strong>${fmt(-next.amount,next.currency)}</strong><span>${next.date}</span></div>`:''}<p>${f.firstReserve?`${f.firstReserve.date} 预计触及资金底线，请先检查计划。`:'目前保守路径未低于资金底线。预计收入没有提前计入。'}</p><a href="#calendar">查看与调整计划 →</a></div>
 <details class="card"><summary>预留明细与逐日走势</summary>${redlineCards()}${chart(f,E.forecast(state,{includeExpected:true}))}<p class="muted">红线为规划预警，不会冻结账户。范围 ${state.plan.start} 至 ${state.plan.end}；未录入的支出不在预测中。</p></details>`;
}
function wealthView(){
 const manual=state.experience==='manual',p={currency:'HKD',bufferDays:2,interest:'deposit',riskProfile:'unassessed',lossBudget:0,...state.wealth};
 const selected=p.productTypes??(p.interest==='investment'?['deposit','cash','bond','equity']:['deposit']);
 const result=p.amount>0?B.recommend(state,{...p,productTypes:manual?selected.filter(id=>id==='deposit'):selected}):null;
 const filters=[['deposit','定期存款'],['cash','现金管理'],['bond','债券基金'],['equity','权益基金']];
 return `<div class="card"><h2>闲钱安排</h2><form id="wealth-form"><fieldset class="product-filters"><legend>产品类别 · 可多选</legend><div>${filters.map(([id,label])=>`<label class="filter-choice"><input type="checkbox" name="product-${id}" ${selected.includes(id)?'checked':''}><span>${label}</span></label>`).join('')}</div></fieldset><div class="form-grid"><label>币种<select name="currency">${choices(['HKD','CNY'],p.currency)}</select></label><label>拟安排金额<input name="amount" type="number" min="0.01" step="0.01" value="${p.amount==null?'':p.amount/100}" required></label><label>到期后缓冲（天）<input name="bufferDays" type="number" min="1" max="14" value="${manual&&!state.wealth?'':p.bufferDays}" required></label></div><details class="compact-options"><summary>风险偏好</summary><div class="form-grid"><label>风险偏好<select name="riskProfile">${[['unassessed','请选择'],['conservative','谨慎'],['balanced','均衡'],['growth','积极']].map(([v,t])=>`<option value="${v}" ${p.riskProfile===v?'selected':''}>${t}</option>`).join('')}</select></label><label>可承受损失金额<input name="lossBudget" type="number" min="0" step="0.01" value="${p.lossBudget?p.lossBudget/100:''}" placeholder="选填"></label></div></details><button class="button">筛选方案</button></form></div>
 ${result&&selected.length===0?'<div class="card empty-state">请选择至少一种产品类别。</div>':''}
 ${result?.deposits.length?`<div class="card"><h2>工银亚洲定期存款</h2><p>起存金额 50,000 原币 · ${B.catalog.tier}</p>${result.deposits.map(r=>`<div class="term-row"><div><b>${r.months} 个月</b><small>到期 ${r.maturity} · 可用 ${r.available}</small></div><div><b>${r.status==='evaluated'?fmt(r.max,r.currency):'超出可安排范围'}</b><small>可安排上限</small></div><p>${r.fits?'金额与期限符合':esc(r.reason)}</p></div>`).join('')}</div>`:''}
 ${result&&selected.some(id=>id!=='deposit')?(manual?'<div class="card empty-state"><h2>投资产品</h2><p>已保存筛选条件，等待银行产品目录接入。</p></div>':`<div class="card"><div class="row"><h2>投资类型匹配</h2><span class="badge">模拟产品参数</span></div>${result.investments.map(r=>`<div class="term-row"><div><b>${esc(r.name)}</b><small>${r.months} 个月 · 可用 ${r.available}</small></div><div><span class="badge">${r.fits?'符合筛选条件':'需调整条件'}</span><small>可安排上限 ${fmt(r.max,r.currency)}</small></div><p>${esc(r.reason)}</p><details><summary>匹配依据</summary>${r.checks.map(c=>`<p>${c.ok?'✓':'○'} ${esc(c.label)}：${esc(c.detail)}</p>`).join('')}</details></div>`).join('')}</div>`):''}
 <details class="card"><summary>产品来源与计算规则</summary><p><a href="${B.catalog.source}" target="_blank" rel="noopener">工银亚洲定期存款条款 ↗</a> · 核查于 ${B.catalog.checked}。开立时段：香港非公众假期周一至周五 08:00–22:00。实际条款及客户资格以银行确认为准。</p><p>按两种币种逐日保留付款、生活费和余额底线；存款本金在到期及所填缓冲期结束后可用。预计收入及收益分别计算，产品期限须在规划期内。</p>${manual?'':'<p>基金类别使用模拟期限、门槛和回撤参数演示匹配。正式投资须完成银行风险测评；实际损失可能超过压力假设。</p>'}</details>`;
}
function modernReview(){return coreLedger();}
function simplifyPage(){
 function fold(node,label){if(!node)return;const d=document.createElement('details');d.className='card disclosure';const s=document.createElement('summary');s.textContent=label;d.append(s);node.replaceWith(d);d.append(node);node.classList.remove('card');const h=node.querySelector(':scope > h2');if(h?.textContent===label)h.remove();}
 if(false){
  fold(document.querySelector('#content > .grid-even'),'查看两种币种的当前预留');
  for(const card of [...document.querySelectorAll('#content > .card')]){if(card.tagName==='DETAILS')continue;const h=card.querySelector('h2')?.textContent||'';if(h!=='时间顺序')fold(card,h);}
  const timeline=[...document.querySelectorAll('#content > .card')].find(c=>c.querySelector('h2')?.textContent==='时间顺序');if(timeline)document.querySelector('.section-links').after(timeline);
 }
 if(tab==='planner'){
  const form=$('#payment-form'),grid=form?.querySelector('.form-grid');
  if(grid){const d=document.createElement('details');d.innerHTML='<summary>费用、到账时间与牌价行</summary>';const g=document.createElement('div');g.className='form-grid';[...grid.children].slice(3).forEach(n=>g.append(n));d.append(g);grid.after(d);}
  const card=form?.closest('.card');if(false){const d=document.createElement('details');d.innerHTML='<summary>参考报价来源与估算假设</summary>';[...card.children].filter(n=>n!==form&&!['H2','SPAN'].includes(n.tagName)).forEach(n=>d.append(n));form.after(d);}
  fold(document.querySelector('#payment-result > .grid-even'),'查看预留依据');
 }
 $('#wealth-form')?.addEventListener('submit',ev=>{ev.preventDefault();try{const d=new FormData(ev.target),p={currency:d.get('currency'),amount:E.money(d.get('amount')),bufferDays:Number(d.get('bufferDays')),productTypes:['deposit','cash','bond','equity'].filter(id=>d.get('product-'+id)==='on'),riskProfile:d.get('riskProfile'),lossBudget:E.money(d.get('lossBudget')||'0')};B.recommend(state,p);state.wealth=p;render();notify('筛选已更新。');}catch(e){notify(e.message,true);}});
 document.querySelectorAll('[data-care]').forEach(b=>b.onclick=()=>{const kind=b.dataset.care,r=B.review(state,reportMonth);if(kind==='ledger'&&(r.unknown.length||!r.current.rows.length)){notify('请先在账本核对用途未明确的记录；空账本不能标记完成。',true);return;}state.care||={};state.care[kind+'Stamp']=B.stamp(state,kind,reportMonth);render();notify('已记录你的核实声明。相关数据改变后需要重新核实；可点击保存保留。');});
}
