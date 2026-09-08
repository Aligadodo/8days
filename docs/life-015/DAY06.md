# DAY06 v0.15 — 生活物资修订稿

当前状态（2026-09-08）：DAY06 已进入发布冻结。本人复跑独立审计 24 项与严格类型检查均通过、退出码 0；此前 catalog 限定池未完成的编译问题已解决，不再是当前阻塞。中央最终集成记录见 [LIFE_015_RELEASE.md](../LIFE_015_RELEASE.md)：213/213 测试、8/8 layout、8/8 exploration 及生产 build 通过。中央运行时与隔离图形实测范围以该文档为准，不等同本人逐节点浏览器手玩。

本文覆盖上一版首稿报告。只改 `src/campaign/life/day06.ts` 和本日 design/docs，未改 exploration/world/runtime/schema/registry，不提交不推送。

## 最新内容与验收结果

| 场景 | 总数 | container | gather | inspect |
|---|---:|---:|---:|---:|
| 原山谷图 | 6 | 1 | 2 | 3 |
| 山舍室内 | 6 | 1 | 2 | 3 |

共 12 节点。3 个 sharedDiscovery 均用于增加领取能力，没有 shared Life inspect。每个 Discovery 只绑定一次，approach/baked 直接复用。两个场景均具有一次容器、定时采集和独立反复观察；最初“每场景 2 容器”预算仍少各 1 个，未声称补齐。

修正了此前把背包一律私有化的问题：原故事仅描述旧包补线，没有失物任务；现在营地主人明确赠予外袋里的备用布料。玩家开外袋取一份，再扣回袋口，原补线发现共存。

## 实物与掉落覆盖

| 场景/实物 | ID（省略 d06-life-） | 当前交互 |
|---|---|---|
| 营地旧背包 | worn-pack | container / cloth；开外袋领取主人赠予的一份备用布料，再扣回；共享 d06-worn-pack |
| 吊桥东端缆绳结 | bridge-knot | 独立 inspect；观察绳结，不拆桥索 |
| 背包左侧露出的木凳面接缝 | bench-joint | 独立 inspect；不占背包轮廓 |
| 营地白花簇旁草丛 | camp-seeds（稳定 ID） | gather / herbs / 300 秒；只采芳香草，保留完整白花与根部 |
| 西坡缓路散石 | path-stones | gather / stone / 300 秒；不撬台阶，不采滑坡面 |
| 橙帐篷外侧接缝 | tent-seam | 独立 inspect |
| 门边敞开靴盘 | recovery-tray | container / cloth；主人提供的一份备用擦靴布，靴与盘留下；共享 d06-drip-tray |
| 浅色折巾 | light-cloth | gather / cloth / 600 秒；主人补充的布料边角，完整布巾留原位；共享 d06-dry-towels |
| 独立蓝色折布 | blue-cloth | gather / cloth / 600 秒；另一叠布料边角份额 |
| 炉旁直立火钳 | stove-poker | 独立 inspect；替换重复雨披观察 |
| 封闭炉门玻璃 | stove | 独立 inspect；不把燃烧炉膛当搜集容器 |
| 原门门板铁扣 | door-latch | 独立 inspect；不占左侧返回门洞，不改变开门状态 |

已删除重复的营地灯、桥头白花、蓝雨披 Life inspect；原 v0.14 发现原样保留。新 inspect 均绑定不同实物/部件，不用重复描述计数。布料统一 cloth，芳香草 herbs，碎石 stone，本包不使用混装池，杜绝布巾出石、草簇出水果。

## 视觉与不适用清单

已逐张 view_image 核对旧山谷图和 shelter-v1.png，均为 1672×941；显式缩放为 1600×900 世界坐标。所有节点独立 baked、真实地面 approach、明确 depth。3 共享轮廓/站位完全复用原节点。

- 原图唯一清晰独立袋容器是绿色背包，现在可开启取一份并复位。两顶帐篷是休息空间，没有凭空在帐内加箱。
- 茶亭茶具保留主线终点；运行时主线锁箱 shelter-lock 不属于 Discovery，现 schema 不支持 sharedMain，不能冒填 sharedDiscovery 抢任务。主任务若扩展主线共享，可让锁箱的原任务与物资共存。
- 室内浅盘作为现成敞开容器已覆盖。雨披仍有原探索观察，不复制节点。两桌上的闭合物从画面判断为书，不改称箱柜。
- 右墙高架花盆、罗盘受桌体阻隔，没有遥控采集。地图/登记簿/天气木牌保留原顺序链。
- 不添加图上不存在的箱柜来补数量。无新位图、无 afterArt；背包当前按“打开取一份后扣回”数据语义，尚未实现或宣称视觉开盖动画。浅盘本已敞开。开取反馈、已取空提示和保存去重待公共运行时实机验收。

## 可执行检测

工作目录 `D:\projects\OneMoreDayGame`：

```powershell
node design/life-015/day06/audit.mjs
npx tsc --noEmit --target es2022 --module esnext --moduleResolution bundler --strict --skipLibCheck src/campaign/life/day06.ts
```

审计 PASS，结果 `design/life-015/day06/audit-results.json`：12 节点 × 初始/完整 DAY06 主线 flags = 24 项检查。包括 nav.isWalkable、出生点往返每站位、每个路径段 nav.visible、两场景门站位、唯一 ID、baked 边界、depth、合法限定池、再生下限、inspect 无掉落、共享 ID 无重复且无共享 inspect、共享 approach/baked 严格一致。没有使用 nav.nearest。

历史中间状态（已解决）：当时严格类型检查未通过共享依赖：`src/campaign/life/catalog.ts:29` 当时尚未实现新增限定池 wood/stone/fruit/cloth 等，报 TS2740。DAY06 数据本身未报错。现 catalog 已补齐，本人以本节相同命令复跑独立审计与严格类型检查，均退出码 0；不再保留该历史问题为当前阻塞。

未修改 registry 做测试，未访问用户 localhost:5173 或存档。中央接线与最终自动验收已完成，具体运行时、保存/重玩、命中采样及隔离图形实测证据见 [LIFE_015_RELEASE.md](../LIFE_015_RELEASE.md)。DAY06 专属开盖位图仍未制作，其余视觉和手工覆盖边界按该中央报告及上文如实保留。本次仅更新报告状态与复跑审计结果，没有改数据或源码，准备发布冻结。

