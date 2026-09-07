# 0.10 可复用实体与动作素材

生成日期：2026-09-07。使用内置图像生成工具，原创项目素材；未截取或复制商业游戏资源。四张原始图集与运行时代码一并版本管理。此前单帧素材保留，方便追溯。

## 制作与使用约定

- 原始图集均为 1254×1254 PNG，纯品红底；原图不破坏性裁剪。
- `src/campaign/SpriteAtlas.ts` 负责按图集特定边界切帧、去品红、裁空白及缓存轮廓遮罩。运行时只沿物件 alpha 轮廓绘制 2 个世界像素的细边，不使用光圈/方框。
- 主角侧向动画每帧保持同一头部/背包朝向。左向仅镜像整组右向帧；正面、背面不按上一帧横向速度翻转。
- `src/campaign/entities.ts` 管理 48 个任务对象和 8 个终点的图集引用、显示高度、完成态。脚底为坐标锚点，人物/物件按脚底 Y 排序。
- 批量图集是可用首版，不等于已经逐像素手工精修。背景中的旧水轮、桌椅等仍是画面的一部分；彻底拆分背景前景和消除所有重复视觉物需后续资产分层。

## traveler-v2.png

保存位置：`D:/projects/OneMoreDayGame/public/assets/sprites/traveler-v2.png`

用途：主角：正面、右向、背面、右向交互，4×4，共 16 帧。

完整生成提示词：

```text
Production GAME SPRITE SHEET, based on the reference character identity (yellow rain jacket, teal backpack and trousers, dark brown hair and boots, friendly chibi traveler). Strict 4 columns x 4 rows, sixteen equally-sized cells on a square canvas, no visible grid lines. Every sprite full body centered with identical head height, torso scale and foot baseline within its cell, generous 15% cell padding. Crisp beautiful 16-bit pixel art, readable at 56x84 game pixels, simple coherent pixel clusters, no blur. Row 1: facing toward viewer, four walking-cycle poses: neutral standing, left foot forward, passing feet, right foot forward. Row 2: facing SCREEN RIGHT in exact side/three-quarter side view for ALL FOUR cells, same head and backpack placement throughout, same four poses. Row 3: facing AWAY from viewer, backpack centered, same four poses. Row 4: facing SCREEN RIGHT, four interaction poses: neutral, slight lean, reaching hand forward, returning upright. Do NOT flip the head, torso, hair, face, or backpack between frames within a row; animate only arms and legs. No props, labels, text, UI, cast shadows, platforms, borders, ground. Background transparent alpha if possible; otherwise uniform flat pure #FF00FF magenta, no checkerboard or gradient.
```

## world-props.png

保存位置：`D:/projects/OneMoreDayGame/public/assets/sprites/world-props.png`

用途：排水篦、路牌、配电箱、电话、水轮、野餐篮、花、足印石、阀门、踏石、吊篮、日晷、信号、灯、晶簇、门。

完整生成提示词：

```text
Production pixel-art RPG prop atlas. Exactly FOUR columns and FOUR rows of separate individual props, sixteen objects total, one centered object per equal square cell. Rich beautiful cozy 16-bit pixel art, clear pixel clusters, restrained dark outlines, warm material highlights, slight top-down 3/4 view. Objects are real in-world things, NOT icons or interface panels. Shared lighting from upper left. Each object fully visible and separated by generous empty space. Readable silhouettes at 44-64 game pixels. In strict left-to-right top-to-bottom order: ROW ONE: cast iron storm drain grate with a small pile of autumn leaves; wooden roadside signpost with blank direction boards; steel electrical switch cabinet with hinges and tiny switches; vintage public telephone on a short wooden stand. ROW TWO: wooden waterwheel and small stone water trough; picnic basket with folded blue gingham cloth and cup; a cluster of blue white and yellow bell flowers rooted in a little soil; pale flat rock with two small animal pawprint impressions. ROW THREE: three brass water valves on a short stone base; cluster of stepping stones and two lily leaves; wooden counterweight pulley winch with rope and small basket; small stone sundial. ROW FOUR: metal railway signal with red amber green lamps; brass lantern on a low post; turquoise and amethyst crystal cluster; a small wooden cabin entrance gate with closed wooden door (no surrounding house). No words or lettering, no numbers, no grid lines, no borders, no badges, no glows, no symbols hovering above, no cast shadows, no scenery. Background transparent alpha if supported, otherwise exactly solid #FF00FF magenta everywhere between objects, never checkerboard.
```

## life-actors.png

保存位置：`D:/projects/OneMoreDayGame/public/assets/sprites/life-actors.png`

用途：猫与获救态、蜂、蝠、同事、园丁、摄影师、孩子、乘客、雨衣旅人、雪人前后态、茶具等。

完整生成提示词：

```text
Pixel-art adventure game CHARACTER AND SMALL OBJECT SPRITE ATLAS. Exactly FOUR columns by FOUR rows, sixteen distinct sprites in equal cells. Square canvas. Charming high-quality 16-bit pixel-art with crisp clusters and dark outlines, same cozy 3/4 top-down viewpoint and upper-left illumination, figures large-headed chibi, objects beautifully shaded. Each fully contained in its own cell with generous padding, no ground or cast shadows, no labels or text or UI. LEFT TO RIGHT row order is mandatory. ROW 1: tiny orange-and-white kitten peeking out of a small brown cardboard box; the SAME orange-and-white kitten sitting happily outside the box with curled tail; cute plump yellow honeybee with visible little wings; small friendly violet bat with wings spread. ROW 2: female office coworker with dark bob haircut, teal cardigan holding a water cup; gardener with straw hat and green apron; photographer traveler with a small camera and orange jacket; child passenger with a bright red scarf and navy coat. ROW 3: older passenger with silver hair, glasses and a scarf holding a warm pack; blue raincoat hiker with backpack; small white snowman WITHOUT a hat beside a fallen red hat; the SAME snowman wearing its red hat. ROW 4: open wicker basket with a ceramic teacup; a jade-green tea jar; folded red scarf; silver insulated thermos. Solid perfectly uniform #FF00FF magenta background for sprite keying, absolutely no other pink objects, no grid borders, no checkerboard, no decorative stars or glows. Sprites are real game actors and objects, not interface icons.
```

## utility-props.png

保存位置：`D:/projects/OneMoreDayGame/public/assets/sprites/utility-props.png`

用途：电脑开关态、蕨叶前后态、矿车、天平、地图架、柜子、警报器、门、行李、班次板、哨子、长凳、工具与水壶。

完整生成提示词：

```text
A production 4 by 4 sprite atlas of sixteen real-world props for a cozy top-down pixel-art adventure. Square image, four equal columns and rows, each prop fully contained in its cell with clear generous margins. Crisp beautiful 16-bit pixel clusters and dark outlines, warm highlights, 3/4 top-down view, consistent lighting. All are real objects NOT abstract icons. In exact left-to-right, top-to-bottom order: ROW 1: small office desk with a blue-screen monitor; same small desk with monitor switched off; young fern with a grey rock blocking its tiny terracotta pot; same young fern upright and watered without blocking rock. ROW 2: battered small minecart with dark wheels and a wheel chock; brass two-pan weighing scale on wooden stand; folded paper map propped on a little wooden reading stand (abstract colored paths, NO TEXT); steel emergency supply locker with latch. ROW 3: red fire alarm button box on a short post; realistic building exit doorway with open door and small green lamp above (NO lettering); luggage suitcase with a hanging blank label; small railway timetable noticeboard with rows of empty pale slots. ROW 4: silver rescue whistle hanging from a little wooden stand; a wooden bench with rounded slats; canvas tool roll containing a hand trowel and gardening gloves; a metal watering can. Every object readable at 40-70 game pixels. Uniform flat pure #FF00FF background for chroma keying, no ground, no cast shadows, no glows, no lettering, no labels, no gridlines or borders.
```
