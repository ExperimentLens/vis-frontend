/**
 * User-editable analysis settings (Settings page), kept in this browser's localStorage.
 * Read once at load: the Settings page reloads the app after saving, so every view
 * sees the same values without subscribing to changes.
 */
export interface AppSettings {
  /** Judge model for Detect Issues, e.g. "anthropic/claude-sonnet-5-5"; empty = vis-api default. */
  judgeModel: string;
  /** p-value below which a difference counts as significant. */
  significanceLevel: number;
  /** Share of groups/runs a case must fail in to show under "Needs attention". */
  attentionFailShare: number;
  /** Pass rates at or above this are green. */
  goodCutoff: number;
  /** Pass rates at or above this (and below goodCutoff) are amber; below is red. */
  warnCutoff: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  judgeModel: '',
  significanceLevel: 0.05,
  attentionFailShare: 0.5,
  goodCutoff: 0.75,
  warnCutoff: 0.5,
};

const STORAGE_KEY = 'experimentlens.settings';

const load = (): AppSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const appSettings: Readonly<AppSettings> = load();

export const saveAppSettings = (next: AppSettings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode / blocked storage: the defaults stay in effect.
  }
};

export type PassBand = 'good' | 'warn' | 'bad';

export const passBand = (rate: number): PassBand =>
  rate >= appSettings.goodCutoff ? 'good' : rate >= appSettings.warnCutoff ? 'warn' : 'bad';
