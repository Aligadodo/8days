import type { LifePack, LifeNode } from "./schema";
import { polygon } from "../navigation";
// Native 1672x941 image coordinates; never infer approaches with nav.nearest.
const p=(x:number,y:number)=>({x:x*1600/1672,y:y*900/941});
const n=(id:string,title:string,kind:LifeNode["kind"],shape:number[][],at:number[],stand:number[],depth:number,description:string,emptyText:string,lootTable?:LifeNode["lootTable"],sharedDiscovery?:string):LifeNode=>({id:`d01-life-${id}`,title,kind,position:p(at[0],at[1]),approach:p(stand[0],stand[1]),baked:polygon(shape.map(([x,y])=>[p(x,y).x,p(x,y).y])),visual:{mount:"ground",support:"待下方逐物支撑标定覆盖",depth:p(0,depth).y},description,emptyText,...(lootTable?{lootTable}:{}),...(kind==="gather"?{renewSeconds:300}:{}),...(sharedDiscovery?{sharedDiscovery}:{})});
const pack:LifePack={day:1,outside:[
 n("bus-recycling","公交亭旁的回收桶","container",[[464,550],[480,545],[492,553],[489,591],[467,591]],[477,570],[520,616],594,"公交亭东侧真实蓝桶；街道回收计划允许取用清洁可回收材料，从桶前站台分拣一份，桶留原处。","这桶可用材料已分拣，留给清运人员的部分不再翻动。","salvage"),
 n("station-recycling","地铁口的回收箱","container",[[996,837],[1018,824],[1034,839],[1032,883],[998,888]],[1014,861],[993,912],891,"地铁入口左侧真实棕色回收箱，街区允许领取的回收材料只取一份；从南侧路面打开投放口检查后合上。","这次可领取的回收材料已取完，箱门已合好。","salvage"),
 n("apartment-leaves","公寓花坛的落叶","gather",[[191,298],[211,289],[237,296],[243,316],[218,326],[194,316]],[218,309],[229,367],330,"公寓门左低花坛内伸向外缘的街树叶簇；仅整理自然脱落的叶片，不拔植株。","这一处刚整理过，稍后再看自然落下的叶片。","herbs"),
 n("cafe-herbs","咖啡店门边的薄荷盆","gather",[[706,274],[721,266],[735,279],[731,304],[712,310],[703,294]],[719,287],[751,353],313,"咖啡店左侧真实白色盆栽；店员允许从外缘摘少量修剪叶，共享给来客，植株留盆。","这一轮修剪叶已领过，让盆栽歇一会儿。","herbs"),
 n("bus-bench","公交亭长椅的雨痕","inspect",[[205,535],[320,538],[336,552],[328,587],[206,582]],[268,563],[289,639],590,"真实候车长椅，从前方站台观察木条上的雨痕，不跨进亭后。","木条一半湿一半干，可以继续观察雨势。"),
 n("letterbox","公寓门前的信箱","inspect",[[420,264],[442,266],[444,308],[422,310]],[433,286],[450,388],313,"公寓台阶右侧真实小信箱；只检查外壳与防雨盖，不打开居民信件。","防雨盖仍合着，私人的信件留给收件人。"),
],inside:[
 n("repair-crate","修补台下的赠料箱","container",[[1100,280],[1152,279],[1155,319],[1101,320]],[1128,300],[1138,375],340,"修补台下真实棕箱；店主赠送的零碎修补材料，打开搭扣取一份后合回，工具与整箱留下。","赠料份额已领取，搭扣重新扣好。","salvage"),
 n("repair-drawers","修补台右抽屉柜","container",[[1178,282],[1261,279],[1262,331],[1178,333]],[1218,307],[1224,375],342,"蓝伞下方真实双抽屉，店主指定下抽屉为公共备用料；拉开下抽屉领取一份，不拿维修中的物品；空抽屉留开，方便确认已经领取。","下抽屉已取空并留开，不能再领一份。","salvage"),
 n("fruit-share","商品岛外侧共享果筐","gather",[[300,450],[351,449],[357,495],[303,500]],[328,477],[264,491],550,"中央商品岛西侧真实橙色水果筐；店主定时补充的共享试吃份，只领一份不搬走果筐。","这一轮共享份已领过，等店主下一次补充。","fruit"),
 n("tea-refill","阅读角的热饮补给","gather",[[1264,498],[1294,498],[1299,520],[1264,525]],[1281,515],[1214,543],583,"阅读角小圆桌上真实茶杯；店主提供定时补充的饮用补给，杯与桌仍留原处。","本轮补给已领过，等下一次添饮。","tea"),
 n("cold-left","左侧玻璃冷柜","inspect",[[194,189],[263,190],[262,310],[194,309]],[229,248],[226,353],330,"后墙左扇玻璃冷柜，店员允许拉开门检查密封条后合好；商品属于店家，不取商品。","门缝没有漏水，商品仍按原样陈列。"),
 n("cold-right","右侧玻璃冷柜","inspect",[[269,190],[337,190],[337,311],[269,311]],[303,249],[280,355],330,"后墙右扇玻璃冷柜，店员允许从柜前拉开门检查除雾状况再关好，不打开商品包装。","玻璃上的水雾慢慢散去，没有物资可领取。"),
 n("bookshelf","阅读角借阅书柜","inspect",[[1474,298],[1578,322],[1578,450],[1473,421]],[1519,375],[1500,522],480,"右墙真实书柜，只翻看书脊目录，书籍属于店内借阅，不能出售或拿走。","目录仍在，书等着下一位读者。"),
]};
const supports: Record<string, Pick<LifeNode["visual"], "mount" | "support">> = {
  "d01-life-repair-crate": { mount: "ground", support: "修补工作台下方棕色箱体，脚落在台前地砖。" },
  "d01-life-repair-drawers": { mount: "ground", support: "修补工作台右下双层矮抽屉柜，柜脚贴地。" },
  "d01-life-fruit-share": { mount: "table", support: "商品岛西侧下层果筐，筐底放在货架搁板。" },
  "d01-life-tea-refill": { mount: "table", support: "阅读角小圆桌上白茶杯，杯底由桌面支撑。" },
  "d01-life-cold-left": { mount: "ground", support: "后墙左扇落地玻璃冷柜。" },
  "d01-life-cold-right": { mount: "ground", support: "后墙右扇落地玻璃冷柜。" },
  "d01-life-bookshelf": { mount: "ground", support: "右墙木书柜，四脚立于地砖。" },
  "d01-life-bus-recycling": { mount: "ground", support: "公交站东侧落地蓝色回收桶。" },
  "d01-life-station-recycling": { mount: "ground", support: "地铁口西南侧落地棕色回收箱。" },
  "d01-life-apartment-leaves": { mount: "ground", support: "公寓门左侧低花坛外沿叶簇。" },
  "d01-life-cafe-herbs": { mount: "ground", support: "咖啡店左侧白色落地盆栽。" },
  "d01-life-bus-bench": { mount: "ground", support: "公交亭木长椅，脚立于站台砖面。" },
  "d01-life-letterbox": { mount: "wall", support: "公寓台阶右侧立柱上的小信箱。" },
};
for(const node of [...pack.outside,...pack.inside]) if(supports[node.id]) node.visual={...node.visual,...supports[node.id]};
const openDrawer=pack.inside.find(node=>node.id==="d01-life-repair-drawers")!;
openDrawer.afterArt={src:"/assets/life-015/day01/drawer-open.png",crop:{x:1170,y:297,width:102,height:66},width:p(102,0).x,height:p(0,66).y,offset:p(3,56)};
openDrawer.visual.depth=p(0,361).y;
export default pack;
