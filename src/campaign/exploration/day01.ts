import type { DiscoveryNode, ExplorationPack } from "./schema";
import { world, area, obstacle } from "../worldSchema";
import { polygon } from "../navigation";

// The approved image is 1672 × 941. Author against visible native pixels;
// convert once to the campaign's 1600 × 900 world, including collision shapes.
const p = (x: number, y: number) => ({ x: x * 1600 / 1672, y: y * 900 / 941 });
const coords = (a: number[][]) => a.map(([x, y]) => [p(x, y).x, p(x, y).y]);
const shape = (a: number[][]) => polygon(coords(a));
const block = (name: string, a: number[][]) => obstacle(name, coords(a));
const rect = (x: number, y: number, w: number, h: number) => shape([[x,y],[x+w,y],[x+w,y+h],[x,y+h]]);
const roomNodes: DiscoveryNode[] = [
  {
    id: "d01-radio", title: "雨夜手摇收音机", kind: "inspect",
    position: p(219, 176), approach: p(226, 353), baked: rect(180,107,71,66),
    visual: { mount: "table", support: "售货区后墙低柜上的红色收音机；从柜前左通道收听", depth: p(0,329).y },
    description: "红色收音机不接电源，侧边留着手摇充电的小把手。转动它，听一段不催促人的街区广播。",
    result: "广播提醒：店门一直开着，修伞台的工具可以借用；雨再大，也可以先坐一会儿。",
  },
  {
    id: "d01-repair-diagram", title: "墙上的修伞图解", kind: "inspect",
    position: p(801,213), approach: p(797,301), baked: rect(714,101,171,110),
    visual: { mount: "wall", support: "两区之间后墙上带伞图案的原生告示板", depth: p(0,251).y },
    description: "三幅伞图依次画着：合拢伞面、用小螺丝刀拧紧伞帽、在桌上缓慢撑开检查。工具盘就在右边。",
    result: "记下修补步骤。修伞不需要主线道具；只要借到工具，再回到同侧工作台即可。",
  },
  {
    id: "d01-screwdriver", title: "借用修补工具", kind: "collect",
    position: p(1076,236), approach: p(1073,375), baked: rect(1035,181,85,58),
    visual: { mount: "table", support: "修补区工作台左半部打开的黑色工具盘，不将工具盘搬走", depth: p(0,340).y },
    description: "打开的工具盘里有细柄螺丝刀。借用一支修伞，其余工具留在台上。",
    result: "借到了细柄螺丝刀。工具不会消耗，也不会因为离开小店丢失。",
    reward: { title: "细柄螺丝刀", category: "tool" },
  },
  {
    id: "d01-repair-umbrella", title: "修补桌上的蓝伞", kind: "restore",
    position: p(1203,254), approach: p(1224,374), baked: shape([[1121,231],[1160,208],[1284,178],[1289,195],[1260,235],[1140,261]]),
    visual: { mount: "table", support: "修补台右半部真实蓝伞，始终从桌前操作，不越过货架", depth: p(0,340).y },
    requires: ["d01-repair-diagram", "d01-screwdriver"],
    afterArt: {
      src: "/assets/exploration-014/day01/night-shop-repaired.png",
      crop: {x:1116,y:145,width:180,height:123},
      width: p(180,0).x, height: p(0,123).y, offset: p(3,14),
    },
    description: "伞帽的螺钉松了。先看左边墙上的图解，再借工具盘里的螺丝刀，才能按图修补。",
    result: "拧紧伞帽，慢慢撑开——伞面终于张平。店主把一本小小的修补纪念贴交给你：这座城，又少了一件被丢掉的东西。",
    reward: { title: "蓝伞修补纪念贴", category: "keepsake" },
  },
  {
    id: "d01-postcard", title: "雨街明信片架", kind: "collect",
    position: p(195,684), approach: p(399,629), baked: shape([[146,570],[209,548],[238,664],[199,691],[159,675]]),
    visual: { mount: "table", support: "左下木桌上的多张雨街明信片架；从桌右上侧领取一张", depth: p(0,785).y },
    description: "木架上是街坊拍摄后寄存在店里的雨街明信片；旁边的小盒表示每位来客可取一张。",
    result: "收藏一张《夜灯与雨》。架子上还留着给后来人的明信片，不会反复领取。",
    reward: { title: "夜灯与雨明信片", category: "postcard" },
  },
  {
    id: "d01-pressed-leaf", title: "阅读桌的压花图鉴", kind: "collect",
    position: p(1426,651), approach: p(1249,654), baked: shape([[1388,587],[1481,594],[1484,648],[1380,645]]),
    visual: { mount: "table", support: "右下阅读桌中央真实摊开的植物图鉴；从桌左侧地毯翻阅，桌前花凳后的狭小地坪不设站位", depth: p(0,741).y },
    description: "摊开的图鉴印着一片街树叶脉，夹页提供可带走的同款压花书签。取一张，原书留在桌上。",
    result: "收藏了梧桐压花书签。雨水打在叶子上的声音，也成了今天的一段记忆。",
    reward: { title: "梧桐压花书签", category: "nature" },
  },
  {
    id: "d01-window-photo", title: "圆窗里的雨线", kind: "photo",
    position: p(1371,191), approach: p(1344,329), baked: shape([[1311,109],[1346,86],[1389,90],[1425,119],[1424,165],[1393,192],[1345,190],[1314,162]]),
    visual: { mount: "wall", support: "右后墙真实圆窗；在窗座前拍摄，不站上窗座", depth: p(0,292).y },
    description: "站在干燥的窗座前，把圆窗里蓝色的雨线和室内暖灯收进一张照片。",
    result: "打卡「暴雨中的一盏灯」。今天除了赶路，你还记住了一个可以停下来的地方。",
  },
  {
    id: "d01-shop-cat", title: "巡视小店的花猫", kind: "pet", animal: "cat",
    position: p(1137,452), approach: p(1124,483),
    patrol: [p(1137,452), p(1281,437), p(1316,387), p(1102,402)],
    visual: { mount: "actor", support: "修补区中央真实地砖上活动；绕开猫窝、桌椅与货架", height: 31, maxWidth: 35 },
    description: "花猫巡完货架，朝你慢慢走来。蹲下来，让它先闻闻你的手。",
    result: "花猫用额头轻碰你的手指，然后继续巡视这间温暖的小店。",
  },
  {
    id: "d01-street-picture", title: "阅读角的老街照片", kind: "inspect",
    position: p(1538,235), approach: p(1500,522), baked: shape([[1485,120],[1568,158],[1568,259],[1483,219]]),
    visual: { mount: "wall", support: "右墙书柜上方真实老街画框，从书柜前远观而非穿过书柜", depth: p(0,480).y },
    description: "画框里的街道没有洪水：公交还没停，咖啡店灯刚亮。它不是新的密码，只是一段被保留下来的普通日子。",
    result: "发现「晴天也曾来过」。照片背面的故事已收进探索日志。",
  },
];

const pack: ExplorationPack = {
  day: 1, theme: "赶路之外，进一间还亮着灯的小店",
  room: {
    id: "d01-room", name: "夜灯杂货铺", background: "/assets/exploration-014/day01/night-shop.png",
    intro: "门铃轻响，雨声被留在玻璃门外。左边有街坊寄存的明信片；右边是免费修补台和阅读角。随时可以从身后的双开门回到原街道。",
    entry: {
      title: "进入夜灯杂货铺", position: {x:1371,y:285}, approach:{x:1370,y:350},
      baked: polygon([[1331,206],[1396,208],[1397,283],[1332,283]]),
      support: "户外右上便利店真实敞亮玻璃门；店前砖面可达，远离咖啡店招牌及带电积水，不覆盖原任务入口",
    },
    world: world({
      spawn: p(814,745),
      regions: [area("售货区与修补阅读角的连续地砖", coords([[165,250],[1590,250],[1630,818],[59,818],[55,617],[156,617]]))],
      obstacles: [
        block("后墙冷柜与货物台",[[176,178],[687,177],[687,331],[173,331]]),
        block("左侧冷柜和墙面货架",[[55,253],[174,243],[161,612],[54,612]]),
        block("中央商品岛含水果箱",[[295,346],[674,337],[680,548],[301,554]]),
        block("上部两区矮货架",[[900,160],[978,157],[978,378],[900,378]]),
        block("右后修补工作台",[[987,182],[1290,183],[1292,342],[987,342]]),
        block("圆窗下窗座",[[1290,200],[1458,206],[1458,298],[1290,296]]),
        block("右墙书柜和立灯",[[1470,280],[1592,292],[1610,529],[1557,529],[1465,466]]),
        block("猫窝",[[1375,369],[1404,345],[1443,351],[1465,382],[1453,418],[1394,425],[1375,406]]),
        block("明信片桌与花盆",[[121,629],[337,629],[337,789],[121,789]]),
        block("左下圆凳",[[352,696],[380,679],[416,690],[426,751],[411,779],[355,779]]),
        block("阅读桌",[[1291,568],[1586,568],[1586,740],[1291,740]]),
        block("阅读椅",[[1366,493],[1438,492],[1442,569],[1360,570]]),
        block("茶杯边桌",[[1245,501],[1310,501],[1310,584],[1245,584]]),
        block("桌前花盆小凳",[[1253,725],[1326,725],[1327,812],[1253,812]]),
        block("右下杯凳",[[1562,725],[1629,725],[1629,813],[1562,813]]),
        block("左下落地花盆",[[51,687],[113,693],[117,803],[54,803]]),
        block("入口左门扇",[[550,705],[667,705],[667,819],[550,819]]),
        block("入口右门扇",[[959,705],[1075,705],[1075,819],[959,819]]),
      ],
      anchors: { exit: [p(813,815).x,p(813,815).y,p(813,780).x,p(813,780).y] },
      baked: { exit: rect(679,809,264,17) },
      visuals: { exit: {mount:"door",support:"底部双开玻璃门之间的真实敞开门槛；入口地毯上即可返回",depth:p(0,819).y} },
    }),
    nodes: roomNodes,
  },
  outside: [
    {
      id: "d01-vending", title: "屋檐下的自动贩卖机", kind: "inspect",
      position:{x:1260,y:300}, approach:{x:1250,y:348}, baked: polygon([[1240,223],[1279,223],[1281,299],[1240,299]]),
      visual:{mount:"ground",support:"便利店左侧原画红色贩卖机，立在屋檐下的砖面上",depth:309},
      description:"贩卖机的商品灯还亮着，但投币口盖着检修条。隔壁亮着的玻璃门里传来收音机声。",
      result:"发现避雨小店。贩卖机不需要投币也不生成无限饮料；进入右侧店门，可以借工具、收集明信片和看猫。",
    },
    {
      id: "d01-rain-photo", title: "暖灯在雨街上的倒影", kind: "photo",
      position:{x:665,y:410}, approach:{x:665,y:391}, baked: polygon([[624,404],[654,388],[707,386],[709,406],[655,433],[625,427]]),
      visual:{mount:"ground",support:"咖啡店西南侧既有湿路面灯影；站在远离招牌落点的街面取景",layer:"ground"},
      description:"不用往招牌下面走。在这段宽路面回望，屋檐的暖灯正落进蓝色雨水里。",
      result:"打卡「脚边的灯」。相片记录在日志，不改变任何交通或通关条件。",
    },
    {
      id: "d01-shop-dog", title: "便利店门前的小狗", kind: "pet", animal:"dog",
      position:{x:1460,y:355}, approach:{x:1450,y:376}, patrol:[{x:1460,y:355},{x:1410,y:355},{x:1360,y:360}],
      visual:{mount:"actor",support:"便利店前连续干燥人行道上巡游，避开门口和旧任务物",height:34,maxWidth:43},
      description:"小狗在屋檐下等主人，隔一会儿就回头看一眼亮着的店门。你伸出手，让它自己走近。",
      result:"小狗摇起尾巴，蹭了蹭你的裤脚。它留在安全的人行道，不会跟进水里。",
    },
  ],
  achievements: [
    {id:"d01-mender",title:"今天，修好一件东西",description:"读过图解、借到工具并修好蓝伞。",requires:["d01-repair-diagram","d01-screwdriver","d01-repair-umbrella"]},
    {id:"d01-neighborhood",title:"雨城的熟客",description:"收集明信片与压花书签，记录雨窗，并结识店里店外的小动物。",requires:["d01-postcard","d01-pressed-leaf","d01-window-photo","d01-shop-cat","d01-shop-dog"]},
  ],
};
export default pack;
