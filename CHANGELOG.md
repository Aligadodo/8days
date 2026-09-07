# Changelog

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
