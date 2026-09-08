# Shared animal atlas · 0.14

Built-in imagegen, not API fallback. Style reference: `public/assets/sprites/life-actors.png` (viewed before generation). First source returned a checkerboard instead of true alpha; it was not accepted as production transparency. Second built-in edit replaced only the background with technical magenta. `build-alpha.ps1` deterministically removes saturated magenta, preserving neutral fur/eyes; production RGBA lives at `public/assets/sprites/critters.png`.

## Original generation prompt

Use case: stylized-concept. Asset type: production pixel-art animal animation sprite sheet for a cozy isometric exploration game. Image 1 is STYLE reference only. Generate a square sheet with EXACTLY 4 columns and 4 rows of equally sized cells, no drawn grid, no labels. Row 1: same small orange tabby kitten in four right-facing walk-cycle poses. Row 2: same cute short-legged brown and cream puppy in four right-facing walk-cycle poses. Row 3: same tiny warm gray mouse with pink ears and long tail in four right-facing walk-cycle poses. Row 4: same orange kitten in four right-facing calm sniffing/idle poses. All animals are fully visible, consistent size and same feet baseline inside each row, generous empty padding between every cell. Match reference detailed crisp outlined Q pixel art, three-quarter top-down game view, black-brown outlines, gentle shading, no objects or boxes, no people. Each animal faces RIGHT in EVERY cell; animate the paws and tail only, do not rotate or redesign the body. Actual transparent alpha background throughout, no checkerboard, no floor, no scenery, no shadows outside silhouette. No text, no UI, no watermark. Make silhouettes distinctly readable at 30-40 world pixels high.

## Background edit prompt

Use case: background-extraction. Image 1 is the EXACT edit target animal animation atlas. Change ONLY the entire white-gray checkerboard background into perfectly uniform solid pure magenta RGB(255,0,255), for deterministic production chroma-key extraction. All gaps between paws, tail and body outside each silhouette must also be exactly pure magenta. Preserve every cat, dog, mouse pixel, pose, size, position, row, cell, outline and ALL feet alignments. Keep exact square framing and resolution. No grid lines, no shadows on the background, no gradient, no labels, no new objects. No magenta over animal artwork. The magenta is a technical background only, not a design element.

## Runtime

Four equal cells per row. Cat frames 0–3, dog 4–7, mouse 8–11, cat sniff 12–15. Mirrored hit testing follows mirrored rendering; patrol motion uses current scene navigation. Animals pause while approached, have no blocking collider, and never award repeated collectibles. No separate front/back animal sprites are claimed.
