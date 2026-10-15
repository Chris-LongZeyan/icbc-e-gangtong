'use strict';
let assistantSession=null,assistantStatus=null,assistantRequest=null,assistantRecorder=null,assistantAudioRequest=null;
const microphoneIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg>';
const assistantCopy={
 zh:{title:'快捷填写',placeholder:'例如：10月8日想买一台人民币12000元的电脑',send:'填入表单',voice:'语音',stop:'结束录音',clear:'重新描述',ready:'已填入下方。请核对后计算。',off:'智能输入待启用，可直接填写下方表单。',privacy:'由 Qwen 处理输入与表单草稿。',busy:'正在整理…',record:'正在录音，最长30秒。结束后可修改文字再提交。'},
 yue:{title:'快捷填写',placeholder:'例如：10月8号想买部人民币12000蚊嘅电脑',send:'填入表格',voice:'语音',stop:'结束录音',clear:'重新描述',ready:'已填好，请核对后再计算。',off:'智能输入待启用，可以直接填下面表格。',privacy:'Qwen 会处理输入同表格草稿。',busy:'整理紧…',record:'录音中，最多30秒。完成后可以改文字再提交。'},
 en:{title:'Describe your plan',placeholder:'For example: buy a CNY 12,000 laptop on 8 October',send:'Fill the form below',voice:'Voice input',stop:'Stop recording',clear:'Start over',ready:'Fields filled. Review them before calculating.',off:'Smart input is awaiting activation. You can fill the form below.',privacy:'Qwen processes your input and form draft.',busy:'Preparing…',record:'Recording, up to 30 seconds. Review the transcript before submitting.'}
};
function assistantContext(){return state.id+':'+state.asOf+':'+tab;}
function stopAssistantRecording(){if(assistantRecorder){assistantRecorder.cancelled=true;if(assistantRecorder.recorder.state!=='inactive')assistantRecorder.recorder.stop();assistantRecorder.stream.getTracks().forEach(t=>t.stop());clearTimeout(assistantRecorder.timer);assistantRecorder=null;}}
function mountAssistant(){
 assistantRequest?.abort();assistantAudioRequest?.abort();stopAssistantRecording();
 if(!['planner','calendar','setup'].includes(tab)||embedded)return;
 const context=assistantContext();
 if(assistantSession?.context!==context)assistantSession={context,language:'zh',previous:null,text:'',message:''};
 const session=assistantSession,intent=tab==='planner'?'check_purchase':tab==='setup'?'prepare_setup':'reserve_payment',manual=$(tab==='planner'?'#payment-form':tab==='setup'?'#setup-form':'#new-event'),card=document.createElement('section');
 if(!manual)return;card.className='assistant-panel';card.setAttribute('aria-label','智能填写');
 // Shared manual fields stay authoritative. No separate AI ledger or automatic submit.
 manual.before(card);if(tab==='calendar')for(let n=manual.parentElement;n;n=n.parentElement)if(n.tagName==='DETAILS')n.open=true;
 function paint(){
  const t=assistantCopy[session.language];
  card.innerHTML=`<div class="row"><h3>${t.title}</h3><select aria-label="输入语言 / Input language" id="assistant-language"><option value="zh">普通话</option><option value="yue">粵語</option><option value="en">English</option></select></div><label class="assistant-input-label" for="assistant-text">${intent==='check_purchase'?'购买计划 / Purchase':intent==='prepare_setup'?'余额与计划 / Balances and plans':'新增付款 / Payment'}</label><textarea id="assistant-text" maxlength="1200" rows="2" placeholder="${intent==='prepare_setup'?(session.language==='en'?'HKD 20,000 and CNY 10,000; reserve HKD 5,000 for emergencies':session.language==='yue'?'有两万港纸同一万人民币，港纸留五千做应急':'有两万港币和一万人民币，港币留五千应急'):intent==='reserve_payment'?(session.language==='en'?'Pay HKD 6,000 rent on 1 November':'11月1日交6000港币房租'):t.placeholder}">${esc(session.text)}</textarea><div class="actions"><button type="button" class="button secondary" id="assistant-send">${t.send}</button><button type="button" class="voice-button" id="assistant-voice" aria-label="${t.voice}" aria-pressed="false">${microphoneIcon}<span>${t.voice}</span></button><button type="button" class="text-button" id="assistant-clear">${t.clear}</button></div><p class="assistant-feedback" id="assistant-feedback" role="status" aria-live="polite"></p><small>${t.privacy} ${session.language==='en'?'Relative dates use balance date':'相对日期以余额日为准'} ${intent==='prepare_setup'?(manual.elements.asOf.value||'待填写'):state.asOf}。</small>`;
  $('#assistant-language').value=session.language;
  $('#assistant-language').onchange=ev=>{assistantRequest?.abort();assistantAudioRequest?.abort();stopAssistantRecording();session.language=ev.target.value;paint();};
  $('#assistant-text').oninput=ev=>session.text=ev.target.value;
  $('#assistant-send').onclick=send;
  $('#assistant-voice').onclick=record;
  $('#assistant-clear').onclick=()=>{assistantRequest?.abort();assistantAudioRequest?.abort();stopAssistantRecording();session.text='';session.previous=null;session.message='';paint();};
  availability();
 }
 function message(text){session.message=text;const node=card.querySelector('#assistant-feedback');if(node)node.textContent=text;}
 function availability(){
  if(!card.isConnected)return;
  const t=assistantCopy[session.language];card.querySelector('#assistant-send').disabled=!assistantStatus?.enabled;
  card.querySelector('#assistant-voice').disabled=!assistantStatus?.voice||!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder;
  card.querySelector('#assistant-feedback').textContent=session.message||(!assistantStatus?.enabled?t.off:'');
 }
 function manualValues(){return Object.fromEntries(new FormData(manual));}
 function previous(){
  if(intent==='prepare_setup'){const d=manualValues(),value={tool:intent,question:session.previous?.question||'',name:d.name||''};for(const k of ['HKD','CNY','reserve','cnyReserve','living','cnyLiving','tuition','rent','asOf','end','tuitionDate','rentDate'])value[k]=d[k]||null;for(const k of ['tuition','rent'])value[k+'Currency']=Number(d[k])>0?d[k+'Currency']||null:null;return value;}
  if(!session.previous)return null;
  const d=manualValues(),isPurchase=intent==='check_purchase',amount=d[isPurchase?'purchase':'amount'];
  return {...session.previous,name:isPurchase?session.previous.name:d.name,currency:d[isPurchase?'target':'currency']||null,amount:amount&&Number(amount)>0?amount:null,date:d[isPurchase?'due':'date']||null};
 }
 async function send(){
  if(!session.text.trim()){$('#assistant-text').focus();return;}
  const baseline=JSON.stringify(state),fields=JSON.stringify(manualValues()),controller=new AbortController();assistantRequest?.abort();assistantRequest=controller;
  $('#assistant-send').disabled=true;message(assistantCopy[session.language].busy);
  try{
   const res=await fetch('api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({text:session.text,asOf:intent==='prepare_setup'?(manual.elements.asOf.value||state.asOf):state.asOf,previous:previous(),intent,language:session.language})}),data=await res.json();
   if(!res.ok)throw Error(data.error||'智能输入暂不可用');
   if(controller.signal.aborted||!card.isConnected)return;
   if(JSON.stringify(state)!==baseline||JSON.stringify(manualValues())!==fields)throw Error('表单已修改，请重新提交描述，以保留你的最新输入。');
   const d=data.draft,map=GangxueAssistant.fields(d,intent);session.previous=d;
   for(const [name,value]of Object.entries(map)){const field=manual.elements.namedItem(name);if(!field)continue;
    if(field.tagName==='SELECT'&&!value&&!field.querySelector('option[value=""]'))field.prepend(new Option('请选择 / Select',''));
    field.value=value;if(value&&value!=='0')field.closest('details')?.setAttribute('open','');field.classList.add('assistant-filled');field.dispatchEvent(new Event('input',{bubbles:true}));
   }
   if(intent==='prepare_setup')for(const k of ['tuition','rent']){manual.elements[k+'Currency'].required=Number(manual.elements[k].value)>0;manual.elements[k+'Date'].required=Number(manual.elements[k].value)>0;}
   session.text='';$('#assistant-text').value='';
   const missing=GangxueAssistant.missing(d,session.language);
   message(d.question||missing||assistantCopy[session.language].ready);
   if(d.question||missing)$('#assistant-text').focus();
  }catch(e){if(e.name!=='AbortError'&&card.isConnected)message(e.message);}
  finally{if(card.isConnected&&!controller.signal.aborted)availability();}
 }
 async function record(){
  if(assistantRecorder){assistantRecorder.recorder.stop();return;}
  let stream;
  try{
   stream=await navigator.mediaDevices.getUserMedia({audio:true});if(!card.isConnected){stream.getTracks().forEach(t=>t.stop());return;}
   const mime=['audio/webm','audio/mp4','audio/ogg'].find(m=>MediaRecorder.isTypeSupported(m));if(!mime)throw Error('此浏览器请使用键盘听写或文字输入。');
   const recorder=new MediaRecorder(stream,{mimeType:mime,audioBitsPerSecond:32000}),chunks=[],active={recorder,stream,cancelled:false,timer:null};assistantRecorder=active;
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   recorder.onerror=()=>{active.cancelled=true;stopAssistantRecording();message('录音失败，请重试或输入文字。');};
   recorder.onstop=async()=>{
    stream.getTracks().forEach(t=>t.stop());clearTimeout(active.timer);assistantRecorder=null;if(active.cancelled||!card.isConnected)return;
    const textBefore=session.text,language=session.language;$('#assistant-voice').disabled=true;message(assistantCopy[language].busy);
    try{
     const blob=new Blob(chunks,{type:mime});if(blob.size>2000000)throw Error('请缩短录音至30秒内。');
     const audio=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
     const audioController=new AbortController();assistantAudioRequest=audioController;const res=await fetch('api/assistant/transcribe',{signal:audioController.signal,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audio,language})}),data=await res.json();if(!res.ok)throw Error(data.error||'录音识别失败');
     if(!card.isConnected||active.cancelled)return;if(session.text!==textBefore)throw Error('你已修改文字，请保留当前输入或重新录音。');
     session.text=(textBefore?textBefore+' ':'')+data.text;$('#assistant-text').value=session.text;message(language==='en'?'Review the transcript, then fill the form.':'请核对识别文字，再点击填入表单。');
    }catch(e){if(card.isConnected&&e.name!=='AbortError')message(e.message);}finally{if(card.isConnected){$('#assistant-voice').innerHTML=microphoneIcon+'<span>'+assistantCopy[session.language].voice+'</span>';$('#assistant-voice').setAttribute('aria-pressed','false');$('#assistant-voice').setAttribute('aria-label',assistantCopy[session.language].voice);availability();}}
   };
   recorder.start();active.timer=setTimeout(()=>{if(recorder.state!=='inactive')recorder.stop();},30000);$('#assistant-voice').innerHTML=microphoneIcon+'<span>'+assistantCopy[session.language].stop+'</span>';$('#assistant-voice').setAttribute('aria-pressed','true');$('#assistant-voice').setAttribute('aria-label',assistantCopy[session.language].stop);message(assistantCopy[session.language].record);
  }catch(e){stream?.getTracks().forEach(t=>t.stop());message(e.name==='NotAllowedError'?'未开启麦克风权限，可直接输入文字。':e.message);}
 }
 paint();
 if(tab==='planner'&&drafts.has(state.id+':planner:payment-form'))markPaymentDraft();
 if(!assistantStatus)fetch('api/assistant').then(r=>r.json()).then(data=>{assistantStatus=data;availability();}).catch(()=>availability());
}
window.addEventListener('pagehide',()=>{assistantRequest?.abort();stopAssistantRecording();});

function markPaymentDraft(){
 const result=document.querySelector('#payment-result'),form=document.querySelector('#payment-form');if(!result||!form)return;
 result.hidden=true;document.querySelector('#keep-purchase')?.closest('details')?.setAttribute('hidden','');
 if(!document.querySelector('#payment-update-note')){const note=document.createElement('p');note.id='payment-update-note';note.className='muted';note.textContent='输入已修改，请点击计算更新结果。';form.append(note);}
}
document.addEventListener('input',ev=>{if(ev.target.closest('#payment-form'))markPaymentDraft();});
