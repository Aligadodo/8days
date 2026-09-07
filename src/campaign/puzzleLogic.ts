import type { PuzzleSpec } from "./types";
/** Stable per puzzle, so resetting an attempt never makes the buttons jump around. */
export function shuffledOptions(puzzle: PuzzleSpec) {
  const options = [...puzzle.options];
  let seed = [...puzzle.id].reduce(
    (n, c) => (n * 31 + c.charCodeAt(0)) >>> 0,
    7,
  );
  for (let i = options.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [options[i], options[j]] = [options[j], options[i]];
  }
  if (options.length > 1 && options.every((v, i) => v === puzzle.solution[i]))
    options.push(options.shift()!);
  return options;
}
