import type { LifeNode, LifePack } from "./schema";
import exploration from "../exploration/day02";
import { polygon } from "../navigation";

// Native 1672×941 painting coordinates; approach pairs below are world coordinates.
const X = 1600 / 1672, Y = 900 / 941;
const p = (x: number, y: number) => ({ x: x * X, y: y * Y });
const node = (id: string, title: string, kind: LifeNode["kind"], outline: number[][],
  approach: number[], depth: number, support: string, description: string,
  lootTable?: LifeNode["lootTable"], mount: "table" | "ground" = "table"): LifeNode => ({
  id: `d02-life-${id}`, title, kind,
  position: p(outline.reduce((sum, a) => sum + a[0], 0) / outline.length, depth),
  approach: { x: approach[0], y: approach[1] }, baked: polygon(outline.map(([x,y]) => [x*X,y*Y])),
  visual: { mount, depth: depth*Y, support }, description,
  emptyText: kind === "inspect" ? description : kind === "container" ? "已经核对并取过这一份共享物资，原容器留在原处，不再重复领取。" : "这一轮可取的余料已收好；请等工作人员下一轮整理，不动仍在使用的物品。",
  ...(lootTable ? { lootTable } : {}), ...(kind === "gather" ? { renewSeconds: 300 } : {}),
});
const shared = (id: string, title: string, kind: LifeNode["kind"], discoveryId: string,
  description: string, lootTable?: LifeNode["lootTable"]): LifeNode => {
  const original = [...exploration.outside,...exploration.room.nodes].find(n => n.id === discoveryId)!;
  return { id:`d02-life-${id}`,title,kind,position:original.position,approach:original.approach,
    baked:original.baked!,visual:original.visual,sharedDiscovery:original.id,description,
    emptyText:kind === "container" ? "工具箱的共享余料已领过；原来的螺丝刀借用与修收音机仍可继续。" : "本轮背面空白的废稿已整理过，晚安涂鸦原样保留。",
    ...(lootTable?{lootTable}:{}),...(kind==='gather'?{renewSeconds:300}:{}), };
};

const pack: LifePack = {
  day: 2,
  outside: [
    shared("shared-tea","茶水间留给同伴的续杯","gather","d02-last-cup",
      "记录同伴留下两只杯子的心意，再从公共温茶中续一份。杯具留在圆桌上，不拿走同事的私人物品；下一班添茶后可再来。","tea"),
    node("copier-drawer","复印区共享纸柜","container",[[897,430],[940,446],[940,504],[898,486]],
      [827,478],514,"复印机下方左面真实纸柜，从柜西侧办公区地砖拉开再合上抽屉。",
      "拉开公共纸柜，取一份管理员留作再利用的边角纸，再把抽屉推回；文件不动。","paper"),
    node("copy-box","复印柜旁回收纸箱","container",[[933,532],[957,520],[979,533],[978,559],[953,571],[932,555]],
      [850,552],571,"复印柜西南脚边独立棕色纸箱，站在西南地砖上查看箱口。",
      "掀开回收箱的小盖，领走本班已经分类好的可用余纸，再盖回防尘；不翻柜里的档案。","paper","ground"),
    shared("blank-scraps","通道废稿整理","gather","d02-goodnight-note",
      "先留下晚安涂鸦的临摹，再整理这一小堆可再用的空白废稿；原涂鸦纸不带走。","paper"),
    node("desk-scraps","空白便笺边角","gather",[[529,604],[550,599],[568,614],[547,625]],
      [632,650],678,"下方工位桌右缘原生小纸堆，从工位东南外侧地面领取共享边角纸。",
      "桌主把这些裁下的空白边角留给需要的人；只整理余纸，不拿夹在下面的工作文件。","paper"),
    node("west-drawers","西侧工位共享便笺抽屉","container",[[279,541],[314,530],[314,583],[280,595]],
      [330,566],595,"西侧工位南面带拉手的独立抽屉柜，站在椅子外侧观察。",
      "同事把闲置的空白便笺留给需要的人。打开指定抽屉取一份，再合好，不翻其他私人抽屉。","paper"),
    node("south-files","南侧旧信封抽屉","container",[[867,715],[911,736],[911,803],[867,781]],
      [796,749],807,"南侧柜群朝西的木质文件抽屉，操作侧是办公区地板而非柜后电气通道。",
      "打开管理员留作回收的底层抽屉，取一份已经去掉文件的旧信封纸，再合回柜门。封存档案留在别的编号格。","paper"),
    node("desk-plant","工位上的绿植","inspect",[[393,769],[419,744],[442,765],[443,796],[419,822],[397,807]],
      [499,804],822,"底边工位右侧真实盆栽，从桌东侧地面观察，不站到桌板上。",
      "盆里的新叶向台灯一侧伸展。只看看土表与叶缘，不摘走同事养的植物。"),
    node("copier-tray","复印机出纸托盘","inspect",[[909,381],[935,375],[965,390],[954,405],[926,410],[905,400]],
      [827,478],514,"复印机上部真实出纸托盘，从柜西侧检查，不触碰上方隔墙或主线地图。",
      "看看出纸口是否有卡纸，等待设备停稳再检查。工作文件不带走，出纸托盘也不拆作材料。"),
  ],
  inside: [
    shared("lounge-refill","休息茶几的温茶续杯","gather","d02-tea-pause",
      "先停下来感受杯子的温度，再领一份公共温茶放入随身补给。杯子留给下一位同伴；添茶需要一点时间。","tea"),
    node("tea-drawer","茶柜共享备用抽屉","container",[[172,428],[221,414],[222,465],[173,480]],
      [269,529],513,"西墙茶柜左下带拉手的真实抽屉，从茶柜东南地板拉开后复位。",
      "公共茶柜里留着一份干净备用布料。打开备用抽屉领一份，再推回；给下一班留出整洁台面。","cloth"),
    shared("red-toolbox","红工具箱公共余料","container","d02-screwdriver",
      "红箱本来已敞开。检查工具格，领取管理员允许带走的一份维修余料；小螺丝刀仍按原借用流程使用。","salvage"),
    node("low-box","茶几下备用小盒","container",[[573,486],[607,478],[611,497],[578,509]],
      [528,541],535,"矮茶几下层左侧蓝灰小盒，站在茶几南侧弯腰取共享物资。",
      "打开茶几下的公共备用盒，取一份整理间留用的零碎材料，盖好后放回原格。","pocket"),
    node("album-box","纪念柜右格共享盒","container",[[1438,611],[1496,597],[1495,631],[1440,649]],
      [1398*X,780*Y],788,"右前纪念柜上层右格蓝色小盒，从柜正前地面操作，不碰台面邮票册。",
      "这个小盒专放大家赠给后来者的零碎用品；打开领取一份，再按原位置盖好。邮票原册不动。","pocket"),
    node("tea-urn","公共保温壶补给","gather",[[193,327],[213,316],[231,329],[233,370],[211,382],[192,367]],
      [269,529],414,"西墙茶柜台面右侧银色保温壶，茶柜东南側地面操作。",
      "从公共保温壶倒一份温茶，壶与公用杯具留在这里。要等下一轮值班添茶后才能再领。","tea"),
    node("front-cuttings","纪念柜花盆修剪余枝","gather",[[1406,481],[1443,470],[1473,493],[1464,522],[1438,537],[1417,520]],
      [1398*X,780*Y],598,"纪念柜台面右侧真实绿植，只收盆沿修剪余枝，从柜前操作。",
      "照料者把修剪下的少量木质余枝留在盆沿供旅人带走。取一份余枝，不折活叶；下一轮整理前暂停领取。","wood"),
    node("back-files","背墙编号档案夹","inspect",[[843,177],[858,173],[858,195],[843,200]],
      [832*X,388*Y],365,"背墙左段落地档案架，从书架前可达地面核对编号。",
      "这册档案夹还挂着姓名签。只核对书脊是否归位，私人文件留给主人；底层公共余料盒另有开口可取。"),
    node("archive-box-left","档案架左下回收盒","container",[[806,298],[838,285],[862,296],[861,328],[833,339],[806,326]],
      [832*X,388*Y],365,"背墙档案架最低层左侧独立纸盒，从架前地面抽出后复位。",
      "最低层这个盒子集中放去掉文件后的空白旧封套。抽出取一份回收纸，再推回原格。","paper"),
    node("archive-box-middle","档案架中下备用盒","container",[[888,273],[925,264],[947,276],[945,307],[914,316],[890,304]],
      [937*X,370*Y],336,"背墙档案架最低层中段独立棕色小盒，从书架前地板开启。",
      "这里是整理档案剩下的共用纸封套。打开取一份空白纸，文件夹仍在上一层。","paper"),
    node("archive-box-right","档案架右下归集盒","container",[[986,244],[1024,233],[1060,248],[1059,274],[1017,287],[985,273]],
      [1030*X,341*Y],300,"背墙档案架最低层右侧独立盒，不延伸到收音机或后方铁柜。",
      "打开管理员归集的可用纸盒，领取一份去掉字迹的封面纸，然后合好。","paper"),
    node("under-desk-left","整理桌下左侧纸箱","container",[[1230,464],[1268,479],[1268,511],[1230,494]],
      [1210*X,546*Y],535,"档案整理桌下左侧露出的独立箱面，从桌南侧外缘打开复位。",
      "桌下左箱是大家共同整理的回收纸。取一份可再用纸，再将箱盖扣回。","paper"),
    node("under-desk-middle","整理桌下中间纸箱","container",[[1294,475],[1336,460],[1346,468],[1345,499],[1301,516],[1294,509]],
      [1260*X,561*Y],539,"整理桌下中间独立棕箱，与左右箱体分别命中，从桌前与纪念柜之间的地板操作。",
      "中间箱收着装订后多出的纸封套，允许按份领取。取过后合回，不重复翻取。","paper"),
    node("under-desk-right","整理桌下右侧纸箱","container",[[1418,445],[1456,433],[1489,445],[1488,471],[1451,486],[1419,474]],
      [1450*X,511*Y],496,"整理桌下右侧独立纸箱，从桌右前地板取用。",
      "右箱已经清空文件，只留可回收的纸封皮。打开取一份，再盖好留在桌下。","paper"),
    node("right-files","靠墙铁制档案柜","inspect",[[1202,159],[1237,151],[1237,259],[1212,266],[1202,258]],
      [1055*X,378*Y],298,"后墙靠左的独立铁制抽屉柜，从整理桌西侧通道目视检查。",
      "窄铁柜的抽屉关得很平，标签仍朝外。可以反复核对外观，未经主人允许不打开。"),
    node("cat-bed","猫窝的软垫","inspect",[[300,432],[332,409],[369,416],[382,444],[370,467],[339,482],[302,467]],
      [325*X,534*Y],484,"茶柜与沙发之间真实圆猫窝，从猫窝南侧地板观察。",
      "垫子边缘被压出一个小凹窝。只确认这里干净安稳，不拿走猫的铺垫。"),
    node("tea-cupboard","茶柜右侧储物门","inspect",[[233,418],[295,399],[295,479],[233,500]],
      [269,529],514,"茶柜右侧两扇木门，与左抽屉分开命中。",
      "右侧柜门放着公共杯具，拉手已经关齐。反复查看是否关好，不领取仍在使用的杯壶。"),
  ],
};
// Only this tight crop is consumed; the generated whole scene never replaces the map.
const openedBox = pack.outside.find(n => n.id === "d02-life-copy-box")!;
const boxCrop = { x: 932, y: 516, width: 49, height: 56 };
openedBox.afterArt = {
  src: "/assets/life-015/day02/copier-box-open-source.png", crop: boxCrop,
  width: boxCrop.width*X, height: boxCrop.height*Y,
  offset: { x: (boxCrop.x+boxCrop.width/2)*X-openedBox.position.x,
    y: (boxCrop.y+boxCrop.height)*Y-openedBox.position.y },
};
openedBox.description = "打开复印柜旁的回收纸箱，取走管理员分好的一份可再用纸。空箱口保持可见，等下次回收，不再翻取。";
openedBox.emptyText = "回收纸箱已打开，箱口里是空的；这一份已领过，不会再次产生物资。";
export default pack;
