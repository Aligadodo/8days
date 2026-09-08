import type { LifePack } from "./schema";
import day01 from "./day01";
import day02 from "./day02";
import day03 from "./day03";
import day04 from "./day04";
import day05 from "./day05";
import day06 from "./day06";
import day07 from "./day07";
import day08 from "./day08";

export const LIFE_PACKS: LifePack[] = [day01,day02,day03,day04,day05,day06,day07,day08];
export const lifeNodesFor = (day: number, inside: boolean) => {
  const pack = LIFE_PACKS.find(p => p.day === day);
  return pack ? (inside ? pack.inside : pack.outside) : [];
};
