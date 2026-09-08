# Changelog

## 0.16.0 - 2026-09-08

- Exposed Backpack, Shop, Companions, Achievements and More as direct drawer destinations, with readable HUD labels and a dedicated achievement quick slot.
- Added a dismissible/reopenable introduction, current-scene supply counts, known safe resource recommendations, exact approach navigation, cooldown guidance and hover-only action/loot information.
- Combined global and local achievements into visible condition/progress cards and completion filters; retained clues, journal, save and settings under More.
- Added 15 renewable supply sources through 11 new nodes and four upgrades of existing interactions. Total: 138 life definitions, including 47 renewable sources, 41 one-time containers and 50 inspections.
- Migrated two formerly one-time public containers to replenishable supplies with a full first cooldown, preserving old claims without an upgrade-time bonus.
- Kept artwork, collision, mainline requirements, prices and active-time renewal rules intact. DAY05's new gathering stance was corrected to genuine reachable floor.
- Corrected post-transaction and nested-page keyboard focus, clarified stock versus actually guidable resources, and made the introduction avoid the expanded/collapsed minimap. All 255 tests, both eight-map audits and the production build pass; isolated browser sampling covers the collection/shop/achievement loop, persistence and narrow layouts.

## 0.15.0 - 2026-09-08

- Added 127 life interactions across 16 scenes (43 one-time containers, 32 renewable sources, 52 repeatable inspections; 13 share existing discovery objects).
- Added a cross-day stack inventory, 10 material/consumable types, 12 context-appropriate loot tables, coin exchange, atomic transactions, and four life achievements. No real-money purchases.
- Added repeatable cat/dog/mouse adoption, up to 12 owned and three deployed followers, with continuous collision-safe movement and persisted party selection.
- Preserved v2 campaign progress while storing claims, inventory, pets, active-play renewal time and consumable effects. Reload/replay cannot reroll a claimed container.
- Fixed DAY02 opened-door silhouette masking and narrow diagonal navigation; fixed DAY04 floating-point corner stops. Ground clicks fall back to reachable safe floor without relaxing interaction stances or collision.
- Added four registered container open-state patches and compact backpack slots. Remaining container art/animation coverage is explicitly documented, not advertised as complete.

## 0.14.0 - 2026-09-08

- Authored eight optional multi-area interior maps connected to real outdoor doors, without claiming that every background building is enterable. Shared main-task doors provide explicit enter/investigate choices; the waterfall observatory retains its stepping-stone prerequisite.
- Added 99 discovery nodes (24 outdoor, 75 indoor), including 38 archive rewards, 14 photo/check-in nodes, 16 local achievements, and nine visible cat/dog/mouse actors. These attribute counts overlap and are not extra nodes.
- Added optional umbrella/radio repairs, seedling care, water-record maintenance, cooking and observation sequences, lost-property checking, and capillary-wick cultivation. Collections never gate the campaign's existing puzzles, passcodes or stamps.
- Added shared room transitions, per-room exploration memory, navigable patrol actors, scene-registered restoration patches, prerequisite/sequence validation, and duplicate-safe discovery settlement inside the existing inventory/journal.
- Extended v2 saves additively: retain collections when replaying a day, preserve each room's exploration, and reload interior saves at the outdoor doorway rather than applying indoor coordinates to the original map.
- Archived generated sources, complete prompts, registration data and per-day audits with code. Added release documentation and portable asset-processing defaults; environment files and explicit temporary QA folders are ignored.
- Registered all eight packs. The 112-test suite passes, including 46 exploration tests covering all 99 nodes with real navigation/update logic, save/return behavior, duplicate rewards, prerequisites, sequences, patrol safety, pause/hazard isolation, missing images, legacy saves and stale shared-door callbacks. Both eight-map audits and the production build pass.
- Fixed shared-door modal pause ownership and Tab focus containment; room footsteps now follow wood/stone surfaces, including the valley workshop's diagonal material seam.
- Added `npm run audit:exploration`. Browser visual sampling opened all eight production rooms through the isolated development review entry, checking backgrounds, walkable spawns, minimaps and animal composition. DAY01 real doorway navigation, cabinet routing, diagram/tool interactions and refresh persistence, plus DAY02 fullscreen entry/exit, pass; browser warnings/errors were empty.
- Completed local acceptance within the documented sample: DAY03 returned through its real door to the outdoor mill stance, opened the shared-door chooser, retained pause and cyclic Tab focus, re-entered the room, and displayed discoveries, local achievements and the eight-day album in the journal. DAY04 shared-door UI has logic regression coverage but was not manually exercised. This is not manual traversal of all 99 nodes or human playtesting; GitHub push confirmation is recorded separately.

## 0.13.0 - 2026-09-08

- Established seven independent visual acceptance gates and split eight world definitions into separately owned files for parallel fixes plus independent review.
- Audited all 56 original targets and seven mechanisms; bound existing map objects to interaction, reduced duplicate props, corrected support planes, scale, text and approach stances.
- Replaced floating flat office furniture with a wall-mounted inspection control and map-matched door patches; replaced cave placeholders with authored RGBA assets and a reachable wall recess, without a road climbing the cliff.
- Added registered scene raster loading, alpha hit tests, thin hover outlines, background-patch composition, and real baked-object redraw at support depth. Mounted props no longer receive floor shadows; unloaded or removed props cannot leave clickable rectangles.
- Refined small-prop footprints and removed collision for collected tools without a remaining body. Preserved v2 puzzle progress with layout revision 13.
- Corrected ambiguous load-balancing clues in the ferry and gondola puzzles without changing campaign codes.
- Close-up office QA rejected a remaining wall-top stance and incorrectly connected pillar-side door: authored a real low-partition opening, blocked the old stance permanently, and walked the revised route in-game.
- Removed contradictory duplicate option letters and kept small falling-object aftermath fragments on real floor only. The merged regression suite now passes 66 tests.
- Added a no-save visual review mode to the calibration page and independent visual-contract regression tests. Static checks and art inspection remain explicitly separate from end-to-end human playtesting.

## 0.12.0 - 2026-09-08

- Recalibrated eight floor plans with named furniture, wall, cliff, roof, tree and vehicle obstacles; all 56 original targets now have authored interaction stances.
- Added continuous static segment collision and per-step movement checks, 8-pixel navigation resolution, cached static visibility, and limited ground-click snapping. Stale routes cannot pass through solid objects.
- Added a powered lever and sliding archive-cabinet secret door in the office, plus a reusable hammer, breakable thin wall and optional keepsake alcove in the cave.
- Tied conditional passages, visible gates, stone crossings and minimap changes to shared world state; hidden keepsakes do not leak before discovery.
- Added staged world actions, impact/slide/latch sounds, cancellable actions and persistent exploration rewards inside the existing backpack/journal.
- Preserved v2 progress with layout-revision checkpoint migration and grandfathered office access for advanced saves.
- Added a read-only map calibration page and seven regression tests (40 total), including all side-task approaches and independent blocked-space probes.


## 0.11.0 - 2026-09-07

- Replaced global modulo hazard timing and instant death dialogs with scene-local warning, release, contact, aftermath and recovery states across 16 hazards.
- Added a tangible cafe sign: dust and creaking, a full 1.5-second evacuation window, a 0.42-second fall, ground-contact collision, debris and a persistent broken sign for the current attempt.
- Added a successful-escape branch without a death modal or lingering invisible damage.
- Added non-graphic collapse/submerge, fading, a rising scarf-wearing soul and a death dialog delayed until 2.45 seconds after impact, with actual game time and a causal recap.
- Added material-specific synthesized warning/impact audio, temporary ambience/music ducking, hidden-tab audio suspension and motion-reduced presentation.
- Added water, electric, wind, smoke, steam, falling-object and train effects; train contact follows its moving carriage.
- Preserved v2 progress/checkpoints; retries reset physical danger states with a fresh protection period. Cinematic input cannot skip or double-count death.
- Added 12 hazard/cinematic regression tests (33 total), a development-only accident review entry and a detailed interaction authoring specification with honest remaining scope.

## 0.10.0 - 2026-09-07

- Replaced mixed-facing walking frames with a consistent 16-frame traveler atlas and stable direction hysteresis.
- Rebuilt navigation around eight authored floor plans, direct line-of-sight movement, 8-neighbor A*, corner clearance and string-pulled routes.
- Replaced all 56 abstract interaction markers with reusable world sprites; added alpha-hit testing, hover-only silhouette outlines and feet-based depth sorting.
- Added visible cat rescue, snowman/monitor/fern states, actor responses and contextual synthesized sounds.
- Added a collapsible minimap with persistent explored fog, player heading, viewport, discovered objects, route and nearby hazard indicators.
- Unified hazard geometry; movement can wait at an active danger boundary and resume the original destination.
- Added main-puzzle checkpoints, persistent shared hint stages, local final-code memory cards, and per-day stamp identity preserving repeated characters.
- Updated full-screen and portrait camera sizing, collapsed guidance, five-slot pocket access, and Escape/Enter actions.
- Shuffled puzzle choices deterministically and require full sequence submission instead of exposing per-step correctness.
- Re-authored waterfall stairs and made its stepping-stone puzzle reveal a physical, navigable crossing.
- Added automated navigation, eight-day interaction/progression, persistence and movement regression tests, plus an implementation-vs-roadmap design audit.

## 0.9.1 - 2026-09-07

- Replaced the single-sprite sliding motion with distance-driven front and back walking frames while retaining the established yellow-coat traveler identity.
- Added direction memory: upward routes use dedicated backpack-facing art, horizontal routes mirror consistently, and stopping preserves the last facing direction.
- Added eased acceleration and braking, stride-synchronized body lift, subtle lean, landing squash, idle breathing, and stable foot anchoring.
- Synchronized footstep audio with actual distance traveled instead of elapsed time and selected grass, wood, or stone cues by environment.
- Added short-lived material feedback at each landing: rain ripples, snow impressions, and subtle ground footprints.
- Added a distinct reaching/inspection pose for puzzle, side-task, and exit interactions.
- Verified front gait alternation, upward gait alternation, back-facing idle settle, rain ripples, and the absence of runtime error UI in the in-app browser.

## 0.9.0 - 2026-09-07

- Replaced all eight programmatic whitebox environments with authored high-detail 16:9 pixel-art scene paintings derived from the approved concept direction.
- Added a unified chibi traveler asset with a yellow rain jacket and turquoise backpack, including runtime chroma-key trimming for a clean canvas sprite.
- Re-authored player starts, puzzle anchors, side-task anchors, exits, danger zones, and hidden navigation networks against the new environment compositions.
- Replaced persistent debug rectangles and labels with gold diamond main-task markers, mint circular side-task markers, compact contextual labels, circular exits, and elliptical danger telegraphs.
- Added level-art thumbnails to the campaign selector so all eight visual identities are visible before unlock.
- Added danger-aware mouse routing: active hazards block pathfinding, warning zones add route cost, and routes pause if a danger activates ahead.
- Added puzzle-to-world causality: solving the rain drain removes electrified water and solving the waterfall valves calms the rapid, both with a restored-area sparkle state.
- Fixed fullscreen rendering to letterbox the 16:9 canvas instead of stretching it to arbitrary monitor ratios.
- Added runtime validation for production map paths, hazard-resolution references, and interaction connectivity to authored navigation networks.
- Added a three-role AI player review covering art direction, exploration usability, and level-design integrity.

## 0.8.0 - 2026-09-07

- Replaced the single-level implementation with a data-driven eight-level campaign covering rain commute, late office, flower valley, rainbow falls, autumn river, mountain storm, snow station, and glowing underground river.
- Added 32 authored main puzzles across sequence, conditional choice, pattern completion, and numeric deduction interactions.
- Added two optional humane side tasks, two telegraphed hazards, four symbol-to-digit clue rewards, and a distinct ending to every level.
- Reworked final passcodes into a second deduction: the exit supplies symbol order while the journal stores symbol-to-digit relationships.
- Added a persistent objective card, progress count, action rationale, off-screen direction arrow, gold current-target outline, and H1–H3 optional hint ladder.
- Added rule-specific wrong-answer feedback and retained discovered knowledge after death.
- Added a campaign selector, sequential unlocking, per-level completion statistics, eight diary stamps, and the final phrase “好好生活，明天再见”.
- Added campaign save format v2 for unlocks, completion, stamps, puzzle progress, side tasks, hints, and deaths.
- Added true Fullscreen API support, fullscreen state feedback, strict 16:9 page sizing, 960×540 logical rendering, and a 2x non-smoothed Canvas buffer.
- Consolidated inventory, journal, save, settings, audio, accessibility, and campaign return into the existing foldable menu.
- Added runtime campaign validation for content budgets, dependency references, hint counts, pattern slots, and derived passcodes.

## 0.4.0 - 2026-09-07

- Added a professional puzzle-authoring framework covering puzzle contracts, teaching curves, hint escalation, state recovery, and playtest metrics.
- Designed the Spring Flower Valley 0.4 puzzle chain around waterwheel repair, picnic completion, wind teaching, flower-and-bee state changes, and icon-based passcode reconstruction.
- Defined a reusable audio event language for UI, navigation, footsteps, items, puzzles, hazards, ambience, music, death, tasks, and achievements.
- Added accessibility requirements for important-sound captions, multisensory cues, independent volume groups, mono output, and silent play.
- Added a reusable level, puzzle, hazard, audio, and playtest authoring template.
- Added a Web Audio event layer with synthesized prototype cues for UI, navigation, three footstep materials, items, puzzles, hazards, death, tasks, and achievements.
- Added independently persisted master, music, effects, and ambience volumes, plus important-sound captions and mono output.
- Reworked the opening clue into a trowel-and-sluice puzzle with three audible knocks and three matching visual pins instead of a printed number.
- Added a safe wind-ribbon teaching beat, directional warning captions, first-hit pushback, and lethal repeat failure.
- Replaced the final door's literal number labels with waterwheel, cup, flower-message, and eave memory symbols and per-symbol input feedback.

## 0.3.0 - 2026-09-06

- Added a four-color pixel-outline language for story, utility, optional, and discovery interactions, with hover and completed states.
- Expanded the valley with a rest bench, refillable spring, readable waystone, reactive beehives, and five collectible nature observations.
- Added three optional daily tasks and nine persistent achievements without introducing new top-level UI pages.
- Expanded the journal with task status, discovery collection, achievement grid, and overall completion percentage.
- Persisted discoveries, side activities, and achievements across reloads and death retries.
- Added river lilies, blossom accents, new interactive props, and richer environmental relationships.
- Documented the reusable content library, interaction state model, map density budget, and staged implementation plan.

## 0.2.0 - 2026-09-06

- Replaced keyboard-first navigation with mouse-first click-to-move, hold-to-follow, object auto-approach, route feedback, and right-click cancel while retaining keyboard controls.
- Added deterministic A* navigation for static world geometry without automatically avoiding gameplay hazards.
- Increased Canvas rendering to a 2x backing buffer and moved to a closer `800×450` logical camera.
- Reworked grass texture, river banks, trail edges, environmental clusters, ridge stones, bee boxes, and navigation landmarks.
- Moved the windmill into the spawn view and rebuilt the opening route for clearer onboarding.
- Added a sourced reference analysis and updated the design, art, level, roadmap, and QA documentation.

## 0.1.0 - 2026-09-06

- Created the standalone game project.
- Archived nine concept-art images with semantic names.
- Added the game design, art direction, level blueprints, roadmap, and decision log.
- Implemented the Spring Flower Valley playable prototype with movement, camera, collisions, contextual interactions, five quick slots, a foldable pocket menu, local saves, four persistent clues, two telegraphed lethal hazards, death-and-retry flow, passcode input, and level completion.
