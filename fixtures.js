(function(root,factory){const api=factory(typeof module==='object'?require('./engine.js'):root.Gangxue);if(typeof module==='object')module.exports=api;else root.GangxueFixtures=api;})(globalThis,function(E){
function make(id){
 if(id==='purchase')return {id,name:'双币购买 · 用户提出的案例',asOf:'2026-10-02',transactions:[],accounts:[{id:'hkd',name:'港币储蓄（合成案例）',currency:'HKD',liquid:true,openingDate:'2026-10-02',opening:2000000,expectedClosing:2000000},{id:'cny',name:'人民币账户（合成案例）',currency:'CNY',liquid:true,openingDate:'2026-10-02',opening:1000000,expectedClosing:1000000}],plan:{start:'2026-10-02',end:'2026-11-01',rate:0.91,reserve:0,living:0,events:[]}};
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
function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function live(id,day=today()){
 const s=make(id),delta=Math.round((E.date(day)-E.date(s.asOf))/86400000),shift=d=>E.addDays(d,delta);
 for(const a of s.accounts)a.openingDate=shift(a.openingDate);
 for(const t of s.transactions)t.date=shift(t.date);
 for(const e of s.plan.events)e.date=shift(e.date);
 s.plan.start=shift(s.plan.start);s.plan.end=shift(s.plan.end);s.asOf=day;
 const expenses=[['视频网站会员',25,'娱乐',3],['深圳交通',32,'交通',5],['内地周末餐饮',86,'餐饮',6]];
 const a=s.accounts.find(a=>a.currency==='CNY');
 if(id==='purchase')for(const account of s.accounts)account.openingDate=E.addDays(day,-30);
 for(const [description,amount,category,days] of expenses){const value=E.money(amount);a.opening+=value;s.transactions.push({id:id+'-cny-'+days,date:E.addDays(day,-days),account:a.id,currency:'CNY',amount:-value,type:'expense',category,description,source:'模拟数据'});}
 // Presentation cases have both spending currencies and a usable savings horizon.
 const targets={reserve:{HKD:80000,CNY:12000},timing:{HKD:30000,CNY:15000},currency:{HKD:50000,CNY:35000},career:{HKD:60000,CNY:35000},purchase:{HKD:20000,CNY:10000}}[id];
 s.name={reserve:'小林 · 在读学生',timing:'小陈 · 到账安排',currency:'小周 · 跨境生活',career:'小许 · 初入职场',purchase:'小周 · 双币购买'}[id];
 if(id==='purchase'){s.plan.end=E.addDays(day,65);s.plan.living=300000;}
 s.plan.cnyLiving=90000;
 for(const [description,amount,category,days] of [['校园午餐',58,'餐饮',2],['港铁出行',9.8,'交通',3],['日常用品',76,'日用',4]])s.transactions.push({id:id+'-hkd-'+days,date:E.addDays(day,-days),account:'hkd',currency:'HKD',amount:-E.money(amount),type:'expense',category,description,source:'模拟数据'});
 if(!s.accounts.some(a=>a.id==='wallet'))s.accounts.push({id:'wallet',name:'八达通（模拟）',currency:'HKD',liquid:false,openingDate:E.addDays(day,-30),opening:0});
 const walletDay=E.addDays(day,-1),linkId=id+'-recent-topup',summaryId=id+'-wallet-summary';
 s.transactions.push(
  {id:id+'-recent-topup-bank',date:walletDay,time:'09:00',account:'hkd',currency:'HKD',amount:-50000,type:'topup',category:'充值',description:'八达通充值',linkId,source:'模拟数据'},
  {id:id+'-recent-topup-wallet',date:walletDay,time:'09:00',account:'wallet',currency:'HKD',amount:50000,type:'topup',category:'充值',description:'八达通到账',linkId,source:'模拟数据'},
  {id:summaryId,date:walletDay,time:'23:00',account:'wallet',currency:'HKD',amount:-14800,type:'expense',category:'未细分钱包支出',description:'八达通消费汇总',source:'模拟数据'});
 s.demoOctopus={date:walletDay,summaryId,opening:0,closing:35200};
 for(const account of s.accounts){const target=account.id==='wallet'?35200:E.money(targets[account.currency]);account.opening=target-s.transactions.filter(t=>t.account===account.id).reduce((n,t)=>n+t.amount,0);account.expectedClosing=target;}
 s.wealth={currency:['reserve','timing'].includes(id)?'CNY':'HKD',productTypes:['deposit']};
 const index=['reserve','timing','currency','career','purchase'].indexOf(id)+1;
 s.accounts.forEach((a,i)=>a.demoCard='DEMO '+String(index).padStart(4,'0')+' 0000 '+String(i+1).padStart(4,'0'));
 return s;
}
return {make,live,today,ids:['reserve','timing','currency','career','purchase']};
});
