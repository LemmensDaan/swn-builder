import { useState } from 'react';
import { useCharacters } from './store/useCharacters';
import { normalizeAppData } from './store/useCharacters';
import HomeScreen from './components/HomeScreen';
import CharacterWizard from './components/wizard/CharacterWizard';
import CharacterSheet from './components/CharacterSheet';
import ShipWizard from './components/wizard/ShipWizard';
import ShipSheet from './components/ShipSheet';
import PDFViewer from './components/PDFViewer';
import HelpPage from './components/HelpPage';
import type { Character } from './types/character';
import type { Ship } from './types/ship';
import { CURRENT_VERSION } from './types/appData';

type View =
  | { type: 'home'; activeTab?: 'characters' | 'ships' }
  | { type: 'wizard'; editId?: string }
  | { type: 'sheet'; id: string }
  | { type: 'ship-wizard'; editId?: string }
  | { type: 'ship-sheet'; id: string; activeTab?: 'characters' | 'ships' };

export default function App() {
  const { characters, upsert, remove, setAll, loaded, ships, upsertShip, removeShip } = useCharacters();
  const [view, setView] = useState<View>({ type: 'home', activeTab: 'characters' });
  const [showRules, setShowRules] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const editingChar = view.type === 'wizard' && view.editId
    ? characters.find(c => c.id === view.editId)
    : undefined;

  const viewingChar = view.type === 'sheet'
    ? characters.find(c => c.id === (view as { type: 'sheet'; id: string }).id)
    : undefined;

  const editingShip = view.type === 'ship-wizard' && view.editId
    ? ships.find(s => s.id === view.editId)
    : undefined;

  const viewingShip = view.type === 'ship-sheet'
    ? ships.find(s => s.id === (view as { type: 'ship-sheet'; id: string }).id)
    : undefined;

  if (!loaded) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <span className="text-amber-400 text-sm font-medium tracking-wide animate-pulse">
          Stars Without Number
        </span>
      </div>
    );
  }

  function handleSave(char: Character) {
    upsert(char);
    setView({ type: 'sheet', id: char.id });
  }

  function handleShipSave(ship: Ship) {
    upsertShip(ship);
    setView({ type: 'ship-sheet', id: ship.id });
  }

  function handleExport() {
    const appData = { version: CURRENT_VERSION, characters };
    const json = JSON.stringify(appData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // e.g. swn-builder-2026-06-05.json
    a.download = `swn-builder-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File): Promise<void> {
    const text = await file.text();
    const parsed = JSON.parse(text); // throws on invalid JSON — caught by HomeScreen
    const appData = normalizeAppData(parsed);
    setAll({ characters: appData.characters, ships: appData.ships });
    setView({ type: 'home' });
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
          onExport={handleExport}
          onImport={handleImport}
          onOpenRules={() => setShowRules(true)}
          onOpenHelp={() => setShowHelp(true)}
          ships={ships}
          onNewShip={() => setView({ type: 'ship-wizard' })}
          onOpenShip={id => setView({ type: 'ship-sheet', id, activeTab: view.activeTab })}
          onDeleteShip={id => removeShip(id)}
          onRetireShip={id => {
            const ship = ships.find(s => s.id === id);
            if (ship) upsertShip({ ...ship, retired: true });
          }}
          onUnretireShip={id => {
            const ship = ships.find(s => s.id === id);
            if (ship) upsertShip({ ...ship, retired: false });
          }}
          onCopyShip={id => {
            const ship = ships.find(s => s.id === id);
            if (ship) upsertShip({ ...ship, id: crypto.randomUUID(), name: ship.name ? `${ship.name}-copy` : 'copy', retired: false });
          }}
          onShipImageChange={(id, dataUrl) => {
            const ship = ships.find(s => s.id === id);
            if (ship) upsertShip({ ...ship, image: dataUrl });
          }}
          initialActiveTab={view.activeTab}
          onTabChange={tab => setView({ ...view, activeTab: tab })}
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
          ships={ships}
          onEdit={() => setView({ type: 'wizard', editId: viewingChar.id })}
          onBack={() => setView({ type: 'home' })}
          onOpenRules={() => setShowRules(true)}
          onOpenHelp={() => setShowHelp(true)}
          onUpdate={upsert}
          onNavigateToShip={id => setView({ type: 'ship-sheet', id })}
        />
      )}

      {view.type === 'ship-wizard' && (
        <ShipWizard
          initial={editingShip}
          onSave={handleShipSave}
          onCancel={() => setView({ type: 'home' })}
          onOpenRules={() => setShowRules(true)}
          onOpenHelp={() => setShowHelp(true)}
        />
      )}

      {view.type === 'ship-sheet' && viewingShip && (
        <ShipSheet
          ship={viewingShip}
          characters={characters}
          onEdit={() => setView({ type: 'ship-wizard', editId: viewingShip.id })}
          onBack={() => setView({ type: 'home', activeTab: view.activeTab })}
          onOpenRules={() => setShowRules(true)}
          onOpenHelp={() => setShowHelp(true)}
          onUpdate={upsertShip}
          onUpdateCharacter={upsert}
          onNavigateToChar={id => setView({ type: 'sheet', id })}
        />
      )}

      {showRules && <PDFViewer onClose={() => setShowRules(false)} />}
      {showHelp && <HelpPage onClose={() => setShowHelp(false)} />}
    </>
  );
}
