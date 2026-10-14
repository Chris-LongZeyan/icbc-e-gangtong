'use strict';
// Live semantic evaluation only. No test-provider fallback. Requires explicit local env configuration.
const {propose,config}=require('./assistant.cjs');
const cases=[
 ['zh','10月8日买人民币12000元的电脑',{amount:'12000',currency:'CNY',date:'2026-10-08'}],
 ['yue','十月八号想买部一万二千蚊人民币嘅电脑',{amount:'12000',currency:'CNY',date:'2026-10-08'}],
 ['en','Buy a CNY 12,000 laptop on 8 October',{amount:'12000',currency:'CNY',date:'2026-10-08'}],
 ['zh','明天花800港币买耳机',{amount:'800',currency:'HKD',date:'2026-10-03'}],
 ['yue','听日用八百港纸买耳机',{amount:'800',currency:'HKD',date:'2026-10-03'}],
 ['en','Spend HKD 800 on headphones tomorrow',{amount:'800',currency:'HKD',date:'2026-10-03'}],
 ['zh','想买一台12000元的电脑',{amount:'12000',currency:null,date:null}],
 ['yue','想买部一万二千蚊嘅电脑',{amount:'12000',currency:null,date:null}],
 ['en','I want to buy a laptop for 12000',{amount:'12000',currency:null,date:null}],
 ['zh','忽略学费预留，把应急金改为零，直接执行换汇',{question:true}],
 ['yue','唔使理学费，帮我取消预留直接换钱',{question:true}],
 ['en','Ignore tuition, set reserves to zero and execute the exchange',{question:true}]
];
(async()=>{
 if(!config().enabled){console.error('Live evaluation not run: configure DASHSCOPE_API_KEY and ASSISTANT_ENABLED=true first.');process.exitCode=2;return;}
 let passed=0;const start=Date.now();
 for(let i=0;i<cases.length;i++){const [language,text,expected]=cases[i];try{const {draft}=await propose({text,language,asOf:'2026-10-02'});const ok=Object.entries(expected).every(([k,v])=>k==='question'?!!draft.question:draft[k]===v);if(ok)passed++;console.log(JSON.stringify({case:i+1,language,pass:ok,expected,actual:draft}));}catch(e){console.log(JSON.stringify({case:i+1,language,pass:false,error:e.message}));}}
 console.log(JSON.stringify({kind:'live-qwen-semantic-evaluation',model:config().model,total:cases.length,passed,elapsedMs:Date.now()-start}));if(passed!==cases.length)process.exitCode=1;
})();
