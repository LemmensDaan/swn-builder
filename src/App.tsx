import { useState } from 'react';
import { useCharacters } from './store/useCharacters';
import HomeScreen from './components/HomeScreen';
import CharacterWizard from './components/wizard/CharacterWizard';
import CharacterSheet from './components/CharacterSheet';
import PDFViewer from './components/PDFViewer';
import HelpPage from './components/HelpPage';
import type { Character } from './types/character';

type View =
  | { type: 'home' }
  | { type: 'wizard'; editId?: string }
  | { type: 'sheet'; id: string };

export default function App() {
  const { characters, upsert, remove } = useCharacters();
  const [view, setView] = useState<View>({ type: 'home' });
  const [showRules, setShowRules] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

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
          onRetire={id => {
            const char = characters.find(c => c.id === id);
            if (char) upsert({ ...char, retired: true });
          }}
          onUnretire={id => {
            const char = characters.find(c => c.id === id);
            if (char) upsert({ ...char, retired: false });
          }}
          onCopy={id => {
            const char = characters.find(c => c.id === id);
            if (char) upsert({ ...char, id: crypto.randomUUID(), name: char.name ? `${char.name}-copy` : 'copy', retired: false });
          }}
          onImageChange={(id, dataUrl) => {
            const char = characters.find(c => c.id === id);
            if (char) upsert({ ...char, image: dataUrl });
          }}
          onOpenRules={() => setShowRules(true)}
          onOpenHelp={() => setShowHelp(true)}
        />
      )}

      {view.type === 'wizard' && (
        <CharacterWizard
          initial={editingChar}
          onSave={handleSave}
          onCancel={() => setView({ type: 'home' })}
          onOpenRules={() => setShowRules(true)}
          onOpenHelp={() => setShowHelp(true)}
        />
      )}

      {view.type === 'sheet' && viewingChar && (
        <CharacterSheet
          char={viewingChar}
          onEdit={() => setView({ type: 'wizard', editId: viewingChar.id })}
          onBack={() => setView({ type: 'home' })}
          onOpenRules={() => setShowRules(true)}
          onOpenHelp={() => setShowHelp(true)}
          onUpdate={upsert}
        />
      )}

      {showRules && <PDFViewer onClose={() => setShowRules(false)} />}
      {showHelp && <HelpPage onClose={() => setShowHelp(false)} />}
    </>
  );
}
