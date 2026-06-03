import { useState } from 'react';
import { useCharacters } from './store/useCharacters';
import HomeScreen from './components/HomeScreen';
import CharacterWizard from './components/wizard/CharacterWizard';
import CharacterSheet from './components/CharacterSheet';
import PDFViewer from './components/PDFViewer';
import type { Character } from './types/character';

type View =
  | { type: 'home' }
  | { type: 'wizard'; editId?: string }
  | { type: 'sheet'; id: string };

export default function App() {
  const { characters, upsert, remove } = useCharacters();
  const [view, setView] = useState<View>({ type: 'home' });
  const [showRules, setShowRules] = useState(false);

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

  return (
    <>
      {view.type === 'home' && (
        <HomeScreen
          characters={characters}
          onNew={() => setView({ type: 'wizard' })}
          onOpen={id => setView({ type: 'sheet', id })}
          onDelete={id => remove(id)}
          onOpenRules={() => setShowRules(true)}
        />
      )}

      {view.type === 'wizard' && (
        <CharacterWizard
          initial={editingChar}
          onSave={handleSave}
          onCancel={() => setView({ type: 'home' })}
          onOpenRules={() => setShowRules(true)}
        />
      )}

      {view.type === 'sheet' && viewingChar && (
        <CharacterSheet
          char={viewingChar}
          onEdit={() => setView({ type: 'wizard', editId: viewingChar.id })}
          onBack={() => setView({ type: 'home' })}
          onOpenRules={() => setShowRules(true)}
        />
      )}

      {showRules && <PDFViewer onClose={() => setShowRules(false)} />}
    </>
  );
}
