import type { LifeNode, LifePack } from "./schema";
import exploration from "../exploration/day05";
import { polygon } from "../navigation";

// Both inspected paintings are 1672 x 941; coordinates are traced native pixels.
const p = (x: number, y: number) => ({ x: x * 1600 / 1672, y: y * 900 / 941 });
const shape = (xy: number[][]) => polygon(xy.map(([x,y]) => [p(x,y).x,p(x,y).y]));
const shared = (id: string) => {
  const n = [...exploration.outside, ...exploration.room.nodes].find(n => n.id === id)!;
  return { position: { ...n.position }, approach: { ...n.approach }, baked: n.baked!, visual: { ...n.visual }, sharedDiscovery: id };
};
const pack: LifePack = {
  day: 5,
  outside: [
    {
      id: "d05-life-orchard-crate", title: "果园赠果木箱", kind: "container",
      position: p(1307,370), approach: { x: 1230, y: 381 },
      baked: shape([[1288,332],[1305,323],[1332,333],[1334,359],[1311,375],[1288,363]]),
      visual: { mount: "ground", support: "果园手推车左前方独立木果箱，从木箱西南侧土路打开共享份额，不取整箱", depth: p(0,375).y },
      description: "园主把这一箱里的一小份秋收物资赠给路过的旅人。翻看敞口木箱，领取属于你的一份，余下的果子仍留给别人。",
      emptyText: "这次赠予份额已经领取。箱内仍是留给其他旅人的果实，不再重复取用。", lootTable: "fruit",
    },
    {
      id: "d05-life-orchard-cart", title: "手推车的秋收赠礼", kind: "container",
      position: p(1350,341), approach: { x: 1298, y: 372 },
      baked: shape([[1321,286],[1346,274],[1378,285],[1379,316],[1350,334],[1324,321]]),
      visual: { mount: "ground", support: "右侧果园已有手推车的木质盛果斗，轮子与车把不是热点；站车南侧实土", depth: p(0,355).y },
      description: "园主允许旅人从车斗里领取一次小份秋收补给。车、工具和其余果实都留在园里；敞口车斗不需要虚构一扇箱盖。",
      emptyText: "园主给你的这一份已经收好，车斗里的余量属于接下来的人。", lootTable: "fruit",
    },
    {
      id: "d05-life-reed-tips", title: "岸边脱落的芦穗", kind: "gather", ...shared("d05-reeds"),
      description: "先听一会儿河风，再从岸侧芦丛下收集自然脱落的一小撮材料。活芦苇不拔走，也不踏入水中；等河风再次积下材料后可再来。",
      emptyText: "岸侧刚积下的材料已收过，等一阵河风；可以继续观察活芦苇。", lootTable: "cloth", renewSeconds: 300,
    },
    {
      id: "d05-life-path-leaves", title: "石路上的干秋叶", kind: "gather",
      position: p(349,716), approach: { x: 350, y: 674 },
      baked: shape([[331,703],[349,695],[367,706],[359,719],[336,722]]),
      visual: { mount: "ground", support: "茶舍通往出生点的石路上原生黄褐落叶小簇，仅扫集干叶，不把路面或灌木当容器", depth: p(0,722).y, layer: "ground" },
      description: "路上的干叶已经离开枝头。捡一小份作自然手工材料，给石路留出落脚处；后续飘落需要在线等候。",
      emptyText: "这簇干叶刚收过，等新的落叶积下再来。", lootTable: "cloth", renewSeconds: 240,
    },
    {
      id: "d05-life-porch-stool", title: "廊台小木凳", kind: "inspect",
      position: p(129,613), approach: { x: 158, y: 611 },
      baked: shape([[106,586],[130,578],[153,587],[152,602],[128,614],[108,602]]),
      visual: { mount: "ground", support: "茶舍前廊靠左的原生低木凳，从东南侧台阶看凳脚，不拆公共家具作木材", depth: p(0,615).y },
      description: "凳面被坐得发亮，四只木脚仍稳稳落在廊台上。可以反复看看木纹，但不拆茶舍的凳子。",
      emptyText: "小木凳还在等下一位歇脚的人，木纹和旧榫头依旧清楚。",
    },
    {
      id: "d05-life-porch-pail", title: "廊台靠墙小桶", kind: "inspect",
      position: p(188,560), approach: { x: 195, y: 574 },
      baked: shape([[177,539],[189,535],[198,540],[197,553],[188,560],[178,554]]),
      visual: { mount: "ground", support: "茶舍门左下方原生小桶，轮廓止于桶沿和桶身，不覆盖上方真实门洞", depth: p(0,560).y },
      description: "靠墙的小桶用来维护廊台。可以俯身查看桶沿和剩水，不把公用清洁器具装进背包。",
      emptyText: "桶沿没有裂口，仍可供茶舍清理廊台。",
    },
  ],
  inside: [
    ...[
      { id: "red", title: "红果酱罐", xy: [[667,433],[676,421],[691,420],[700,433],[700,464],[688,474],[671,468]], pos: [684,474], stance: [700,598] },
      { id: "amber", title: "琥珀果酱罐", xy: [[700,415],[709,404],[721,405],[730,417],[730,447],[716,456],[702,450]], pos: [716,456], stance: [741,565] },
      { id: "gold", title: "金黄果酱罐", xy: [[729,397],[740,389],[752,392],[758,403],[758,430],[745,440],[731,433]], pos: [744,440], stance: [775,538] },
      { id: "dark", title: "深色果酱罐", xy: [[755,378],[765,367],[779,369],[788,382],[787,410],[772,420],[758,412]], pos: [772,420], stance: [810,506] },
    ].map((jar): LifeNode => ({
      id: `d05-life-tasting-${jar.id}`, title: `吧台留样·${jar.title}`, kind: "inspect",
      position: p(jar.pos[0],jar.pos[1]), approach: p(jar.stance[0],jar.stance[1]), baked: shape(jar.xy),
      visual: { mount: "table", support: `弧形吧台上原生${jar.title}，仅罐身为热区；从吧台东南木地板查看留样`, depth: p(0,616-(jar.pos[0]-640)*169/217).y },
      description: `主人允许你轻揭${jar.title}的盖子看看稠度和果香，随后盖回。这里展示的是果酱留样，不会凭空取出新鲜水果或随机杂物。`,
      emptyText: "罐盖重新盖好，果酱留样仍在。可以继续观察，不产生背包物资。",
    })),
    {
      id: "d05-life-fruit-share", title: "厨房定时果篮补给", kind: "gather", ...shared("d05-fruit"),
      description: "仍可按原配方挑选试做秋果；另外主人允许从这只公用果篮取一小份随身补给。篮子留在台上，等下一轮补给准备好再领取。",
      emptyText: "本轮公用补给已取过，下一轮尚未准备好；原来的选果试做仍然可以操作。", lootTable: "fruit", renewSeconds: 360,
    },
    {
      id: "d05-life-tea-share", title: "吧台铜壶温茶", kind: "gather",
      position: p(801,439), approach: p(879,400),
      baked: shape([[773,337],[783,326],[809,325],[823,340],[826,355],[817,369],[789,372],[775,360]]),
      visual: { mount: "table", support: "弧形吧台北端原生铜茶壶，站吧台东侧木地板，独立于低茶桌果酱罐打卡", depth: p(0,447).y },
      description: "主人允许旅人从吧台铜壶里续一份温茶。壶留在台上，下一壶泡好需要等候，不从茶壶里随机取水果。",
      emptyText: "这一轮温茶已经续过，等下一壶泡好再来。", lootTable: "tea", renewSeconds: 420,
    },
    ...[482,522,560,598,637].map((x,index): LifeNode => ({
      id: `d05-life-clean-jar-${index+2}`, title: `清洁罐架·第${index+2}只空罐`, kind: "inspect",
      position: p(x,282), approach: p(x,389),
      baked: shape([[x-17,240],[x-12,228],[x+10,228],[x+18,240],[x+18,278],[x+8,286],[x-16,279]]),
      visual: { mount: "table", support: `后墙罐架从左数第${index+2}只原生空玻璃罐，与最左侧封存任务罐分离，从台南侧石地观察`, depth: p(0,359).y },
      description: "这只是茶舍洗净待用的玻璃罐。隔着罐壁看看透光和密封口即可，不拿走公用器皿，也不把空罐冒充装满奖励的箱子。",
      emptyText: "罐壁仍然干净，密封口完整，继续留在公用罐架上。",
    })),
    {
      id: "d05-life-desk-left-drawer", title: "寄信桌左侧共享纸抽屉", kind: "container",
      position: p(1080,387), approach: p(1067,458),
      baked: shape([[1057,336],[1105,339],[1105,367],[1057,363]]),
      visual: { mount: "table", support: "寄信书桌左侧真实抽屉面与把手，站椅子左边，不覆盖桌面公开留言簿", depth: p(0,396).y },
      description: "主人开放了左侧文具抽屉。拉开抽屉，领取一次可再利用的空白纸，再推回原位；桌上留言与信件仍留在原处。",
      emptyText: "你的共享纸份额已经取过，抽屉已推回；可以查看把手，不再重复领取。", lootTable: "paper",
    },
    {
      id: "d05-life-desk-right-drawer", title: "寄信桌右侧回收纸抽屉", kind: "container",
      position: p(1260,387), approach: p(1290,441),
      baked: shape([[1232,338],[1302,337],[1302,366],[1232,367]]),
      visual: { mount: "table", support: "寄信书桌右侧真实抽屉面，从桌右前方看；信盘与抽屉不合并为大矩形", depth: p(0,396).y },
      description: "主人把允许回收的无字边角纸收在右抽屉。拉开取一份后推回，不回收写好的信件，也不读取别人的私人文字。",
      emptyText: "这一份回收纸已经领走，抽屉重新合好。其他旅人的信件不属于可领物资。", lootTable: "paper",
    },
  ],
};
export default pack;
