import type { DiscoveryNode, ExplorationPack } from "./schema";
import { world, area, obstacle } from "../worldSchema";
import { polygon } from "../navigation";

// Both paintings are 1672 × 941; coordinates below bind to inspected native pixels.
const p = (x: number, y: number) => ({ x: x * 1600 / 1672, y: y * 900 / 941 });
const coords = (a: number[][]) => a.map(([x,y]) => [p(x,y).x,p(x,y).y]);
const shape = (a: number[][]) => polygon(coords(a));
const rect = (x: number,y: number,w: number,h: number) => shape([[x,y],[x+w,y],[x+w,y+h],[x,y+h]]);
const block = (name: string,a: number[][]) => obstacle(name,coords(a));
const nodes: DiscoveryNode[] = [
  {
    id:"d08-field-notebook",title:"摊开的培育手册",kind:"inspect",
    position:p(276,359),approach:p(280,498),baked:shape([[205,281],[273,266],[326,273],[350,340],[284,357],[221,355]]),
    visual:{mount:"table",support:"左侧木工作台上摊开的纸本；站在桌前读，不取走原书",depth:p(0,464).y},
    description:"手册夹着导水布示意：布的一端浸进水槽，另一端搭在培养土上。右墙图板的壶→槽→蘑菇画的是补水流程；不要把水直接倒在菌盖上。",
    result:"记下毛细导水办法。先检查右侧床土的干湿边界，再到铜壶旁取一份蓝布条，最后在培养床前沿铺设。",
  },
  {
    id:"d08-quartz-copy",title:"标本盘的石英分样",kind:"collect",
    position:p(402,329),approach:p(405,485),baked:shape([[347,267],[433,254],[458,319],[369,338]]),
    visual:{mount:"table",support:"观察台中部有多粒晶体的木标本盘；取一粒分样，整盘原标本保留",depth:p(0,448).y},
    description:"浅盘把同一矿脉的几粒石英并排陈列，盘沿注明可取一粒已分好的小样；无需敲击洞壁的晶簇。",
    result:"归档「石英分样」。其余晶体继续留给后来人观察，每位访客只领一份。",
    reward:{title:"矿工实验室石英分样",category:"nature"},
  },
  {
    id:"d08-brass-lens",title:"黄铜观察镜",kind:"inspect",
    position:p(498,330),approach:p(546,478),baked:shape([[470,231],[511,224],[526,260],[511,289],[530,310],[513,332],[474,320]]),
    visual:{mount:"table",support:"左工作台右端的黄铜观察镜，底座压在木面上，从桌右前侧观察",depth:p(0,439).y},
    description:"观察镜对着台上的晶体。缓慢换一个角度，亮线来自棱面反光，并不是刻在石头上的数字。",
    result:"记录「棱面与光」。矿物外形与菌菇生长可以分开记录，不需要把它们拼成通关口令。",
  },
  {
    id:"d08-wick-cloth",title:"铜壶旁的蓝布料",kind:"collect",
    position:p(660,237),approach:p(649,351),baked:shape([[622,191],[652,180],[698,208],[690,239],[659,246],[631,228]]),
    visual:{mount:"table",support:"中央偏左的小木台上叠放的蓝布料；领取一份预裁布条，剩余布料与铜壶留在桌上",depth:p(0,309).y},
    description:"铜壶旁叠着吸水蓝布，折层间放着预裁细条。取一份用作导水芯，剩余布料不搬走。",
    result:"收好一份导水布条。这里提供材料，不需要主线小锤，也不用破坏原有壁龛。",
    reward:{title:"培育床导水布条",category:"tool"},
  },
  {
    id:"d08-dry-edge",title:"干土与湿端的边界",kind:"inspect",
    position:p(1400,406),approach:p(1360,549),baked:shape([[1203,349],[1497,346],[1518,398],[1476,420],[1210,415]]),
    visual:{mount:"table",support:"右侧低木培养床真实土面；从床前石地观察，不能站进床内",depth:p(0,504).y},
    description:"前沿水槽里明明有水，大部分土却仍是浅褐色；只有右端接近水的深色土旁长着小菌菇。干湿边界与手册的导水布图恰好对应。",
    result:"确认缺的是连接水槽和土面的吸水芯，不是更多水，也不是敲击或调音。可在床的木前沿铺布，让水缓慢进入土层。",
  },
  {
    id:"d08-capillary-bed",title:"为培养床铺导水带",kind:"restore",
    position:p(1365,505),approach:p(1355,547),baked:rect(1218,436,293,48),
    visual:{mount:"table",support:"右侧培养床前沿木框和水槽；双脚留在前方石地，布条跨框搭在土面",depth:p(0,508).y},
    requires:["d08-field-notebook","d08-dry-edge","d08-wick-cloth"],
    afterArt:{src:"/assets/exploration-014/day08/field-lab-watered.png",crop:{x:1170,y:300,width:390,height:215},width:p(390,0).x,height:p(0,215).y,offset:p(0,10)},
    description:"先读左桌手册、确认床土的干湿边界，再取铜壶旁的布条。把布一端浸进已有水槽，另一端平搭土上，不往菌盖浇水。",
    result:"蓝布跨过木沿，土面出现几块深色湿斑。菌菇不会立刻长大；你记录下补水起点，把下一次观察留给后来的人。",
    reward:{title:"毛细导水培育观察记录",category:"nature"},
  },
  {
    id:"d08-spore-rubbing",title:"圆石桌上的菌菇印样",kind:"collect",
    position:p(1490,625),approach:p(1358,617),baked:shape([[1424,550],[1510,534],[1551,569],[1539,610],[1492,635],[1436,608]]),
    visual:{mount:"table",support:"右下圆石台上多张纸质菌菇印样；从左侧地面领一张副本，留下原观察页",depth:p(0,667).y},
    requires:["d08-capillary-bed"],
    description:"圆石台上的菌菇印样提供给完成维护的访客。补水记录写好后，领取其中一张留作观察对照；纸不是新长出的菌菇。",
    result:"归档「矿洞菌菇印样」。保留其余印样与培养记录，等下一位观察者回来比较。",
    reward:{title:"矿洞菌菇印样副本",category:"keepsake"},
  },
  {
    id:"d08-nursery-photo",title:"蓝菌床的安静合影",kind:"photo",
    position:p(1139,265),approach:p(1078,355),baked:shape([[978,155],[1060,111],[1141,137],[1263,147],[1315,198],[1290,251],[1000,255]]),
    visual:{mount:"table",support:"右后方已经成熟的发光菌菇床；从前方宽石地取景，蘑菇保持在床内",depth:p(0,307).y},
    description:"成熟床与旁边刚补水的床各有自己的时间。留在石地上，把蓝色菌盖与暖色实验灯一同收进镜头。",
    result:"打卡「地底也有育苗室」。记录的是一处有人照料的小地方。",
    reward:{title:"地底育苗室照片",category:"postcard"},
  },
  {
    id:"d08-lab-mouse",title:"巡查石地的小灰鼠",kind:"pet",animal:"mouse",
    position:p(845,506),approach:p(836,549),patrol:[p(845,506),p(1030,487),p(1110,585),p(893,623)],
    visual:{mount:"actor",support:"两区之间开阔的连续干燥石地，绕开培养床和中央岩柱",height:18,maxWidth:27},
    description:"小灰鼠沿石缝巡游，在培养床外停一下。蹲在空地上，让它自己靠近，不把食物丢进培养土。",
    result:"小灰鼠闻了闻你的鞋尖，沿原来的石地继续巡视。",
  },
];

const pack: ExplorationPack = {
  day:8,theme:"晶光之外，照料一小块会生长的土",
  room:{
    id:"d08-room",name:"矿工野外实验室与菌菇培育室",background:"/assets/exploration-014/day08/field-lab.png",
    intro:"木支架后是一处矿工实验站：左边观察矿物，右边照料菌菇。中央石地连通两区，底部原木门随时返回矿口。这里不产生主线口令。",
    entry:{title:"进入矿工实验支洞",position:p(495,171),approach:{x:465,y:188},baked:shape([[463,111],[535,111],[535,172],[474,165],[455,151]]),support:"旧大图左上矿口真实木支架内的黑色洞门，轨道直接伸入；从原出生石台进入，独立于封砌薄墙壁龛与晨光出口"},
    world:world({
      spawn:p(811,819),
      regions:[area("观察区、岩柱前连接廊与培育区的连续石地",coords([[158,302],[706,288],[755,325],[943,325],[971,279],[1523,302],[1580,548],[1544,685],[1301,779],[1000,818],[902,879],[719,879],[620,813],[342,762],[162,695]]))],
      obstacles:[
        block("左观察工作台",[[171,275],[531,252],[565,344],[548,435],[211,473]]),
        block("铜壶布料小台",[[548,173],[690,161],[716,250],[700,310],[562,318]]),
        block("中央封闭岩柱与背墙",[[700,0],[964,0],[949,326],[745,335]]),
        block("成熟菌床",[[962,153],[1320,148],[1322,304],[963,312]]),
        block("干土培养床与水槽",[[1170,303],[1539,308],[1555,501],[1182,513]]),
        block("印样圆石桌",[[1411,542],[1496,515],[1572,556],[1590,614],[1559,660],[1467,682],[1400,635],[1388,584]]),
        block("左下物资箱",[[73,547],[158,515],[198,569],[251,574],[281,683],[162,717],[95,674]]),
        block("底部门左木柱",[[642,677],[712,677],[717,918],[642,918]]),
        block("底部门右木柱与灯",[[913,676],[984,676],[1023,801],[983,912],[915,915]]),
      ],
      anchors:{exit:[p(810,890).x,p(810,890).y,p(810,852).x,p(810,852).y]},
      baked:{exit:rect(722,866,181,39)},
      visuals:{exit:{mount:"door",support:"底部木支架之间真实可穿过的门槛；从同一门原路返回矿口石台",depth:p(0,910).y}},
      // Foreground lintel is re-pasted by the shared baked occluder renderer.
      occluders:[{polygon:rect(647,675,333,73),depth:p(0,912).y}],
    }),nodes,
  },
  outside:[
    {id:"d08-rail-wear",title:"弯轨内侧的磨痕",kind:"inspect",position:p(290,315),approach:{x:275,y:340},baked:shape([[268,307],[310,295],[331,297],[298,316],[276,328]]),visual:{mount:"ground",support:"矿口向西转弯的旧铁轨，磨亮一侧仍贴着枕木，站在轨道石路内侧",layer:"ground",depth:p(0,328).y},description:"弯轨内侧比外侧光滑，矿车来回通过的痕迹一直通向左上木支架。那扇真实洞门后是实验站。",result:"发现「被使用过的路」。不推矿车、不改变轨道，只记录磨损方向。"},
    {id:"d08-bank-quartz",title:"岸台晶簇的棱影",kind:"inspect",position:p(351,458),approach:{x:354,y:494},baked:shape([[325,447],[327,398],[343,374],[367,384],[379,415],[374,463],[351,487],[329,473]]),visual:{mount:"ground",support:"西岸观水平台北缘原生蓝晶簇，立在岩台上；从平台内侧看棱面，绝不取走大晶簇",depth:p(0,487).y},description:"站在宽岩台内侧看蓝晶簇，棱影随视角改变。记录形状即可，矿工的标本盘里另备有可领取的分样。",result:"归档「西岸蓝晶棱影观察」。没有敲下任何岩壁晶体。",reward:{title:"西岸蓝晶棱影观察",category:"nature"}},
    {id:"d08-track-mushrooms",title:"轨道外缘的蓝菌簇",kind:"inspect",position:p(73,457),approach:{x:125,y:499},baked:shape([[44,448],[71,432],[90,445],[96,465],[78,482],[47,477]]),visual:{mount:"ground",support:"西侧轨道弯道旁岩脚原生蓝色小菌簇；留在轨道上远观，不踏进岩脚或水面",depth:p(0,484).y},description:"岩脚的蓝菌贴着湿石缝生长，较干的枕木上没有同样的菌盖。可以记下这条环境线索，去矿工培育室找对照。",result:"发现「潮湿边界」。只观察、不采野菌；室内培养土也能找到相似的干湿差异。"},
  ],
  achievements:[
    {id:"d08-patient-cultivator",title:"给生长留一点时间",description:"读手册、观察干湿边界、取布、完成导水并领取印样。",requires:["d08-field-notebook","d08-dry-edge","d08-wick-cloth","d08-capillary-bed","d08-spore-rubbing"]},
    {id:"d08-underground-observer",title:"地底观察员",description:"记录三处洞外发现、领取石英分样、使用观察镜、拍下菌床并结识小鼠。",requires:["d08-rail-wear","d08-bank-quartz","d08-track-mushrooms","d08-quartz-copy","d08-brass-lens","d08-nursery-photo","d08-lab-mouse"]},
  ],
};
export default pack;
