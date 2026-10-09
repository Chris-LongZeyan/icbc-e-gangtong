# 报告图表复现

图表由Python/Matplotlib生成，输出300 dpi PNG、可编辑排版使用的矢量PDF及CSV数据，不输出SVG。所有输入均为合成算例、已保存实验或公开价格，不读取个人流水，不联网。

在仓库根目录执行（Python 3.10+、Node.js 24）：

```powershell
python -m pip install -r report-tools/requirements.txt
node report-tools/export-chart-data.cjs
python report-tools/build_charts.py
```

可指定输出目录、字体及分辨率：

```powershell
python report-tools/build_charts.py --out my-figures --font C:/Windows/Fonts/msyh.ttc --dpi 300
```

脚本自动尝试Windows微软雅黑、macOS苹方或Linux Noto CJK；找不到中文字体时明确报错，不生成乱码。安装字体的许可由使用者遵守。本次验证环境为Matplotlib 3.10.5。

| 文件名 | 报告位置 | 证据类型及图形 |
| --- | --- | --- |
| fig-wallet-accounting | 2.1 跨币种生活中的资金核算 | 500元充值与148元消费的合成算例；堆叠条形图 |
| fig-reserve-path | 4.3 典型场景与计算结果 | reserve案例的用途金额与引擎逐日输出；条形图和时间序列 |
| fig-fx-minimum | 4.3 典型场景与计算结果 | quote逐分计算；阶梯图 |
| fig-ablation | 4.4 独立验证与实验结论 | results.json实测计数；横向条形图 |
| fig-data-cost | 附录C.2 可比数据服务的敏感性分析 | 官方单价的成本敏感性测算；曲线与条形图 |

`data/examples.json`由同一规划引擎导出。`experiments/results.json`保留原实验，不由制图脚本覆盖，避免无意改变报告性能数据。`chart-manifest.json`记录输入及PNG哈希。图中每个计数、金额和曲线都有确定来源，不以装饰图形代替实验。

价格依据：[Teller](https://teller.io/)、[Stripe](https://stripe.com/pricing)；汇率区间依据：[香港金管局联系汇率说明](https://www.hkma.gov.hk/media/eng/publication-and-research/reference-materials/monetary/HKMA_LERS_English_version.pdf)。核查日2026-10-09。US$0.30/月是海外账户交易数据服务价格，不是八达通报价；计费连接数仅用于规模敏感性分析。余额查询费用另算。

原型截图使用实际页面及合成案例，不由本脚本伪造。`report-assets/prototype-*.jpg`分别展示账本、资金预留、可行兑换和约束拒绝；对应报告附录D。截图中的参考报价保留原始日期，不表示实时银行接入。约束拒绝截图采用人民币12,000元购买、10月3日付款、两个自然日到账延迟，预计10月4日可用。
