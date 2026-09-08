import type { ExplorationPack, DiscoveryNode } from './schema';
import { world, area, obstacle } from '../worldSchema';
import { polygon } from '../navigation';

// Both source paintings are 1672×941; all authored pixels are registered explicitly.
const X=1600/1672, Y=900/941;
const p=(x:number,y:number)=>({x:x*X,y:y*Y});
const poly=(a:number[][])=>polygon(a.map(([x,y])=>[x*X,y*Y]));
const floor=(name:string,a:number[][])=>area(name,a.map(([x,y])=>[x*X,y*Y]));
const solid=(name:string,a:number[][])=>obstacle(name,a.map(([x,y])=>[x*X,y*Y]));
const table=(support:string,depth:number)=>({mount:'table' as const,support,depth:depth*Y});
const node=(n:DiscoveryNode)=>n;

const pack:ExplorationPack={
  day:6, theme:'雨没有停，今天也可以先留下',
  outside:[
    node({id:'d06-rain-petals',title:'桥头被雨压低的白花',kind:'collect',
      position:p(1394,543),approach:{x:1330,y:554},baked:poly([[1377,526],[1396,523],[1409,535],[1402,552],[1384,554]]),
      visual:{mount:'ground',layer:'ground',support:'吊桥东端石阶内侧泥岸的原生白花，从桥头台阶观察，不踏入溪谷'},
      description:'花瓣被雨压低，叶尖的水滴落向泥岸。只在生活册画下它的姿态，不采走山花。',
      result:'收录一幅雨中白花速写，花仍在桥头。',reward:{title:'雨中白花速写',category:'nature'}}),
    node({id:'d06-camp-light',title:'营地桌上的守候灯',kind:'photo',
      position:p(1388,752),approach:{x:1368,y:743},baked:poly([[1375,731],[1389,725],[1397,738],[1398,758],[1377,766]]),
      visual:table('原营地木桌上的煤油灯，站在桌东侧营地平地拍照，与主线新增保温壶分开',795),
      description:'雨丝从灯光前划过。拍下这盏仍亮着的灯，给今天留一个不用赶路的时刻。',
      result:'打卡：有人留灯的营地。',reward:{title:'有人留灯的营地',category:'postcard'}}),
    node({id:'d06-worn-pack',title:'木凳上的旧登山包',kind:'inspect',
      position:p(1407,881),approach:{x:1398,y:823},baked:poly([[1381,839],[1410,825],[1433,837],[1447,883],[1431,908],[1390,902],[1379,879]]),
      visual:table('营地南侧原生木凳上靠稳的绿色背包，从木凳东北侧平地观察缝线，包留在凳上',932),
      description:'旧背包带上有整齐的补线，侧袋收着湿绳。有人走过很远的路，也知道什么时候放下行李。',
      result:'记下：可以把走得更远，改成先好好休息。'}),
  ],
  room:{
    id:'d06-room',name:'避雨山舍 · 烘干区与测绘角',
    background:'/assets/exploration-014/day06/shelter-v1.png',
    intro:'左侧是烘干区，右侧是测绘与留舍登记角。墙上云→山→屋的木牌指向一次天气观察练习；这里的记录不产生主线口令，也不会改变户外暴雨。左侧原门随时可返回。',
    entry:{title:'进入避雨山舍',position:p(1289,222),approach:{x:1253,y:228},
      baked:poly([[1275,183],[1300,181],[1302,222],[1276,224]]),
      support:'右上山间建筑正面两盏灯之间的原生木门，沿现有寺庙台阶到门前木廊进入；不是左侧茶亭的主线终点'},
    world:world({
      spawn:p(332,706),
      regions:[floor('烘干区到测绘角的连续木地板',[[281,557],[413,413],[631,379],[1206,380],[1261,645],[1304,655],[1304,850],[1598,900],[104,856],[117,801],[247,754]]),
        floor('左侧原门内侧石门槛',[[131,705],[208,641],[283,698],[247,755],[133,789]])],
      obstacles:[
        solid('西侧实木墙与雨衣挂墙',[[30,364],[429,47],[431,339],[283,550],[283,578],[209,505],[196,357],[119,409],[133,691],[90,751],[33,741]]),
        solid('北侧封闭墙体',[[427,34],[1469,34],[1469,369],[824,374],[822,391],[635,390],[636,421],[431,410]]),
        solid('炉体与整块防火石台',[[395,353],[443,332],[613,328],[637,370],[603,445],[392,445]]),
        solid('沥水盘与登山靴',[[319,446],[441,435],[476,454],[444,550],[283,557]]),
        solid('折巾木凳',[[643,288],[805,284],[823,325],[806,400],[647,397]]),
        solid('测绘桌实体',[[1222,309],[1461,305],[1587,527],[1590,568],[1556,643],[1258,643],[1239,553]]),
        solid('留舍登记桌',[[1309,626],[1579,626],[1622,744],[1615,858],[1323,852]]),
        solid('登记桌前方木凳',[[1413,775],[1516,777],[1549,816],[1530,909],[1422,900]]),
      ],
      anchors:{exit:[192*X,672*Y,309*X,705*Y]},
      baked:{exit:poly([[116,421],[174,365],[193,491],[203,638],[132,709]])},
      visuals:{exit:{mount:'door',support:'画面左下唯一开门内侧的石门槛，站在木地板操作，原路返回山舍门廊',depth:752*Y}},
    }),
    nodes:[
      node({id:'d06-weather-rule',title:'云、山、屋的观察木牌',kind:'inspect',position:p(866,205),approach:p(866,424),
        baked:poly([[773,140],[952,139],[953,208],[773,209]]),
        visual:{mount:'wall',support:'北墙折巾凳右上方的原生三图木牌，从牌前空地阅读',depth:378*Y},
        description:'木牌从左到右刻着云→山→屋，并用箭头连接。下方的使用说明是：先到雨窗看云和雨，再到地图核对山谷与裸露山脊，最后在留舍登记簿旁整理自己的路线记录。雨仍密、山脊无遮蔽时，记录留舍等待，不把晴天路线当成此刻可走。',
        result:'观察顺序：雨窗 → 地形图 → 留舍登记簿确认。铜罗盘只用于认识地图方位，不能预报雨停。'}),
      node({id:'d06-rain-window',title:'雨窗里的低云',kind:'inspect',position:p(1166,280),approach:p(1115,421),
        baked:poly([[1018,83],[1335,82],[1334,268],[1017,266]]),
        visual:{mount:'wall',support:'北墙封闭玻璃雨窗，从窗下空地看雨，不把窗当入口',depth:367*Y},
        description:'玻璃上仍是密集雨线，山尖消失在低云后。这里没有雨已经停下的证据。观察木牌的第一步“云”，对应这扇窗。',
        result:'已观察天气：雨仍密，低云遮山，先不启程。'}),
      node({id:'d06-contour-map',title:'山谷与山脊地形图',kind:'inspect',position:p(1325,515),approach:p(1192,533),
        baked:poly([[1270,340],[1379,343],[1460,423],[1437,492],[1368,510],[1296,492]]),
        visual:table('右侧测绘桌上纸质等高线图的左半部，从桌西侧地板看图，不跨桌',641),
        description:'图上溪流蜿蜒在谷底，密集等高线围着裸露山脊；纸图不代表实时通行许可。对应木牌第二步“山”：核对地形后，今天的练习选择留舍等雨，不尝试谷底近路或露天山脊。',
        result:'已核对地形：谷底汇水、山脊无遮蔽。去登记簿整理留舍记录。'}),
      node({id:'d06-stay-ledger',title:'整理一页留舍路线',kind:'collect',position:p(1375,749),approach:p(1265,715),
        baked:poly([[1343,649],[1407,641],[1463,650],[1480,714],[1416,725],[1357,716]]),
        visual:table('右前登记桌上摊开的原生册页，站在桌西侧空地对照抄写，公共册原位保留',851),
        requires:['d06-weather-rule'],sequence:['d06-rain-window','d06-contour-map'],
        description:'按木牌云→山→屋的箭头，依次点击雨窗、地形图，再点这本登记簿确认。全部证据：窗外密雨低云；地图谷底汇水、山脊无遮蔽；所以在生活册写“留舍等待”，而不是出门走捷径。若顺序中断，可重新看窗、看图后回来。',
        result:'把“留舍等雨，重新观察后再做打算”抄进自己的生活册。公共登记簿留下，户外天气与主线进度不变。',reward:{title:'雨停前的留舍路线抄本',category:'keepsake'}}),
      node({id:'d06-dry-towels',title:'烘干凳上的折巾',kind:'inspect',position:p(751,331),approach:p(751,443),
        baked:poly([[743,274],[789,271],[805,291],[791,324],[735,323]]),
        visual:table('炉旁木凳右侧的一叠浅色干巾，从凳前地板看折法，不站进炉台',400),
        description:'干巾整齐叠在离炉体有距离的木凳上。先把外衣沥水，再坐下来擦干手，比急着再走一段更合适。',result:'记下烘干区的小习惯：把湿与干分开。'}),
      node({id:'d06-blue-cape',title:'挂钩上的蓝雨披',kind:'inspect',position:p(355,410),approach:p(507,500),
        baked:poly([[338,212],[361,218],[377,301],[394,376],[372,401],[344,398],[320,379],[323,294]]),
        visual:{mount:'hanging',support:'西墙金属挂钩悬挂的原生蓝雨披，从沥水盘东侧通道观察，不能跨炉台',depth:416*Y},
        description:'雨披挂在墙钩上，衣角悬在沥水盘附近，没有搭到炉体。衣服慢慢干，人也可以慢慢缓过来。',result:'观察到雨披与热源保持距离的挂法。'}),
      node({id:'d06-drip-tray',title:'门边沥水盘',kind:'inspect',position:p(379,522),approach:p(482,585),
        baked:poly([[322,450],[436,445],[451,470],[419,529],[300,520]]),
        visual:{mount:'ground',support:'左侧门内墙边石垫上的真实靴盘，从盘右下木地板看水痕，不走进靴盘',depth:557*Y},
        description:'靴底带来的水收在浅盘里，门口的石门槛与干燥木地板分开。无需修理任何东西，只要沿留出的干地慢慢走。',result:'记下雨天归舍的顺序：门口沥水，再进干地。'}),
      node({id:'d06-shelter-cat',title:'守着干地的小猫',kind:'pet',position:p(765,643),approach:p(781,683),
        visual:{mount:'actor',support:'山舍中央干燥木地板巡游，远离炉台、靴盘与桌脚',height:30,maxWidth:38},animal:'cat',
        patrol:[p(765,643),p(943,634),p(1090,703),p(889,784),p(624,724)],
        description:'猫沿干地慢慢绕圈，在你的脚边停一停。蹲下伸出手，让它自己靠近。',result:'它用额头碰了碰你，又回到暖和的地板上。'}),
    ],
  },
  achievements:[
    {id:'d06-read-the-weather',title:'等一等，也是一条路线',description:'按云→山→屋的证据顺序完成观察并归档留舍路线。',requires:['d06-weather-rule','d06-rain-window','d06-contour-map','d06-stay-ledger']},
    {id:'d06-warm-footsteps',title:'把雨留在门边',description:'看过沥水盘、雨披和折巾，并与干地上的小猫亲近。',requires:['d06-drip-tray','d06-blue-cape','d06-dry-towels','d06-shelter-cat']},
  ],
};
export default pack;
