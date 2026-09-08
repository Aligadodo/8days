# 登记抽屉开态资产

工具：内置 image_gen.imagegen，2026-09-08。使用imagegen技能已读的SKILL.md及prompting/sample-prompts指南。编辑前view_image查看原目标。

输入（edit target）：public/assets/exploration-014/day07/waiting-room-v1.png。
生成原稿：design/life-015/day07/register-drawer-open-source.png。
生产源图：public/assets/life-015/day07/register-drawer-open-v1.png。
原始工具结果：C:/Users/hrcao/.codex/generated_images/01a07e9b-dced-7a33-8a7e-e68677e0f551/exec-4643a9aa-3edf-4218-8dde-f6c925394674.png。
两份均为1672×941未重采样PNG；生产仅消费裁片，不使用整张生成图替换背景。无shell/python绘制或编辑位图。

## 完整提示

Use case: precise-object-edit. Image 1 is the EDIT TARGET. Keep the exact 1672x941 full image framing, all geometry and every object unchanged. Change ONLY the small center drawer of the wooden register desk in the lower right: original drawer front approximately x1371..1471 y565..591. Pull this ONE drawer forward slightly, toward the viewer/downward by about 14 pixels, revealing a dark EMPTY wooden drawer interior and its thin side rails. It has already been searched and is empty. Keep the open drawer entirely inside x1362..1482 y562..616, so it does not extend beyond desk feet. Preserve desk tabletop, open ledger, brass stamp, desk legs, floor, lighting and pixel art exactly. No other drawers open. No added labels, symbols, items, characters or UI. This is a production state patch for the existing pixel game map, not a redesigned scene. Crisp same pixel clusters, identical perspective and warm brown wood.

## 输出检查与实际注册

生成结果已目视检查：只有登记台中间抽屉的开态用于生产。最终实际抽屉比提示估计更靠左，位于约1345..1443；按实际图像校正baked为[(1348,566),(1441,566),(1441,592),(1348,592)]，保留原节点位置与操作站位。

crop=(1338,562,112,59)，世界缩放X=1600/1672、Y=900/941，width=112X、height=59Y。节点锚点(1437X,596Y)，offset=(-43X,25Y)，使用共享artBounds公式得到左上恰为(1338X,562Y)，右下(1450X,621Y)。原桌脚约619源像素，开态只下探2源像素；操作站位仍为(1430X,655Y)，裁片至脚底保留34Y>25世界像素。原闭态baked位于新开态空腔内，不留下远离抽屉的旧热点；不将整张矩形裁片作为点击范围。柜体现有障碍保留，不扩张地板。

afterArt仅在该container已领取（lifeAvailable为false）时由公共drawScenePatches绘制；未领取时仍原闭态。抽屉空着留开，文案同步。该图属于固定柜体表面局部状态，不增加漂浮物件。未声称浏览器角色合成已实测，需主任务在桌前/左右走动确认共享渲染层的遮挡。数值边界、站位与导航已有可执行审计。
