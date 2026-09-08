# DAY01 · 夜灯杂货铺 · 生成来源

使用内置 `image_gen__imagegen`，未使用 CLI/API 备用。2026-09-08。

## 底图

- 参考：`public/assets/maps/day01-rain-city.png`（只作风格参考，先查看）。
- 原始输出：`C:/Users/hrcao/.codex/generated_images/01a07e7f-2a53-7281-b63a-59e45111c1ba/exec-584fdcc9-761a-4d01-a058-a833482205a1.png`。
- 本目录：`night-shop-source.png`；生产：`public/assets/exploration-014/day01/night-shop.png`。
- 原生尺寸 1672×941，统一映射到 1600×900 世界；不拉伸主角。

完整提示词：

> Use case: stylized-concept. Asset type: production 2D pixel adventure game room background, landscape 16:9. Image 1 is STYLE REFERENCE ONLY: preserve its richly detailed crisp pixels, tiny cozy proportions, warm amber light against rainy blue shadows, orthographic elevated three-quarter view. Create NEW interior of the bright little convenience shop in the right of that reference. NO people or animals, player added by engine. Whole room cutaway, roof removed, floor fully visible, no foreground walls hiding the walk area. Composition: broad rectangular single-floor room, camera fairly overhead, back wall along image top. Two connected play zones: left 60% cozy neighborhood shop with shelves/counter only against back/left walls, right 40% quiet repair-and-reading corner. A short shelving divider in upper middle, with a wide opening in the center so both zones connect on the SAME flat floor. Bottom center a clearly visible open double glass entrance with blue rainy pavement beyond its threshold, clear wide walkway from entrance to back. At least 65% uncluttered WALKABLE wood/tile floor; furniture is placed at margins, spaced apart and readable. Distinct large-enough objects: red hand-crank radio on back-left low counter, a neat screwdriver in a small opened tool tray on back-right workbench, raincoat umbrella with detached tip laid on same workbench beside tray, stack of city postcards on separate small left reading table, green book and pressed leaf on lower-right reading desk, small round rain-streaked window high in right wall with warm window seat below. Back center noticeboard with illustrated umbrella repair diagram (NO readable letters), back-left jars and few bread baskets. Floor has a little cat bed along right wall but NO baked cat. A framed picture of this rainy street near the reading chair. No icons, no glowing outlines, no labels, no text, no UI, no vignette or blur. NOT concept montage; one continuous navigable interior map filling canvas. All props follow the same three-quarter perspective and pixel density as reference.

## 修伞完成态

- 编辑对象：已查看的 `night-shop.png`。
- 原始输出：`C:/Users/hrcao/.codex/generated_images/01a07e7f-2a53-7281-b63a-59e45111c1ba/exec-7aa4f50c-2c24-4ce0-ac1d-7ec385d7cb69.png`。
- 本目录：`night-shop-repaired-source.png`；生产：`public/assets/exploration-014/day01/night-shop-repaired.png`。
- 运行时仅采原生 crop `(1116,145,180,123)`；世界宽高分别乘 `1600/1672`、`900/941`，相对蓝伞节点 `(1203,254)` 的中心/底部偏移为原生 `(3,14)`。不替换整个房间，不改变家具碰撞。

完整提示词：

> Use case: precise-object-edit. Image 1 is EDIT TARGET. Make ONLY ONE localized change: the folded navy umbrella on the upper-right repair workbench is now repaired and laid partially OPEN on exactly the same tabletop. Show a neat taut blue canopy with intact ribs and a little gold fastening tip; keep its hooked handle near its existing location. This umbrella must remain entirely within the workbench tabletop, not spill onto floor or obscure neighboring tool tray. Preserve every other pixel/room architecture/composition, walls, furniture, tool tray, shelves, colors, light, canvas dimensions, pixel art style, whole image framing. No people, labels, icons, light circles, no new furniture. Output full image with the one changed object so a registered rectangular patch around the umbrella can be cropped.

## 审图与注册

两张输出均已直接查看。底图有同地坪、清晰双开门、大块连续通道，工作台/低柜/中岛/阅读桌实体可辨识。初稿提示中的伞帽微小细节不足以独立作为谜底，故文案明确描述松动螺钉，墙上图解提供完整操作顺序，不要求从像素猜螺钉。完成态伞面明显展开，用于实际状态反馈。

动物不烘焙进底图，使用共享猫狗图集；猫窝是环境家具，不是猫实体。所有静态发现绑定原生实物，不另加程序家具。

导航验收脚本：从项目运行 `node design/exploration-014/day01/audit.mjs`。
