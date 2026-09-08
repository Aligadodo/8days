import type { LifeNode, LifePack } from "./schema";
import exploration from "../exploration/day08";
import { polygon } from "../navigation";

// Inspected original paintings: 1672 × 941, scaled to the 1600 × 900 world.
const p=(x:number,y:number)=>({x:x*1600/1672,y:y*900/941});
const shape=(a:number[][])=>polygon(a.map(([x,y])=>[p(x,y).x,p(x,y).y]));
const shared=(id:string,kind:LifeNode["kind"],title:string,description:string,emptyText:string,lootTable?:LifeNode["lootTable"]):LifeNode=>{
  const n=[...exploration.outside,...exploration.room.nodes].find(n=>n.id===id)!;
  return {id:`d08-life-${id.slice(4)}`,kind,title,position:n.position,approach:n.approach,baked:n.baked!,visual:n.visual,sharedDiscovery:id,description,emptyText,...(lootTable?{lootTable}:{}),...(kind==='gather'?{renewSeconds:300}:{})};
};
const pack:LifePack={
  day:8,
  outside:[
    {id:"d08-life-west-cart",title:"西岸矿车的共享余料",kind:"container",position:p(189,423),approach:{x:259,y:391},baked:shape([[135,375],[149,355],[181,346],[221,350],[244,371],[231,407],[204,433],[155,420]]),visual:{mount:"ground",support:"西岸弯轨上原有敞口矿车车斗，从右侧轨道路面检查，不进入车斗",depth:p(0,435).y},description:"矿工把这辆停用车里的少量碎料留作访客共享分样。翻查敞口车斗边的一份余料，大块晶体与矿车留在原位。",emptyText:"分给访客的这一份余料已经领过。车斗仍装着不外借的大晶体，可以再看看车轮与木板接缝。",lootTable:"mineral"},
    {id:"d08-life-lower-cart",title:"下方矿车的回收分样",kind:"container",position:p(505,786),approach:{x:513,y:801},baked:shape([[453,735],[477,724],[524,735],[552,751],[548,779],[521,797],[473,789],[453,774]]),visual:{mount:"ground",support:"西岸下方轨道原有小矿车，车斗压在轮架上，从右下轨道石地翻查",depth:p(0,800).y},description:"这辆敞口小车收着已筛过的公共矿样，访客可领一份余料。只整理边沿松散分样，不搬运车中整块晶石。",emptyText:"本车的访客分样已领完，留下的晶石用于展示。车轮仍稳稳停在轨道上。",lootTable:"mineral"},
    {id:"d08-life-platform-chips",title:"岩台边的松散晶屑",kind:"gather",position:p(404,486),approach:{x:375,y:505},baked:shape([[390,472],[405,467],[422,475],[423,486],[410,494],[393,491]]),visual:{mount:"ground",support:"西岸宽观水岩台北缘大蓝晶右脚的小晶屑，脚留在岩台内侧",layer:"ground",depth:p(0,495).y},description:"晶簇脚边有几粒已经脱落的细小晶屑。只拾取松散部分，不敲击母晶；过一阵再查看缝隙里是否露出新的碎屑。",emptyText:"眼下没有更多松散晶屑，留下牢固的晶体。稍后再来查看。",lootTable:"mineral",renewSeconds:360},
    {id:"d08-life-track-chips",title:"下行轨旁的紫晶碎粒",kind:"gather",position:p(418,710),approach:{x:400,y:752},baked:shape([[401,701],[416,693],[432,704],[432,716],[419,724],[403,718]]),visual:{mount:"ground",support:"下方矿车左边轨道岩台上的小紫晶簇，站在南侧石路拾取簇脚松散碎粒",layer:"ground",depth:p(0,725).y},description:"轨道边的小紫晶簇脚下有松散细粒，可拾取一点作矿物观察材料。牢固晶体保留，过一阵再检查石缝中露出的碎粒。",emptyText:"这一小片松散碎粒已整理过，小晶簇仍留在岩台上。等一阵再检查。",lootTable:"mineral",renewSeconds:420},
    {id:"d08-life-mine-lantern",title:"矿门旁的提灯挂架",kind:"inspect",position:p(569,148),approach:{x:564,y:195},baked:shape([[557,110],[571,106],[582,115],[580,143],[565,151],[552,140]]),visual:{mount:"hanging",support:"原图矿门右侧真实暖灯与短挂架，站在门外石台检查，避开共鸣水晶热区",depth:p(0,167).y},description:"检查矿门旁灯罩和挂钩是否牢靠，不熄灭指路灯，也不拆下灯具。",emptyText:"灯罩和挂钩保持完整，暖光继续照着入口。"},
    {id:"d08-life-track-sleeper",title:"西侧直轨的木枕接缝",kind:"inspect",position:p(141,564),approach:{x:131,y:563},baked:shape([[103,551],[156,550],[170,560],[163,570],[109,567]]),visual:{mount:"ground",support:"西侧轨道下行直段真实横向木枕，与上方弯轨磨痕是不同部件",layer:"ground",depth:p(0,571).y},description:"检查这一根木枕两端是否仍贴住石床。它承担轨道支撑，不拆成可售木料。",emptyText:"木枕两端依旧稳固，接缝没有新的松动。"},
  ],
  inside:[
    {id:"d08-life-upper-crate",title:"箱堆上层的共享工具余料",kind:"container",position:p(145,634),approach:p(225,531),baked:shape([[79,548],[155,520],[184,556],[196,606],[174,632],[108,648],[91,603]]),visual:{mount:"ground",support:"室内左下箱堆上层大木箱，由下层箱稳固支撑；从右上石地掀盖检查，开盖后保持在同一箱体上",depth:p(0,648).y},description:"上层木箱是实验站供访客领取的维修余料。掀开箱盖，取走一份可回收材料，箱盖支在后侧，剩余站内材料清楚可见。",emptyText:"箱盖已经打开，访客余料已领过，剩下的是实验站留用的材料。",lootTable:"salvage",afterArt:{src:"/assets/life-015/day08/upper-crate-open.png",crop:{x:55,y:475,width:155,height:180},width:p(155,0).x,height:p(0,180).y,offset:p(-12.5,21)}},
    {id:"d08-life-right-crate",title:"箱堆右侧的公共补给",kind:"container",position:p(248,685),approach:p(309,662),baked:shape([[196,641],[231,624],[262,631],[280,672],[248,697],[207,687]]),visual:{mount:"ground",support:"箱堆右下独立木箱，立在连续石地上；从右侧掀盖检查后合回",depth:p(0,699).y},description:"右边木箱存放实验站为来访者准备的一份补给。轻轻掀盖领取，再盖好，不翻动左边的封存箱。",emptyText:"本次访客补给已领完。合好箱盖，保持里面的干燥。",lootTable:"pantry"},
    {id:"d08-life-small-box",title:"右侧小木盒的备用零件",kind:"container",position:p(238,631),approach:p(298,601),baked:shape([[216,583],[237,574],[253,584],[259,620],[240,637],[220,626]]),visual:{mount:"table",support:"右侧补给箱上叠着的独立小木盒，盒底靠箱面支撑；从右侧石地开合",depth:p(0,638).y},description:"小木盒里是矿工赠给访客的一份备用零件。揭开小盖，取一份，再放回盖子；不把盒子整个带走。",emptyText:"这只小盒的赠予零件已经领过。盒盖合好，余下零件留作站内维修。",lootTable:"salvage"},
    {id:"d08-life-lower-sealed-crate",title:"下层封存木箱",kind:"inspect",position:p(153,701),approach:p(305,711),baked:shape([[105,649],[191,627],[200,680],[165,714],[117,702]]),visual:{mount:"ground",support:"左下箱堆最底层承重木箱，箱盖压在上层箱下；从右前石地观察箱板",depth:p(0,716).y},description:"底层木箱承着上面的工具箱，属于实验站封存物资。查看箱板有无受潮即可，不抽箱、不搬走主人财物。",emptyText:"木板与承重位置没有变化，封存箱继续留在原位。"},
    {id:"d08-life-left-tin",title:"桌下左罐的共享杂料",kind:"container",position:p(265,423),approach:p(279,498),baked:shape([[239,399],[264,392],[282,403],[281,422],[249,431],[239,420]]),visual:{mount:"table",support:"左工作台下层搁板左端独立圆罐，站在桌前开启罐盖后盖好",depth:p(0,441).y},description:"桌下左圆罐装着允许回收的少量杂料。旋开罐盖取一份，取完拧回，桌上的原观察手册不受影响。",emptyText:"左罐里可回收的这一份已经领过，盖子重新拧紧。",lootTable:"salvage"},
    {id:"d08-life-right-tin",title:"桌下右罐的公共矿样",kind:"container",position:p(323,412),approach:p(341,489),baked:shape([[301,393],[325,385],[341,393],[344,411],[313,420],[302,411]]),visual:{mount:"table",support:"左工作台下层搁板中间独立圆罐，与左罐分开命中，从桌前取样后盖好",depth:p(0,431).y},description:"右圆罐存放实验站的公共散矿样，每位访客可领取一份。开盖分取，随后盖回防潮。",emptyText:"右罐本次分样已经领取，余样留给实验站使用。",lootTable:"mineral"},
    {id:"d08-life-shelf-case",title:"桌下回收草稿纸盒",kind:"container",position:p(424,400),approach:p(430,486),baked:shape([[393,383],[443,377],[469,382],[470,400],[403,409],[393,402]]),visual:{mount:"table",support:"工作台下层右侧真实扁平灰盒，放在木搁板上；从桌前抽开盒盖分取后盖回",depth:p(0,420).y},description:"扁平盒存放实验站允许访客回收的一份废草稿纸。抽开盖子取一份后盖回，桌上正式手册保持原位。",emptyText:"盒内这一份回收草稿纸已经领过，盒盖重新放好。",lootTable:"paper"},
    {id:"d08-life-copper-can",title:"原位检查铜浇水壶",kind:"inspect",position:p(590,219),approach:p(589,348),baked:shape([[548,176],[570,169],[577,153],[604,149],[623,162],[633,191],[616,217],[575,220],[562,192]]),visual:{mount:"table",support:"后方小木台上的铜壶，脚留桌前石地，查看壶嘴与把手不拿走",depth:p(0,310).y},description:"铜壶是实验站反复使用的公用器具。检查壶嘴是否畅通，随后原位放好；既有铺布维护仍按手册进行。",emptyText:"铜壶继续留在木台上，壶嘴与把手都完整。"},
    shared("d08-quartz-copy","gather","标本盘的少量补充分样","保留整盘原标本，领取一份实验站定期整理到盘边的细小分样；首次观察仍会记录原来的石英收藏。","盘边本轮补充分样已领过，母标本留着继续观察。稍后再检查是否补齐。","mineral"),
    shared("d08-wick-cloth","gather","蓝布料的公共边角料","布叠里有供访客领取的少量裁剪边角料。领取一份，保留整叠布与原来的导水材料登记。","这一轮布边角已取过，整叠公用布仍在桌上，稍后再领取补充份。","cloth"),
    {id:"d08-life-table-joint",title:"布料台前脚的榫接",kind:"inspect",position:p(573,306),approach:p(601,350),baked:shape([[565,262],[581,265],[583,297],[576,314],[565,306]]),visual:{mount:"ground",support:"铜壶布料小台左前木腿真实榫接和着地脚，独立于桌上布料与铜壶",depth:p(0,315).y},description:"检查小木台前脚的榫接是否贴合。桌脚支撑着公用铜壶和布料，只观察、不拆走。",emptyText:"桌脚稳稳落在石地上，榫接仍然贴合。"},
  ],
};
export default pack;



