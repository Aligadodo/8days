import type { Point, Rect } from "./types";

export const WORLD = { width: 1600, height: 900 };
export const CELL = 8;
export type Polygon = Point[];
const FOOTPRINT = [
  [0, 0],
  [9, 0],
  [-9, 0],
  [0, 6],
  [0, -6],
  [6.4, 4.3],
  [-6.4, 4.3],
  [6.4, -4.3],
  [-6.4, -4.3],
];
const NAV_STEPS = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1],
  [2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
// Find boundary crossings, so a short clipped corner cannot hide between samples.
function crossings(a: Point, b: Point, shape: Polygon) {
  const result: number[] = [];
  for (let i = 0; i < shape.length; i++) {
    const c = shape[i],
      d = shape[(i + 1) % shape.length],
      rx = b.x - a.x,
      ry = b.y - a.y,
      sx = d.x - c.x,
      sy = d.y - c.y,
      den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / den,
      u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / den;
    // A long planned segment and its short animation steps must agree at an
    // exact polygon vertex. Roundoff can otherwise turn u=0 into -1e-16 and
    // accept a corner-grazing route that the next movement frame rejects.
    const epsilon = 1e-9;
    if (t >= -epsilon && t <= 1 + epsilon && u >= -epsilon && u <= 1 + epsilon)
      result.push(Math.max(0, Math.min(1, t)));
  }
  return result;
}
const shapeBounds = new WeakMap<
  Polygon,
  { left: number; right: number; top: number; bottom: number }
>();
function overlapsSegment(a: Point, b: Point, shape: Polygon) {
  let bounds = shapeBounds.get(shape);
  if (!bounds) {
    bounds = {
      left: Math.min(...shape.map((p) => p.x)),
      right: Math.max(...shape.map((p) => p.x)),
      top: Math.min(...shape.map((p) => p.y)),
      bottom: Math.max(...shape.map((p) => p.y)),
    };
    shapeBounds.set(shape, bounds);
  }
  return (
    Math.max(a.x, b.x) >= bounds.left &&
    Math.min(a.x, b.x) <= bounds.right &&
    Math.max(a.y, b.y) >= bounds.top &&
    Math.min(a.y, b.y) <= bounds.bottom
  );
}
export interface WalkRegion {
  name: string;
  polygon: Polygon;
  requires?: string;
}
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
export const p = (x: number, y: number): Point => ({ x, y });
export const polygon = (coordinates: number[][]): Polygon =>
  coordinates.map(([x, y]) => p(x, y));
export const rectangle = (
  x: number,
  y: number,
  width: number,
  height: number,
): Polygon =>
  polygon([
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
  ]);
export function contains(point: Point, vertices: Polygon) {
  let result = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[i],
      b = vertices[j];
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      result = !result;
  }
  return result;
}
/** Shared, unrotated danger shape: rendering, path checks and damage use this ellipse. */
export function inHazard(point: Point, rect: Rect, padding = 0) {
  return (
    ((point.x - rect.x - rect.width / 2) / (rect.width / 2 + padding)) ** 2 +
      ((point.y - rect.y - rect.height / 2) / (rect.height / 2 + padding)) **
        2 <=
    1
  );
}
export function corridor(
  name: string,
  coordinates: number[][],
  width: number,
): WalkRegion[] {
  const points = polygon(coordinates),
    regions: WalkRegion[] = [];
  points.forEach((a, i) => {
    regions.push({
      name,
      polygon: Array.from({ length: 12 }, (_, n) =>
        p(
          a.x + (Math.cos((n * Math.PI) / 6) * width) / 2,
          a.y + (Math.sin((n * Math.PI) / 6) * width) / 2,
        ),
      ),
    });
    const b = points[i + 1];
    if (!b) return;
    const length = distance(a, b),
      dx = ((-(b.y - a.y) / length) * width) / 2,
      dy = (((b.x - a.x) / length) * width) / 2;
    regions.push({
      name,
      polygon: [
        p(a.x + dx, a.y + dy),
        p(b.x + dx, b.y + dy),
        p(b.x - dx, b.y - dy),
        p(a.x - dx, a.y - dy),
      ],
    });
  });
  return regions;
}

export class Navigation {
  private readonly visibilityCache = new Map<string, boolean>();
  // Static components live for this navigation revision, not for one animation frame.
  private readonly componentOf = new Int32Array(Math.ceil(WORLD.width / CELL) * Math.ceil(WORLD.height / CELL)).fill(-1);
  private readonly components: number[][] = [];
  readonly columns = Math.ceil(WORLD.width / CELL);
  readonly rows = Math.ceil(WORLD.height / CELL);
  readonly cells: Uint8Array;
  constructor(
    readonly regions: WalkRegion[],
    readonly blockers: Polygon[] = [],
  ) {
    this.cells = new Uint8Array(this.columns * this.rows);
    for (let i = 0; i < this.cells.length; i++)
      this.cells[i] = Number(this.isWalkable(this.center(i)));
  }
  center(index: number) {
    return p(
      ((index % this.columns) + 0.5) * CELL,
      (Math.floor(index / this.columns) + 0.5) * CELL,
    );
  }
  index(point: Point) {
    return (
      Math.floor(point.y / CELL) * this.columns + Math.floor(point.x / CELL)
    );
  }
  isWalkable(point: Point) {
    // Feet clearance, not sprite width. Tall sprites can overlap walls without walking through them.
    return FOOTPRINT.every(([dx, dy]) => {
      const q = p(point.x + dx, point.y + dy);
      return (
        q.x >= 6 &&
        q.y >= 6 &&
        q.x < WORLD.width - 6 &&
        q.y < WORLD.height - 6 &&
        this.regions.some((r) => contains(q, r.polygon)) &&
        !this.blockers.some((b) => contains(q, b))
      );
    });
  }
  regionAt(point: Point) {
    return this.regions.find((r) => contains(point, r.polygon))?.name ?? "路边";
  }
  visible(
    a: Point,
    b: Point,
    blocked: (point: Point) => boolean = () => false,
  ) {
    const gridPoint = (q: Point) =>
      q.x % CELL === CELL / 2 && q.y % CELL === CELL / 2;
    const key =
      gridPoint(a) && gridPoint(b)
        ? [this.index(a), this.index(b)].sort((x, y) => x - y).join(":")
        : null;
    let clear = key ? this.visibilityCache.get(key) : undefined;
    if (clear === undefined) {
      clear = this.staticVisible(a, b);
      if (key) this.visibilityCache.set(key, clear);
    }
    if (!clear) return false;
    const steps = Math.max(1, Math.ceil(distance(a, b) / 5));
    for (let i = 0; i <= steps; i++) {
      const q = p(
        a.x + ((b.x - a.x) * i) / steps,
        a.y + ((b.y - a.y) * i) / steps,
      );
      if (blocked(q)) return false;
    }
    return true;
  }
  private staticVisible(a: Point, b: Point) {
    if (!this.isWalkable(a) || !this.isWalkable(b)) return false;
    for (const [dx, dy] of FOOTPRINT) {
      const from = p(a.x + dx, a.y + dy),
        to = p(b.x + dx, b.y + dy);
      if (
        this.blockers.some(
          (shape) =>
            overlapsSegment(from, to, shape) &&
            crossings(from, to, shape).length > 0,
        )
      )
        return false;
      const floors = this.regions.filter((r) =>
        overlapsSegment(from, to, r.polygon),
      );
      const cuts = [
        0,
        1,
        ...floors.flatMap((r) => crossings(from, to, r.polygon)),
      ].sort((a, b) => a - b);
      for (let i = 1; i < cuts.length; i++) {
        if (cuts[i] - cuts[i - 1] < 1e-8) continue;
        const t = (cuts[i] + cuts[i - 1]) / 2,
          q = p(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
        if (!floors.some((r) => contains(q, r.polygon))) return false;
      }
    }
    return true;
  }
  nearest(
    point: Point,
    maxDistance = 100,
    blocked: (point: Point) => boolean = () => false,
  ) {
    if (this.isWalkable(point) && !blocked(point)) return { ...point };
    let best: Point | null = null,
      bestDistance = maxDistance;
    const left = Math.max(0, Math.floor((point.x - maxDistance) / CELL)),
      right = Math.min(
        this.columns - 1,
        Math.ceil((point.x + maxDistance) / CELL),
      );
    const top = Math.max(0, Math.floor((point.y - maxDistance) / CELL)),
      bottom = Math.min(
        this.rows - 1,
        Math.ceil((point.y + maxDistance) / CELL),
      );
    for (let y = top; y <= bottom; y++)
      for (let x = left; x <= right; x++) {
        const index = y * this.columns + x;
        if (!this.cells[index]) continue;
        const q = this.center(index),
          d = distance(point, q);
        if (d < bestDistance && !blocked(q)) {
          best = q;
          bestDistance = d;
        }
      }
    return best;
  }
  private attach(q: Point, blocked: (point: Point) => boolean) {
    const candidates: number[] = [];
    for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) {
      const cx = Math.floor(q.x / CELL) + x, cy = Math.floor(q.y / CELL) + y;
      const index = cy * this.columns + cx;
      if (cx < 0 || cy < 0 || cx >= this.columns || cy >= this.rows || !this.cells[index]) continue;
      if (this.visible(q, this.center(index), blocked)) candidates.push(index);
    }
    return candidates.sort((a, b) => distance(q, this.center(a)) - distance(q, this.center(b)))[0];
  }
  private neighbours(index: number) {
    const x = index % this.columns, y = Math.floor(index / this.columns), result: number[] = [];
    const border = (i: number) => !this.cells[i - 1] || !this.cells[i + 1] || !this.cells[i - this.columns] || !this.cells[i + this.columns];
    const nearBorder = border(index);
    // A narrow oblique aisle can contain valid feet positions but no chain of
    // immediately adjacent 8px centers. Two-by-one links still require the same
    // continuous footprint visibility; they never tunnel across a thin wall.
    for (const [dx, dy] of NAV_STEPS) {
      const nx = x + dx, ny = y + dy, next = ny * this.columns + nx;
      if (nx < 0 || ny < 0 || nx >= this.columns || ny >= this.rows || !this.cells[next]) continue;
      if ((Math.abs(dx) === 2 || Math.abs(dy) === 2) && !nearBorder && !border(next)) continue;
      if (Math.abs(dx) === 1 && Math.abs(dy) === 1 && (!this.cells[y * this.columns + nx] || !this.cells[ny * this.columns + x])) continue;
      result.push(next);
    }
    return result;
  }
  private component(from: number) {
    const known = this.componentOf[from];
    if (known >= 0) return this.components[known];
    const id = this.components.length, cells = [from];
    this.components.push(cells); this.componentOf[from] = id;
    for (let cursor = 0; cursor < cells.length; cursor++) {
      const current = cells[cursor];
      for (const next of this.neighbours(current)) {
        if (this.componentOf[next] >= 0 || !this.visible(this.center(current), this.center(next))) continue;
        this.componentOf[next] = id; cells.push(next);
      }
    }
    return cells;
  }
  /** Ground-click fallback only. Interactions must continue using route(..., 0).
   * Chooses a safe point in the player's connected floor, never on another island.
   * Grid candidates are refined towards the click with continuous footprint checks.
   */
  routeNearestReachable(start: Point, wanted: Point, blocked: (point: Point) => boolean = () => false): Point[] {
    if (![start.x, start.y, wanted.x, wanted.y].every(Number.isFinite) || !this.isWalkable(start) || blocked(start)) return [];
    if (this.visible(start, wanted, blocked)) return [{ ...wanted }];
    const from = this.attach(start, blocked);
    if (from === undefined) return [{ ...start }];
    const component = this.component(from);
    let best = { ...start }, bestDistance = distance(start, wanted);
    const exact = this.isWalkable(wanted) && !blocked(wanted) ? this.attach(wanted, blocked) : undefined;
    if (exact !== undefined && this.componentOf[exact] === this.componentOf[from]) best = { ...wanted };
    else for (const index of component) {
      const point = this.center(index), d = distance(point, wanted);
      if (d < bestDistance && !blocked(point)) { best = point; bestDistance = d; }
    }
    const refine = (point: Point) => {
      if (this.visible(point, wanted, blocked)) return { ...wanted };
      let low = 0, high = 1;
      for (let i = 0; i < 14; i++) {
        const t = (low + high) / 2;
        if (this.visible(point, p(point.x + (wanted.x - point.x) * t, point.y + (wanted.y - point.y) * t), blocked)) low = t;
        else high = t;
      }
      return p(point.x + (wanted.x - point.x) * low, point.y + (wanted.y - point.y) * low);
    };
    best = refine(best);
    const planned = this.route(start, best, blocked, 0);
    if (planned.length) return planned;
    // A live hazard can divide an otherwise connected floor. Flood only on this
    // failed click, with dynamic edge checks; do not cache changing hazards.
    const parent = new Int32Array(this.cells.length).fill(-2), queue = [from];
    parent[from] = -1;
    let closest = from; bestDistance = distance(this.center(from), wanted);
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const current = queue[cursor], point = this.center(current), d = distance(point, wanted);
      if (d < bestDistance) { closest = current; bestDistance = d; }
      for (const next of this.neighbours(current)) {
        if (parent[next] !== -2 || !this.visible(point, this.center(next), blocked)) continue;
        parent[next] = current; queue.push(next);
      }
    }
    if (distance(start, wanted) < bestDistance) return [refine(start)];
    const raw = [refine(this.center(closest))];
    for (let index = closest; index !== -1; index = parent[index]) raw.unshift(this.center(index));
    raw.unshift({ ...start });
    return this.smooth(raw, blocked);
  }
  private smooth(raw: Point[], blocked: (point: Point) => boolean) {
    const result: Point[] = [];
    for (let i = 0; i < raw.length - 1;) {
      let j = raw.length - 1;
      while (j > i + 1 && !this.visible(raw[i], raw[j], blocked)) j--;
      result.push(raw[j]); i = j;
    }
    return result.filter((q, i) => distance(i ? result[i - 1] : raw[0], q) > .5);
  }
  route(
    start: Point,
    wanted: Point,
    blocked: (point: Point) => boolean = () => false,
    snapDistance = 100,
  ): Point[] {
    const end = this.nearest(wanted, snapDistance, blocked);
    if (!end) return [];
    if (this.visible(start, end, blocked)) return [{ ...end }];
    // Attach exact endpoints only through a verified segment, never exempt a destination from collision.
    const from = this.attach(start, blocked),
      to = this.attach(end, blocked);
    if (from === undefined || to === undefined) return [];
    const scores = new Float64Array(this.cells.length).fill(Infinity),
      parent = new Int32Array(this.cells.length).fill(-1);
    const closed = new Uint8Array(this.cells.length),
      open = new Set<number>([from]);
    scores[from] = 0;
    const goal = this.center(to),
      heuristic = (index: number) => {
        const q = this.center(index),
          dx = Math.abs(q.x - goal.x),
          dy = Math.abs(q.y - goal.y);
        return Math.hypot(dx, dy);
      };
    while (open.size) {
      let current = -1,
        priority = Infinity;
      for (const index of open) {
        const value = scores[index] + heuristic(index);
        if (value < priority) {
          priority = value;
          current = index;
        }
      }
      if (current === to) {
        const raw: Point[] = [end];
        for (let i = to; i !== -1; i = parent[i]) raw.unshift(this.center(i));
        raw.unshift({ ...start });
        return this.smooth(raw, blocked);
      }
      open.delete(current);
      closed[current] = 1;
      for (const next of this.neighbours(current)) {
        if (closed[next]) continue;
        if (!this.visible(this.center(current), this.center(next), blocked))
          continue;
        const score = scores[current] + distance(this.center(current), this.center(next));
        if (score < scores[next]) {
          scores[next] = score;
          parent[next] = current;
          open.add(next);
        }
      }
    }
    return [];
  }
}
