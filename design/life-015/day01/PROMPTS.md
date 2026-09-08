# DAY01 下抽屉取空开态

工具：内置 image_gen（2026-09-08）。编辑目标：public/assets/exploration-014/day01/night-shop.png。已先用 view_image 查看完整原图，再生成并目视检查输出。未用脚本绘制或修改像素。

完整提示：

Use case: precise-object-edit. Asset type: pixel game registered container open-state. Image 1 is the EDIT TARGET, the whole night shop at exactly 1672x941. Change ONLY the LOWER drawer of the dark two-drawer cabinet UNDER THE RIGHT END of the umbrella repair table, native pixels x1178..1264, y299..334. Pull that one lower drawer slightly forward toward camera, revealing its EMPTY wooden interior, with the original small brass handle on its front. Keep the upper drawer, cabinet legs and table absolutely unchanged. The opened drawer should fit entirely within x1170..1272, y297..361; do not extend past y361 where people walk. This is a modest 10-20 pixel extension, not a new oversized box. Preserve exact canvas dimensions, camera, every pixel outside that small region, original warm lighting and clustered pixel detail. Do not change or open the brown crate left of it. Do not alter umbrella, tools, table top, shelving, floor elsewhere, windows or doors. No characters, UI, labels or added objects. Output the entire unchanged room with this single lower drawer opened and empty, for precise crop overlay registration.

输出保存为 drawer-open-source.png；正式资源为 /assets/life-015/day01/drawer-open.png。仅通过 afterArt 使用源像素 crop {x:1170,y:297,width:102,height:66}；整幅输出不替换原场景。输出和原图均为1672×941，世界为1600×900。
