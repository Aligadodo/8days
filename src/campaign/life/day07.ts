import type { LifePack, LifeNode } from "./schema";
import exploration from "../exploration/day07";
import { polygon } from "../navigation";
const X=1600/1672,Y=900/941;
const p=(x:number,y:number)=>({x:x*X,y:y*Y});
const poly=(a:number[][])=>polygon(a.map(([x,y])=>[x*X,y*Y]));
const n=(v:LifeNode)=>v;
const ground=(support:string,depth:number)=>({mount:"ground" as const,support,depth:depth*Y});
const table=(support:string,depth:number)=>({mount:"table" as const,support,depth:depth*Y});
function observe(id:string,shared:string,description:string):LifeNode {
 const d=[...exploration.outside,...exploration.room.nodes].find(v=>v.id===shared)!;
 return {id:`d07-life-${id}`,title:d.title,kind:"inspect",position:d.position,approach:d.approach,baked:d.baked!,visual:d.visual,sharedDiscovery:shared,description,emptyText:description};
}
const pack:LifePack={day:7,outside:[
 n({...observe("fir-needles","d07-snow-fir","先拍下小雪松的原有雪夜风景，再按站方养护约定拣一份盆沿自然脱落的针叶纤维。树、根和积雪都留下，不折活枝；下一轮清理前等待新的落针叶。"),
   title:"站台小雪松的自然落针叶",kind:"gather",lootTable:"cloth",renewSeconds:360,
   emptyText:"这轮盆沿落针叶已经整理过，雪夜照片仍在相册里。保留活枝，等下次养护。"}),
 n({id:"d07-life-cart-crate",title:"行李车左侧周转箱",kind:"container",position:exploration.outside[1].position,approach:exploration.outside[1].approach,baked:exploration.outside[1].baked!,visual:ground("原行李车左侧棕色周转箱，从车西南侧石地打开；箱子仍留在车上",590),sharedDiscovery:"d07-luggage-cart",lootTable:"paper",description:"站方允许取用周转箱里的废包装余料。打开箱盖取一份再合上；密封旅客行李和整个箱体都留在车上。",emptyText:"这只周转箱的可取余料已领完，箱盖已经合好，旅客包裹保持原样。"}),
 n({id:"d07-life-east-crate",title:"东站房窗下周转箱",kind:"container",position:p(1586,455),approach:{x:1490,y:449},baked:poly([[1569,441],[1598,437],[1617,446],[1615,462],[1588,470],[1568,458]]),visual:ground("东站房右窗下原生低矮箱体，从箱南侧站台取站方共享包装余料，不挡木门",473),lootTable:"paper",description:"站方允许取用窗下周转箱的一份包装余料。掀盖取用后合好，箱体继续留给车站周转。",emptyText:"这份包装余料已经领取，箱盖已合好，不会再次补发。"}),
 n({id:"d07-life-west-planter",title:"站房门旁花桶养护余枝",kind:"gather",position:p(429,620),approach:{x:422,y:641},baked:poly([[410,595],[426,583],[443,599],[444,616],[433,627],[417,623]]),visual:ground("西站房木门右侧原生花桶的盆沿与枝叶，站在台阶东侧石地取养护余料",635),lootTable:"wood",renewSeconds:300,description:"站方园丁把修剪余枝留在花桶沿供旅人取用。只取已剪下的一小份，不拔植株；下一轮养护后再来。",emptyText:"这一轮剪落物已取完，等园丁下一轮养护；积雪与活枝留在原处。"}),
 n({id:"d07-life-platform-planter",title:"近站台边的养护花桶",kind:"gather",position:p(510,647),approach:{x:530,y:631},baked:poly([[489,634],[509,624],[526,633],[533,648],[514,659],[494,654]]),visual:ground("西站台近侧原生矮花桶，从东侧安全石地取盆沿养护剪落物",666),lootTable:"wood",renewSeconds:360,description:"花桶里只收取园丁留下的修剪余料，作为旅行手作材料。花盆、土和活株都保留，补充按在线养护时间计算。",emptyText:"盆沿这一份余料已取完，等下次养护补充。"}),
 n({id:"d07-life-door-lantern",title:"候车室门旁壁灯",kind:"inspect",position:p(399,552),approach:{x:385,y:627},baked:poly([[393,518],[402,516],[408,525],[407,541],[399,550],[391,540]]),visual:{mount:"wall",support:"西站房木门右侧原有小壁灯，从门前台阶看灯罩与安装座",depth:600*Y},description:"隔着玻璃看温暖灯芯，检查壁灯是否稳固；不拆灯具、不取燃料。",emptyText:"灯罩没有松动，暖光继续照着门前台阶。"}),
 n({id:"d07-life-cart-wheel",title:"行李车前轮",kind:"inspect",position:p(498,593),approach:{x:487,y:578},baked:poly([[493,583],[502,582],[507,588],[504,596],[497,600],[491,595]]),visual:ground("原行李车前侧独立小车轮，低于原包裹轮廓；站在车南侧看轮轴",601),description:"车轮的轮辋有薄雪，轮轴仍紧固。只检查，不拆走公共车辆零件。",emptyText:"轮轴与轮辋完整，车上的包裹可以继续稳当周转。"}),
 n({id:"d07-life-east-bench",title:"东站台长椅扶手",kind:"inspect",position:p(1277,455),approach:{x:1260,y:445},baked:poly([[1250,435],[1274,430],[1292,438],[1297,452],[1287,462],[1257,452]]),visual:ground("东站台楼梯右下原生长椅，从南侧站台石地看木扶手，不触碰主线失物箱",466),description:"椅脚牢牢固定在石地上，扶手上的细雪被袖口擦出一道痕。只检查，不拆取木材。",emptyText:"椅脚和扶手仍完整，给下一位等车的人留着。"}),
 ],inside:[
 n({id:"d07-life-east-planter-clippings",title:"东角花桶的养护余叶",kind:"gather",position:p(1562,648),approach:p(1484,730),
   baked:poly([[1536,626],[1557,611],[1581,624],[1590,646],[1577,668],[1544,666]]),
   visual:ground("登记桌右下方独立落地花桶的下部枝叶与盆沿，站在西南木地板取园丁整理出的余叶，不覆盖登记台",754),
   lootTable:"cloth",renewSeconds:360,description:"园丁在东角花桶沿留下少量养护余叶，允许旅人取一份做纤维手作。花桶和完整活株留在原位，等待下一轮养护，不为取叶攀上登记桌。",
   emptyText:"本轮养护余叶已领过，东角活株与花桶保留，等下一轮整理。"}),
 n({id:"d07-life-tea-cabinet",title:"茶柜下层共享补给柜",kind:"container",position:p(174,350),approach:p(228,405),baked:poly([[133,307],[194,294],[200,347],[147,364]]),visual:ground("左上茶柜左下真实柜门，从茶柜南侧地板开柜取一份站方补给",375),lootTable:"pantry",description:"站方在左下柜留了一份给候车旅人的共享补给。打开柜门取用后关好，不带走柜里的杯壶。",emptyText:"这一份候车补给已领过，柜门已合上；杯壶继续留给大家。"}),
 n({id:"d07-life-register-drawer",title:"登记台共享纸料抽屉",kind:"container",position:p(1437,596),approach:p(1430,655),baked:poly([[1348,566],[1441,566],[1441,592],[1348,592]]),visual:ground("右下登记台中部可见抽屉面板，从桌南侧拉开，不命中桌上的登记簿",619),afterArt:{src:"/assets/life-015/day07/register-drawer-open-v1.png",crop:{x:1338,y:562,width:112,height:59},width:112*X,height:59*Y,offset:{x:-43*X,y:25*Y}},lootTable:"paper",description:"抽屉中有站方允许取用的一份废纸边料。拉开取用后留出一条开口，让空抽屉提示这份纸料已领取；桌上登记簿与印章不动。",emptyText:"共享纸料已领取，空抽屉保持拉开；登记簿仍可照常核对。"}),
 n({id:"d07-life-tea-tin",title:"茶柜中层共享茶罐",kind:"gather",position:p(191,227),approach:p(303,384),baked:poly([[176,199],[187,192],[197,199],[197,216],[184,222],[175,216]]),visual:table("茶柜中层中央金褐小罐，站在柜东南侧取一份轮次补给，保留罐体",375),lootTable:"tea",renewSeconds:300,description:"站方会定时补充共享茶叶罐，每轮可冲一份温茶。打开小盖取茶后合上；茶罐和茶具不拿走。",emptyText:"本轮温茶补给已领过，等下一轮站内补给。"}),
 n({id:"d07-life-south-pot",title:"候车区花桶剪落物",kind:"gather",position:p(116,700),approach:p(196,702),baked:poly([[86,652],[111,639],[143,650],[146,680],[126,701],[88,689]]),visual:ground("左下木花桶实际盆沿，从东侧木地板取园丁保留的剪落物",738),lootTable:"wood",renewSeconds:360,description:"园丁允许取一份盆沿的剪落物做手作；不采活叶、不掘土，也不移动花桶。",emptyText:"这轮盆沿余料已取完，等下一次养护补充。"}),
 observe("suitcase","d07-suitcase","皮箱是私人失物，只看提手、搭扣和封口，不开箱、不取物；仍参与原来的失物核对。"),
 n({id:"d07-life-tea-cabinet-right",title:"茶柜右下公用餐具柜",kind:"inspect",position:p(243,326),approach:p(303,384),baked:poly([[204,292],[264,281],[274,332],[211,346]]),visual:ground("左上茶柜右下独立柜门，公用餐具留在柜内，从东南侧查看",375),description:"右下柜存放公用餐具。打开柜门检查餐具和合页，确认清洁后关好；不带走杯壶或拆取柜板。",emptyText:"打开检查后已关好，公用餐具仍留在柜里。"}),
 n({id:"d07-life-stamp",title:"登记台上的铜印章",kind:"inspect",position:p(1480,550),approach:p(1480,655),baked:poly([[1474,479],[1486,478],[1493,487],[1488,503],[1494,515],[1491,532],[1465,531],[1463,517],[1476,508]]),visual:table("登记台右侧原生铜印章，站在桌东南侧地板看柄和底座，不碰登记簿热点",619),description:"铜柄被许多手掌磨得发亮。这是站内公物，只观察，不拆取金属或拿走印章。",emptyText:"印章安稳立在桌边，留给下一个核对记录的人。"}),
 ]};
export default pack;
