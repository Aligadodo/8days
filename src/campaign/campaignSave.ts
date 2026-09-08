import { LEVELS } from "./levels";
import { WORLDS } from "./worldDesign";
import { EXPLORATION_PACKS } from "./exploration/packs";
import { allDiscoveries } from "./exploration/discoveries";
import type { CampaignSave, PersistedLevelState } from "./types";
import { restoreEconomy } from "./life/economy";
import { restoreLife } from "./life/runtime";
import { LIFE_PACKS } from "./life/packs";

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const strings = (value: unknown, allowed: string[]) => Array.isArray(value)
  ? [...new Set(value.filter((id): id is string => typeof id === "string" && allowed.includes(id)))] : [];
const count = (value: unknown, maximum = 1_000_000) =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(maximum, Math.floor(value))) : 0;
const fog = (value: unknown) => Array.isArray(value)
  ? [...new Set(value.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < 50 * 29))] : [];

/** localStorage is untrusted: migrate field-by-field, preserving valid v2 progress. */
export function restoreCampaignSave(value: unknown): CampaignSave {
  const source = record(value);
  const fresh: CampaignSave = { version: 2, unlocked: 1, completed: [], stamps: [], levels: {},economy:restoreEconomy(undefined),life:restoreLife(undefined,[]) };
  if (source.version !== 2) return fresh;
  const completed = strings(source.completed, LEVELS.map(l => l.id));
  const levels: Record<string, PersistedLevelState> = {};
  const savedLevels = record(source.levels);
  LEVELS.forEach((level, index) => {
    if (!Object.hasOwn(savedLevels, level.id)) return;
    const saved = record(savedLevels[level.id]);
    const pack = EXPLORATION_PACKS.find(p => p.day === level.day);
    const puzzleIds = level.puzzles.map(p => p.id);
    const checkpoint = record(saved.checkpoint);
    const validPoint = [checkpoint.x, checkpoint.y].every(n => typeof n === "number" && Number.isFinite(n))
      && Number(checkpoint.x) >= 0 && Number(checkpoint.x) <= 1600 && Number(checkpoint.y) >= 0 && Number(checkpoint.y) <= 900;
    const hintSource = record(saved.hintStages);
    const hintStages = Object.fromEntries(puzzleIds.filter(id => Object.hasOwn(hintSource, id)).map(id => [id, count(hintSource[id], 3)]));
    const roomExplored: Record<string, number[]> = {};
    if (pack) roomExplored[pack.room.id] = fog(record(saved.roomExplored)[pack.room.id]);
    levels[level.id] = {
      solved: strings(saved.solved, puzzleIds),
      sideTasks: strings(saved.sideTasks, level.sideTasks.map(t => t.id)),
      worldFlags: strings(saved.worldFlags, WORLDS[index].mechanisms.filter(m => m.kind !== "gate").map(m => m.id)),
      hintsUsed: count(saved.hintsUsed), deaths: count(saved.deaths),
      layoutRevision: count(saved.layoutRevision),
      explored: fog(saved.explored), hintStages,
      ...(validPoint ? { checkpoint: { x: Number(checkpoint.x), y: Number(checkpoint.y) } } : {}),
      discoveries: strings(saved.discoveries, allDiscoveries(pack).map(n => n.id)),
      visitedRooms: strings(saved.visitedRooms, pack ? [pack.room.id] : []), roomExplored,
    };
  });
  return { version: 2, unlocked: Math.max(1, count(source.unlocked, 8)), completed,
    stamps: LEVELS.filter(l => completed.includes(l.id)).map(l => l.stamp), levels,
    economy:restoreEconomy(source.economy),life:restoreLife(source.life,LIFE_PACKS.flatMap(pack=>[...pack.outside,...pack.inside])) };
}
