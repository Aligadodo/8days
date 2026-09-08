import type { LifeNode, LifePack } from "./schema";
import exploration from "../exploration/day04";
import { polygon } from "../navigation";

// Native painting coordinates (1672×941); all approach pairs are world coordinates.
const X=1600/1672, Y=900/941;
const node=(id:string,title:string,kind:LifeNode["kind"],outline:number[][],approach:number[],depth:number,
  support:string,description:string,lootTable?:LifeNode["lootTable"],mount:"table"|"ground"="ground"):LifeNode=>({
  id:`d04-life-${id}`,title,kind,
  position:{x:outline.reduce((sum,a)=>sum+a[0],0)/outline.length*X,y:depth*Y},
  approach:{x:approach[0],y:approach[1]},baked:polygon(outline.map(([x,y])=>[x*X,y*Y])),
  visual:{mount,depth:depth*Y,support},description,
  emptyText:kind==='inspect'?description:kind==='container'?"共享罐的这一份余料已取过，空罐留在原处，不重复领取。":"本轮可取的少量余料已收好，保留植物和公共用品，等下一轮整理后再来。",
  ...(lootTable?{lootTable}:{}),...(kind==='gather'?{renewSeconds:300}:{}),
});
const shared=(id:string,title:string,kind:LifeNode["kind"],discoveryId:string,description:string,lootTable?:LifeNode["lootTable"]):LifeNode=>{
  const original=[...exploration.outside,...exploration.room.nodes].find(n=>n.id===discoveryId)!;
  return {id:`d04-life-${id}`,title,kind,position:original.position,approach:original.approach,baked:original.baked!,visual:original.visual,
    sharedDiscovery:original.id,description,emptyText:kind==='inspect'?description:kind==='container'?"迎客茶已经领过一份，壶盖已盖回，余下温暖留给后来者。":"本轮维修边角料已整理过；主线与记录器借用工具仍可照常使用。",
    ...(lootTable?{lootTable}:{}),...(kind==='gather'?{renewSeconds:300}:{}),};
};

const pack:LifePack={day:4,
  outside:[
    node("lower-fronds","下游石阶旁的落叶","gather",[[455,785],[469,770],[490,775],[501,795],[484,807],[463,802]],
      [460,780],807,"下游斜石阶北侧低矮植物簇，只从阶面取自然落下的枯叶。",
      "收起叶丛间自然掉落的少量干叶纤维，不拔活根，也不走下石阶；水雾带来下一轮落叶需要时间。","cloth"),
    node("bridge-fronds","吊桥岸侧的落叶","gather",[[410,503],[425,491],[441,502],[440,521],[426,532],[410,521]],
      [431,486],532,"西岸吊桥北端旁原生低矮叶丛，从桥面收边缘落叶，不攀护栏。",
      "只取够得着的自然落叶纤维，保留活枝与岸边覆土。等新的落叶积下来再收下一份。","cloth"),
    node("step-seam","下游石阶接缝","inspect",[[532,711],[545,702],[557,709],[552,723],[537,728]],
      [525,699],728,"下游阶梯转角的独立石块接缝，从阶面观察，不与虹台湿苔发现重叠。",
      "小块碎屑积在石阶接缝，说明这里常有水流过。反复确认落脚处，不撬动阶石。"),
    node("bridge-post","西岸吊桥的木栏柱","inspect",[[493,544],[503,540],[510,549],[511,576],[499,581],[493,572]],
      [484,532],581,"西岸吊桥中段外侧独立木栏柱，从桥中央看木材接头。",
      "柱脚的绑扎还贴着横梁。可以反复检查木纹，不拆走承重木料，不攀栏杆。"),
    node("lower-rail","下游护岸石缘","inspect",[[363,818],[384,807],[402,805],[409,816],[388,830],[371,835]],
      [390,814],835,"下游石阶内缘凸起的护岸石，脚留在斜石阶上。",
      "石缘磨得发亮，裂缝里有潮气。反复观察可以记住安全边界，不撬走承担护岸作用的石块。"),
    node("east-bridge","东岸木桥端板","inspect",[[1217,713],[1238,700],[1255,708],[1240,726],[1228,731]],
      [1222,698],731,"东岸木桥接石阶处可见端板，站在原桥落点检查木纹。",
      "木板还紧贴着桥端，钉帽没有翘起。看看即可，不把正在承重的木材拆成回收物。"),
  ],
  inside:[
    node("parts-tin","检修台的敞口小罐","container",[[1126,297],[1137,290],[1146,296],[1149,319],[1135,327],[1124,318]],
      [1085,396],372,"工具台右缘独立黄铜小罐，原画可见敞口，从检修台前蓝砖地面查看罐内。",
      "查看本来就敞口的公用小罐，取一份水务员留下的密封纤维边角料，空罐原位保留。绳圈与扳手仍按原来的检修步骤借用。","cloth","table"),
    shared("cord-offcuts","工具台维修边角料","gather","d04-cord",
      "先登记原来的绳与扳手借用，再整理工具台允许带走的一小份盘根绳纤维边角料；不给记录器拆零件，工具不消耗。","cloth"),
    node("window-cuttings","窗台花盆的修剪余枝","gather",[[116,453],[146,449],[172,470],[163,493],[139,509],[115,492]],
      [238,492],535,"左侧窗台原生花盆，从窗台右侧地面只取盆沿修剪余枝。",
      "照料者留了一小份芳香草修剪余枝给旅人。只取已经剪下的部分，不摘活花，下一轮整理后才能再领。","herbs","table"),
    shared("kettle-share","公共水壶的迎客茶","container","d04-kettle",
      "按观测所的待客规矩揭盖确认余温，倒取本次访问的一份温茶，再把盖子盖好。公用水壶原地保留，不取其他物资。","tea"),
    node("cat-bowl","窗凳旁的小猫水碗","inspect",[[208,642],[227,631],[244,638],[253,653],[244,672],[222,678],[207,665]],
      [268,645],678,"窗边长凳东侧地面的真实水碗，从水碗东侧石砖查看。",
      "碗里有一圈清亮的水。可以反复确认水面没有落灰，不取走猫的水碗或饮水。"),
    node("reading-stool","阅读桌前的小木凳","inspect",[[381,515],[408,504],[436,510],[443,532],[425,548],[384,542]],
      [432,560],574,"阅读桌南侧独立木凳座面，站在凳东南外侧检查榫接。",
      "木凳承着许多读书人的重量。看看凳面与榫脚，确认仍稳当，不把公用家具拆走。"),
    node("partition-pot","隔墙边的盆栽","inspect",[[739,296],[760,281],[783,290],[798,313],[791,349],[769,365],[747,351]],
      [715,391],365,"标本桌东侧、石隔墙西侧的原生盆栽，从前方暖色地砖观察。",
      "盆沿接住了窗边飘来的细水雾。检查叶面与盆底，不挪走挡在墙边的盆栽。"),
  ],
};
export default pack;
