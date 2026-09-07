# 矿洞 0.13 机关位图生成记录

使用内置 image_gen；DAY 08 地图只作风格与透视参考，未覆盖原背景。透明生成与一次定向重试实际输出 RGB 棋盘底，未作为生产资产使用；后续使用内置编辑生成纯品红技术底，build-alpha.ps1 确定性去除品红后保存真正 RGBA PNG。中性白/灰不参与抠色，以保留纸面与高光。

## wall

Use case: stylized-concept. Asset type: transparent 2-state environment sprite sheet, same one breakable cave wall asset. Image 1 is ONLY the visual reference for pixel-art density, dim blue-violet rock texture, cyan cave lighting and elevated three-quarter camera. Do NOT redraw the map. Create a PNG with genuine transparent alpha, no opaque backdrop, no checker pattern. Exactly TWO equal panels side by side with clear generous transparent margins, no text. LEFT: a small rough fissured thin cave wall blocking a shallow niche, irregular blue-gray stone slabs with one narrow warm dusty crack, no doorframe or arch, textured irregular natural stones and cool dim shading. RIGHT: the exact same exterior rock silhouette and angle after the fragile middle is broken; a shallow dark niche is exposed with a small walkable-looking stone shelf INSIDE, broken loose stones down at the foot, no chest or reward inside. Both sprites share identical support/base at bottom and perspective, viewed from above at about 35 degrees; the left face is visible, the upper edge slopes gently up-right. This will be placed against the cave's upper-left vertical cliff, not freestanding on a floor. Low contrast matte cave rock, pixel clusters not flat vector polygons, no bright outline or glow ring. Keep camera and silhouette perfectly consistent across states. No water, no background scene, no characters, no UI, no labels, no framed tiles.

色键编辑提示：

Use case: background-extraction. EDIT TARGET is this exact game sprite image. Replace ONLY the entire white-and-gray checkerboard with one perfectly solid uniform pure magenta background RGB(255,0,255), hex #ff00ff. All holes and gaps outside the object must be the identical pure magenta. No shadows on magenta, no gradients, no checkerboard, no border, no new elements. Keep the original wall object artwork, pixel edges, material texture, geometry, alignment, dimensions and scale exactly unchanged. Do not recolor the actual sprite. The magenta is a technical chroma key for mechanical preprocessing, not game art. Do not draw magenta over any object detail.

## hammer

Use case: stylized-concept. Asset type: one isolated transparent game-world mining tool sprite. Image 1 is ONLY the style reference: detailed crisp clustered-pixel cave map, cool blue-violet bounce light, warm tiny highlights, elevated three-quarter overhead camera. Generate one small battered leather tool pouch resting flat on cave ground, a short realistic wooden-handled steel rock hammer tucked diagonally into the open pouch with head exposed. Object not an inventory icon; show top surface and right side from above, physical dark contact shadow attached to its base, believable worn muted leather and steel texture. Genuine transparent alpha PNG with ample transparent margin, no checkerboard, no background floor tile, no ground patch, no additional items, no outlined frame, no text, no logo. Muted small useful tool that will render only 28px high next to a 70px character, not a giant basket.

色键编辑提示：

Use case: background-extraction. EDIT TARGET is this exact game sprite image. Replace ONLY the entire white-and-gray checkerboard with one perfectly solid uniform pure magenta background RGB(255,0,255), hex #ff00ff. All holes and gaps outside the object must be the identical pure magenta. No shadows on magenta, no gradients, no checkerboard, no border, no new elements. Keep the original hammer object artwork, pixel edges, material texture, geometry, alignment, dimensions and scale exactly unchanged. Do not recolor the actual sprite. The magenta is a technical chroma key for mechanical preprocessing, not game art. Do not draw magenta over any object detail.

## cache

Use case: stylized-concept. Asset type: one isolated transparent game-world keepsake sprite. Image 1 is ONLY style reference for crisp clustered-pixel texture and overhead three-quarter cave perspective, not edit target. Create a tiny opened battered wooden keepsake box with a single folded cream handwritten diary inside, subdued brown wood in cool blue-violet ambient cave light and very faint warm top edge. The box rests on a stone shelf, but do NOT draw the shelf. Show small top opening and right face at matching elevated 35-degree three-quarter perspective. Genuine transparent alpha PNG with ample empty margin, no background, no checkerboard, no floor patch, no glow halo, no UI frame or icon treatment, no legible text, no gems, no coins, no characters. It is an intimate old miner's diary, not a gold treasure chest, rendered about 22px high in game.

色键编辑提示：

Use case: background-extraction. EDIT TARGET is this exact game sprite image. Replace ONLY the entire white-and-gray checkerboard with one perfectly solid uniform pure magenta background RGB(255,0,255), hex #ff00ff. All holes and gaps outside the object must be the identical pure magenta. No shadows on magenta, no gradients, no checkerboard, no border, no new elements. Keep the original cache object artwork, pixel edges, material texture, geometry, alignment, dimensions and scale exactly unchanged. Do not recolor the actual sprite. The magenta is a technical chroma key for mechanical preprocessing, not game art. Do not draw magenta over any object detail.

## vine

Use case: stylized-concept. Asset type: one isolated transparent game-world vine barrier sprite. Image 1 is only reference for crisp clustered-pixel art, dim blue-violet glowing cave palette and overhead 35-degree three-quarter camera. Produce a compact tangled living vine barrier across a narrow stone flower bridge, viewed from above looking north-east. Two mossy root knots at left and right bottom support crossed woody purple-brown stems with small teal leaves and just 3 tiny violet flowers; asymmetrical organic silhouette with transparent gaps, delicate and grounded, no doorway or manmade wooden supports. Can retract as a single mass toward a bridge edge during animation. Genuine transparent alpha PNG, no background scene, no floor/bridge patch, no checkerboard, no light ring, no glowing box, no white outline, no text, no UI icon style. Match the reference's rock and plant light levels, avoid bright cartoon green. Pixel art should have rich irregular texture, not simple flat geometric vines.

色键编辑提示：

Use case: background-extraction. EDIT TARGET is this exact game sprite image. Replace ONLY the entire white-and-gray checkerboard with one perfectly solid uniform pure magenta background RGB(255,0,255), hex #ff00ff. All holes and gaps outside the object must be the identical pure magenta. No shadows on magenta, no gradients, no checkerboard, no border, no new elements. Keep the original vine object artwork, pixel edges, material texture, geometry, alignment, dimensions and scale exactly unchanged. Do not recolor the actual sprite. The magenta is a technical chroma key for mechanical preprocessing, not game art. Do not draw magenta over any object detail.

## 注册规格

原图与品红中间稿在本目录；生产文件在 public/assets/scene-013/cave/。裁切和世界尺寸以 day08.ts art 字段为准；SceneRaster 只读 RGBA，不运行时猜测背景。裂壁双态共用锚点，不生成新的上爬岩壁道路；壁龛仅允许在轨道旁安全调查。
