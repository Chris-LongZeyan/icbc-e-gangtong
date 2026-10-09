"""Reproduce report figures as PNG and PDF; never emits SVG. Python 3.10+."""
from pathlib import Path
import argparse,csv,json,hashlib
from datetime import datetime
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager,dates as mdates,ticker

ROOT=Path(__file__).resolve().parents[1]
ap=argparse.ArgumentParser();ap.add_argument('--out',type=Path,default=ROOT/'report-assets');ap.add_argument('--font',type=Path);ap.add_argument('--dpi',type=int,default=300);args=ap.parse_args()
args.out.mkdir(parents=True,exist_ok=True)
font=args.font
if font is None:
 for candidate in ['C:/Windows/Fonts/msyh.ttc','/System/Library/Fonts/PingFang.ttc','/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc']:
  if Path(candidate).exists():font=Path(candidate);break
if font:
 font_manager.fontManager.addfont(str(font));plt.rcParams['font.family']=font_manager.FontProperties(fname=str(font)).get_name()
else:
 available={f.name for f in font_manager.fontManager.ttflist}
 names=['Microsoft YaHei','PingFang SC','Noto Sans CJK SC','WenQuanYi Zen Hei']
 selected=next((n for n in names if n in available),None)
 if not selected:raise SystemExit('未找到中文字体。请用 --font 指定合法安装的中文 TTF/TTC/OTF 字体文件。')
 plt.rcParams['font.family']=selected
plt.rcParams.update({'font.size':10,'text.parse_math':False,'axes.unicode_minus':False,'axes.spines.top':False,'axes.spines.right':False,'axes.labelcolor':'#333333','text.color':'#222222','pdf.fonttype':42,'savefig.facecolor':'white'})
RED='#b51c26'; BLUE='#426b8c'; GRAY='#8c9399'; GREEN='#4d7865'
data=json.loads((ROOT/'report-tools/data/examples.json').read_text(encoding='utf-8'))
exp=json.loads((ROOT/'experiments/results.json').read_text(encoding='utf-8'))
assert sum(exp['counts'].values())==exp['caseCount'] and not exp['mismatches']
assert data['wallet']['consumed']+data['wallet']['remaining']==data['wallet']['topup']
assert data['projection'][-1]['after_purchase_cents']==500000
assert next(q for q in data['quote'] if q['debit']==235398)['received']==200000
assert next(q for q in data['quote'] if q['debit']==235397)['received']==199999
manifest=[]
def finish(fig,name,source,rows):
 fig.tight_layout(rect=(0,.09,1,1));fig.text(.015,.02,source,fontsize=8,color='#555555',va='bottom')
 for ext in ['png','pdf']:fig.savefig(args.out/f'{name}.{ext}',dpi=args.dpi,bbox_inches='tight')
 with (args.out/f'{name}.csv').open('w',encoding='utf-8-sig',newline='') as f:
  writer=csv.DictWriter(f,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
 manifest.append({'figure':name,'source':source,'png_sha256':hashlib.sha256((args.out/f'{name}.png').read_bytes()).hexdigest()});plt.close(fig)

# 1. Funds are conserved through top-up; only merchant spending is consumption.
fig,ax=plt.subplots(figsize=(8.2,4.4));x=range(3);bank=[500,0,0];wallet=[0,500,352];spent=[0,0,148]
bottom=[0]*3
for label,values,color in [('银行余额',bank,BLUE),('钱包未消费余额',wallet,GRAY),('累计最终消费',spent,RED)]:
 ax.bar(x,values,bottom=bottom,label=label,color=color,width=.56)
 for i,v in enumerate(values):
  if v:ax.text(i,bottom[i]+v/2,f'{v:,}',ha='center',va='center',color='white',fontweight='bold')
 bottom=[a+b for a,b in zip(bottom,values)]
ax.set_xticks(list(x),['充值前','充值 500 港元后','再消费 148 港元后']);ax.set_ylabel('港元');ax.set_ylim(0,620);ax.legend(ncol=3,loc='upper center',frameon=False)
ax.set_title('充值与最终消费的资金核算');ax.yaxis.grid(True,alpha=.2);ax.set_axisbelow(True)
finish(fig,'fig-wallet-accounting','来源：报告第2.1节合成算例；期初银行余额500、钱包余额0，无费用或退款。\n堆叠总高为期初资金＝剩余资金＋累计消费，不表示总资产保持不变。',[{'stage':i,'bank_hkd':bank[i],'wallet_hkd':wallet[i],'cumulative_consumption_hkd':spent[i]} for i in x])

# 2. Actual engine output, with the protected envelope and an additional HKD5,000 purchase.
fig,(ax,bx)=plt.subplots(1,2,figsize=(11,4.8),gridspec_kw={'width_ratios':[1,1.65]})
a=data['allocation'];labels=['学费','租金','应急金','生活预算','可安排'];vals=[a[k] for k in ['tuition','rent','reserve','living','free']]
ax.barh(labels,vals,color=[GRAY,GRAY,BLUE,GRAY,RED]);ax.invert_yaxis();ax.set_xlabel('港元');ax.set_xlim(0,61000);ax.set_title('80,000港元的用途分配')
for i,v in enumerate(vals):ax.text(v+800,i,f'{v:,}',va='center',fontsize=9)
rows=data['projection'];ds=[datetime.fromisoformat(r['date']) for r in rows]
for key,label,color,style in [('balance_cents','原计划余额',BLUE,'-'),('after_purchase_cents','追加5,000元支出后',RED,'-'),('protected_cents','剩余保护用途及应急金',GRAY,'--')]:bx.plot(ds,[r[key]/100 for r in rows],label=label,color=color,linestyle=style,lw=1.8)
bx.axhline(5000,color=GREEN,lw=1,ls=':');bx.set_title('规划期港币逐日余额');bx.set_ylabel('港元');bx.xaxis.set_major_locator(mdates.DayLocator(interval=15));bx.xaxis.set_major_formatter(mdates.DateFormatter('%m-%d'));bx.legend(frameon=False,fontsize=8,loc='upper right');bx.grid(alpha=.18)
finish(fig,'fig-reserve-path','来源：fixtures.js reserve合成案例，经engine.js与core.js导出；金额为港币。\n不提前计入预计生活费；追加支出以期初立即扣款表示，期末余额恰好达到5,000元应急底线。',rows)

# 3. Stepwise cent rounding around the optimum. No continuous interpolation.
fig,ax=plt.subplots(figsize=(8.3,4.5));qs=data['quote'];xs=[q['debit']/100 for q in qs];ys=[q['received']/100 for q in qs]
ax.step(xs,ys,where='post',color=BLUE);ax.scatter(xs,ys,s=15,color=BLUE);ax.axhline(2000,color=RED,ls='--',label='人民币缺口 2,000.00')
ax.scatter([2353.98],[2000],color=RED,s=45,zorder=5);ax.annotate('最小扣款 HK$2,353.98\n少一分仅到账 ¥1,999.99',xy=(2353.98,2000),xytext=(2353.89,2000.04),arrowprops={'arrowstyle':'->','color':RED},fontsize=9)
ax.xaxis.set_major_formatter(ticker.FormatStrFormatter('%.2f'));ax.yaxis.set_major_formatter(ticker.FormatStrFormatter('%.2f'));ax.set_xlabel('港币扣款（元）');ax.set_ylabel('人民币到账（元）');ax.set_ylim(1999.9,2000.11);ax.legend(frameon=False,loc='lower right');ax.set_title('整数舍入条件下的最小兑换额');ax.grid(alpha=.18)
finish(fig,'fig-fx-minimum',f'来源：core.js quote整数计算；中银香港CNH报价快照 {data["rateTime"]}。\n客户买入价1.176990 HKD/CNH，额外费用为0；情景测算，不是实时或可执行报价。',qs)

# 4. Reuse stored experiment results; do not rerun performance measurements.
fig,ax=plt.subplots(figsize=(9,4.5));names=['仅折算总资产','原币余额与费用','去掉到账限制','完整模型'];keys=['aggregate','currencyOnly','withoutSettlement'];counts=[exp['baselines'][k]['falseAccept'] for k in keys]+[len(exp['mismatches'])]
rates=[v/exp['caseCount']*100 for v in counts];ax.barh(names,rates,color=[GRAY,GRAY,BLUE,RED],height=.58);ax.invert_yaxis();ax.set_xlim(0,52);ax.set_xlabel('错误放行数 ÷ 全部2,000组案例（%）');ax.set_title('约束消融实验的错误放行结果')
for i,(v,n) in enumerate(zip(rates,counts)):ax.text(v+.8,i,f'{n} / 2,000  ({v:.2f}%)',va='center')
ax.xaxis.grid(alpha=.18);ax.set_axisbelow(True)
finish(fig,'fig-ablation','来源：experiments/results.json；固定种子20261008，2,000组五日合成案例。\n各对照为自建删减模型，不是银行产品实测；结果不代表真实客户发生概率。',[{'model':name,'false_accept':n,'denominator':exp['caseCount'],'percent':v} for name,n,v in zip(names,counts,rates)])

# 5. Public-price arithmetic, no customer acquisition or profit forecast.
fig,(ax,bx)=plt.subplots(1,2,figsize=(11,4.5));volumes=list(range(0,10001,1000));annual_usd=.30*12
ax.fill_between(volumes,[n*annual_usd*7.75 for n in volumes],[n*annual_usd*7.85 for n in volumes],color=RED,alpha=.25)
ax.plot(volumes,[n*annual_usd*7.8 for n in volumes],color=RED,label='US$0.30/月 × 12个月');ax.set_xlabel('全年等效计费连接数（情景规模）');ax.set_ylabel('年度交易订阅费（港元）');ax.set_title('交易订阅费与计费规模');ax.ticklabel_format(axis='y',style='plain');ax.legend(frameon=False,fontsize=8);ax.grid(alpha=.18)
query=[0,12,365];costs=[annual_usd+.10*n for n in query];labs=['仅交易订阅','另加每月一次余额查询','另加每日一次余额查询']
bx.barh(labs,costs,color=[BLUE,GRAY,RED]);bx.invert_yaxis();bx.set_xlim(0,48);bx.set_xlabel('每个连接每年费用（美元）');bx.set_title('独立付费查询的频率影响')
for i,v in enumerate(costs):bx.text(v+.5,i,f'{v:.2f}',va='center')
finish(fig,'fig-data-cost','来源：Teller与Stripe Financial Connections官方标准价（2026-10-09核查）；交易US$0.30/月，余额US$0.10/次。\n左图汇率换算区间7.75—7.85；不含固定接入、核验、税费和支持费用，非八达通报价或收入预测。',[{'connections':n,'subscription_usd':n*annual_usd,'hkd_at_7_75':round(n*annual_usd*7.75,2),'hkd_at_7_85':round(n*annual_usd*7.85,2)} for n in volumes])
(args.out/'chart-manifest.json').write_text(json.dumps({'figures':manifest,'matplotlib':matplotlib.__version__,'data_source_sha256':hashlib.sha256((ROOT/'experiments/results.json').read_bytes()).hexdigest()},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Generated {len(manifest)} figures (PNG/PDF/CSV) in {args.out}')
