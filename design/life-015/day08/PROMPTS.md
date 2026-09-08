# DAY08 v0.15 局部容器状态图

工具：内置 imagegen。输入目标为 `public/assets/exploration-014/day08/field-lab.png`，调用前已 view_image 查看；源图和生成结果均已人工查看。

生成源：`upper-crate-open-source.png`。正式资源：`public/assets/life-015/day08/upper-crate-open.png`。保存完整生成图；运行时只回贴 `(55,475,155,180)`，不引入图外生成差异。

## 完整提示

Use case: precise-object-edit. Image 1 is the exact existing production RPG pixel background, 1672x941. Edit ONLY the lid of the upper large wooden crate in the bottom-left stack: crate body native coordinates approximately x80..196 y520..648. Show this one crate with its lid hinged open toward back-left, revealing a dark interior with a few small mixed salvage offcuts remaining; do not empty whole box. Preserve crate body, lock/front clasp, lower supporting crate, neighboring right crate and small box, all floor and wall geometry and EVERY other object exactly. Open lid must stay within native rectangle x55 y475 width155 height180. Preserve exact full image 1672x941, camera, perspective, light, crisp pixel style. No other crates open; no new props, text, symbols, UI, or characters. Output full original composition.

## 精确注册

原生锚点 (145,634)，offset (-12.5,21)，宽高 (155,180)，因此共享 artBounds 的左上角为 (55,475)，右下角 (210,655)。所有值统一乘以 (1600/1672,900/941)。开盖不改下层承重箱，也不增加通行区；只完成上层大箱的静态开态，没有声称其他容器已有开态动画。
