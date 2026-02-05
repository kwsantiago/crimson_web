const STORAGE_KEY = 'crimsonland_settings';

export interface GameSettings {
  sfxVolume: number;
  musicVolume: number;
  sfxEnabled: boolean;
  musicEnabled: boolean;
  showFps: boolean;
  screenShake: boolean;
  keyBindings: Record<string, string>;
}

const DEFAULT_SETTINGS: GameSettings = {
  sfxVolume: 0.7,
  musicVolume: 0.5,
  sfxEnabled: true,
  musicEnabled: true,
  showFps: false,
  screenShake: true,
  keyBindings: {
    moveUp: 'W',
    moveDown: 'S',
    moveLeft: 'A',
    moveRight: 'D',
    reload: 'R',
    pause: 'ESCAPE'
  }
};

export const DEFAULT_KEY_BINDINGS = { ...DEFAULT_SETTINGS.keyBindings };

export class SettingsManager {
  private settings: GameSettings;

  constructor() {
    this.settings = this.load();
  }

  private load(): GameSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
    }
    return { ...DEFAULT_SETTINGS };
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
    }
  }

  get<K extends keyof GameSettings>(key: K): GameSettings[K] {
    return this.settings[key];
  }

  set<K extends keyof GameSettings>(key: K, value: GameSettings[K]) {
    this.settings[key] = value;
    this.save();
  }

  getKeyBinding(action: string): string {
    return this.settings.keyBindings[action] ?? DEFAULT_KEY_BINDINGS[action] ?? '';
  }

  setKeyBinding(action: string, key: string) {
    this.settings.keyBindings[action] = key;
    this.save();
  }

  resetKeyBindings() {
    this.settings.keyBindings = { ...DEFAULT_KEY_BINDINGS };
    this.save();
  }

  resetAll() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.save();
  }

  getAll(): GameSettings {
    return { ...this.settings };
  }
}
