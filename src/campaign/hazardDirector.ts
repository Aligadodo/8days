import type { AudioEventId } from "../audio/AudioManager";
import type { HazardSpec, Point } from "./types";
import { distance, inHazard } from "./navigation";

export type HazardKind =
  | "sign"
  | "falling"
  | "electric"
  | "water"
  | "wind"
  | "smoke"
  | "steam"
  | "mud"
  | "train";
export type HazardStage =
  | "dormant"
  | "warning"
  | "release"
  | "active"
  | "recovery"
  | "spent";
export interface HazardState {
  stage: HazardStage;
  age: number;
  threatened: boolean;
  cycles: number;
}
export interface HazardProfile {
  kind: HazardKind;
  warning: number;
  release: number;
  active: number;
  recovery: number;
  once: boolean;
  warnSound: AudioEventId;
  impactSound: AudioEventId;
  impactText: string;
}
export function hazardProfile(h: HazardSpec): HazardProfile {
  const kind: HazardKind =
    h.kind ??
    (h.id === "falling-sign"
      ? "sign"
      : /电/.test(h.title)
        ? "electric"
        : /调车/.test(h.title)
          ? "train"
          : /蒸汽/.test(h.title)
            ? "steam"
            : /烟/.test(h.title)
              ? "smoke"
              : /软泥/.test(h.title)
                ? "mud"
                : /强风/.test(h.title)
                  ? "wind"
                  : /落|吊顶|冰锥|崩/.test(h.title)
                    ? "falling"
                    : "water");
  const falling = kind === "sign" || kind === "falling";
  const cues: Record<HazardKind, [AudioEventId, AudioEventId, string]> = {
    sign: ["hazard.sign.creak", "hazard.impact.wood", "招牌砸落，木屑散开"],
    falling: [
      "hazard.branch.creak",
      "hazard.impact.stone",
      "碎块落地，尘屑扬起",
    ],
    electric: ["hazard.electric.warn", "hazard.electric.hit", "电弧沿积水窜开"],
    water: ["hazard.water.warn", "hazard.water.hit", "水流冲过低处"],
    wind: ["hazard.wind.warn", "hazard.wind.hit", "阵风卷过小路"],
    smoke: ["hazard.pressure.warn", "hazard.pressure.hit", "浓烟封住了通道"],
    steam: ["hazard.pressure.warn", "hazard.pressure.hit", "蒸汽从裂隙喷出"],
    mud: ["hazard.water.warn", "hazard.water.hit", "泥面塌陷，脚下失去支撑"],
    train: ["hazard.train.warn", "hazard.train.hit", "调车驶过轨道"],
  };
  const [warnSound, impactSound, impactText] = cues[kind];
  return {
    kind,
    warning:
      kind === "sign" ? 1.5 : Math.max(1.5, h.activeFrom - h.warningFrom),
    release: falling ? 0.42 : 0.5,
    active: falling ? 0.28 : Math.max(1.2, h.period - h.activeFrom),
    recovery: falling ? 0.85 : 1,
    once: falling,
    warnSound,
    impactSound,
    impactText,
  };
}
export const hazardCenter = (h: HazardSpec): Point => ({
  x: h.rect.x + h.rect.width / 2,
  y: h.rect.y + h.rect.height / 2,
});
export function trainCenterX(h: HazardSpec, s: HazardState) {
  return (
    h.rect.x -
    110 +
    Math.min(1, s.age / hazardProfile(h).active) * (h.rect.width + 220)
  );
}
export function hazardContact(h: HazardSpec, s: HazardState, player: Point) {
  if (!inHazard(player, h.rect, 5)) return false;
  return (
    hazardProfile(h).kind !== "train" ||
    Math.abs(player.x - trainCenterX(h, s)) <= 59
  );
}
export type HazardEvent = {
  type: "warning" | "release" | "impact" | "avoided";
  hazard: HazardSpec;
};

/** Scene-local clocks: a lethal event cannot begin off screen or skip its telegraph.
 * No wall-clock timers: pause, hidden tabs and frame-rate differences cannot skip stages. */
export class HazardDirector {
  private states = new Map<string, HazardState>();
  reset() {
    this.states.clear();
  }
  state(h: HazardSpec): HazardState {
    let state = this.states.get(h.id);
    if (!state) {
      state = { stage: "dormant", age: 0, threatened: false, cycles: 0 };
      this.states.set(h.id, state);
    }
    return state;
  }
  phase(h: HazardSpec) {
    const stage = this.state(h).stage;
    return stage === "active"
      ? "active"
      : stage === "warning" || stage === "release"
        ? "warning"
        : "safe";
  }
  update(
    h: HazardSpec,
    delta: number,
    player: Point,
    canArm: boolean,
    presented: boolean,
    disabled = false,
  ): HazardEvent[] {
    const s = this.state(h),
      profile = hazardProfile(h),
      events: HazardEvent[] = [];
    if (disabled) {
      s.stage = "spent";
      s.age = 0;
      return events;
    }
    const inside = inHazard(player, h.rect, 5);
    if (s.stage === "spent") return events;
    if (s.stage === "dormant") {
      s.age += delta;
      const close =
        profile.kind === "sign"
          ? inHazard(player, h.rect, 48)
          : distance(player, hazardCenter(h)) < 215;
      if (
        !canArm ||
        !presented ||
        !close ||
        (s.cycles > 0 && s.age < Math.max(3, h.warningFrom))
      )
        return events;
      s.stage = "warning";
      s.age = 0;
      s.threatened = inside;
      events.push({ type: "warning", hazard: h });
      return events; // Starting frame never consumes any of the promised warning window.
    }
    if (s.stage === "warning" || s.stage === "release") s.threatened ||= inside;
    s.age += delta;
    // Advance at most one stage per frame: even a delayed frame must present the release.
    const duration =
      s.stage === "warning"
        ? profile.warning
        : s.stage === "release"
          ? profile.release
          : s.stage === "active"
            ? profile.active
            : profile.recovery;
    if (s.age + 1e-8 < duration) return events;
    s.age = 0;
    if (s.stage === "warning") {
      s.stage = "release";
      events.push({ type: "release", hazard: h });
    } else if (s.stage === "release") {
      s.stage = "active";
      events.push({ type: "impact", hazard: h });
      if (profile.once && s.threatened && !inside)
        events.push({ type: "avoided", hazard: h });
    } else if (s.stage === "active") {
      s.stage = "recovery";
      if (!profile.once && s.threatened && !inside)
        events.push({ type: "avoided", hazard: h });
    } else {
      s.stage = profile.once ? "spent" : "dormant";
      s.cycles++;
    }
    return events;
  }
  lethal(h: HazardSpec, events: HazardEvent[]) {
    // Solid falling objects hit once at ground contact, not an invisible lingering damage field.
    return hazardProfile(h).once
      ? events.some((e) => e.type === "impact")
      : this.state(h).stage === "active";
  }
}

export const DEATH_TIMING = {
  impact: 0.28,
  soul: 0.58,
  settle: 1.9,
  dialog: 2.45,
} as const;
export function deathStage(age: number) {
  return age < DEATH_TIMING.impact
    ? "impact"
    : age < DEATH_TIMING.soul
      ? "fading"
      : age < DEATH_TIMING.settle
        ? "soul"
        : age < DEATH_TIMING.dialog
          ? "settle"
          : "dialog";
}
export function gameTime(startTime: string, elapsed: number) {
  const [h, m] = startTime.split(":").map(Number),
    total = h * 60 + m + Math.floor(elapsed / 8);
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
