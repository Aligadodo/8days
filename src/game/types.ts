import type { AudioCue } from "../audio/AudioManager";

export type Direction = "up" | "down" | "left" | "right";

export type ItemId = "journal" | "trowel" | "ribbon" | "water" | "key";

export interface ItemDefinition {
  id: ItemId;
  name: string;
  icon: string;
  description: string;
}

export interface ClueDefinition {
  id: number;
  icon: string;
  title: string;
  digit: string;
  memory: string;
}

export interface TaskView {
  id: string;
  title: string;
  detail: string;
  progress: string;
  done: boolean;
  optional: boolean;
}

export interface AchievementDefinition {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface DiscoveryDefinition {
  id: string;
  icon: string;
  title: string;
  note: string;
}

export interface ViewState {
  time: string;
  objective: string;
  interaction: string | null;
  inventory: ItemId[];
  selectedSlot: number;
  clues: number[];
  tasks: TaskView[];
  discoveries: string[];
  achievements: string[];
  deaths: number;
  completed: boolean;
  dangerAssist: boolean;
  reducedMotion: boolean;
}

export interface DeathInfo {
  time: string;
  cause: string;
  lesson: string;
}

export interface GameHooks {
  onViewChange: (state: ViewState) => void;
  onMessage: (message: string) => void;
  onDeath: (info: DeathInfo) => void;
  onCodeRequest: () => void;
  onComplete: () => void;
  onAudio: (cue: AudioCue) => void;
}
