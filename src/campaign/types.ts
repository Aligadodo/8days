import type { AudioCue } from "../audio/AudioManager";

export interface Point {
  x: number;
  y: number;
}

export interface Rect extends Point {
  width: number;
  height: number;
}

export type EnvironmentKind =
  | "rain-city"
  | "night-office"
  | "flower-valley"
  | "rainbow-falls"
  | "autumn-river"
  | "storm-mountain"
  | "snow-station"
  | "glow-cave";

export type PuzzleKind = "sequence" | "choice" | "pattern" | "number";

export interface Palette {
  sky: string;
  ground: string;
  groundAlt: string;
  path: string;
  pathEdge: string;
  water: string;
  accent: string;
  accentSoft: string;
  shadow: string;
}

export interface PuzzleSpec {
  id: string;
  kind: PuzzleKind;
  icon: string;
  symbol: string;
  title: string;
  position: Point;
  story: string;
  prompt: string;
  evidence: string[];
  instruction: string;
  options: string[];
  solution: string[];
  slots?: number;
  rewardDigit: string;
  rewardItem: string;
  solvedText: string;
  wrongFeedback: string;
  hints: [string, string, string];
  requires?: string[];
}

export interface SideTaskSpec {
  id: string;
  icon: string;
  title: string;
  position: Point;
  prompt: string;
  completeText: string;
}

export interface HazardSpec {
  kind?: import("./hazardDirector").HazardKind;
  id: string;
  title: string;
  rect: Rect;
  period: number;
  warningFrom: number;
  activeFrom: number;
  warning: string;
  lesson: string;
  color: string;
  /** Solving this puzzle permanently removes the hazard from the current run. */
  disabledBy?: string;
}

export interface LandmarkSpec {
  title: string;
  icon: string;
  position: Point;
  size?: number;
}

export interface LevelDefinition {
  id: string;
  day: number;
  name: string;
  subtitle: string;
  stamp: string;
  environment: EnvironmentKind;
  /** Production environment painting, authored at a 16:9 world ratio. */
  background: string;
  intro: string;
  goal: string;
  ending: string;
  code: string;
  finalSymbolOrder: string[];
  palette: Palette;
  weatherIcon: string;
  startTime: string;
  playerStart: Point;
  exit: Point;
  route: Point[];
  puzzles: PuzzleSpec[];
  sideTasks: SideTaskSpec[];
  hazards: HazardSpec[];
  landmarks: LandmarkSpec[];
  blockers: Rect[];
}

export interface PersistedLevelState {
  layoutRevision?: number;
  worldFlags?: string[];
  solved: string[];
  sideTasks: string[];
  hintsUsed: number;
  deaths: number;
  explored?: number[];
  checkpoint?: Point;
  hintStages?: Record<string, number>;
  discoveries?: string[];
  visitedRooms?: string[];
  roomExplored?: Record<string, number[]>;
}

export interface CampaignSave {
  version: 2;
  unlocked: number;
  completed: string[];
  stamps: string[];
  levels: Record<string, PersistedLevelState>;
}

export interface CampaignView {
  exploration: {
    roomId: string | null; sceneName: string; roomName?: string;
    flags: string[]; visited: number;
    items: { id: string; title: string; category: string }[];
    discoveries: { id: string; title: string; location: string; description: string; done: boolean }[];
    achievements: { id: string; title: string; description: string; done: boolean }[];
    album: { day: number; title: string; found: number; total: number; visited: boolean }[];
  };
  worldFlags: string[];
  worldItems: string[];
  accessHint?: string;
  levelIndex: number;
  level: LevelDefinition;
  solved: string[];
  sideTasks: string[];
  inventory: string[];
  currentPuzzle: PuzzleSpec | null;
  objective: string;
  completed: boolean;
  deaths: number;
  hintsUsed: number;
  elapsedSeconds: number;
}

export interface DeathInfo {
  cause: string;
  lesson: string;
  time: string;
  sequence?: string;
}

export interface CampaignHooks {
  onDoorChoice?: (title: string, enter: () => void, inspect: () => void) => void;
  onCinematic?: (active: boolean) => void;
  onView: (view: CampaignView) => void;
  onToast: (message: string, tone?: "normal" | "success" | "danger") => void;
  onPuzzle: (puzzle: PuzzleSpec) => void;
  onFinal: (level: LevelDefinition) => void;
  onDeath: (info: DeathInfo) => void;
  onComplete: (level: LevelDefinition, view: CampaignView) => void;
  onAudio: (cue: AudioCue) => void;
}
