'use strict';
const B=GangxueBeyond;
let ledgerExpanded=false;
function sectionLinks(){
 const group=['calendar','planner','wealth','scenario'].includes(tab)?[['calendar','付款与预留'],['planner','大额购买 / 换汇'],['wealth','闲置资金期限'],['scenario','计划有变']]:['ledger','octopus'].includes(tab)?[['ledger','分类账本'],...(!embedded?[['octopus','八达通核对']]:[])]:[];
 return group.length?'<div class="section-links">'+group.map(([id,label])=>`<a href="#${id}" ${tab===id?'aria-current="page"':''}>${label}</a>`).join('')+'</div>':'';
}
function minimalOverview(){
 const f=E.forecast(state),r=C.redline(state),next=state.plan.events.filter(e=>e.kind==='expense'&&e.date>state.asOf).sort((a,b)=>a.date.localeCompare(b.date))[0];
 return `<div class="card calm-hero"><span class="metric-label">覆盖已录入计划后 · 港币可自由支出参考</span><div class="hero-number">${fmt(f.free)}</div><p>已扣除生活预算及必要付款，保留应急金；人民币不足底线时归零。</p><div class="balance-strip"><span>可用港币 <b>${fmt(r.liquid.HKD)}</b></span><span>可用人民币 <b>${fmt(r.liquid.CNY,'CNY')}</b></span></div><a class="button" href="#planner">检查一笔大额付款</a></div>
 <div class="card next-payment"><span class="metric-label">下一笔已安排付款</span><h2>${next?esc(next.name):'暂无待付款事项'}</h2>${next?`<div class="row"><strong>${fmt(-next.amount,next.currency)}</strong><span>${next.date}</span></div>`:''}<p>${f.firstReserve?`${f.firstReserve.date} 预计触及资金底线，请先检查计划。`:'目前保守路径未低于资金底线。预计收入没有提前计入。'}</p><a href="#calendar">查看与调整计划 →</a></div>
 <details class="card"><summary>预留明细与逐日走势</summary>${redlineCards()}${chart(f,E.forecast(state,{includeExpected:true}))}<p class="muted">红线为规划预警，不会冻结账户。范围 ${state.plan.start} 至 ${state.plan.end}；未录入的支出不在预测中。</p></details>`;
}
function wealthView(){
 const p={currency:'HKD',amount:100000,bufferDays:2,interest:'deposit',...state.wealth},rows=B.match(state,p);
 return `<div class="card"><h2>这笔钱，可以暂时放多久？</h2><p>先保留学费、租金与日常用钱，再检查存款期限。</p><form id="wealth-form"><div class="form-grid"><label>币种<select name="currency">${choices(['HKD','CNY'],p.currency)}</select></label><label>拟暂存金额<input name="amount" type="number" min="0" step="0.01" value="${p.amount/100}" required></label><label>到期后缓冲（自然日）<input name="bufferDays" type="number" min="1" max="14" value="${p.bufferDays}" required></label></div><label>希望了解的产品<select name="interest"><option value="deposit" ${p.interest==='deposit'?'selected':''}>先只考虑普通存款</option><option value="investment" ${p.interest==='investment'?'selected':''}>也想了解有本金风险的投资</option></select></label><div class="actions"><button class="button">检查可用期限</button></div></form><small>这是偏好记录，不是银行风险测评。缓冲为个人假设，未推算银行营业日；可用日当日也按先付款后回款检查。</small></div>
 ${p.interest==='investment'?'<div class="callout">已记录了解投资的意愿。当前只有普通存款条款初筛；没有接入真实投资目录和适当性评估，因此不生成投资产品推荐。风险偏好不会释放学费或租金预留。</div>':''}
 <div class="card"><h2>工银亚洲网上定期存款 · 条款初筛</h2><p class="muted">${B.catalog.tier}，公开起存额为 50,000 原币。仅检查金额和期限；各行是独立方案，不能相加。</p>${rows.map(r=>`<div class="term-row"><div><b>${r.months} 个月</b><small>到期 ${r.maturity} · 假设可用 ${r.available}</small></div><div><b>${r.status==='evaluated'?fmt(r.max,r.currency):'未评估'}</b><small>该期限最多可暂存</small></div><p>${esc(r.reason)}</p>${r.fits?'<span class="badge">可向银行继续核实</span>':''}</div>`).join('')}</div>
 <details class="card"><summary>来源、计算边界与购买条件</summary><p><a href="${B.catalog.source}" target="_blank" rel="noopener">工银亚洲官方网上定期存款条款 ↗</a>：页面标注 ${B.catalog.published}，本项目核查 ${B.catalog.checked}。本地条款快照不会自动刷新；本页不报价或预测收益。</p><p>官网列出的开立时段为香港非公众假期周一至周五 08:00–22:00。期限按日历月，月底取目标月份最后一天。真实起息日、到期可用时间、客户类别、人民币金额档位和最新条款需银行确认。</p><p>任一币种在已有规划期出现资金或动态红线缺口，均不分配存款额度。已受保护的付款始终留在流动资金中。期限超出已知规划不外推为安全；本金在可用日当天付款完成后才视为返回，利息不用于补缺口。</p></details>`;
}
function modernReview(){
 const r=B.review(state,reportMonth),tasks=B.tasks(state,reportMonth),done=tasks.filter(t=>t.done).length,o=state.octopus,os=o?O.summary(o.records,o.opening,o.closing):null;
 return `<div class="card"><div class="row"><h2>月度回顾</h2><form id="month-form" class="inline-form"><label>月份<input name="month" type="month" value="${reportMonth}" required></label><button class="button secondary">查看</button></form></div><div class="review-totals">${['HKD','CNY'].map(c=>`<div><span class="metric-label">已知净消费 · ${c}</span><div class="metric-value">${fmt(r.current.totals[c],c)}</div><small>${r.changes[c]===null?'上月或本月无该币种记录，暂不比较':`比 ${r.previousMonth} 已知记录${r.changes[c]>=0?'增加':'减少'} ${fmt(Math.abs(r.changes[c]),c)}`}</small></div>`).join('')}</div><p class="muted">${r.current.partial?'月份未结束或快照未覆盖月末。':''}仅统计已导入、未忽略记录；已忽略 ${r.current.excludedCount} 笔。差额不是完整消费趋势。</p></div>
 <div class="card"><h2>接下来做什么</h2>${r.actions.map(a=>`<div class="review-action"><p>${esc(a.text)}${a.amount!=null?' '+fmt(a.amount,a.currency):''}</p>${a.ids.length?`<details><summary>查看依据 · ${a.ids.length} 笔</summary><p class="audit">${a.ids.map(esc).join('、')}</p></details>`:''}</div>`).join('')}<div class="actions"><a href="#ledger">核对账本 →</a><a href="#calendar">调整付款计划 →</a></div><small>规则生成，可追溯到记录；未调用 AI。没有足够数据时不推断消费习惯。</small></div>
 <details class="card"><summary>本月预算执行</summary>${r.budgets.map(b=>`<div class="list-row"><span>${esc(b.category)} · ${b.currency}</span><b>${fmt(b.spent,b.currency)} / ${fmt(b.amount,b.currency)}</b></div>`).join('')||'<p>尚未设置本月分类预算。</p>'}</details>
 <div class="card"><div class="row"><h2>把计划维护好</h2><span class="badge">${done} / 3 ${done===3?'· 本轮已核对':''}</span></div>${tasks.map(t=>`<div class="list-row"><span>${t.done?'✓':'○'} ${t.label}</span>${t.id==='budget'?'<a href="#ledger">设置预算</a>':`<button class="text-button" data-care="${t.id}" ${t.done?'disabled':''}>我已核实</button>`}</div>`).join('')}<small>核对标记随相关数据变化失效；重复点击不累积奖励。进度仅为个人维护记录，无可兑换积分，不奖励换汇或投资。</small></div>
 ${!embedded?`<details class="card"><summary>八达通数据覆盖</summary><p>${os?`${os.count} 条独立记录；${os.status==='balanced'?'期初期末算术相符':os.status==='mismatch'?'期初期末不相符':'缺少独立余额核对'}；${o.complete?'用户声明覆盖完整':'完整性未确认'}。`:'尚未导入八达通明细。'}独立样本未叠加进上面的银行／钱包汇总，避免重复计算。算术相符不证明没有漏单。</p><a href="#octopus">核对八达通记录 →</a></details>`:''}`;
}
function simplifyPage(){
 function fold(node,label){if(!node)return;const d=document.createElement('details');d.className='card disclosure';const s=document.createElement('summary');s.textContent=label;d.append(s);node.replaceWith(d);d.append(node);node.classList.remove('card');}
 if(tab==='ledger'){
  fold($('#spend-filter'),'筛选日期、类别与账户');
  for(const card of [...document.querySelectorAll('#content > .card')]){const h=card.querySelector('h2')?.textContent||'';if(h.startsWith('领域分布')||h.startsWith('月度分类预算'))fold(card,h);}
  const body=document.querySelector('#content select[data-category]')?.closest('tbody');
  if(body&&body.children.length>12){const rows=[...body.children];if(!ledgerExpanded)rows.slice(12).forEach(row=>row.hidden=true);const b=document.createElement('button');b.className='text-button';b.textContent=ledgerExpanded?'收起明细':`展开全部 ${rows.length} 笔`;b.onclick=()=>{ledgerExpanded=!ledgerExpanded;render();};body.closest('.card').append(b);}
 }
 if(tab==='calendar'){
  fold(document.querySelector('#content > .grid-even'),'查看两种币种的当前预留');
  for(const card of [...document.querySelectorAll('#content > .card')]){if(card.tagName==='DETAILS')continue;const h=card.querySelector('h2')?.textContent||'';if(h!=='时间顺序')fold(card,h);}
  const timeline=[...document.querySelectorAll('#content > .card')].find(c=>c.querySelector('h2')?.textContent==='时间顺序');if(timeline)document.querySelector('.section-links').after(timeline);
 }
 if(tab==='planner'){
  const form=$('#payment-form'),grid=form?.querySelector('.form-grid');
  if(grid){const d=document.createElement('details');d.innerHTML='<summary>费用、到账时间与牌价行</summary>';const g=document.createElement('div');g.className='form-grid';[...grid.children].slice(3).forEach(n=>g.append(n));d.append(g);grid.after(d);}
  const card=form?.closest('.card');if(card){const d=document.createElement('details');d.innerHTML='<summary>参考报价来源与估算假设</summary>';[...card.children].filter(n=>n!==form&&!['H2','SPAN'].includes(n.tagName)).forEach(n=>d.append(n));form.after(d);}
  fold(document.querySelector('#content > .grid-even'),'查看预留依据');
 }
 $('#wealth-form')?.addEventListener('submit',ev=>{ev.preventDefault();try{const d=new FormData(ev.target),p={currency:d.get('currency'),amount:E.money(d.get('amount')),bufferDays:Number(d.get('bufferDays')),interest:d.get('interest')};B.match(state,p);state.wealth=p;render();notify('期限检查已更新；保存后可继续使用这些偏好。');}catch(e){notify(e.message,true);}});
 document.querySelectorAll('[data-care]').forEach(b=>b.onclick=()=>{const kind=b.dataset.care,r=B.review(state,reportMonth);if(kind==='ledger'&&(r.unknown.length||!r.current.rows.length)){notify('请先在账本核对用途未明确的记录；空账本不能标记完成。',true);return;}state.care||={};state.care[kind+'Stamp']=B.stamp(state,kind,reportMonth);render();notify('已记录你的核实声明。相关数据改变后需要重新核实；可点击保存保留。');});
}
