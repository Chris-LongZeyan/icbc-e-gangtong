# 项目建议书图表代码与数据索引

对应当前《工银e港通项目建议书》。工作目录：`C:/Users/Chris_longzeyan/OneDrive/Desktop/ICBC`。

## Python 统计图

图1至图5由同一文件 `poc/report-tools/build_charts.py` 生成，分别输出 PNG、PDF 和 CSV。脚本内各段以注释编号，代码顺序为图1、图3、图2、图4、图5。

| 建议书编号 | 内容 | Python 代码位置 | 输出文件前缀 | 输入数据 |
| --- | --- | --- | --- | --- |
| 图1 | 充值与最终消费的核算分解 | `build_charts.py` 第43行起 | `fig-wallet-accounting` | 脚本中的500元充值、148元消费合成算例 |
| 图2 | 整数舍入下的最小兑换额 | `build_charts.py` 第64行起 | `fig-fx-minimum` | `poc/report-tools/data/examples.json` 的 `quote` 和历史报价 |
| 图3 | 用途分配与逐日余额路径 | `build_charts.py` 第54行起 | `fig-reserve-path` | `examples.json` 的 `allocation`、`projection` |
| 图4 | 约束消融实验的错误放行比例 | `build_charts.py` 第71行起 | `fig-ablation` | `poc/experiments/results.json` |
| 图5 | 账户数据服务费用的规模与调用频率敏感性 | `build_charts.py` 第78行起 | `fig-data-cost` | 脚本中的公开服务单价与汇率区间；对应参考文献[34-36] |

在工作目录执行：

```powershell
python -m pip install -r poc/report-tools/requirements.txt
python poc/report-tools/build_charts.py --font C:/Windows/Fonts/simsun.ttc --dpi 300
```

输出目录为 `poc/report-assets`。也可加 `--out 自选目录`。当前图表采用宋体，默认分辨率300 dpi，生成PNG、PDF及CSV，不生成SVG。

数据导出程序是 `poc/report-tools/export-chart-data.cjs`，负责调用原型引擎生成 `examples.json`。直接运行绘图脚本会读取已保存的算例与实验快照；更新算例时再运行数据导出程序，并同步核对建议书中的日期和报价。

## 原型截图

图6至图9是实际页面截图，不通过Python绘图生成。

| 编号 | 内容 | 建议书使用的图片 | 来源 |
| --- | --- | --- | --- |
| 图6 | 资金总览与用途预留 | `poc/report-assets/demo-overview-20261016.jpg` | 10月16日原型画面；原始演示素材为 `demo/e-gangtong-judges/assets/overview.jpg` |
| 图7 | 分类账本及逐笔调整 | `poc/report-assets/demo-ledger-20261016.jpg` | 10月16日原型画面；原始演示素材为 `demo/e-gangtong-judges/assets/ledger.jpg` |
| 图8 | 手机端Qwen调用后的试算结果 | `poc/report-assets/demo-ai-result-20261017.png` | 手机录屏 `demo/e-gangtong-mobile/screen.mp4` 第250.9秒；录制脚本为 `tmp/record-mobile-demo.cjs` |
| 图9 | 到账期限冲突 | `poc/report-assets/prototype-infeasible.jpg` | 既有原型运行截图；当前未找到独立保存的截屏脚本 |

图8可从保存的视频重新提取：

```powershell
& 'tmp/video-codecs/node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe' -y -ss 250.9 -i demo/e-gangtong-mobile/screen.mp4 -frames:v 1 poc/report-assets/demo-ai-result-20261017.png
```

原型二维码为 `report/submission/prototype-qr.png`，用于访问原型，不列入论文图号。

## 表格

| 编号 | 内容 | 数据与编排文件 |
| --- | --- | --- |
| 表1 | 工商银行既有服务与本方案功能增量 | 建议书第2.4节Markdown表格；依据该节官方产品文献人工整理 |
| 表2 | 双币购买试算的约束与结果 | 建议书第4.3节Markdown表格；来源为正文列明的固定报价合成算例 |
| 表3 | 约束消融与独立枚举结果 | 建议书附录B.2的Markdown表格；数值来自 `poc/experiments/results.json` |

上述表格直接写在 `report/submission/工银e港通_项目建议书.md`，没有单独的Python绘表脚本。`tmp/build_proposal_pdf.py` 将它们排入PDF；`tmp/build_proposal_html.cjs` 负责HTML转换。
