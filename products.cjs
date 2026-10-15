'use strict';
const source='https://www.icbcasia.com/hk/sc/personal/latest-promotion/online-time-deposit.html';
function parse(html,now=new Date()){
 const text=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ');
 const section=text.split('e时代／综合客户')[1];if(!section)throw Error('客户类别格式已变化');
 const published=text.match(/为\s*(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);if(!published)throw Error('缺少公布日期');
 const publishedAt=`${published[1]}-${published[2].padStart(2,'0')}-${published[3].padStart(2,'0')}`;
 if(Date.parse(publishedAt)>now.getTime())throw Error('公布日期异常');
 const products=[];
 for(const [currency,label,band]of [['HKD','港币','50,000或以上'],['CNY','人民币','50,000至500,000以下']]){
  const escaped=band.replace(/,/g,',\\s*');const match=section.match(new RegExp(label+'\\s*'+escaped+'\\s*'+Array(5).fill('([0-9]+(?:\\.[0-9]+)?)%').join('\\s*')));
  if(!match)throw Error('产品表格格式已变化');
  [1,2,3,6,12].forEach((months,i)=>{const annualRate=Number(match[i+1]);if(annualRate<0||annualRate>20)throw Error('利率异常');products.push({id:currency+'-'+months,currency,months,minimum:5000000,maximum:currency==='CNY'?49999999:null,annualRate,name:'工银亚洲网上定期存款',tier:'e时代／综合客户',channel:'网上银行／手机银行'});});
 }
 return {source,provider:'工银亚洲',publishedAt,retrievedAt:now.toISOString(),products};
}
const standardSource='https://www.icbcasia.com/hk/en/personal/banking/deposits/time-deposit/default.html';
function parseStandard(html,now=new Date()){
 const text=html.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ');
 const hkd=text.match(/Hong Kong Dollar Time Deposit:\s*Minimum amount is HKD\s*([0-9,]+)/i),cny=text.match(/Renminbi Time Deposit:\s*Minimum amount is CNY\s*([0-9,]+)/i);
 if(!hkd||!cny||!/overnight to 12 months/i.test(text))throw Error('普通存款条款格式已变化');
 return ['HKD','CNY'].flatMap((currency,j)=>{const minimum=Number([hkd,cny][j][1].replace(/,/g,''))*100;if(!Number.isSafeInteger(minimum)||minimum<=0||minimum>1e10)throw Error('起存额无效');return [1,2,3,6,12].map(months=>({id:'standard-'+currency+'-'+months,kind:'standard',currency,months,minimum,maximum:null,annualRate:null,name:'工银亚洲普通定期存款',tier:'普通定期',channel:'分行／电子渠道',source:standardSource,retrievedAt:now.toISOString()}));});
}
async function refresh(){
 const now=new Date(),read=async url=>{const res=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'e-Gangtong prototype public product reference'}});if(!res.ok)throw Error('官方页面暂不可用');return res.text();};
 const results=await Promise.allSettled([read(source).then(html=>parse(html,now)),read(standardSource).then(html=>parseStandard(html,now))]);
 if(results.every(r=>r.status==='rejected'))throw Error('官方产品资料暂不可用');
 const result=results[0].status==='fulfilled'?results[0].value:{source,provider:'工银亚洲',publishedAt:null,retrievedAt:now.toISOString(),products:[]};
 if(results[1].status==='fulfilled')result.products.push(...results[1].value);
 return result;
}
module.exports={source,standardSource,parse,parseStandard,refresh};
