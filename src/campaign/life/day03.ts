import type { LifePack, LifeNode } from "./schema";
import { polygon } from "../navigation";
const p=(x:number,y:number)=>({x:x*1600/1672,y:y*900/941});
const n=(id:string,title:string,kind:LifeNode["kind"],shape:number[][],at:number[],stand:number[],depth:number,description:string,emptyText:string,lootTable?:LifeNode["lootTable"]):LifeNode=>({id:`d03-life-${id}`,title,kind,position:p(at[0],at[1]),approach:p(stand[0],stand[1]),baked:polygon(shape.map(([x,y])=>[p(x,y).x,p(x,y).y])),visual:{mount:"ground",support:"待下方逐物支撑标定覆盖",depth:p(0,depth).y},description,emptyText,...(lootTable?{lootTable}:{}),...(kind==="gather"?{renewSeconds:360}:{})});
const pack:LifePack={day:3,outside:[
 n("picnic-hamper","野餐篮的共享份","container",[[1301,716],[1312,710],[1325,716],[1330,737],[1322,737],[1319,722],[1308,722],[1305,737],[1297,737]],[1313,725],[1250,825],793,"野餐篮已有藤编提手，点击提手掀开查看主人给路人的共享份，取一份后放回盖布；下方野餐席仍保留原谜题热区。","篮内给你的共享份已领取，其他食物留给主人。","pantry"),
 n("picnic-tin","茶杯下的随行食盒","container",[[1345,793],[1385,789],[1418,803],[1390,822],[1351,815]],[1380,806],[1400,842],823,"白茶杯下真实棕色小食盒，从前侧搭扣打开后合回；主人允许取一份备用补给，杯子上仍可进行原喝茶互动。","备用补给已取过，食盒搭扣已扣回。","pantry"),
 n("path-seedheads","石径边成熟的草籽","gather",[[741,697],[758,682],[783,687],[799,702],[782,717],[750,717]],[773,702],[763,744],720,"主石径西缘已有草穗簇，只接住自然成熟脱落的草籽，不拔花田里的植物。","这一簇刚采过，等新的成熟草籽自然脱落。","herbs"),
 n("mill-petals","磨坊门前的落花","gather",[[356,503],[372,489],[397,496],[409,516],[392,531],[362,525]],[382,510],[344,546],533,"磨坊前庭东缘真实白色花簇，收集路缘自然掉落的花叶，原花株留下。","路缘已整理过，过一会儿再找自然落花。","herbs"),
 n("hive-left","左蜂箱的巢门","inspect",[[1398,565],[1441,572],[1465,588],[1450,638],[1402,630]],[1428,602],[1398,664],642,"最左侧真实木蜂箱，只从外侧观察巢门，不开蜂巢、不取蜂蜜；保留原看蜂支线。","蜜蜂仍在进出，保持距离，不伸手进箱。"),
 n("hive-middle","中蜂箱的防雨顶","inspect",[[1480,562],[1536,570],[1556,587],[1539,634],[1484,627]],[1516,596],[1454,555],637,"中间真实蜂箱的斜顶与箱缝，从北侧已有小径观察，不打开活跃蜂群的住处。","箱顶挡着雨露，蜂群的储粮留给它们。"),
 n("bridge-stone","桥面石块的纹路","inspect",[[534,618],[553,616],[579,623],[566,636],[538,632]],[551,621],[535,619],637,"旧石桥面已有嵌石，站在桥面看纹路，不撬走承重石。","石块仍稳稳留在桥里，只把纹路记下来。"),
],inside:[
 n("seed-drawer-left","左种子柜的共享抽屉","container",[[309,336],[348,324],[349,347],[310,361]],[330,342],[338,417],392,"后墙长柜左下真实抽屉；花匠指定为分享的零散园艺料，拉开取一份后推回。","共享份已领取，抽屉推回，珍藏种子不动。","herbs"),
 n("seed-drawer-right","右种子柜的回收抽屉","container",[[543,294],[582,281],[582,306],[543,318]],[563,301],[607,351],344,"后墙长柜右下真实抽屉；花匠允许取用的包装回收料，打开取一份后合好。","这一抽屉的回收份额已取过。","paper"),
 n("arch-cabinet","拱窗下的种子藏柜","inspect",[[700,280],[831,315],[831,373],[701,335]],[764,326],[808,407],376,"后墙拱窗下真实实心木柜；花匠允许打开柜门检查样本标签后关好，样本留柜，柜体不当成穿行门。","检查后柜门重新合上，育种样本原样留在隔板上。"),
 n("barrel","工具台边的回收桶","container",[[34,399],[57,388],[81,399],[86,449],[69,467],[36,450]],[58,428],[115,502],469,"工具台左边真实木桶，花匠赠予桶内清洁零碎回收料；从桶前地板分拣一份，桶保留。","能分享的材料已分拣，桶留作后续收纳。","salvage"),
 n("cut-herbs","分拣桌上的修剪草叶","gather",[[548,441],[562,435],[586,451],[603,477],[589,485],[565,465]],[576,459],[604,590],585,"中央桌前侧已有捆扎绿色修剪枝叶，花匠允许取一小份，剩余枝叶留在桌上晾干。","本轮修剪枝叶已领过，等花匠整理下一批。","herbs"),
 n("lavender","桌边晾好的紫花","gather",[[443,497],[462,485],[480,487],[489,506],[476,526],[448,518]],[473,503],[472,639],585,"中央桌前沿真实紫花束，花匠整理的干花共享份只取少量，整束留桌。","这批干花份额已领过，等下一次整理。","herbs"),
 n("tool-seed-tray","工具台上的分类盒","inspect",[[157,297],[211,280],[245,321],[205,350],[165,336]],[201,317],[238,464],465,"左工作台后部已有敞口种子分类盒，观察格子里的包装，避开前沿剪刀热区。","每一格仍整齐，不带走花匠的样本。"),
 n("table-sorter","中央分拣格盒","inspect",[[570,417],[643,403],[699,424],[671,460],[612,474],[570,450]],[631,435],[751,475],585,"中央桌东侧真实开放分格木盒，只检查不同种子包的分类；不覆盖后侧已有奖励纸包叠。","样本仍留在格子里，勿忘我奖励由原照料链领取。"),
]};
const supports: Record<string, Pick<LifeNode["visual"], "mount" | "support">> = {
  "d03-life-picnic-hamper": { mount: "ground", support: "野餐席上的藤编篮，命中上部真实提手。" },
  "d03-life-picnic-tin": { mount: "ground", support: "野餐席东边白杯下方棕色随行食盒。" },
  "d03-life-path-seedheads": { mount: "ground", support: "主石径西缘成熟草穗簇。" },
  "d03-life-mill-petals": { mount: "ground", support: "水磨前庭东缘白花簇及自然落花。" },
  "d03-life-hive-left": { mount: "ground", support: "最左木蜂箱由底座支撑在花田中。" },
  "d03-life-hive-middle": { mount: "ground", support: "中央木蜂箱，观察上部防雨斜顶。" },
  "d03-life-bridge-stone": { mount: "ground", support: "石桥路面嵌石，与路面同一透视。" },
  "d03-life-seed-drawer-left": { mount: "ground", support: "后墙长木柜左下抽屉，柜脚立于木地板。" },
  "d03-life-seed-drawer-right": { mount: "ground", support: "后墙长木柜右下抽屉，柜脚立于木地板。" },
  "d03-life-arch-cabinet": { mount: "ground", support: "拱窗下实心木种子柜，柜底压在木地板上。" },
  "d03-life-barrel": { mount: "ground", support: "左侧工具台边落地木桶。" },
  "d03-life-cut-herbs": { mount: "table", support: "中央分拣桌前部捆扎绿色枝叶。" },
  "d03-life-lavender": { mount: "table", support: "中央分拣桌前沿紫色干花束。" },
  "d03-life-tool-seed-tray": { mount: "table", support: "左工具台后部敞口分格木盒。" },
  "d03-life-table-sorter": { mount: "table", support: "中央分拣桌东半部敞口种子格盒。" },
};
for(const node of [...pack.outside,...pack.inside]) if(supports[node.id]) node.visual={...node.visual,...supports[node.id]};
export default pack;
