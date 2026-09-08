import type { ExplorationPack, DiscoveryNode } from "./schema";
import { world, area, obstacle } from "../worldSchema";
import { polygon } from "../navigation";

// Source painting is 1672×941. Registration is explicit, not a guessed 16:9 crop.
const X = 1600 / 1672, Y = 900 / 941;
const p = (x: number, y: number) => ({ x: x * X, y: y * Y });
const poly = (a: number[][]) => polygon(a.map(([x, y]) => [x * X, y * Y]));
const floor = (name: string, a: number[][]) => area(name, a.map(([x,y]) => [x * X,y * Y]));
const solid = (name: string, a: number[][]) => obstacle(name, a.map(([x,y]) => [x * X,y * Y]));
const table = (support: string, depth: number) => ({ mount: "table" as const, support, depth: depth * Y });
const node = (n: DiscoveryNode) => n;

const pack: ExplorationPack = {
  day: 2,
  theme: "灯还亮着，也可以先休息",
  outside: [
    node({ id: "d02-last-cup", title: "茶水间的两只杯子", kind: "inspect",
      position: p(844, 250), approach: {x: 828, y: 318}, baked: poly([[827,211],[850,215],[850,239],[828,238]]),
      visual: table("原茶水间圆桌上的两只杯子，站在桌南侧地砖观察", 294),
      description: "两只杯子的杯柄相对。有人给加班同伴也留了一杯，而不是催他再多做一页。",
      result: "记下今日小事：有人记得你的那杯水。" }),
    node({ id: "d02-desk-photo", title: "工位上的合影", kind: "photo",
      position: p(444, 452), approach: {x: 525, y: 460}, baked: poly([[422,419],[444,414],[453,441],[431,448]]),
      visual: table("西侧工位原生台灯旁的小相框；从工位右侧通道拍照，不踩椅子", 497),
      description: "相框里不是业绩榜，是几个人在野餐垫上笑得很傻。只拍下这个提醒，不带走别人的相框。",
      result: "打卡：工作之外的我们。", reward: {title: "工作之外的我们", category: "postcard"} }),
    node({ id: "d02-goodnight-note", title: "废纸背面的晚安涂鸦", kind: "collect",
      position: p(805, 779), approach: {x: 767, y: 779}, baked: poly([[792,764],[808,757],[821,775],[805,786]]),
      visual: {mount:"ground", layer:"ground", support:"南侧宽通道地面原有散纸，远离配电柜与主线终点"},
      description: "掉在通道里的废稿背面画着一颗困得歪掉的月亮，角落写着：不必每晚都发光。",
      result: "把月亮涂鸦临摹进生活册，原稿仍留在原处。", reward: {title:"晚安月亮涂鸦临摹", category:"keepsake"} }),
  ],
  room: {
    id: "d02-room", name: "会议室后侧 · 员工休息与旧档案",
    background: "/assets/exploration-014/day02/lounge-archive-v2.png",
    intro: "门后是相连的休息区和旧档案整理间。这里没有主线口令；可以看夜景、修一台收音机，或者和小猫待一会儿。原门随时能返回办公区。",
    entry: { title:"进入员工休息与档案间", position:{x:477,y:280}, approach:{x:490,y:315},
      baked: poly([[463,136],[534,112],[535,274],[465,300]]),
      support:"西北玻璃会议室面向办公区的原生木门，门槛下方是初始可达办公区地板；不穿越会议室玻璃障碍，也不占用检修/消防门" },
    world: world({
      spawn: p(302, 792),
      regions: [floor("休息区—档案区连续地板", [[100,503],[750,321],[1230,255],[1628,446],[1490,515],[1630,704],[995,935],[693,935],[314,851],[190,780],[227,694]]),
        floor("原木门内侧平层门槛", [[123,807],[196,891],[290,852],[242,781],[225,732],[190,750]])],
      obstacles: [
        solid("左侧茶柜实体", [[107,382],[270,337],[298,394],[300,489],[163,536],[107,503]]),
        solid("沙发与靠墙边桌", [[353,368],[573,293],[690,340],[690,389],[616,414],[402,478],[356,454]]),
        solid("猫窝", [[300,427],[331,407],[376,423],[383,465],[341,484],[297,463]]),
        solid("休息区矮茶几", [[499,444],[641,399],[702,437],[703,493],[550,546],[502,510]]),
        solid("背墙档案书架", [[747,170],[1188,60],[1207,266],[792,366],[750,338]]),
        solid("右侧铁柜与箱子", [[1188,183],[1320,175],[1611,308],[1606,450],[1516,477],[1492,359],[1255,270],[1198,289]]),
        solid("档案整理桌", [[1084,330],[1318,241],[1521,369],[1523,428],[1282,545],[1084,424]]),
        solid("整理桌凳", [[1121,423],[1150,404],[1182,423],[1183,475],[1146,493],[1120,472]]),
        solid("纪念册矮柜", [[1224,594],[1458,518],[1517,558],[1516,695],[1310,788],[1224,728]]),
        solid("右前角花盆柜", [[1516,659],[1568,643],[1611,671],[1610,727],[1562,750],[1514,717]]),
      ],
      anchors: { exit:[218*X,798*Y,284*X,798*Y] },
      baked: { exit:poly([[131,606],[235,552],[240,779],[137,829]]) },
      visuals: {exit:{mount:"door",support:"左下原木门内侧真实地板门槛，向右侧地板操作后返回，不穿门板",depth:831*Y}},
    }),
    nodes: [
      node({id:"d02-rest-notice", title:"休息区留言板", kind:"inspect", position:p(601,278), approach:p(712,369),
        baked:poly([[544,169],[644,141],[646,250],[544,279]]),
        visual:{mount:"wall",support:"沙发上方原生软木留言板；从边桌右侧地板读纸条",depth:380*Y},
        description:"纸条写着：收音机的旋钮松了，红工具箱有螺丝刀；断电拧紧外部旋钮即可，请勿打开机壳。修好后，可照着茶几上的样本折一只纸鹤，原样本请留下。这里的邮票册也欢迎留下纪念拓印。",
        result:"已记录：留言板 → 红工具箱 → 收音机外旋钮 → 茶几学折纸鹤。工具不会消耗，也与配电主线无关。"}),
      node({id:"d02-screwdriver",title:"红工具箱里的螺丝刀",kind:"collect",position:p(1400,492),approach:p(1418,515),
        baked:poly([[1342,373],[1396,352],[1404,321],[1436,336],[1450,355],[1431,395],[1431,406],[1398,421],[1342,394]]),
        visual:table("整理桌右前边缘的红色工具箱，站在桌右侧真实地板取工具",500),
        description:"箱里的小螺丝刀有绝缘柄。借走修外部机械旋钮，不碰办公区带电线路。",
        result:"借到小螺丝刀；工具在本次探索中不消耗。",reward:{title:"休息室小螺丝刀",category:"tool"}}),
      node({id:"d02-radio",title:"松了旋钮的旧收音机",kind:"restore",position:p(1171,432),approach:p(1055,378),
        baked:poly([[1130,286],[1169,277],[1209,304],[1209,339],[1182,355],[1131,334]]),
        visual:table("整理桌左前缘真实收音机，从桌左侧操作外部旋钮，不跨桌拿取",429),
        requires:["d02-rest-notice","d02-screwdriver"],
        afterArt:{src:"/assets/exploration-014/day02/radio-restored-source.png",crop:{x:1138,y:298,width:47,height:42},width:47*X,height:42*Y,offset:{x:-9.5*X,y:-92*Y}},
        description:"断电后固定松动的外旋钮，再开启机器。留言板已说明工具和处理范围，不需要猜电路，也不打开外壳。",
        result:"旋钮咔哒扣住，指示灯亮了。晚间广播轻声说：今天的工作就到这里吧。可以去茶几照着样本折一只纸鹤了。"}),
      node({id:"d02-paper-crane",title:"照着样本折一只纸鹤",kind:"collect",position:p(641,478),approach:p(694,538),
        baked:poly([[625,423],[645,436],[655,420],[659,445],[639,452],[622,439]]),
        visual:table("矮茶几右侧原生折纸鹤样本，站在茶几东南侧地毯边缘观察折法，样本保留",532),
        requires:["d02-radio"],description:"照着茶几上的样本，用生活册的空白纸页折一只自己的纸鹤。原样本留给下一位旅人。沿着折痕看，翅膀像一小片归家的屋檐。",
        result:"把自己折的纸鹤收进背包，桌上样本仍留给下一个人。",reward:{title:"亲手折的夜班纸鹤",category:"keepsake"}}),
      node({id:"d02-stamp-album",title:"共享邮票册",kind:"collect",position:p(1377,757),approach:p(1398,780),
        baked:poly([[1317,550],[1388,524],[1429,578],[1360,617]]),
        visual:table("右前矮柜上的打开邮票册，从柜前地板阅读并拓印，不拿走整本册子",786),
        description:"共享册里记录着大家旅行的邮票。按留言板的邀请，拓印一枚“夜归”纪念章，原册留在原处。",
        result:"收录夜归邮戳拓印。每枚只登记一次。",reward:{title:"夜归邮戳拓印",category:"postcard"}}),
      node({id:"d02-night-window",title:"窗外仍亮着的几扇窗",kind:"photo",position:p(419,331),approach:p(325,534),
        baked:poly([[315,185],[514,128],[514,270],[315,328]]),
        visual:{mount:"wall",support:"沙发后方夜景窗，从沙发左前方地板拍摄，不站上沙发",depth:331*Y},
        description:"城市很大，没必要每扇窗都等你一起熄灯。在这里拍张照，然后给自己留一点休息时间。",
        result:"打卡：灯火与归途。",reward:{title:"灯火与归途",category:"postcard"}}),
      node({id:"d02-tea-pause",title:"茶几上的温杯",kind:"inspect",position:p(568,482),approach:p(497,567),
        baked:poly([[553,432],[576,428],[586,448],[579,463],[557,460]]),visual:table("茶几左侧原有陶杯，站在茶几西南地板停一停",532),
        description:"手掌靠近杯壁，还能感到一点温度。休息并不是做完所有事才配得到的奖励。",
        result:"生活册记下一次主动的休息。"}),
      node({id:"d02-desk-bell",title:"柜上的小铜铃",kind:"inspect",position:p(1292,625),approach:p(1182,660),
        baked:poly([[1283,550],[1301,550],[1315,592],[1270,607],[1265,585]]),visual:table("纪念册柜左侧真实铜铃，站在柜西侧敲一下",760),
        description:"轻敲铜铃，只响一声。这里不是新的任务铃，它只是提醒值夜的人：有人准备回家了。",
        result:"叮。把今天轻轻收尾。"}),
      node({id:"d02-lounge-cat",title:"休息室的小猫",kind:"pet",position:p(390,554),approach:p(414,598),
        visual:{mount:"actor",support:"茶柜与地毯外侧的真实地板巡游，不跨沙发和茶几",height:31,maxWidth:39},
        animal:"cat",patrol:[p(390,554),p(431,601),p(538,652),p(623,620),p(522,575)],
        description:"猫沿着地毯外沿绕了一圈，在离你不远的地方放慢脚步。蹲下来，让它自己决定靠近。",
        result:"它用额头轻轻碰了碰你的手。休息区多了一位熟悉你的朋友。"}),
    ],
  },
  achievements:[
    {id:"d02-small-repair",title:"修好一个小夜晚",description:"读留言、借工具、修好收音机并照样折出纸鹤。",requires:["d02-rest-notice","d02-screwdriver","d02-radio","d02-paper-crane"]},
    {id:"d02-off-duty",title:"工作之外，也有生活",description:"记录工位合影、窗外灯火，停下来喝茶并亲近小猫。",requires:["d02-desk-photo","d02-night-window","d02-tea-pause","d02-lounge-cat"]},
  ],
};
export default pack;
