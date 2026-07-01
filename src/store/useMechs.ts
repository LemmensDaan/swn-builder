import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import localforage from 'localforage';
import type { Mech } from '../types/mech';

interface MechState {
  mechs: Mech[];
}

interface MechActions {
  upsertMech: (mech: Mech) => void;
  removeMech: (id: string) => void;
  copyMech: (id: string) => void;
  setRetired: (id: string, retired: boolean) => void;
}

/** Saved-mech roster, persisted to IndexedDB via localforage (mirrors the sector store). */
export const useMechs = create<MechState & MechActions>()(
  persist(
    (set) => ({
      mechs: [],
      upsertMech: (mech) => set(s => {
        const idx = s.mechs.findIndex(m => m.id === mech.id);
        if (idx >= 0) { const next = [...s.mechs]; next[idx] = mech; return { mechs: next }; }
        return { mechs: [...s.mechs, mech] };
      }),
      removeMech: (id) => set(s => ({ mechs: s.mechs.filter(m => m.id !== id) })),
      copyMech: (id) => set(s => {
        const src = s.mechs.find(m => m.id === id);
        if (!src) return {};
        const copy: Mech = {
          ...src,
          id: crypto.randomUUID(),
          name: src.name ? `${src.name}-copy` : 'copy',
          retired: false,
          slots: src.slots.map(sl => ({ ...sl, uid: crypto.randomUUID() })),
        };
        return { mechs: [...s.mechs, copy] };
      }),
      setRetired: (id, retired) => set(s => ({
        mechs: s.mechs.map(m => m.id === id ? { ...m, retired } : m),
      })),
    }),
    {
      name: 'swn-mechs',
      version: 1,
      storage: createJSONStorage(() => ({
        getItem: async (name: string) => localforage.getItem<string>(name),
        setItem: async (name: string, value: string) => { await localforage.setItem(name, value); },
        removeItem: async (name: string) => { await localforage.removeItem(name); },
      })),
    }
  )
);
