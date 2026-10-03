const SOURCE='https://www.bochk.com/whk/rates/exchangeRatesHKD/exchangeRatesHKD-input.action?lang=en';
function parse(html){
 const time=html.match(/Information last updated at HK Time:\s*(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})/);
 const markets={};
 for(const currency of ['CNY','CNH']){
  const row=html.match(new RegExp('<tr[^>]*>\\s*<td[^>]*>\\s*'+currency+'\\s*</td>([\\s\\S]*?)</tr>','i'));
  const values=row?.[1].replace(/<[^>]*>/g,' ').match(/\b\d+\.\d{6}\b/g)?.map(Number);
  if(!values||values.length!==2||values[0]<=0||values[1]<values[0])throw Error('官方报价结构改变或字段缺失');
  markets[currency]={customerSell:values[0],customerBuy:values[1]};
 }
 if(!time)throw Error('官方更新时间缺失');
 return {provider:'中银香港 BOCHK',kind:'官方公开电汇参考报价，非锁定成交价',unit:'HKD per CNY/CNH',source:SOURCE,sourceUpdatedAt:time[1].replaceAll('/','-').replace(' ','T')+'+08:00',retrievedAt:new Date().toISOString(),markets};
}
async function refresh(){const r=await fetch(SOURCE,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'Gangxue-Research-Prototype/0.3'}});if(!r.ok)throw Error('官方来源 HTTP '+r.status);return parse(await r.text());}
module.exports={parse,refresh,SOURCE};
