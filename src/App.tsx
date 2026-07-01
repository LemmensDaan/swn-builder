import { useState } from 'react';
import { useCharacters, normalizeAppData, normalizeCharacter, normalizeShipData } from './store/useCharacters';
import HomeScreen from './components/HomeScreen';
import CharacterWizard from './components/wizard/CharacterWizard';
import CharacterSheet from './components/CharacterSheet';
import ShipWizard from './components/wizard/ShipWizard';
import ShipSheet from './components/ShipSheet';
import PDFViewer from './components/PDFViewer';
import HelpPage from './components/HelpPage';
import type { Character } from './types/character';
import type { Ship } from './types/ship';
import type { Sector, StarSystem } from './types/sector';
import { EXPORT_VERSION } from './types/exportData';
import SectorViewer from './components/sector/SectorViewer';
import FactionSheet from './components/factions/FactionSheet';
import type { HomeTab } from './components/HomeScreen';
import { useSectorStore, flushSectorSave } from './store/useSectorStore';

type View =
  | { type: 'home'; activeTab?: HomeTab }
  | { type: 'wizard'; editId?: string }
  | { type: 'sheet'; id: string }
  | { type: 'ship-wizard'; editId?: string }
  | { type: 'ship-sheet'; id: string; activeTab?: HomeTab }
  | { type: 'sector' }
  | { type: 'faction-sheet'; factionId: string; sectorId: string };

export default function App() {
  const { characters, upsert, remove, setAll, loaded, ships, upsertShip, removeShip, saveError, clearSaveError, saveWarning, clearSaveWarning } = useCharacters();
  const sectors = useSectorStore(s => s.sectors);
  const systems = useSectorStore(s => s.systems);
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

  const viewingFactionInfo = view.type === 'faction-sheet'
    ? (() => {
        const v = view as { type: 'faction-sheet'; factionId: string; sectorId: string };
        const sector = sectors.find(s => s.id === v.sectorId);
        return sector
          ? { faction: sector.factions.find(f => f.id === v.factionId), sector }
          : undefined;
      })()
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

  function downloadJson(data: object, filename: string) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function dateStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function slugify(name: string) {
    return (name || 'unnamed').replace(/[^a-z0-9]/gi, '-').toLowerCase().replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  function handleExportAll() {
    downloadJson(
      { version: EXPORT_VERSION, type: 'full', characters, ships, sectors, systems },
      `swn-export-${dateStr()}.json`,
    );
  }

  function handleExportCharacter(id: string) {
    const char = characters.find(c => c.id === id);
    if (!char) return;
    downloadJson(
      { version: EXPORT_VERSION, type: 'character', character: char },
      `swn-character-${slugify(char.name)}-${dateStr()}.json`,
    );
  }

  function handleExportShip(id: string) {
    const ship = ships.find(s => s.id === id);
    if (!ship) return;
    downloadJson(
      { version: EXPORT_VERSION, type: 'ship', ship },
      `swn-ship-${slugify(ship.name)}-${dateStr()}.json`,
    );
  }

  function handleExportSector(id: string) {
    const sector = sectors.find(s => s.id === id);
    if (!sector) return;
    const sectorSystems: Record<string, StarSystem> = {};
    Object.entries(systems).forEach(([sysId, sys]) => {
      if (sys.sectorId === sector.id) sectorSystems[sysId] = sys;
    });
    downloadJson(
      { version: EXPORT_VERSION, type: 'sector', sector, systems: sectorSystems },
      `swn-sector-${slugify(sector.name)}-${dateStr()}.json`,
    );
  }

  async function handleImport(file: File): Promise<void> {
    const text = await file.text();
    const parsed = JSON.parse(text); // throws on invalid JSON — caught by HomeScreen

    // Use getState() after the await to avoid stale closure on store actions
    const sectorStore = useSectorStore.getState();

    if (parsed.type === 'character') {
      const char: Character = { ...normalizeCharacter(parsed.character), id: crypto.randomUUID() };
      upsert(char);
      setView({ type: 'home', activeTab: 'characters' });
    } else if (parsed.type === 'ship') {
      const ship: Ship = { ...normalizeShipData(parsed.ship), id: crypto.randomUUID() };
      upsertShip(ship);
      setView({ type: 'home', activeTab: 'ships' });
    } else if (parsed.type === 'sector') {
      sectorStore.importSingleSector(parsed.sector as Sector, parsed.systems as Record<string, StarSystem>);
      flushSectorSave();
      setView({ type: 'sector' });
    } else if (parsed.type === 'full') {
      const data = normalizeAppData(parsed);
      setAll({ characters: data.characters, ships: data.ships });
      sectorStore.replaceSectorData(parsed.sectors ?? [], parsed.systems ?? {});
      flushSectorSave();
      setView({ type: 'home', activeTab: 'characters' });
    } else {
      // legacy v1 format — characters + ships only
      const data = normalizeAppData(parsed);
      setAll({ characters: data.characters, ships: data.ships });
      setView({ type: 'home', activeTab: 'characters' });
    }
  }

  return (
    <>
      {(saveError || saveWarning) && (
        <div
          style={{
            position: 'fixed', top: 16, right: 16, zIndex: 9999,
            maxWidth: 360,
            background: saveError ? 'rgba(60,10,10,0.96)' : 'rgba(12,20,50,0.96)',
            border: `1px solid ${saveError ? 'rgba(220,50,50,0.5)' : 'rgba(80,120,220,0.4)'}`,
            borderRadius: 8,
            padding: '10px 14px',
            display: 'flex', alignItems: 'flex-start', gap: 10,
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            color: saveError ? '#fca5a5' : '#93c5fd',
            fontSize: 13,
            fontFamily: 'monospace',
          }}
        >
          <span style={{ flex: 1 }}>{saveError ?? saveWarning}</span>
          <button
            onClick={() => { clearSaveError(); clearSaveWarning(); }}
            style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6, color: 'inherit', fontSize: 16, lineHeight: 1, padding: 0 }}
          >✕</button>
        </div>
      )}
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
          onExportAll={handleExportAll}
          onExportCharacter={handleExportCharacter}
          onExportShip={handleExportShip}
          sectors={sectors}
          onExportSector={handleExportSector}
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
          onTabChange={tab => {
            if (tab === 'sector') { setView({ type: 'sector' }); return; }
            setView({ ...view, type: 'home', activeTab: tab });
          }}
          onOpenFaction={(factionId, sectorId) => setView({ type: 'faction-sheet', factionId, sectorId })}
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

      {view.type === 'sector' && (
        <SectorViewer onBack={() => setView({ type: 'home', activeTab: 'sector' })} />
      )}

      {view.type === 'faction-sheet' && viewingFactionInfo?.faction && (
        <FactionSheet
          key={viewingFactionInfo.faction.id}
          faction={viewingFactionInfo.faction}
          sectorId={viewingFactionInfo.sector.id}
          sectorName={viewingFactionInfo.sector.name}
          onBack={() => setView({ type: 'home', activeTab: 'factions' })}
        />
      )}

      {showRules && <PDFViewer onClose={() => setShowRules(false)} />}
      {showHelp && <HelpPage onClose={() => setShowHelp(false)} />}
    </>
  );
}
