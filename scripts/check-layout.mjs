import { loadSource } from "../tests/load-source.mjs";
const { WORLDS } = loadSource("src/campaign/worldDesign.ts"),
  { LEVELS } = loadSource("src/campaign/levels.ts");
const { buildWorldNavigation, allWorldFlags } = loadSource(
  "src/campaign/worldGeometry.ts",
);
for (const [i, w] of WORLDS.entries()) {
  const nav = buildWorldNavigation(
    w,
    allWorldFlags(
      w,
      LEVELS[i].puzzles.map((p) => p.id),
    ),
  );
  const errors = [];
  if (!nav.isWalkable(w.spawn))
    errors.push({ id: "spawn", point: w.spawn, near: nav.nearest(w.spawn) });
  for (const [id, p] of Object.entries(w.approaches)) {
    if (!nav.isWalkable(p)) errors.push({ id, point: p, near: nav.nearest(p) });
    else if (!nav.route(w.spawn, p, () => false, 0).length)
      errors.push({ id, point: p, disconnected: true });
  }
  for (const m of w.mechanisms)
    if (
      !nav.isWalkable(m.approach) ||
      !nav.route(w.spawn, m.approach, () => false, 0).length
    )
      errors.push({
        id: m.id,
        point: m.approach,
        near: nav.nearest(m.approach),
      });
  console.log(JSON.stringify({ day: i + 1, errors }));
  if (errors.length) process.exitCode = 1;
  if (process.argv.includes("--components")) {
    const visited = new Set(),
      components = [];
    for (let n = 0; n < nav.cells.length; n++)
      if (nav.cells[n] && !visited.has(n)) {
        const nodes = [n];
        visited.add(n);
        for (let at = 0; at < nodes.length; at++) {
          const a = nodes[at];
          for (const d of [-1, 1, -nav.columns, nav.columns]) {
            const b = a + d;
            if (
              b >= 0 &&
              b < nav.cells.length &&
              nav.cells[b] &&
              !visited.has(b) &&
              Math.abs((a % nav.columns) - (b % nav.columns)) <= 1 &&
              nav.visible(nav.center(a), nav.center(b))
            ) {
              visited.add(b);
              nodes.push(b);
            }
          }
        }
        components.push(nodes);
      }
    components.sort((a, b) => b.length - a.length);
    for (let c = 1; c < Math.min(components.length, 8); c++) {
      let best = Infinity,
        pair;
      for (const a of components[c])
        for (const b of components[0]) {
          const pa = nav.center(a),
            pb = nav.center(b),
            d = (pa.x - pb.x) ** 2 + (pa.y - pb.y) ** 2;
          if (d < best) {
            best = d;
            pair = [pa, pb];
          }
        }
      console.log(
        "component",
        components[c].length,
        "nearest main",
        JSON.stringify(pair),
      );
    }
  }
}
