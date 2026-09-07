export type AudioBus = "music" | "effects" | "ambience";

export type AudioEventId =
  | "hazard.sign.creak"
  | "hazard.object.release"
  | "hazard.impact.wood"
  | "hazard.impact.stone"
  | "hazard.electric.warn"
  | "hazard.electric.hit"
  | "hazard.water.warn"
  | "hazard.water.hit"
  | "hazard.pressure.warn"
  | "hazard.pressure.hit"
  | "hazard.train.warn"
  | "hazard.train.hit"
  | "player.soul.rise"
  | "animal.cat"
  | "interaction.phone"
  | "interaction.camera"
  | "ui.click.soft"
  | "ui.drawer.open"
  | "ui.drawer.close"
  | "nav.route.accept"
  | "nav.route.blocked"
  | "footstep.grass"
  | "footstep.wood"
  | "footstep.stone"
  | "item.pickup.tool"
  | "item.pickup.clue"
  | "interaction.blocked"
  | "puzzle.partial"
  | "puzzle.solve"
  | "puzzle.reset"
  | "puzzle.mill.solve"
  | "puzzle.wind.teach"
  | "memory.wheel"
  | "memory.cup"
  | "memory.flower"
  | "memory.home"
  | "hazard.wind.warn"
  | "hazard.wind.hit"
  | "hazard.branch.creak"
  | "player.death.soft"
  | "task.complete"
  | "achievement.unlock"
  | "music.spring.intro";

export interface AudioCue {
  id: AudioEventId;
  pan?: number;
  caption?: string;
}

export interface AudioSettings {
  master: number;
  music: number;
  effects: number;
  ambience: number;
  captions: boolean;
  mono: boolean;
}

const AUDIO_SAVE_KEY = "one-more-day:audio:v1";

const DEFAULT_SETTINGS: AudioSettings = {
  master: 0.8,
  music: 0.55,
  effects: 0.8,
  ambience: 0.45,
  captions: true,
  mono: false,
};

type CaptionHook = (caption: string, pan: number) => void;

export class AudioManager {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private buses: Record<AudioBus, GainNode | null> = {
    music: null,
    effects: null,
    ambience: null,
  };
  private settings: AudioSettings;
  private ambienceSources: AudioBufferSourceNode[] = [];
  private ambienceStarted = false;
  private cinematic = false;
  private readonly lastPlayed = new Map<AudioEventId, number>();

  constructor(private readonly onCaption: CaptionHook) {
    this.settings = this.loadSettings();
  }

  getSettings() {
    return { ...this.settings };
  }

  async unlock() {
    if (!this.context) this.createGraph();
    if (this.context?.state === "suspended") await this.context.resume();
  }

  setSuspended(suspended: boolean) {
    if (!this.context) return;
    if (suspended && this.context.state === "running")
      void this.context.suspend();
    if (!suspended && this.context.state === "suspended")
      void this.context.resume();
  }

  setVolume(bus: "master" | AudioBus, value: number) {
    this.settings[bus] = Math.max(0, Math.min(1, value));
    this.applyVolumes();
    this.saveSettings();
  }
  setCinematic(enabled: boolean) {
    this.cinematic = enabled;
    this.applyVolumes(); // Temporary scene ducking must not overwrite saved user volumes.
  }

  setCaptions(enabled: boolean) {
    this.settings.captions = enabled;
    this.saveSettings();
  }

  setMono(enabled: boolean) {
    this.settings.mono = enabled;
    this.saveSettings();
  }

  startAmbience() {
    if (!this.context || !this.buses.ambience || this.ambienceStarted) return;
    this.ambienceStarted = true;
    const buffer = this.context.createBuffer(
      1,
      this.context.sampleRate * 4,
      this.context.sampleRate,
    );
    const channel = buffer.getChannelData(0);
    let drift = 0;
    for (let index = 0; index < channel.length; index += 1) {
      drift = drift * 0.985 + (Math.random() * 2 - 1) * 0.015;
      channel[index] = drift;
    }
    const breeze = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    breeze.buffer = buffer;
    breeze.loop = true;
    filter.type = "bandpass";
    filter.frequency.value = 620;
    filter.Q.value = 0.35;
    gain.gain.value = 0.2;
    breeze.connect(filter).connect(gain).connect(this.buses.ambience);
    breeze.start();
    this.ambienceSources.push(breeze);

    const water = this.context.createOscillator();
    const waterGain = this.context.createGain();
    water.type = "sine";
    water.frequency.value = 108;
    waterGain.gain.value = 0.012;
    water.connect(waterGain).connect(this.buses.ambience);
    water.start();
  }

  play(cue: AudioCue) {
    const pan = this.settings.mono
      ? 0
      : Math.max(-1, Math.min(1, cue.pan ?? 0));
    if (cue.caption && this.settings.captions) this.onCaption(cue.caption, pan);
    if (
      !this.context ||
      !this.buses.effects ||
      this.context.state !== "running"
    )
      return;

    const now = this.context.currentTime;
    const cooldown = this.cooldownFor(cue.id);
    const last = this.lastPlayed.get(cue.id) ?? -Infinity;
    if (now - last < cooldown) return;
    this.lastPlayed.set(cue.id, now);

    switch (cue.id) {
      case "hazard.sign.creak":
        this.sweep(180, 78, 0.46, 0.045, pan, "sawtooth");
        this.tone(136, 0.24, 0.04, "sawtooth", 0.48, pan);
        this.tone(94, 0.27, 0.036, "triangle", 0.85, pan);
        this.noise(0.18, 0.022, 3400, pan);
        break;
      case "hazard.object.release":
        this.noise(0.09, 0.065, 2200, pan);
        this.sweep(240, 65, 0.32, 0.035, pan, "triangle");
        break;
      case "hazard.impact.wood":
      case "hazard.impact.stone":
        this.noise(0.3, 0.09, cue.id.endsWith("wood") ? 730 : 1450, pan);
        this.tone(72, 0.2, 0.065, "triangle", 0, pan);
        [0.11, 0.21, 0.32].forEach((delay, i) =>
          this.tone(
            195 + i * 64,
            0.07,
            0.026 - i * 0.006,
            "square",
            delay,
            pan,
          ),
        );
        break;
      case "hazard.electric.warn":
      case "hazard.electric.hit":
        this.noise(0.2, 0.038, 3800, pan);
        this.tone(120, 0.28, 0.028, "sawtooth", 0, pan);
        break;
      case "hazard.water.warn":
      case "hazard.water.hit":
        this.noise(cue.id.endsWith("warn") ? 0.7 : 0.45, 0.055, 620, pan);
        this.sweep(140, 65, 0.45, 0.035, pan, "sine");
        break;
      case "hazard.pressure.warn":
      case "hazard.pressure.hit":
        this.noise(cue.id.endsWith("warn") ? 0.8 : 0.5, 0.047, 2800, pan);
        break;
      case "hazard.train.warn":
        this.chord([196, 247], 0.75, 0.035, pan);
        this.tone(392, 0.15, 0.028, "triangle", 0.85, pan);
        break;
      case "hazard.train.hit":
        this.noise(0.65, 0.08, 500, pan);
        this.tone(95, 0.6, 0.04, "sawtooth", 0, pan);
        break;
      case "player.soul.rise":
        [523, 659, 784].forEach((hz, i) =>
          this.tone(hz, 0.5, 0.018, "sine", i * 0.17, pan),
        );
        break;
      case "animal.cat":
        this.sweep(700, 1020, 0.12, 0.025, pan, "sine");
        this.sweep(990, 590, 0.25, 0.026, pan, "sine");
        break;
      case "interaction.phone":
        this.chord([350, 440], 0.16, 0.022, pan);
        break;
      case "interaction.camera":
        this.noise(0.065, 0.035, 3400, pan);
        break;
      case "ui.click.soft":
        this.tone(520, 0.045, 0.035, "square", 0, pan);
        break;
      case "ui.drawer.open":
        this.sweep(310, 490, 0.12, 0.035, pan);
        break;
      case "ui.drawer.close":
        this.sweep(470, 300, 0.1, 0.03, pan);
        break;
      case "nav.route.accept":
        this.tone(430, 0.06, 0.025, "triangle", 0, pan);
        break;
      case "nav.route.blocked":
      case "interaction.blocked":
        this.tone(145, 0.11, 0.045, "square", 0, pan);
        break;
      case "footstep.grass":
        this.noise(0.045, 0.016, 1100, pan);
        break;
      case "footstep.wood":
        this.tone(185, 0.055, 0.025, "square", 0, pan);
        break;
      case "footstep.stone":
        this.noise(0.035, 0.025, 2400, pan);
        break;
      case "item.pickup.tool":
        this.chord([520, 690], 0.09, 0.04, pan);
        break;
      case "item.pickup.clue":
        this.chord([440, 554, 659], 0.13, 0.045, pan);
        break;
      case "puzzle.partial":
        this.tone(610, 0.12, 0.035, "sine", 0, pan);
        break;
      case "puzzle.solve":
        this.chord([440, 554, 659, 880], 0.17, 0.045, pan);
        break;
      case "puzzle.reset":
        this.sweep(260, 170, 0.15, 0.04, pan);
        break;
      case "puzzle.mill.solve":
        [0, 0.19, 0.38].forEach((delay) =>
          this.tone(164, 0.09, 0.065, "square", delay, pan),
        );
        this.chord([392, 494, 587], 0.2, 0.04, pan, 0.56);
        break;
      case "puzzle.wind.teach":
        this.sweep(240, 680, 0.75, 0.035, pan);
        this.tone(760, 0.2, 0.025, "sine", 0.65, pan);
        break;
      case "memory.wheel":
        this.tone(164, 0.09, 0.045, "square", 0, pan);
        break;
      case "memory.cup":
        this.tone(720, 0.13, 0.035, "sine", 0, pan);
        break;
      case "memory.flower":
        this.chord([523, 659], 0.12, 0.03, pan);
        break;
      case "memory.home":
        this.chord([330, 440], 0.16, 0.035, pan);
        break;
      case "hazard.wind.warn":
        this.noise(0.52, 0.07, 1750, pan);
        this.sweep(230, 520, 0.46, 0.04, pan);
        break;
      case "hazard.wind.hit":
        this.noise(0.34, 0.1, 900, pan);
        break;
      case "hazard.branch.creak":
        this.sweep(125, 72, 0.56, 0.075, pan, "sawtooth");
        break;
      case "player.death.soft":
        this.sweep(260, 110, 0.52, 0.055, pan, "sine");
        break;
      case "task.complete":
        this.chord([494, 622, 740], 0.12, 0.03, pan);
        break;
      case "achievement.unlock":
        this.chord([523, 659, 784, 1047], 0.12, 0.032, pan);
        break;
      case "music.spring.intro":
        [0, 0.32, 0.64, 0.98].forEach((delay, index) => {
          this.tone(
            [392, 494, 587, 784][index],
            0.42,
            0.025,
            "sine",
            delay,
            pan,
            "music",
          );
        });
        break;
    }
  }

  private createGraph() {
    this.context = new AudioContext();
    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);
    for (const bus of Object.keys(this.buses) as AudioBus[]) {
      const gain = this.context.createGain();
      gain.connect(this.masterGain);
      this.buses[bus] = gain;
    }
    this.applyVolumes();
  }

  private applyVolumes() {
    if (!this.context || !this.masterGain) return;
    const at = this.context.currentTime;
    this.masterGain.gain.setTargetAtTime(this.settings.master, at, 0.02);
    for (const bus of Object.keys(this.buses) as AudioBus[]) {
      this.buses[bus]?.gain.setTargetAtTime(
        this.settings[bus] * (this.cinematic && bus !== "effects" ? 0.22 : 1),
        at,
        0.08,
      );
    }
  }

  private tone(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    delay: number,
    pan: number,
    bus: AudioBus = "effects",
  ) {
    if (!this.context || !this.buses[bus]) return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const panner = this.context.createStereoPanner();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    panner.pan.value = pan;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(panner).connect(this.buses[bus]);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  private sweep(
    from: number,
    to: number,
    duration: number,
    volume: number,
    pan: number,
    type: OscillatorType = "triangle",
  ) {
    if (!this.context || !this.buses.effects) return;
    const start = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const panner = this.context.createStereoPanner();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);
    panner.pan.value = pan;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(panner).connect(this.buses.effects);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  private noise(duration: number, volume: number, cutoff: number, pan: number) {
    if (!this.context || !this.buses.effects) return;
    const buffer = this.context.createBuffer(
      1,
      Math.ceil(this.context.sampleRate * duration),
      this.context.sampleRate,
    );
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1)
      data[index] = Math.random() * 2 - 1;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    const panner = this.context.createStereoPanner();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    panner.pan.value = pan;
    gain.gain.setValueAtTime(volume, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      this.context.currentTime + duration,
    );
    source.buffer = buffer;
    source
      .connect(filter)
      .connect(gain)
      .connect(panner)
      .connect(this.buses.effects);
    source.start();
  }

  private chord(
    frequencies: number[],
    duration: number,
    volume: number,
    pan: number,
    delay = 0,
  ) {
    frequencies.forEach((frequency, index) =>
      this.tone(
        frequency,
        duration,
        volume,
        "sine",
        delay + index * 0.075,
        pan,
      ),
    );
  }

  private cooldownFor(id: AudioEventId) {
    if (id.startsWith("footstep")) return 0.22;
    if (id === "ui.click.soft") return 0.045;
    if (id === "nav.route.accept") return 0.12;
    if (id === "nav.route.blocked" || id === "interaction.blocked") return 0.25;
    return 0.04;
  }

  private loadSettings(): AudioSettings {
    try {
      const parsed = JSON.parse(
        localStorage.getItem(AUDIO_SAVE_KEY) ?? "{}",
      ) as Partial<AudioSettings>;
      return {
        master: this.validVolume(parsed.master, DEFAULT_SETTINGS.master),
        music: this.validVolume(parsed.music, DEFAULT_SETTINGS.music),
        effects: this.validVolume(parsed.effects, DEFAULT_SETTINGS.effects),
        ambience: this.validVolume(parsed.ambience, DEFAULT_SETTINGS.ambience),
        captions:
          typeof parsed.captions === "boolean"
            ? parsed.captions
            : DEFAULT_SETTINGS.captions,
        mono:
          typeof parsed.mono === "boolean"
            ? parsed.mono
            : DEFAULT_SETTINGS.mono,
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  private validVolume(value: number | undefined, fallback: number) {
    return typeof value === "number" && Number.isFinite(value)
      ? Math.max(0, Math.min(1, value))
      : fallback;
  }

  private saveSettings() {
    localStorage.setItem(AUDIO_SAVE_KEY, JSON.stringify(this.settings));
  }
}
