import { useState } from 'react';
import { useCharacters } from './store/useCharacters';
import HomeScreen from './components/HomeScreen';
import CharacterWizard from './components/wizard/CharacterWizard';
import CharacterSheet from './components/CharacterSheet';
import type { Character } from './types/character';

type View =
  | { type: 'home' }
  | { type: 'wizard'; editId?: string }
  | { type: 'sheet'; id: string };

export default function App() {
  const { characters, upsert, remove } = useCharacters();
  const [view, setView] = useState<View>({ type: 'home' });

  const editingChar = view.type === 'wizard' && view.editId
    ? characters.find(c => c.id === view.editId)
    : undefined;

  const viewingChar = view.type === 'sheet'
    ? characters.find(c => c.id === (view as { type: 'sheet'; id: string }).id)
    : undefined;

  function handleSave(char: Character) {
    upsert(char);
    setView({ type: 'sheet', id: char.id });
  }

  if (view.type === 'home') {
    return (
      <HomeScreen
        characters={characters}
        onNew={() => setView({ type: 'wizard' })}
        onOpen={id => setView({ type: 'sheet', id })}
        onDelete={id => remove(id)}
      />
    );
  }

  if (view.type === 'wizard') {
    return (
      <CharacterWizard
        initial={editingChar}
        onSave={handleSave}
        onCancel={() => setView({ type: 'home' })}
      />
    );
  }

  if (view.type === 'sheet' && viewingChar) {
    return (
      <CharacterSheet
        char={viewingChar}
        onEdit={() => setView({ type: 'wizard', editId: viewingChar.id })}
        onBack={() => setView({ type: 'home' })}
      />
    );
  }

  return null;
}
