import { useState, useEffect } from 'react';
import type { Character } from '../types/character';

const STORAGE_KEY = 'swn-characters';

function load(): Character[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
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
