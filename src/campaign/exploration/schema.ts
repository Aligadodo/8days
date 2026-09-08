import type { Point } from "../types";
import type { Polygon } from "../navigation";
import type { WorldDesign, ObjectVisual, RasterArt } from "../worldSchema";

export interface DiscoveryNode {
  id: string;
  title: string;
  kind: "collect" | "inspect" | "restore" | "photo" | "pet";
  position: Point;
  approach: Point;
  /** Bind to an actual visible object; never an arbitrary click circle. */
  baked?: Polygon;
  visual: ObjectVisual;
  art?: RasterArt;
  description: string;
  result: string;
  requires?: string[];
  reward?: { title: string; category: "keepsake" | "nature" | "postcard" | "tool" };
  /** Optional world-space sequence: click these named objects in order. */
  sequence?: string[];
  animal?: "cat" | "dog" | "mouse";
  patrol?: Point[];
  /** A completed action may add an authored registered state patch. */
  afterArt?: RasterArt;
}
export interface RoomDefinition {
  id: string;
  name: string;
  background: string;
  intro: string;
  world: WorldDesign;
  /** Outdoor doorway, distinct from all existing main-line targets. */
  entry: { title: string; position: Point; approach: Point; baked: Polygon; support: string;
    /** Existing door also hosts a main task: present enter/investigate choices. */
    sharedTarget?: string };
  /** Interior exit is world.anchors.exit; its visual polygon is world.baked.exit. */
  nodes: DiscoveryNode[];
}
export interface ExplorationPack {
  day: number;
  theme: string;
  room: RoomDefinition;
  outside: DiscoveryNode[];
  achievements: { id: string; title: string; description: string; requires: string[] }[];
}
