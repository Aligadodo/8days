import type { Point } from "../types";
import type { Polygon } from "../navigation";
import type { ObjectVisual, RasterArt } from "../worldSchema";

export type LootTableId = "salvage" | "nature" | "pantry" | "mineral" | "pocket"
  | "cloth" | "herbs" | "fruit" | "stone" | "wood" | "paper" | "tea";
export interface LifeNode {
  id: string;
  title: string;
  kind: "container" | "gather" | "inspect";
  position: Point;
  approach: Point;
  baked: Polygon;
  visual: ObjectVisual;
  description: string;
  emptyText: string;
  lootTable?: LootTableId;
  renewSeconds?: number;
  afterArt?: RasterArt;
  /** A native object already hosts this optional discovery: run it without stealing its hotspot. */
  sharedDiscovery?: string;
}
export interface LifePack {
  day: number;
  outside: LifeNode[];
  inside: LifeNode[];
}
