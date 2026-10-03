const fs=require('node:fs'),path=require('node:path'),F=require('./fixtures.js'),E=require('./engine.js');
fs.mkdirSync(path.join(__dirname,'data'),{recursive:true});
for(const id of F.ids){const state=F.make(id);fs.writeFileSync(path.join(__dirname,'data',id+'.json'),JSON.stringify(state,null,2));fs.writeFileSync(path.join(__dirname,'data',id+'.csv'),E.csv(state.transactions));}
fs.writeFileSync(path.join(__dirname,'data','import-example.csv'),E.csv([{id:'manual-example-1',date:'2026-10-01',account:'hkd',currency:'HKD',amount:-8800,type:'expense',category:'餐饮',description:'示例新增晚餐',fxRate:0.91,cnyActual:null}]));
console.log('Generated 5 reconciled synthetic cases and an import example.');
