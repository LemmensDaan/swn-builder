export interface SystemPrefs {
  showOrbits: boolean;
  highQuality: boolean;
  showFactionZones: boolean;
  asteroidShadows: boolean;
}

export const DEFAULT_PREFS: SystemPrefs = { showOrbits: true, highQuality: true, showFactionZones: false, asteroidShadows: false };

const LS_KEY = 'swn-system-prefs';

export function loadPrefs(): SystemPrefs {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_PREFS };
}

export function savePrefs(prefs: SystemPrefs): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
}
