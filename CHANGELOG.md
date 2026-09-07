# Changelog

## Unreleased

- Added a professional puzzle-authoring framework covering puzzle contracts, teaching curves, hint escalation, state recovery, and playtest metrics.
- Designed the Spring Flower Valley 0.4 puzzle chain around waterwheel repair, picnic completion, wind teaching, flower-and-bee state changes, and icon-based passcode reconstruction.
- Defined a reusable audio event language for UI, navigation, footsteps, items, puzzles, hazards, ambience, music, death, tasks, and achievements.
- Added accessibility requirements for important-sound captions, multisensory cues, independent volume groups, mono output, and silent play.
- Added a reusable level, puzzle, hazard, audio, and playtest authoring template.

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
