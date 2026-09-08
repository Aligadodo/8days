# v0.15 生活经济与空间体验：并行契约

目标：16 个现有场景增加可打开容器、可再生采集和反复观察；跨关卡真实背包、游戏币兑换与多宠物跟随；修正墙体遮挡与不可达点击回退。主线、危险预告和 v2 存档进度不得回退。

## 文件所有权

- runtime：CampaignGame.ts、entities.ts、types.ts、campaignSave.ts、音效及 pets.ts，负责运行时接线，不改 main.ts。
- economy：life/economy.ts、life/catalog.ts、main.ts、style.css，纯经济事务与抽屉 UI；与 runtime 先确认公开方法。
- spatial：navigation.ts、worldSchema.ts、objectRendering.ts、worlds/day02.ts、空间回归；渲染主循环变更交 runtime。
- 六个日期内容任务：life/dayNN.ts（DAY03 任务额外 DAY01；DAY04 任务额外 DAY02），对应 docs/life-015/、design/life-015/、public/assets/life-015/。可调整自己日期的 exploration/dayNN.ts、worlds/dayNN.ts，但 DAY02 原地图碰撞由 spatial 独占。
- 主任务：life/schema.ts、life/packs.ts、验收、综合文档与发布；不抢上述实现文件。

## 场景内容标准

- LifePack 默认导出 `{ day, outside: LifeNode[], inside: LifeNode[] }`；inside 对应当天唯一室内图。
- `LifeNode`：id（dNN-life- 前缀）、title、kind(container/gather/inspect)、position、approach、baked、visual、description、emptyText，容器/采集增加 lootTable，采集增加 renewSeconds；可选 afterArt。
- `lootTable` 混装池：salvage、nature、pantry、mineral、pocket；具体物品限定池：cloth、herbs、fruit、stone、wood、paper、tea。枝叶/茶壶/纸抽屉必须使用对应限定池，不能从茶壶取出水果、从纸堆取出石头。具体随机池由 economy 管理，日期不发明 item ID。
- 只命中画上真实物品的轮廓，不画新方框、光圈、扁平家具；悬停细光边。容器应有开启反馈及已取空状态，已开不可通过刷新重抽。
- 每个场景至少 6 个新增节点，优先逐个覆盖可见箱、桶、柜、采集簇；已有任务容器可共享交互（配置 sharedDiscovery），不抢占主线触发。不能把全部箱柜标成“私人物品，只看不开”规避开箱设计；普通箱柜应打开取物/查看后复位，剧情指定失物则保留其叙事，不改主线物件归属。
- 每个站位必须精确可达且脚底不穿桌墙；地面连通不靠隐形窄线；真正墙、桌柜、水面、悬崖仍阻挡。
- 一次容器、180 秒以上在线游戏时间再生采集、可重复无奖励观察三种生命周期都覆盖。暂停/离线不刷新资源。
- 独立清单记录箱体覆盖/遗漏、图上坐标与可达性，不声称所有装饰像素已互动。

## 验收门槛

1. 16 场景内容、依赖、站位、资产、重复 ID 全量自动检查。
2. 点击墙/断开区域回退本连通分量最近安全位置；所有路径段保持脚印碰撞验证。
3. 不再用物体画面中心决定遮挡。墙体按地面接触线与人物脚底判断，任何遮挡不应横向截断处于前方的角色。
4. 背包堆叠、金币、售出/购买、消耗、多个宠物拥有与出战、切图/重开/刷新持久化；非法存档和重复按钮不能复制物资或透支。
5. 旧主线/危险/16 场景测试及生产构建通过；UI 实测闭环，不写“已全量手玩”。

现实货币、交易/支付、联网多人、强迫每日登录均不在本轮。
