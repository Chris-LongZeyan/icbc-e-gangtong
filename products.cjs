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
async function refresh(){const res=await fetch(source,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'e-Gangtong prototype public product reference'}});if(!res.ok)throw Error('官方页面暂不可用');return parse(await res.text());}
module.exports={source,parse,refresh};
