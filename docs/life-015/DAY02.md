# DAY02 · v0.15 生活物资

## 首稿与范围

数据：`src/campaign/life/day02.ts`，默认导出 LifePack。现有原办公区、休息与档案间保持原画和探索链；没有修改 world、exploration、runtime、schema、registry。原图已逐张查看，所有节点是源图 1672×941 的真实物体，baked 按 1600×900 精确映射。

当前 24 节点：原图 8（4 容器、2 采集、2 观察）；室内 16（10 容器、2 采集、4 观察）。采集统一 300 秒在线游戏时间；生命周期、暂停与离线行为交共享运行时。`d02-goodnight-note` 只共享废稿整理，`d02-screwdriver` 只共享工具箱；baked、approach、position、visual 都直接取原发现数据，原 ID 不替换。

纸柜、纸箱、旧封套只掉 `paper`；公共备用布与叶纤维用 `cloth`；保温壶用 `tea`；修剪木枝用 `wood`。混装红工具箱用 `salvage`，茶几/纪念柜的赠予混装小盒用 `pocket`。不随机从纸张里拿石头，也不从茶壶里拿水果。私人档案夹与个人盆栽没有掉落。

## 可见容器覆盖 / 不适用清单

| 场景与实物 | 状态与对应节点 |
|---|---|
| 办公原图复印机下左面纸抽屉 | container `copier-drawer`，共享回收纸，开合后复位文案 |
| 复印柜西南脚边棕色纸箱 | container `copy-box`，共享回收纸，有 imagegen 空箱口 afterArt |
| 西工位南面抽屉 | container `west-drawers`，主人赠予便笺；原图通道断连已报空间代理 |
| 南侧木档案柜西面底层抽屉 | container `south-files`，管理员已清空文件的旧信封纸 |
| 原图左端、中央和下方其余工位抽屉；台面零散私人盒 | 尚未逐个可打开；多处柜前处于原world断开通道或桌椅之间，未用远端站位遥控 |
| 原图南柜顶部叠箱、复印区后架书盒 | 尚未逐个交互；需共享空间/遮挡复核后扩充，不宣称已全覆盖 |
| 原图电气柜、消防/检修门与锁、会议室内柜 | 原主线/危险设施，不改成随机物资箱；会议室内部不伪造可达站位 |
| 室内茶柜左抽屉 | container `tea-drawer`，公共备用布 |
| 室内茶柜右侧柜门 | inspect `tea-cupboard`，公共杯具保留；尚无视觉开门 |
| 茶柜银色保温壶 | gather `tea-urn`，300 秒添茶补给 |
| 茶几下左小盒 | container `low-box`；右侧另一个下层盒尚未独立配置 |
| 红工具箱 | container `red-toolbox`，原图本来敞开，共享借螺丝刀节点，混装维修余料 |
| 背墙档案架最低层左/中/右三盒 | `archive-box-left/middle/right`，三个独立 container，回收纸封套 |
| 整理桌下左/中/右三箱 | `under-desk-left/middle/right`，三个独立 container，回收纸 |
| 前景纪念柜上层右格小盒 | container `album-box`，主人赠予混装零碎物；原邮票册保留 |
| 背墙姓名档案夹、后墙独立铁柜 | `back-files` 和 `right-files` 可反复检查，无奖励，不把所有柜都当私人封存规避开箱 |
| 背墙上层叠盒、右墙铁柜群及顶盒、前景柜其余下层盒 | 尚未逐盒交互；高层不可伸手或被桌体遮挡，未为数量扩大轮廓/远程站位 |
| 茶架杯子/顶部罐、双保温壶中的左壶 | 除已配置右壶，仍为装饰；不把杯具取走 |

非容器新增：通道废稿、桌缘纸堆、工位盆栽、复印机托盘、盆栽修剪余枝、猫窝。不是再复制一份旧 inspect。

## 开态素材

内置 imagegen 以 `public/assets/maps/day02-night-office.png` 为目标，只改复印柜前的小棕色纸箱空箱口。生成源图完整保存于 `design/life-015/day02/copier-box-open-source.png`，生产副本 `public/assets/life-015/day02/copier-box-open-source.png`。完整提示词见本日 `prompts.md`。无 CLI 回退，无 shell/Python 画图或修图。

只消费原生裁片 `(932,516,49,56)`，通过 `x*1600/1672, y*900/941` 注册；生成整图不替换原画，不覆盖附近主线地图或打印机。已查看原图与生成全图，空箱口可见。其余容器“打开、领取、复位”目前只有共享拾取/文字反馈，**不宣称已绘制全部箱盖和抽屉动画**。

## 验证与交接

从 `D:/projects/OneMoreDayGame` 执行：

```powershell
node design/life-015/day02/audit.mjs 2
npx tsc --noEmit
```

逐点完整结果：`design/life-015/day02/audit-results.json`。审计直接导入本日 LifePack，检查唯一 ID、限定池、再生秒数、真实共享发现与站位/轮廓完全一致、不得重复旧 inspect、主线/探索轮廓冲突、PNG 裁片与 afterArt 注册、初始/全 flag 精确寻路及每段 visible、室内每节点到返回站位。

首次 24 点复验：23 点完整可达，室内 16 点全部可达；唯一失败为 `west-drawers` 原办公区连通性。站位 `(330,566)` isWalkable=true、route=0；相邻可见地面 `(335,572)/(309,579)/(340,561)/(360,562)` 同样断开。已报告主任务转空间代理，未越权修改 DAY02 world。旧纪念柜站位 `(1398*X,804*Y)` 已修正到原探索可达站位 `(1398*X,780*Y)`。

TypeScript 首次全仓检查受并行 runtime/main 未完成接线报错影响，本日文件无错误。

### 冻结交付复验

按主任务要求冻结 **24 节点（外8、内16）**。空间代理修复窄斜道的网格连接后，本日独立审计 **24/24 初始与全 flag 均精确可达，0 failure**，包含所有室内节点原路返回。没有为通过测试搬动西抽屉站位或修改其原 world。

`npx tsc --noEmit` 最终通过；`node --test --test-name-pattern='DAY (2|4)' tests/life-content.test.mjs` 的 DAY02/04 八项测试通过。最新逐点结果已覆盖写入本日 `audit-results.json`。

独立只读素材预览 `design/life-015/day02/preview.mjs` 用浏览器 CSS 六倍放大原图、生成源图及**原图+实际49×56裁片合成**，已目视确认可见空箱口、纸箱底脚未漂移、邻近文件架和地面仍来自原图。预览只读取位图，不制作/重画素材；使用独立随机本地端口，不触及用户5173游戏。它验证素材拼接，**不是游戏点击/领取端到端测试**。

尚待主任务：正式浏览器命中与遮挡、经济随机数量/幂等领取/再生与存档、共享原任务共存。没有宣称全部柜箱都已有开盖动画。未操作用户游戏或用户存档。
