import type { LifeNode, LifePack } from './schema';
import exploration from '../exploration/day06';
import { polygon } from '../navigation';
const X=1600/1672,Y=900/941;
const p=(x:number,y:number)=>({x:x*X,y:y*Y});
const poly=(a:number[][])=>polygon(a.map(([x,y])=>[x*X,y*Y]));
const shared=(id:string,life:Pick<LifeNode,'id'|'title'|'kind'|'description'|'emptyText'> & Partial<Pick<LifeNode,'lootTable'|'renewSeconds'>>):LifeNode=>{
  const n=[...exploration.outside,...exploration.room.nodes].find(n=>n.id===id)!;
  return {...life,position:{...n.position},approach:{...n.approach},baked:n.baked!,visual:{...n.visual,depth:n.visual.depth??n.position.y},sharedDiscovery:id};
};
const pack:LifePack={day:6,outside:[
  shared('d06-rain-petals',{id:'d06-life-rain-petal-fiber',title:'桥头花簇下的雨落叶',kind:'gather',lootTable:'cloth',renewSeconds:360,
    description:'先记下原来被雨压低的白花，再从岸侧花簇脚边拣起自然落下的少量花叶纤维。脚留在桥头实地，不折花、不解桥索，等新的雨落叶慢慢积下。',
    emptyText:'这轮雨落花叶已收好。白花仍在岸边，原来的雨中发现保留；不要为了收集走下护岸。'}),
  shared('d06-worn-pack',{id:'d06-life-worn-pack',title:'旧登山包里的备用布料',kind:'container',lootTable:'cloth',description:'营地主人将旧包外袋中的备用布料赠给避雨旅人。解开外袋扣带，取一份，再把袋口扣回去；保留原来观察补线的发现。',emptyText:'这一份备用布料已取走，外袋已扣回，包和其余装备仍放在木凳上。'}),
  {id:'d06-life-bridge-knot',title:'吊桥东端的缆绳结',kind:'inspect',position:p(1306,580),approach:{x:1265,y:526},
    baked:poly([[1293,564],[1309,560],[1318,566],[1315,589],[1303,595],[1294,584]]),
    visual:{mount:'hanging',depth:609*Y,support:'吊桥东端靠岸木柱上缠绕的真实绳结，从桥头台阶看，不跨护栏或松绳'},
    description:'反复检查靠岸缆绳结的缠绕方向，保持绳结原状，不把桥索当作可回收纤维。',emptyText:'绳结仍绕在木柱上，桥索保持原状。'},
  {id:'d06-life-bench-joint',title:'营地空凳面的接缝',kind:'inspect',position:p(1361,908),approach:{x:1283,y:853},
    baked:poly([[1333,901],[1350,891],[1375,904],[1375,913],[1360,922],[1335,914]]),
    visual:{mount:'table',depth:935*Y,support:'绿色背包左侧露出的原生木凳面，从凳西侧营地地面观察，轮廓与背包分开'},
    description:'看看空凳面的木板接缝是否积水，留出下一位旅人放东西的位置。',emptyText:'接缝里还有雨水，木凳继续留在原地。'},
  {id:'d06-life-camp-seeds',title:'营地花簇旁的芳香草',kind:'gather',position:p(1170,855),approach:{x:1155,y:828},
    baked:poly([[1155,838],[1176,836],[1185,849],[1182,872],[1165,878],[1150,864]]),
    visual:{mount:'ground',layer:'ground',depth:878*Y,support:'营地篝火西侧白花簇底部泥地，从营地西缘平地拾取，不靠近火心'},
    description:'从花簇旁的草丛采一小份芳香草，保留根部与完整白花。至少在线五分钟后再来。',emptyText:'这处芳香草已采过，留根休养，稍后再来。',lootTable:'herbs',renewSeconds:300},
  {id:'d06-life-path-stones',title:'西坡石径内侧碎石',kind:'gather',position:p(511,645),approach:{x:475,y:649},
    baked:poly([[496,633],[506,624],[518,629],[526,642],[516,651],[502,651]]),
    visual:{mount:'ground',layer:'ground',depth:651*Y,support:'西坡缓路转弯内侧原生散石，从宽石径拾松散小石，不进入北侧滑坡面'},
    description:'拾取路边已经松散的小石样本，不撬台阶或挡土石。下一批至少等在线五分钟。',emptyText:'松散石样已收好，完整路基保留。',lootTable:'stone',renewSeconds:300},
  {id:'d06-life-tent-seam',title:'橙帐篷的外侧缝线',kind:'inspect',position:p(1485,735),approach:{x:1405,y:744},
    baked:poly([[1475,644],[1483,647],[1501,704],[1496,744],[1481,740],[1486,697]]),
    visual:{mount:'ground',depth:751*Y,support:'上方橙色帐篷前侧帐布接缝，站在帐篷南侧营地地面看，不进入帐篷或翻包'},
    description:'观察帐布接缝上的水珠。帐篷是他人的休息空间，只看外侧，不搜取内部物品。',emptyText:'水珠沿接缝往下滑，帐内保持安静。'},
],inside:[
  shared('d06-drip-tray',{id:'d06-life-recovery-tray',title:'沥水盘边的备用擦靴布',kind:'container',lootTable:'cloth',description:'山舍主人允许从已经敞开的浅盘边取一份备用擦靴布。取出布料后把靴子和盘留好，不拆靴带或翻鞋内。',emptyText:'浅盘边的备用擦靴布已取完，靴与盘仍在原位。'}),
  shared('d06-dry-towels',{id:'d06-life-light-cloth',title:'浅色折巾旁的共享布料份额',kind:'gather',lootTable:'cloth',renewSeconds:600,description:'主人把整理这叠浅色布巾时留下的可用布料边角分给旅人。领取一份，完整折巾留下；下一份至少等在线十分钟由主人补充。',emptyText:'这处共享布料已领过，主人还未补充；完整干巾留给避雨者。'}),
  {id:'d06-life-blue-cloth',title:'蓝色折布的共享布料份额',kind:'gather',position:p(701,322),approach:p(689,448),
    baked:poly([[676,269],[726,270],[735,282],[727,315],[712,323],[665,313],[665,288]]),
    visual:{mount:'table',depth:400*Y,support:'炉旁木凳左侧独立蓝色折布，从凳前地板领取主人整理出的回收份额，不踩防火石台'},
    description:'主人允许领取蓝布整理时留下的另一份布料边角，布堆本身不搬走。这份共享补给至少在线十分钟后补充。',emptyText:'蓝布处的这一份已收好，请等主人补充，不反复拆取完整布巾。',lootTable:'cloth',renewSeconds:600},
  {id:'d06-life-stove-poker',title:'炉侧直立火钳',kind:'inspect',position:p(619,371),approach:p(671,446),
    baked:poly([[613,252],[620,249],[627,271],[626,349],[619,371],[612,366],[616,337]]),
    visual:{mount:'ground',depth:390*Y,support:'炉体右侧真实直立火钳，从炉台与折巾凳南侧的木地板观察，不伸进火中'},
    description:'看看火钳摆放的位置与长柄，不触碰热端。它是照看炉火的共用工具，观察后原位保留。',emptyText:'火钳仍立在炉旁，长柄远离通行脚步。'},
  {id:'d06-life-stove',title:'封闭炉门与防火台',kind:'inspect',position:p(519,380),approach:p(540,489),
    baked:poly([[474,273],[547,272],[552,333],[536,350],[472,344]]),
    visual:{mount:'ground',depth:445*Y,support:'烘干区封闭炉体前面的小炉门，从防火台南侧木地板观察，不上石台或伸手开炉'},
    description:'隔着炉门玻璃看火，检查炉台周边没有搭着湿衣。燃着的炉膛不是可搜刮的容器。',emptyText:'炉门保持关闭；不取燃料，不把热炉灰放进背包。'},
  {id:'d06-life-door-latch',title:'原门内侧铁扣',kind:'inspect',position:p(228,645),approach:p(332,706),
    baked:poly([[219,613],[233,611],[243,624],[240,649],[231,651],[221,639]]),
    visual:{mount:'door',depth:705*Y,support:'左下敞开木门门板内侧真实铁扣，从门右侧木地板观察，轮廓不占左侧返回门洞'},
    description:'看看旧铁扣的磨痕，保留门的开态，方便后来的人和自己原路返回。',emptyText:'铁扣留在原位，返回通道一直畅通。'},
]};
export default pack;
