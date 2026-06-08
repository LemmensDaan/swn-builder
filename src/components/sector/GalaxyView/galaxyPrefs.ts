export const GALAXY_STYLES = [
  { key: 'classic'    as const, label: 'Classic',    desc: 'Smooth disc galaxy'              },
  // lenticular — hidden for now, implementation kept
  { key: 'spiral'     as const, label: 'Spiral',     desc: 'Two logarithmic arms'            },
  { key: 'triple'     as const, label: 'Three Arms', desc: 'Three-arm spiral'                },
  { key: 'quad'       as const, label: 'Four Arms',  desc: 'Four-arm spiral'                 },
  { key: 'barred'     as const, label: 'Barred',     desc: 'Central bar with two arms'       },
] as const;
export type GalaxyStyle = 'classic' | 'lenticular' | 'spiral' | 'triple' | 'quad' | 'barred';

export const COLOR_SCHEMES = [
  { key: 'classic'  as const, label: 'Classic',  desc: 'Rose & twilight blue'        },
  { key: 'nebula'   as const, label: 'Nebula',   desc: 'Mint cyan to ocean blue'     },
  { key: 'quasar'   as const, label: 'Quasar',   desc: 'Gold amber to deep crimson'  },
  { key: 'void'     as const, label: 'Void',     desc: 'Lavender to deep indigo'     },
  { key: 'aurora'   as const, label: 'Aurora',   desc: 'Forest green to violet'      },
  { key: 'ember'    as const, label: 'Ember',    desc: 'Ivory & crimson starfire'    },
  { key: 'cerulean' as const, label: 'Cerulean', desc: 'Sky blue to midnight ocean'  },
  { key: 'jade'     as const, label: 'Jade',     desc: 'Lime to deep emerald'        },
  { key: 'twilight' as const, label: 'Twilight', desc: 'Coral rose to deep violet'   },
  { key: 'copper'   as const, label: 'Copper',   desc: 'Gold to bronze & sienna'     },
] as const;
export type ColorScheme = 'classic' | 'nebula' | 'quasar' | 'void' | 'aurora' | 'ember' | 'cerulean' | 'jade' | 'twilight' | 'copper';

export interface GalaxyPrefs {
  style: GalaxyStyle;
  colorScheme: ColorScheme;
}

export const DEFAULT_PREFS: GalaxyPrefs = { style: 'spiral', colorScheme: 'classic' };

const LS_KEY = 'swn-galaxy-prefs';

export function loadPrefs(): GalaxyPrefs {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_PREFS };
}

export function savePrefs(prefs: GalaxyPrefs): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
}
