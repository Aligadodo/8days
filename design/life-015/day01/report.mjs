import {writeFileSync} from 'node:fs';
import {loadSource} from '../../../tests/load-source.mjs';
const coverage={1:`
户外已覆盖：公交站东侧蓝色回收桶、地铁口西侧棕色回收箱、公寓信箱（保护居民信件，不领取）。公交椅、公寓花坛和咖啡店门侧盆栽分别有独立观察/采集。
户外不适用/未覆盖：公园长椅旁绿色箱体在围栏与旧障碍内，本次不虚构穿栏路；便利店货架商品属于店面展示；便利店西侧小棕盆/箱图形无法确定为箱盖，仅保留装饰；旧贩卖机发现与公交牌、地铁终端保持原互动。
室内已覆盖：修补台下棕色赠料箱、右侧抽屉柜（下抽屉永久取空开态）、后墙两扇玻璃冷柜（可开门检查后关好）、商品岛西侧果筐、阅读角茶杯、书柜。
室内未逐件覆盖：修补台左下绿色盒、左侧展示柜、中央货架底层每个包装箱、后柜散装罐/篮、修补台上层私人抽屉及书桌下书籍。当前不声称全店每个瓶罐都可独立开；原工具盘、蓝伞、明信片、图鉴仍由0.14节点负责，不复制inspect凑数。`,3:`
户外已覆盖：藤编野餐篮提手、白杯下食盒搭扣各自是一次容器；两簇植物采集；左/中蜂箱和一块桥面石可观察。篮提手与食盒低前缘使用真实窄轮廓，不占原野餐席或白茶杯热区。
户外不适用/未覆盖：第三只最右蜂箱前没有已标定可达地面，本次不虚构跨花田路径；三只蜂箱均属活跃蜂群，不作为路人可打开取蜜的箱子；野餐奶瓶和碟中面包仍为装饰，原主线野餐、喝茶与看蜂保持原内容。磨坊墙体与小屋内不可见物品不增加物资。
室内已覆盖：工具台边木桶、后墙长柜左/右各一个共享抽屉、拱窗下实心柜（开门检查样本后合上）、工具台分格盒、中央桌分格盒；两束已剪下草叶/干花是再生分享。
室内未逐件覆盖：后墙其余小抽屉、上层种子罐、温室每只花盆、猫碗（原节点）、共用水壶与种子包（原链）不重复计数。所有容器暂为开合复位叙事反馈，没有新增DAY03开态PNG；原幼苗恢复图保持原样。`};
for(const day of [1,3]){const s=String(day).padStart(2,'0');const {default:pack}=loadSource(`src/campaign/life/day${s}.ts`);let doc=`# DAY${s} · v0.15生活物资交付\n\n2026-09-08。只新增本日LifePack与审计/报告，保留0.14玩法。原画逐张通过view_image检查；数据原生坐标1672×941，统一映射1600×900。\n\n`;
for(const [scene,nodes] of [['原地图',pack.outside],['室内',pack.inside]]){doc+=`## ${scene}\n\n${nodes.length}个新增节点：${nodes.filter(n=>n.kind==='container').length}一次容器、${nodes.filter(n=>n.kind==='gather').length}再生采集、${nodes.filter(n=>n.kind==='inspect').length}反复检查。\n\n|ID|物件/生命周期|物点（世界）|站位（世界）|挂载/深度|池/再生秒|\n|---|---|---|---|---|---|\n`;for(const n of nodes)doc+=`|${n.id}|${n.title} / ${n.kind}|${n.position.x.toFixed(2)},${n.position.y.toFixed(2)}|${n.approach.x.toFixed(2)},${n.approach.y.toFixed(2)}|${n.visual.mount} / ${n.visual.depth.toFixed(2)}|${n.lootTable??'无奖励'} / ${n.renewSeconds??'不再生'}|\n`;}
doc+=`\n## 容器覆盖与不适用清单\n${coverage[day]}\n\n## 生命周期与热点\n\n一次容器仅领取主人赠予/共享/回收份额；采集为${day===1?300:360}秒在线游戏时间再生，不写离线刷新逻辑；inspect无lootTable，可反复检查。掉落数量、存档与冷却由共享经济运行时负责。茶用tea、果筐用fruit、枝叶用herbs、纸料抽屉用paper；只有明确混装回收/补给容器用粗池。\n\n当前没有sharedDiscovery绑定，原inspect没有重复包装成新节点。窄部件避让原热点；已执行2世界单位网格交叠采样，DAY01/03与原baked热点发现0重叠，此为采样审计，不冒充连续多边形证明。\n\n## 可执行验证\n\n所有命令workdir为 D:/projects/OneMoreDayGame。\n\n- node design/life-015/day01/check.mjs：四场景共28节点，初始/完整flag站位全部精确可达，每条路径段nav.visible通过，入口返回可达，0失败；不调用nav.nearest。\n- node design/life-015/day03/check.mjs：只审计DAY03的独立入口。\n- node design/life-015/day01/hotspots.mjs：旧主线baked/探索热点网格交叠0项。\n- node --test --test-name-pattern="DAY (1|3) " tests/life-content.test.mjs：8/8 PASS。\n- node --test --test-name-pattern="DAY (1|3)" tests/exploration.test.mjs：8/8 PASS，含进出/原位返回/保存重开/猫巡游与暂停。\n- npx tsc --noEmit：最后复跑PASS（早期并行共享代码未完成的报错已消失）。\n\n未手玩浏览器，未访问用户localhost与真实存档；真实开箱点击、afterArt重绘深度、售出与冷却持久化待主任务统一验收。\n`;
if(day===1)doc+=`\n## 有限开态资源\n\n内置image_gen生成并目视检查正式PNG public/assets/life-015/day01/drawer-open.png；源稿design/life-015/day01/drawer-open-source.png；完整提示design/life-015/day01/PROMPTS.md。原画/输出1672×941，只消费crop(1170,297,102,66)，相对节点原生(1218,307)下沿偏移(3,56)，严格按原生尺寸缩放。只改变原修补台下右柜的下抽屉，取空后留开。没有用脚本画或修改像素。\n\n为真实打开抽屉的占地，在exploration/day01.ts增加原生(1175,330)–(1270,360)阻挡，闭态也保守预留该桌脚范围，未削墙/桌碰撞。原修伞站位与出入口回归通过。其余容器只有开合复位文案与公共动作反馈，未宣称均已有开盖动画。\n`;
writeFileSync(`docs/life-015/DAY${s}.md`,doc);}
