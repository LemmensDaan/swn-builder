import { useState, useEffect } from 'react';
import type { Character } from '../types/character';
import { emptyCharacter } from '../types/character';

const STORAGE_KEY = 'swn-characters';

/** Ensure a loaded character has all fields introduced in later versions. */
function normalize(raw: Partial<Character>): Character {
  const defaults = emptyCharacter();
  return {
    ...defaults,
    ...raw,
    // Fields added after initial release — apply defaults if missing
    levelHistory: raw.levelHistory ?? [],
    creationSkills: raw.creationSkills ?? raw.skills ?? {},
    adventurerPartials: raw.adventurerPartials ?? undefined,
    equipmentReadied: raw.equipmentReadied ?? [],
    debts: raw.debts ?? 0,
    notes: raw.notes ?? '',
  } as Character;
}

function load(): Character[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalize) : [];
  } catch {
    return [];
  }
}

function save(chars: Character[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chars));
}

export function useCharacters() {
  const [characters, setCharacters] = useState<Character[]>(load);

  useEffect(() => {
    save(characters);
  }, [characters]);

  function upsert(char: Character) {
    setCharacters(prev => {
      const idx = prev.findIndex(c => c.id === char.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = char;
        return next;
      }
      return [...prev, char];
    });
  }

  function remove(id: string) {
    setCharacters(prev => prev.filter(c => c.id !== id));
  }

  return { characters, upsert, remove };
}
