# DAY08 图像生成记录

## 修复状态图提示（field-lab-watered-source.png / field-lab-watered.png）

Use case: precise-object-edit. Image 1 is edit target: finished pixel RPG mine laboratory background.
Change ONLY the dry growing trough at the right middle, native bounds roughly x1172 y306 to x1555 y508 in the 1672x941 image. Preserve every other pixel, exact camera, dimensions, geometry, doors, mushrooms, tables and lighting. Show repaired capillary irrigation: three narrow blue cloth wick strips resting physically OVER the front wooden edge, with their lower ends immersed in the existing blue water gutter and upper ends lying on the brown substrate. A small darker damp patch spreads from each cloth tip on the substrate. Do NOT add grown mushrooms or spray fountains. Keep the single existing small cyan mushroom at far right. Water gutter stays where it is, trough footprint and silhouette unchanged. Crisp pixel art in same palette. No text or symbols outside scene. Output full same image, not cropped.

运行时只取修复图原生像素 `(1170,300,390,215)`；与原图等比注册，目标左上角也是相同的世界坐标。未用程序绘制替代任何场景位图。

工具：内置 imagegen；参考图 `public/assets/maps/day08-glowing-river.png`（只作风格参考）。原图及正式图均完整保存，不使用概念图假标定。

## field-lab-source.png / field-lab.png

Use case: stylized-concept
Asset type: production background for a 2D pixel exploration game, 16:9 landscape.
Image 1 is ONLY style reference (existing glowing cave). Create a NEW interior of the timber-framed mine entrance: a miners' field laboratory connected to a mushroom cultivation room. Crisp 16-bit block pixel art, elevated three-quarter top-down RPG view like reference, purple/navy rocks, cyan mushrooms and amber work lamps. No characters, no UI, no text, no watermarks.
Entire enclosed room shown, wide 1600x900 world composition. Outer rock walls. Left laboratory occupies left half, right mushroom nursery occupies right half; a short rock dividing wall at top center ends before the middle so a wide horizontal stone walkway joins both zones. Broad continuous uncluttered dry stone floor across lower half. ONLY entrance/exit is a clearly open timber threshold centered in bottom wall, facing viewer; no other doors, black tunnels, or open inaccessible cave entrances.
Back-left against wall: low wooden workbench bearing open cream field notebook at left, a shallow tray of several loose quartz chips at center, brass magnifying instrument at right. At upper center-left a separate small table bearing a copper watering can and folded cloth. Right zone: back wall holds TWO low timber mushroom growing troughs, one lush glowing cyan cap bed at upper right, one dry brown substrate trough farther down on right side, with obvious empty shallow water channel along its front and a small cyan mushroom growing at damp end. On wall above dry trough a framed simple pictorial care diagram showing watering can arrow to trough then mushroom, no letters. A small round stone shelf at lower-right bears several paper spore prints with a mushroom silhouette. Small squat closed supply crates at far lower-left. An amber lantern hangs beside bottom doorway. All objects clean distinct silhouettes; all tabletop objects have clearly visible support; approachable from floor in front. Do not put furniture across center path or doorway. No pools, pits, bridges, rails indoors. Render room boundaries and furniture footprints clearly for collision calibration.
