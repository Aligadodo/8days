# DAY02 · v0.15 container state provenance

## Outcome: accepted tight empty-box patch

Source/production: `copier-box-open-source.png`, full native 1672×941. Only crop `(932,516,49,56)` is consumed with explicit world registration. Browser six-times CSS comparison of original, candidate and actual crop over original confirms a dark empty box mouth. No whole-scene replacement or shell/Python raster processing. `preview.mjs` serves unmodified source bytes on an ephemeral local port for read-only comparison.

- Built-in imagegen; no CLI fallback, no shell/Python raster edits.
- Original production map inspected before edit. Full generated source is retained; runtime consumes only registered crop, leaving other objects unchanged.
- Exact prompt:

Use case: precise-object-edit. Asset type: exactly registered opened-container state for a 2D pixel adventure game. Input Image 1 is the edit target: existing production night-office map, native 1672x941. Preserve its full canvas, camera, pixel style, dark warm lighting and ALL original geometry. Change ONLY the small brown cardboard recycling box standing on the floor immediately in front of the copier/bookcase, native image x932..980 y520..572, slightly right of center. Fold its top cardboard flaps outward a little so its open dark EMPTY interior is visible. Keep its footprint, front and side panels, scale and floor shadow registered. Do not add contents, symbols or glow. Do NOT edit the copier, drawers, shelves, doors, posters, nearby papers, walls or other boxes. Limit changed pixels to x922..987 y505..575. The rest of the whole image must stay identical. Full original-size scene output, not a closeup. This will be consumed as a tight state-patch crop, so exact position and matching bordering pixels are essential.
