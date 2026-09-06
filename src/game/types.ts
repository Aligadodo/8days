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

export interface ViewState {
  time: string;
  objective: string;
  interaction: string | null;
  inventory: ItemId[];
  selectedSlot: number;
  clues: number[];
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
}

