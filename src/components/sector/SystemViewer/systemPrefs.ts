export interface SystemPrefs {
  showOrbits: boolean;
}

export const DEFAULT_PREFS: SystemPrefs = { showOrbits: true };

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
