import type { DiscoveryNode, ExplorationPack } from "./schema";
import { area, obstacle, world } from "../worldSchema";
import { polygon } from "../navigation";

// Positions below were traced on the inspected 1672 × 941 source, not a guessed grid.
const p = (x: number, y: number) => ({ x: x * 1600 / 1672, y: y * 900 / 941 });
const coords = (points: number[][]) => points.map(([x, y]) => [p(x, y).x, p(x, y).y]);
const shape = (points: number[][]) => polygon(coords(points));
const floor = (name: string, points: number[][]) => area(name, coords(points));
const solid = (name: string, points: number[][]) => obstacle(name, coords(points));
const nodes: DiscoveryNode[] = [
  {
    id: "d05-recipe", title: "读懂墙上的秋果配方", kind: "inspect",
    position: p(537, 344), approach: p(529, 387),
    baked: shape([[440,125],[631,125],[631,209],[439,209]]),
    visual: { mount: "wall", support: "厨房后墙的苹果—铜锅—玻璃罐配方画；从罐架南侧读图", depth: p(0,360).y },
    description: "画上是苹果、冒热气的铜锅和封好的罐。果篮紧邻清水盆，提示下锅前先洗净：先到果篮选果，再到水盆清洗，最后到铜锅确认小火慢煮。依次点击「挑选当季秋果」→「清洗一小份秋果」→「照看铜锅的小火」，再点击「登记这一罐秋天」完成封存。离开后可重新按这个顺序操作。",
    result: "配方已记下：果篮 → 水盆 → 铜锅 → 罐架。只试做一小份，不搬走茶屋的整篮果子，也不影响渡船任务。",
  },
  {
    id: "d05-fruit", title: "挑选当季秋果", kind: "inspect",
    position: p(377, 343), approach: p(448, 382),
    baked: shape([[344,292],[375,281],[408,295],[409,321],[379,336],[347,321]]),
    visual: { mount: "table", support: "水盆右后方矮台上的原生苹果篮，从篮右前方石砖操作", depth: p(0,365).y },
    description: "茶屋把成熟、没有碰伤的苹果放在这只篮子里。试做时只取一小份，篮里仍留着给后来者的果实。下一步去左侧的水盆。",
    result: "选好一小份成熟秋果。果篮仍在原位；接下来先清洗，不直接倒进铜锅。",
  },
  {
    id: "d05-wash", title: "清洗一小份秋果", kind: "inspect",
    position: p(322, 439), approach: p(391, 481),
    baked: shape([[283,321],[336,313],[366,328],[351,351],[300,355],[280,341]]),
    visual: { mount: "table", support: "石台上真实嵌入式水盆，从石台东南侧地砖伸手操作", depth: p(0,456).y },
    description: "水盆的水清亮，旁边是配方里的小火铜锅。把选好的一小份秋果洗净，再去照看锅里的慢煮；直接碰这里不会永久耗掉其他步骤，可以重新练习。",
    result: "用清水洗好这一小份秋果。下一步去铜锅，记得慢火而不是猛烧。",
  },
  {
    id: "d05-simmer", title: "照看铜锅的小火", kind: "inspect",
    position: p(207, 486), approach: p(260, 550),
    baked: shape([[173,297],[191,279],[230,278],[251,295],[253,333],[232,352],[190,350],[171,332]]),
    visual: { mount: "table", support: "厨房西墙砖炉上的铜锅，站在砖炉南侧与矮门墙之间的石砖，不跨进灶台", depth: p(0,532).y },
    description: "铜锅保持温和的小火。按配方把洗好的秋果慢慢煮软，不需要猜温度数字。确认之后到后墙的玻璃罐架登记这一小份成果。",
    result: "秋果在铜锅里慢慢变软，香气没有盖过河风。最后到玻璃罐架，检查完整顺序并封存试做记录。",
  },
  {
    id: "d05-preserve", title: "登记这一罐秋天", kind: "restore",
    position: p(473, 354), approach: p(468, 387),
    baked: shape([[421,237],[432,228],[449,229],[458,240],[459,278],[422,282],[420,260]]),
    visual: { mount: "table", support: "后墙罐架最左边的清洁玻璃罐，站在台前；不把整个架子变成拾取物", depth: p(0,360).y },
    requires: ["d05-recipe"], sequence: ["d05-fruit", "d05-wash", "d05-simmer"],
    description: "封存前核对配方：依次点击「挑选当季秋果」→「清洗一小份秋果」→「照看铜锅的小火」，再来罐架确认。步骤来自墙画、紧邻果篮的清水盆与各处操作说明，不是随机暗号；不对时可以从果篮重新开始。",
    result: "你完成了一次秋果试做，登记在茶屋的轮值记录里。清洁罐架仍保留公用样本；吧台前的试吃便签允许你抄一份配方带走。",
  },
  {
    id: "d05-jam-card", title: "抄一份秋果试做卡", kind: "collect",
    position: p(620, 548), approach: p(674, 642),
    baked: shape([[590,456],[618,456],[648,471],[624,490],[590,479]]),
    visual: { mount: "table", support: "弧形吧台南端托盘上的纸便签，从吧台东南侧木地板抄录", depth: p(0,614).y },
    requires: ["d05-preserve"],
    description: "试做完成后，可以把吧台便签上的配方抄入旅行册。留在托盘上的原件是给下一位旅人的，不要把整张台面搬进背包。",
    result: "收藏「秋果慢煮·我的第一份试做卡」。原配方纸仍摆在托盘上，属于所有走进茶舍的人。",
    reward: { title: "秋果慢煮·试做配方卡", category: "keepsake" },
  },
  {
    id: "d05-leaf-print", title: "记录六种叶子的轮廓", kind: "collect",
    position: p(960, 357), approach: p(955, 401),
    baked: shape([[908,123],[1011,123],[1011,239],[908,239]]),
    visual: { mount: "wall", support: "河窗左侧原生压叶画框，从画框下方无遮挡的木地板描摹", depth: p(0,354).y },
    description: "画框里封着六种秋叶，尖角、圆边、分叉都不同。隔着玻璃描下轮廓即可，不拆公共标本，也不摘活叶。",
    result: "旅行册新增六叶轮廓页。真正的压叶仍留在茶舍，等下一个愿意停步的人。",
    reward: { title: "河湾六叶·轮廓手记", category: "nature" },
  },
  {
    id: "d05-letters", title: "摘录寄给未来的一句话", kind: "collect",
    position: p(1151, 391), approach: p(1067, 458),
    baked: shape([[1104,270],[1150,265],[1190,270],[1191,313],[1150,308],[1104,314]]),
    visual: { mount: "table", support: "河窗下书桌上摊开的留言簿，从椅子左侧站立；只抄公开留言，不读封口信件", depth: p(0,396).y },
    description: "公开留言簿的一页写着：愿你读到这里时，还记得好好吃饭、慢慢回家。旁边封好的信属于别人，不需要拆开才能完成收藏。",
    result: "抄下这句普通但温柔的祝愿。留言簿留在书桌上，背包里只有你自己的摘录卡。",
    reward: { title: "寄给未来的河湾摘录", category: "postcard" },
  },
  {
    id: "d05-mail", title: "给未来的自己留封信", kind: "inspect",
    position: p(1268, 392), approach: p(1290, 441),
    baked: shape([[1240,287],[1290,288],[1292,308],[1242,308]]),
    visual: { mount: "table", support: "书桌右侧独立木信盘中的信封，不与左侧留言簿重叠", depth: p(0,396).y },
    description: "茶舍允许旅人留下写给自己的信。你在自己的空白信纸上写一句今天想记住的事，封好以后再放回信盘；不拆别人的信。",
    result: "你给未来的自己留下「今天曾在河边坐了一会儿」。这件小事不会给出口增加一位密码。",
  },
  {
    id: "d05-tea-photo", title: "在低茶桌旁停一会儿", kind: "photo",
    position: p(1319, 628), approach: p(1310, 694),
    baked: shape([[1293,510],[1317,498],[1334,510],[1338,549],[1321,561],[1296,555]]),
    visual: { mount: "table", support: "右侧圆茶桌上唯一的红果酱试吃罐；从桌南侧空木地板打卡，避开两侧坐垫", depth: p(0,645).y },
    description: "把小小的果酱罐与窗里的河湾一起留在画面里。没有倒计时催你，也不必冒险走到河中心。",
    result: "打卡「秋天可以装进一张照片」。桌上的试吃罐留给后来的人。",
    reward: { title: "河湾茶舍·一罐秋天", category: "postcard" },
  },
];

const pack: ExplorationPack = {
  day: 5, theme: "装好秋天，也留下问候",
  room: {
    id: "d05-room", name: "河湾茶舍·果酱厨房与寄信茶席",
    background: "/assets/exploration-014/day05/river-teahouse.png",
    intro: "左边的石砖厨房可以试做秋果，绕过吧台南端就是寄信茶席。读配方、收集手记、写信或只喝口茶都随你；左下原入口随时可以返回河岸。",
    entry: {
      title: "进入河湾茶舍", position: { x: 197, y: 508 }, approach: { x: 195, y: 574 },
      baked: polygon([[181,459],[212,448],[214,493],[199,510],[181,507]]),
      support: "左岸茶舍正面中间的原生木门，门前廊台是可行走石地；独立于东侧茶桌 tea-jar，不新画门",
    },
    world: world({
      spawn: p(288, 664),
      regions: [
        floor("秋果厨房的石砖", [[110,535],[284,534],[389,414],[432,346],[724,346],[728,414],[570,498],[590,584],[518,743],[398,705],[365,688],[204,688],[200,566],[110,566]]),
        floor("吧台南端连通地坪", [[402,567],[585,567],[677,632],[645,751],[448,751],[406,702]]),
        floor("寄信茶席木地板", [[858,350],[1453,350],[1456,527],[1550,593],[1350,766],[521,766],[586,615],[856,435]]),
        floor("随时返回的茶舍门槛", [[210,651],[357,651],[357,775],[208,775]]),
      ],
      obstacles: [
        solid("西墙灶台和洗果石台", [[130,350],[280,340],[397,320],[433,345],[389,415],[287,530],[125,530]]),
        solid("后墙清洁罐架", [[403,275],[745,275],[746,359],[403,359]]),
        solid("弧形服务吧台", [[541,475],[765,342],[854,350],[857,447],[640,616],[552,586]]),
        solid("中间承重柱", [[847,25],[901,26],[901,357],[847,357]]),
        solid("窗下寄信书桌", [[1051,300],[1323,301],[1323,396],[1051,396]]),
        solid("寄信桌前椅子", [[1129,333],[1204,332],[1205,441],[1130,441]]),
        solid("东墙果酱储物架", [[1454,228],[1571,277],[1583,592],[1460,484]]),
        solid("圆茶桌", [[1257,503],[1369,503],[1416,541],[1413,591],[1378,636],[1250,642],[1217,599],[1216,541]]),
        solid("茶桌西坐垫", [[1130,557],[1210,555],[1224,624],[1136,631]]),
        solid("茶桌东坐垫", [[1414,557],[1490,557],[1502,622],[1407,630]]),
        solid("茶舍门左矮墙", [[44,548],[210,551],[210,740],[48,704]]),
        solid("茶舍门右木柱", [[358,570],[405,572],[405,786],[358,783]]),
      ],
      anchors: { exit: [p(280,749).x,p(280,749).y,p(280,711).x,p(280,711).y] },
      baked: { exit: shape([[211,673],[357,673],[357,774],[210,762]]) },
      visuals: { exit: { mount: "door", support: "左下方真正敞开的门洞与石门槛，不要求任何收藏或烹饪完成", depth: p(0,774).y } },
    }),
    nodes,
  },
  outside: [
    {
      id: "d05-reeds", title: "听芦穗擦过河风", kind: "inspect",
      position: { x: 452, y: 501 }, approach: { x: 401, y: 488 },
      baked: polygon([[435,455],[462,445],[474,477],[466,514],[443,522],[429,492]]),
      visual: { mount: "ground", support: "茶舍东侧步道靠水的原生芦苇丛，从干燥小路倾听，不把河水划为可行走", depth: 524 },
      description: "芦穗挨着风一齐弯下去，声音不像渡船的木板，也不像脚下的落叶。这里可以听，不必踩进水里采走它。",
      result: "自然日志新增「河风里的芦穗」。活芦苇留在岸边，记忆跟你走。",
    },
    {
      id: "d05-dock-photo", title: "码头灯下的晚秋", kind: "photo",
      position: { x: 1216, y: 631 }, approach: { x: 1243, y: 652 },
      baked: polygon([[1207,587],[1219,582],[1226,592],[1225,611],[1209,613]]),
      visual: { mount: "hanging", support: "右岸码头西侧原生小灯笼，从同侧木平台站稳拍照，避开南边 last-ticket 票牌", depth: 645 },
      description: "灯笼亮起来的时候，水面也收了一点橙色。站在护栏内记录这盏灯，不翻到水边寻找更近的镜头。",
      result: "打卡「赶得上回家的晚秋」。收藏的是安全站位拍下的照片，不是把码头灯带走。",
      reward: { title: "码头灯下·晚秋照片", category: "postcard" },
    },
    {
      id: "d05-dog", title: "茶舍小狗「麦芽」", kind: "pet",
      position: { x: 420, y: 593 }, approach: { x: 419, y: 611 },
      visual: { mount: "actor", support: "茶舍东侧弯曲石路，小狗只在岸上连续路面巡游，不走茶桌或芦苇水面", height: 32, maxWidth: 41 },
      animal: "dog", patrol: [{ x: 419, y: 589 },{ x: 409, y: 558 },{ x: 397, y: 542 },{ x: 414, y: 584 }],
      description: "麦芽在茶舍外等熟悉的人。你放慢脚步，等它自己闻一闻，不拿铜锅里的食物喂它。",
      result: "麦芽摇摇尾巴，用鼻尖碰了碰你的掌心，又沿着自己的小路去听河水。它不是路障，也不需要被装进背包。",
    },
  ],
  achievements: [
    { id: "d05-autumn-preserver", title: "秋天的慢煮人", description: "读懂配方、依次选果清洗慢煮、登记试做，并抄一份配方卡。", requires: ["d05-recipe","d05-fruit","d05-wash","d05-simmer","d05-preserve","d05-jam-card"] },
    { id: "d05-gentle-post", title: "河湾的温柔寄件人", description: "记录叶形、摘录公开留言、留一封自己的信、在茶席打卡并与麦芽亲近。", requires: ["d05-leaf-print","d05-letters","d05-mail","d05-tea-photo","d05-dog"] },
  ],
};
export default pack;
