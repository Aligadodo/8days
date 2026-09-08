import type { ExplorationPack, DiscoveryNode } from "./schema";
import { world, area, box } from "../worldSchema";
import { polygon } from "../navigation";
// Both source paintings are 1672×941; never crop or silently assume 1600×900 pixels.
const X=1600/1672, Y=900/941;
const p=(x:number,y:number)=>({x:x*X,y:y*Y});
const poly=(a:number[][])=>polygon(a.map(([x,y])=>[x*X,y*Y]));
const rect=(x:number,y:number,w:number,h:number)=>poly([[x,y],[x+w,y],[x+w,y+h],[x,y+h]]);
const solid=(name:string,x:number,y:number,w:number,h:number)=>box(name,x*X,y*Y,w*X,h*Y);
const table=(support:string,depth:number)=>({mount:"table" as const,support,depth:depth*Y});
const node=(n:DiscoveryNode)=>n;
const pack:ExplorationPack={
 day:7,theme:"每件失物，都在等一个归人",
 outside:[
  node({id:"d07-platform-bench",title:"站房窗下的长椅",kind:"inspect",position:p(270,665),approach:{x:291,y:663},
   baked:poly([[238,637],[284,625],[300,645],[299,660],[251,679],[239,670]]),visual:{mount:"ground",support:"西站房窗下已有木长椅，从东南侧站台石地观察椅面",depth:650},
   description:"雪沿着椅背积了一条白边，靠窗的座位却有人刚刚拂过。这里曾有人替下一位旅人留座。",result:"记下：雪夜里的一张空座位。"}),
  node({id:"d07-luggage-cart",title:"行李车上的包裹",kind:"inspect",position:p(518,570),approach:{x:534,y:573},
   baked:poly([[478,548],[513,535],[548,547],[547,575],[491,590],[474,578]]),visual:{mount:"ground",support:"西站台原画行李车上的箱包，从车右前方石地看标签，不带走包裹",depth:567},
   description:"车上的箱包大小各异，却都把提手朝向外侧。失物整理角也许保留着同样细心的习惯。",result:"记下包裹的摆放习惯，所有行李留在车上。"}),
  node({id:"d07-snow-fir",title:"站台边的小雪松",kind:"photo",position:p(835,560),approach:{x:790,y:553},
   baked:poly([[828,513],[838,527],[850,551],[846,563],[824,569],[815,557],[822,537]]),visual:{mount:"ground",support:"西站台中段靠长椅的原生盆栽雪松，站在站台内侧拍摄，不踏入轨道",depth:548},
   description:"树枝接住一层层雪，盆沿还露着暖色的陶土。拍下它，不摇掉替根部保温的积雪。",result:"打卡：末班车前的小雪松。",reward:{title:"站台雪松照片",category:"nature"}}),
 ],
 room:{id:"d07-room",name:"站房候车室 · 失物与信号角",background:"/assets/exploration-014/day07/waiting-room-v1.png",
  intro:"左边可以坐候车、看雪和临摹旅行卡，右边是失物登记桌。墙上图案和箭头给出了核对顺序；这不是行车信号操作，也不产生主线口令。下方门槛随时原路返回。",
  entry:{title:"进入站房候车室",position:{x:347,y:585},approach:{x:385,y:627},baked:poly([[349,546],[374,538],[379,552],[378,607],[351,615]]),support:"西侧站房原画窗旁绿色木门，门下有真实石台阶；使用既有候车室门前台阶导航，不占东站房主线终点"},
  world:world({spawn:p(825,750),
   regions:[area("候车厅与整理角连续木地板",[[78,305],[1597,305],[1597,774],[78,774]].map(([x,y])=>[x*X,y*Y])),area("唯一入口石门槛",[[721,738],[930,738],[930,864],[721,864]].map(([x,y])=>[x*X,y*Y]))],
   obstacles:[solid("北侧墙体",75,40,1530,257),solid("茶柜",112,130,180,244),solid("茶柜边盆栽",278,241,69,73),solid("候车长椅北排",343,248,382,146),solid("候车长椅南排",310,483,412,168),solid("旅行卡架",96,409,98,212),solid("西南花盆",76,630,78,104),solid("雨伞桌",1000,230,116,166),solid("手套桌",1145,230,120,166),solid("行李箱桌",1291,230,126,166),solid("信号角小台",1460,270,80,108),solid("登记台",1297,445,235,174),solid("东南花盆",1511,582,84,175),solid("门左柱",638,686,83,181),solid("门右柱",930,686,86,181)],
   anchors:{exit:[825*X,827*Y,825*X,785*Y]},baked:{exit:rect(722,743,207,122)},visuals:{exit:{mount:"door",support:"画面下方唯一开放门框之间的石门槛，南向返回原西站台",depth:863*Y}},
  }),
  nodes:[
   node({id:"d07-sort-board",title:"失物核对图示",kind:"inspect",position:p(1208,201),approach:p(930,335),baked:rect(1024,104,379,95),visual:{mount:"wall",support:"失物桌上方木墙的伞、手套、行李箱和右向箭头；站在桌列左侧读图",depth:295*Y},description:"墙上从左到右画着伞、手套、行李箱，两支箭头依次向右。登记须先核对雨具，再核对保暖物，最后核对行李；依次点击三张桌上的实物，最后到右下登记簿确认。物品仍保管在站内。",result:"核对顺序：雨伞 → 红手套 → 行李箱 → 登记簿。看错可以重新从雨伞开始；不操作列车信号。"}),
   node({id:"d07-umbrella",title:"雨具桌的折伞",kind:"inspect",position:p(1054,365),approach:p(1055,429),baked:poly([[1073,225],[1095,230],[1091,248],[1075,252],[1063,292],[1034,322],[1036,293],[1061,250],[1062,234]]),visual:table("第一张失物桌上的折伞；从桌南侧核对，伞留在桌面",395),description:"第一幅图是张开的伞，桌上是合拢的同类雨具。核对伞柄的弯钩与伞布。",result:"雨具已核对。接着看红手套，再看行李箱，最后确认登记簿。"}),
   node({id:"d07-mitten",title:"保暖物桌的红手套",kind:"inspect",position:p(1205,365),approach:p(1205,429),baked:poly([[1194,240],[1221,239],[1229,260],[1240,263],[1237,281],[1220,286],[1210,305],[1169,289],[1180,266]]),visual:table("第二张失物桌上的红色针织手套；操作站位在桌南地板",395),description:"针织纹和拇指轮廓与墙上第二幅图一致。这里核对保暖物，不把手套拿走。",result:"保暖物已核对；行李箱是最后一类。"}),
   node({id:"d07-suitcase",title:"行李桌的小皮箱",kind:"inspect",position:p(1352,365),approach:p(1350,429),baked:poly([[1308,244],[1342,240],[1344,228],[1365,228],[1373,243],[1396,248],[1394,299],[1310,295]]),visual:table("第三张失物桌上的棕色皮箱；站在桌南侧看提手和搭扣，不打开私人行李",395),description:"提手和双搭扣对应墙上的最后一个图案。只核对外观，不开箱。",result:"行李已核对，可以在右下登记簿确认本轮观察。"}),
   node({id:"d07-register",title:"登记簿上的核对存根",kind:"collect",position:p(1390,576),approach:p(1410,655),baked:poly([[1352,466],[1386,466],[1398,475],[1405,466],[1430,466],[1432,517],[1396,520],[1353,515]]),visual:table("右下登记台上的打开登记簿；从桌南侧填写自己的核对存根，原簿和失物留在站内",619),requires:["d07-sort-board"],sequence:["d07-umbrella","d07-mitten","d07-suitcase"],description:"墙上伞 → 手套 → 行李箱的箭头是全部顺序证据。按此顺序点击三桌实物，最后点这里确认。核对成功后在生活册抄一份存根，登记簿不拿走。",result:"已在生活册留下失物核对存根：雨具、保暖物、行李各归其位，等待主人回来。",reward:{title:"失物核对存根抄件",category:"keepsake"}}),
   node({id:"d07-travel-card",title:"旅行卡架上的雪夜卡",kind:"collect",position:p(154,565),approach:p(229,568),baked:poly([[142,536],[170,532],[173,561],[146,566]]),visual:{mount:"hanging",support:"左墙落地卡架最下排右侧旅行卡，从架右侧木地板临摹，原卡保留",depth:620*Y},description:"公共卡架留下了各地旅人的画。选一张雪夜卡临摹进自己的生活册，不取走陈列样本。",result:"收录雪夜旅行卡临摹，给归途留一点颜色。",reward:{title:"雪夜旅行卡临摹",category:"postcard"}}),
   node({id:"d07-window",title:"隔窗看雪",kind:"photo",position:p(490,221),approach:p(773,330),baked:rect(350,87,280,111),visual:{mount:"wall",support:"北墙封闭玻璃雪景窗，从长椅东侧空地斜拍，不翻窗或踩座椅",depth:240*Y},description:"玻璃挡住风雪，灯光照着雪花。把窗框和空座位一起拍下，照片里也有等待的温度。",result:"打卡：暖窗里的末班车时光。",reward:{title:"暖窗候车照片",category:"postcard"}}),
   node({id:"d07-signal",title:"站内信号示意板",kind:"inspect",position:p(1490,240),approach:p(1462,413),baked:poly([[1437,119],[1565,154],[1557,225],[1436,195]]),visual:{mount:"wall",support:"右墙固定的三灯示意板，从灯下小台左南侧看灯罩，不扳动真实铁路信号",depth:290*Y},description:"三只灯罩都装在小小的教学板上，它只用于站内展示。失物墙的箭头才是核对顺序，不能拿灯色当行车指令。",result:"分清了教学示意板与实际行车信号，记录一次站内观察。"}),
   node({id:"d07-waiting-cat",title:"候车室的小猫",kind:"pet",position:p(830,470),approach:p(845,500),animal:"cat",patrol:[p(830,470),p(965,490),p(1090,620),p(1080,704),p(830,670)],visual:{mount:"actor",support:"两活动区之间真实木地板巡游，绕开桌椅与门柱，使用共享猫图集",height:30,maxWidth:39},description:"小猫沿着长椅与整理桌之间的空地巡一圈。蹲下来等它靠近，不把它从暖屋抱到雪地。",result:"小猫蹭了蹭你的袖口，今晚的候车室多了一位朋友。"}),
  ],
 },
 achievements:[{id:"d07-careful-custodian",title:"替陌生人保管归途",description:"读图并按雨具、保暖物、行李的顺序核对，留下存根。",requires:["d07-sort-board","d07-umbrella","d07-mitten","d07-suitcase","d07-register"]},{id:"d07-warm-wait",title:"等待也有温度",description:"看站台空椅、拍暖窗、临摹旅行卡并亲近小猫。",requires:["d07-platform-bench","d07-window","d07-travel-card","d07-waiting-cat"]}],
};
export default pack;
