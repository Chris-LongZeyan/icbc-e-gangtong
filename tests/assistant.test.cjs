'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const A=require('../assistant.cjs'),T=require('../assistant-tools'),F=require('../fixtures'),C=require('../core');
const cfg={enabled:true,voice:true,base:'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',key:'test-only',model:'qwen3.7-plus'};
const full={tool:'check_purchase',name:'电脑',amount:'12000',currency:'CNY',date:'2026-10-08',question:''};
const request={text:'10月8号买人民币12000元电脑',asOf:'2026-10-02'};
function provider(value=full){const {tool,...args}=value;return async()=>new Response(JSON.stringify({choices:[{message:{tool_calls:[{function:{name:tool,arguments:JSON.stringify(args)}}]}}]}));}
test('assistant is disabled without key and explicit activation',()=>{assert.equal(A.config({}).enabled,false);assert.equal(A.config({DASHSCOPE_API_KEY:'x'}).enabled,false);assert.equal(A.config({DASHSCOPE_API_KEY:'x',ASSISTANT_ENABLED:'true'}).enabled,true);assert.throws(()=>A.config({QWEN_REGION:'http://localhost'}));});
test('Qwen request uses real compatible tool protocol and minimal context',async()=>{
 let sent;const result=await A.propose(request,{config:cfg,fetch:async(url,options)=>{sent={url,...options};return provider()(url,options);}});
 assert.deepEqual(result.draft,full);assert.equal(result.requiresConfirmation,true);
 const body=JSON.parse(sent.body);assert.equal(body.tools.length,1);assert.equal(body.tools[0].function.name,'check_purchase');assert.equal(body.enable_thinking,false);assert.equal(body.model,'qwen3.7-plus');assert.equal(body.messages.length,2);assert.equal(sent.redirect,'error');assert.equal(JSON.stringify(body).includes('accounts'),false);
});
test('partial extraction clears defaults and asks for missing fields in three languages',async()=>{
 const partial={...full,currency:null,date:null};const result=await A.propose(request,{config:cfg,fetch:provider(partial)});
 assert.ok(result.draft.question);assert.deepEqual(T.fields(result.draft,'check_purchase'),{target:'',purchase:'12000',due:''});
 assert.match(T.missing(partial,'en'),/currency, payment date/);assert.match(T.missing(partial,'yue'),/补充返/);assert.match(T.missing(partial,'zh'),/币种、付款日期/);
});
test('clarification preserves previous structured draft and input language',async()=>{
 const previous={...full,date:null,question:'Which date?'};let body;
 await A.propose({...request,text:'October 8',language:'en',previous},{config:cfg,fetch:async(_,options)=>{body=JSON.parse(options.body);return provider()();}});
 assert.deepEqual(JSON.parse(body.messages[1].content).previous,previous);assert.equal(JSON.parse(body.messages[1].content).language,'en');
});
test('unauthorized tools, extra fields, malformed dates and negative amounts are rejected',async()=>{
 for(const value of [{...full,tool:'execute_fx'},{...full,reserve:0},{...full,date:'2026-02-30'},{...full,amount:'-1'},{...full,amount:'1.001'},{...full,amount:'1e5'}])await assert.rejects(A.propose(request,{config:cfg,fetch:provider(value)}));
 await assert.rejects(A.propose({...request,accounts:[]},{config:cfg,fetch:provider()}));
});
test('model prose or multiple tool calls never becomes a financial result',async()=>{
 for(const message of [{content:'You can spend all your tuition.'},{tool_calls:[{},{}]}])await assert.rejects(A.propose(request,{config:cfg,fetch:async()=>new Response(JSON.stringify({choices:[{message}]}))}));
});
test('provider failures do not leak errors or fall back to fake AI',async()=>{
 await assert.rejects(A.propose(request,{config:cfg,fetch:async()=>new Response('secret-provider-detail',{status:401})}),e=>e.status===502&&!e.message.includes('secret'));
 await assert.rejects(A.propose(request,{config:{...cfg,enabled:false},fetch:()=>{throw Error('must not call');}}),e=>e.status===503);
});
test('confirmed tool calculation uses same engine as manual form and preserves source state',()=>{
 const state=F.make('purchase'),before=JSON.stringify(state),rates={customerSell:1.17,customerBuy:1.17699};
 const result=T.run(state,rates,full);assert.deepEqual(result.result,C.solve(state,rates,{target:'CNY',purchase:1200000,due:'2026-10-08',settlementDays:0,feeBps:0,fixedFee:0}));assert.equal(result.result.solution.debit,235398);assert.equal(JSON.stringify(state),before);
});
test('reserve drafts populate the existing event form and never change risk settings',()=>{
 const d={...full,tool:'reserve_payment',name:'学费'};assert.deepEqual(T.fields(d,'reserve_payment'),{name:'学费',date:'2026-10-08',amount:'12000',currency:'CNY',kind:'expense'});assert.throws(()=>T.fields(d,'check_purchase'));
 const state=F.make('reserve'),result=T.run(state,null,d);assert.equal(result.preview.plan.events.at(-1).protect,true);assert.equal(state.plan.events.some(e=>e.id==='assistant-preview'),false);assert.equal(result.preview.plan.reserve,state.plan.reserve);
});
test('date horizon and unresolved ambiguity block tool execution',()=>{
 for(const change of [{date:'2026-10-01'},{date:'2030-01-01'},{question:'Which currency?'},{amount:'0'}])assert.throws(()=>T.run(F.make('purchase'),null,{...full,...change}));
});
test('Qwen ASR validates audio and forwards Mandarin, Cantonese and English language codes',async()=>{
 for(const language of ['zh','yue','en']){let body;const r=await A.transcribe({audio:'data:audio/webm;base64,YWJj',language},{config:cfg,fetch:async(_,options)=>{body=JSON.parse(options.body);return new Response(JSON.stringify({choices:[{message:{content:'12000'}}]}));}});assert.equal(body.asr_options.language,language);assert.equal(body.model,'qwen3-asr-flash');assert.equal(r.text,'12000');}
 for(const audio of ['https://private-server/audio','data:text/html;base64,YWJj','data:audio/webm;base64,!'])assert.throws(()=>A.audioInput({audio,language:'zh'}));
 await assert.rejects(A.transcribe({audio:'data:audio/webm;base64,YWJj',language:'yue'},{config:{...cfg,voice:false}}));
});
test('new manual setup fills balances and asks for nonzero payment details without inventing budgets',async()=>{
 const value={tool:'prepare_setup',name:'我的试算',HKD:'20000',CNY:'10000',reserve:null,cnyReserve:null,living:null,cnyLiving:null,tuition:'50000',rent:null,asOf:'2026-10-14',end:'2026-12-13',tuitionDate:null,rentDate:null,tuitionCurrency:null,rentCurrency:null,question:''};
 const r=await A.propose({...request,intent:'prepare_setup'},{config:cfg,fetch:provider(value)});const map=T.fields(r.draft,'prepare_setup');
 assert.equal(map.HKD,'20000');assert.equal(map.CNY,'10000');assert.equal(map.tuitionDate,'');assert.equal(map.tuitionCurrency,'');assert.equal('reserve' in map,false);assert.match(T.missing(r.draft),/学费币种、学费日期/);
 assert.throws(()=>A.draft({...value,CNY:'-100'}));assert.throws(()=>A.draft({...value,execute:true}));
});
