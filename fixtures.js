(function(root,factory){const api=factory(typeof module==='object'?require('./engine.js'):root.Gangxue);if(typeof module==='object')module.exports=api;else root.GangxueFixtures=api;})(globalThis,function(E){
function make(id){
 if(id==='career'){
  const s=make('currency');s.id='career';s.name='小许 · 首份工作与首月安居';
  s.plan.end='2026-11-16';s.plan.living=600000;s.plan.reserve=500000;
  s.plan.events=[
   {id:'deposit',name:'租房押金与首期租金（示例）',date:'2026-10-08',currency:'HKD',amount:-1800000,kind:'expense'},
   {id:'rent1',name:'次月房租',date:'2026-11-08',currency:'HKD',amount:-600000,kind:'expense'},
   {id:'cny-payment',name:'内地待付费用（示例）',date:'2026-10-12',currency:'CNY',amount:-300000,kind:'expense'},
   {id:'salary',name:'预计首份工资（净额假设）',date:'2026-10-31',currency:'HKD',amount:2200000,kind:'income'}];
  return s;
 }

 const config={reserve:{name:'小林 · 学期资金已到位',hkd:80000,cny:0,tuition:50000,rent:6000,living:8000,reserve:5000,allowance:12000},timing:{name:'小陈 · 依赖下次生活费',hkd:13000,cny:0,tuition:8000,rent:3000,living:4800,reserve:2000,allowance:12000},currency:{name:'小周 · 人民币充足，港币不足',hkd:6000,cny:35000,tuition:20000,rent:5000,living:6000,reserve:3000,allowance:8000}}[id];
 if(!config)throw Error('未知案例');const tx=[];let n=0;
 const push=(date,account,currency,amount,type,category,description,extra={})=>tx.push({id:id+'-'+(++n),date,account,currency,amount:E.money(amount),type,category,description,cnyActual:null,fxRate:currency==='HKD'?0.91:null,source:'模拟数据',...extra});
 for(const m of ['08','09']){
  push('2026-'+m+'-01','cny','CNY',5000,'income','生活费','家人生活费（已到账）');
  push('2026-'+m+'-02','cny','CNY',-5000,'fx','换汇','人民币换港币',{linkId:id+'-fx-'+m});
  push('2026-'+m+'-02','hkd','HKD',5494.51,'fx','换汇','人民币换港币',{linkId:id+'-fx-'+m});
  push('2026-'+m+'-03','hkd','HKD',-config.rent,'expense','房租','月租');
  push('2026-'+m+'-04','hkd','HKD',-500,'topup','转账','八达通充值',{linkId:id+'-topup-'+m});
  push('2026-'+m+'-04','wallet','HKD',500,'topup','转账','八达通到账',{linkId:id+'-topup-'+m});
  for(let d=5;d<=28;d++)push('2026-'+m+'-'+String(d).padStart(2,'0'),'hkd','HKD',-(60+d%5*8),'expense',d%3?'餐饮':'日用',d%3?'校园餐饮':'生活用品');
  push('2026-'+m+'-15','wallet','HKD',-500,'expense','未细分钱包支出','钱包对账汇总；无逐笔明细');
 }
 push('2026-09-29','hkd','HKD',-120,'expense','日用','书店购物',{cnyActual:10920});const refundOf=tx.at(-1).id;
 push('2026-09-30','hkd','HKD',120,'refund','日用','书店退款',{cnyActual:10920,refundOf});
 const accounts=[{id:'hkd',name:'港币储蓄（模拟）',currency:'HKD',liquid:true,target:config.hkd},{id:'cny',name:'人民币账户（模拟）',currency:'CNY',liquid:true,target:config.cny},{id:'wallet',name:'八达通钱包（模拟）',currency:'HKD',liquid:false,target:0}].map(a=>({...a,openingDate:'2026-08-01',opening:E.money(a.target)-tx.filter(t=>t.account===a.id).reduce((s,t)=>s+t.amount,0),expectedClosing:E.money(a.target)}));
 // Fixture opening balances are deliberately derived to reconcile to the stated case.
 return {id,name:config.name,asOf:'2026-10-02',accounts,transactions:tx,plan:{start:'2026-10-02',end:'2026-12-01',rate:0.91,reserve:E.money(config.reserve),living:E.money(config.living),events:[
  {id:'tuition',name:'学费尾款（示例）',date:'2026-10-25',currency:'HKD',amount:-E.money(config.tuition),kind:'expense'},
  {id:'rent1',name:'10 月房租',date:'2026-10-05',currency:'HKD',amount:-E.money(config.rent),kind:'expense'},
  {id:'rent2',name:'11 月房租',date:'2026-11-05',currency:'HKD',amount:-E.money(config.rent),kind:'expense'},
  {id:'allowance',name:'预计生活费（假设到账为港币）',date:'2026-10-20',currency:'HKD',amount:E.money(config.allowance),kind:'income'}]}};
}
return {make,ids:['reserve','timing','currency','career']};
});
