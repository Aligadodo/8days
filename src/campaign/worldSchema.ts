import {
  corridor,
  polygon,
  rectangle,
  type Polygon,
  type WalkRegion,
} from "./navigation";
import type { Point, Rect } from "./types";

export const LAYOUT_REVISION = 13;
/** Art is anchored to the physical support, never to an arbitrary UI rectangle. */
export interface ObjectVisual {
  mount: "ground" | "wall" | "table" | "hanging" | "actor" | "door";
  support: string;
  height?: number;
  maxWidth?: number;
  atlas?: "world-props" | "life-actors" | "utility-props";
  frame?: number;
  layer?: "ground" | "actor";
  depth?: number;
  /** Visible front edge at floor level, in world coordinates. Used with actor feet,
   * not the artwork's center; sloping and segmented edges are supported. */
  contactLine?: Point[];
}
export interface RasterArt {
  src: string;
  /** Optional source crop in native image pixels; preserve the image alpha. */
  crop?: Rect;
  width: number;
  height: number;
  offset?: Point;
}
export interface Obstacle {
  name: string;
  polygon: Polygon;
}
export interface WorldMechanism {
  id: string;
  kind: "tool" | "breakable" | "lever" | "gate" | "cache";
  name: string;
  position: Point;
  approach: Point;
  width: number;
  height: number;
  requires?: string[];
  controlledBy?: string;
  hint: string;
  complete: string;
  reward?: string;
  visual?: ObjectVisual;
  baked?: Polygon;
  art?: { closed?: RasterArt; open?: RasterArt };
}
export interface BuiltSurface {
  name: string;
  path: number[][];
  width: number;
  material: "stone" | "wood";
  requires?: string;
  art?: RasterArt;
  variants?: RasterArt[];
  spacing?: number;
}
export interface WorldOccluder {
  name?: string;
  polygon: Polygon;
  /** Legacy horizontal contact fallback; new oblique furniture should author a line. */
  depth: number;
  contactLine?: Point[];
  requires?: string;
  unless?: string;
}
export interface WorldDesign {
  regions: WalkRegion[];
  obstacles: Obstacle[];
  blockers: Polygon[];
  positions: Record<string, Point>;
  approaches: Record<string, Point>;
  baked: Record<string, Polygon>;
  solidProps: Record<string, Rect>;
  visuals: Record<string, ObjectVisual>;
  spawn: Point;
  exit: Point;
  mechanisms: WorldMechanism[];
  surfaces: BuiltSurface[];
  occluders: WorldOccluder[];
  puzzleAccess: Record<string, string[]>;
}
export const area = (
  name: string,
  coords: number[][],
  requires?: string,
): WalkRegion => ({ name, polygon: polygon(coords), requires });
export const path = (
  name: string,
  coords: number[][],
  width: number,
  requires?: string,
) => corridor(name, coords, width).map((r) => ({ ...r, requires }));
export const obstacle = (name: string, coords: number[][]): Obstacle => ({
  name,
  polygon: polygon(coords),
});
export const box = (
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
): Obstacle => ({ name, polygon: rectangle(x, y, w, h) });
type Input = Partial<WorldDesign> & {
  spawn: Point;
  regions: WalkRegion[];
  anchors: Record<string, [number, number, number, number]>;
};
export function world(input: Input): WorldDesign {
  const positions: Record<string, Point> = {},
    approaches: Record<string, Point> = {};
  for (const [id, [x, y, sx, sy]] of Object.entries(input.anchors)) {
    positions[id] = { x, y };
    approaches[id] = { x: sx, y: sy };
  }
  return {
    regions: input.regions,
    obstacles: input.obstacles ?? [],
    blockers: (input.obstacles ?? []).map((o) => o.polygon),
    positions,
    approaches,
    baked: input.baked ?? {},
    solidProps: input.solidProps ?? {},
    visuals: input.visuals ?? {},
    spawn: input.spawn,
    exit: positions.exit,
    mechanisms: input.mechanisms ?? [],
    surfaces: input.surfaces ?? [],
    occluders: input.occluders ?? [],
    puzzleAccess: input.puzzleAccess ?? {},
  };
}
// All coordinates are in the 1600 × 900 painting space. The last two anchor numbers
// are the authored interaction stance, not a guessed offset or a snap through a wall.
